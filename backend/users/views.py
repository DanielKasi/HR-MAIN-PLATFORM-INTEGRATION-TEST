from typing import Literal
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema
from django.db.models import Prefetch
from institution.models import UserBranch
from utilities.helpers import (
    build_password_link,
    create_and_institution_otp,
    send_otp_to_user,
    send_password_link_to_user,
    verify_otp,
    cleanup_expired_otps,
    send_password_reset_link_to_user,
    create_and_institution_token,
)
from django.utils import timezone
from .serializers import (
    CustomUserSerializer,
    LoginRequestSerializer,
    InstitutionUserLoginResponseSerializer,
    RoleSerializer,
    PermissionSerializer,
    PermissionCategorySerializer,
    UserOTPVerificationSerializer,
    UserPasswordResetSerializer,
    UserResendOTPVerificationSerializer,
    UserSendForgotPasswordTokenSerializer,
    ResendOTPSerializer, ProfileSerializer
)
from .models import CustomUser, Role, Permission, PermissionCategory, UserType, OTPModel, Profile
from institution.serializers import InstitutionWithBranchesSerializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.views import TokenRefreshView
from django.core.exceptions import ObjectDoesNotExist

from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from .serializers import CustomUserSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from utilities.pagination import CustomPageNumberPagination
import logging
from utilities.password_validator import validate_password_strength
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
import requests
import secrets
import urllib.parse
from institution.utils import generate_compliant_password
import os

logger = logging.getLogger(__name__)


class UserListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=CustomUserSerializer,
        responses={201: CustomUserSerializer},
        description="Register a new user with email, full name, and password.",
        summary="Create a new user",
        tags=["User Management"],
    )
    def post(self, request):
        serializer = CustomUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            otp = create_and_institution_otp(
                user_id=user.id, purpose=f"registration_{user.id}", expiry_minutes=15
            )
            send_otp_to_user(user, otp)

            cleanup_expired_otps()

            return Response(
                CustomUserSerializer(user).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: CustomUserSerializer(many=True)},
        description="Retrieve the authenticated user's details.",
        summary="Get user details",
        tags=["User Management"],
    )
    def get(self, request):
        queryset = CustomUser.objects.all()

        if not request.user.is_staff:
            queryset = queryset.filter(id=request.user.id)

        queryset = queryset.prefetch_related(
            "user_roles__role__permissions__permission",
            Prefetch(
                "attached_branches",
                queryset=UserBranch.objects.select_related("branch__Institution"),
                to_attr="prefetched_user_branches",
            ),
        )

        serializer = CustomUserSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserDetailAPIView(APIView):
    @extend_schema(
        responses={200: CustomUserSerializer},
        description="Retrieve a specific user's details.",
        summary="Get user details",
        tags=["User Management"],
    )
    def get(self, request, user_id):
        try:
            user = CustomUser.objects.get(id=user_id)
            serializer = CustomUserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response(
                {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        request=CustomUserSerializer(partial=True),
        responses={200: CustomUserSerializer},
        description="Update the authenticated user's details (partial update).",
        summary="Update user details",
        tags=["User Management"],
    )
    def patch(self, request, user_id):
        if user_id:
            try:
                user = CustomUser.objects.get(id=user_id)
                serializer = CustomUserSerializer(user, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(
                        {
                            "message": "User updated successfully",
                            "user": serializer.data,
                        },
                        status=status.HTTP_200_OK,
                    )
                return Response(
                    {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )
            except CustomUser.DoesNotExist:
                return Response(
                    {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
                )
        return Response(
            {"detail": "User ID is required for updating."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @extend_schema(
        responses={204: None},
        description="Delete a specific user.",
        summary="Delete user",
        tags=["User Management"],
    )
    def delete(self, request, user_id):
        if user_id:
            try:
                user = CustomUser.objects.get(id=user_id)
                user.delete()
                return Response(
                    {"message": "User deleted successfully"},
                    status=status.HTTP_204_NO_CONTENT,
                )
            except CustomUser.DoesNotExist:
                return Response(
                    {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
                )
        return Response(
            {"detail": "User ID is required for deletion."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class VerifyOTPAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=UserOTPVerificationSerializer,
        responses={200: {"message": "string"}},
        description="Verify OTP for user registration",
        tags=["User Management"],
    )
    def post(self, request):
        serializer = UserOTPVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        user_id = serializer.validated_data["user_id"]
        otp = serializer.validated_data["otp"]

        try:
            user = CustomUser.objects.get(id=user_id)

            success, message = verify_otp(user_id, received_otp=otp)

            if success:
                user.is_active = True
                user.is_email_verified = True
                user.save()

                logger.info(f"User {user_id} verified and activated successfully")
                return Response(
                    {"message": "OTP verified successfully. Account activated."},
                    status=status.HTTP_200_OK,
                )
            else:
                logger.warning(f"OTP verification failed for user {user_id}: {message}")
                return Response(
                    {"message": message}, status=status.HTTP_400_BAD_REQUEST
                )

        except CustomUser.DoesNotExist:
            logger.error(f"User {user_id} not found during OTP verification")
            return Response(
                {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error during OTP verification for user {user_id}: {str(e)}")
            return Response(
                {"detail": "An error occurred during verification"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=ResendOTPSerializer,
        responses={200: {"message": "string", "user_id": "integer"}},
        description="Resend OTP to user",
        summary="Resend OTP",
        tags=["User Management"],
    )
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        user_id = serializer.validated_data["user_id"]

        # Get the user from the database
        try:
            user = CustomUser.objects.get(id=user_id)

            # Don't resend OTP if user is already verified
            if user.is_email_verified:
                return Response(
                    {"message": "User is already verified"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create and send new OTP
            otp = create_and_institution_otp(
                user_id=user.id, purpose=f"registration_{user.id}", expiry_minutes=15
            )
            send_otp_to_user(user, otp)

            logger.info(f"OTP resent to user {user_id}")
            return Response(
                {"message": "OTP sent successfully", "user_id": user_id},
                status=status.HTTP_200_OK,
            )
        except CustomUser.DoesNotExist:
            logger.warning(f"User {user_id} not found during OTP resend")
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error resending OTP to user {user_id}: {str(e)}")
            return Response(
                {"error": "Failed to resend OTP"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VerifyPasswordResetAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=UserPasswordResetSerializer,
        responses={200: {"detail": "string"}},
        description="Reset password using secure token (no user_id exposed).",
        tags=["User Management"],
    )
    def post(self, request):
        serializer = UserPasswordResetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            otp_record = OTPModel.objects.get(value=token, purpose="registration")

            if otp_record.is_expired():
                return Response(
                    {"detail": "Token has expired."}, status=status.HTTP_400_BAD_REQUEST
                )

            user = otp_record.user
            user.is_active = True
            user.is_email_verified = True
            user.is_password_verified = True
            user.set_password(new_password)
            user.save()

            otp_record.delete()  # optionally remove used token
            return Response(
                {"detail": "Password set successfully. Account activated."},
                status=status.HTTP_200_OK,
            )

        except OTPModel.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ResendOTPAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=UserResendOTPVerificationSerializer,
        responses={200: {"message": "string"}},
        description="Resend email OTP for user registration",
        tags=["User Management"],
    )
    def post(self, request):
        mode: Literal["otp", "password_link"] = request.query_params.get("mode", "otp")
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )
        try:

            user_id	 = serializer.validated_data["user_id"]
            user_instance = CustomUser.objects.get(id=user_id)
            otp = create_and_institution_otp(
                user_id=user_instance.id, purpose="registration", expiry_minutes=15
            )
            if mode == "otp":
                send_otp_to_user(user_instance, otp)
            else:
                token = create_and_institution_token(
                    user=user_instance.profile.user, purpose="registration", expiry_minutes=15
                )
                password_link = build_password_link(request=request, token=token)
                send_password_link_to_user(user=user_instance, link=password_link)

            return Response(
                CustomUserSerializer(user_instance).data,
                status=status.HTTP_201_CREATED,
            )

        except CustomUser.DoesNotExist | Exception as e:
            return Response(
                {"detail": "Could not send the OTP"},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=LoginRequestSerializer,
        responses={200: InstitutionUserLoginResponseSerializer},
        description="Authenticate user to receive JWT tokens and user details.",
        summary="User Login",
        tags=["Authentication"],
    )
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            password = serializer.validated_data["password"]

            try:
                user_instance = CustomUser.objects.get(email=email)
                # The custom_codes are in sync with the frontend, they should be kept so or modified together
                if (
                    not user_instance.is_password_verified
                    and not user_instance.is_email_verified
                ):
                    return Response(
                        {
                            "detail": "You need to reset your password to be able to login",
                            "custom_code": "ADMIN_CREATED_UNVERIFIED",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                if not user_instance.is_email_verified:
                    return Response(
                        {
                            "detail": "You need to verify your account to be able to login",
                            "custom_code": "SELF_CREATED_UNVERIFIED",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                user = authenticate(email=user_instance.email, password=password)

                if user is not None:
                    if user.user_type == UserType.STAFF:
                        institution_attached = user.institutions_owned.all()

                        # If user is not an institution owner, check if they are associated with an institution in profile
                        if not institution_attached:
                            try:
                                institution_attached = (
                                    [user.profile.institution]
                                    if user.profile.institution
                                    else []
                                )
                            except ObjectDoesNotExist:
                                institution_attached = (
                                    [] if not institution_attached else institution_attached
                                )

                        serializer_context = {"user": user}

                        return Response(
                            {
                                "tokens": user.get_token(),
                                "user": CustomUserSerializer(user).data,
                                "institution_attached": InstitutionWithBranchesSerializer(
                                    institution_attached,
                                    many=True,
                                    context=serializer_context,
                                ).data,
                            },
                            status=status.HTTP_200_OK,
                        )
                return Response(
                    {
                        "detail": "Invalid Credentials",
                        "custom_code": "INVALID_CREDENTIALS",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            except CustomUser.DoesNotExist:
                return Response(
                    {
                        "detail": "Invalid Credentials",
                        "custom_code": "INVALID_CREDENTIALS",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class UserInstitutionsListAPIView(APIView):
    def get(self, request):
        try:
            user = request.user

            if not user or user.user_type != UserType.POS:
                return Response(status=status.HTTP_403_FORBIDDEN)
            institution_attached = user.institution_owned.all()

            if not institution_attached or not len(institution_attached):
                try:
                    institution_attached = (
                        [user.profile.institution] if user.profile.institution else []
                    )
                except ObjectDoesNotExist:
                    institution_attached = [] if not institution_attached else institution_attached

            serializer = InstitutionWithBranchesSerializer(
                institution_attached,
                many=True,
                context={"user": user},
            )

            return Response(
                serializer.data,
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(status=status.HTTP_404_NOT_FOUND)


class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = TokenRefreshSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        refresh_token = serializer.validated_data.get("refresh")
        access_token = serializer.validated_data.get("access")

        try:
            token = RefreshToken(refresh_token)
            user_id = token.payload.get("user_id")

            user = CustomUser.objects.get(id=user_id)
            if user.user_type == UserType.STAFF:
                response_data = {
                    "tokens": {
                        "access": str(access_token),
                        "refresh": str(refresh_token),
                    },
                    "user": CustomUserSerializer(user).data,
                    "institution_attached": InstitutionWithBranchesSerializer(
                        user.institutions_owned.all(), many=True, context={"user": user}
                    ).data,
                }
            else:
                return Response(
                    {"detail": "Invalid user type."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(response_data, status=status.HTTP_200_OK)

        except CustomUser.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": f"Token refresh failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class RoleListAPIView(APIView):
    @extend_schema(
        request=RoleSerializer,
        responses={201: RoleSerializer},
        description="Create a new role.",
        summary="Create a new role",
        tags=["User Management"],
    )
    def post(self, request):
        serializer: RoleSerializer = RoleSerializer(data=request.data)

        if serializer.is_valid():
            role = serializer.save()
            return Response(
                RoleSerializer(role).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: RoleSerializer(many=True)},
        description="Retrieve all roles.",
        summary="Get all roles",
        tags=["User Management"],
    )
    def get(self, request):
        Institution_id = request.query_params.get("Institution_id", None)
        roles = Role.objects.filter(institution__id=Institution_id).order_by("name")
        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(roles, request)
        serializer = RoleSerializer(
            paginator_qs, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)


class RoleDetailAPIView(APIView):
    @extend_schema(
        responses={200: RoleSerializer},
        summary="Get a role",
        tags=["User Management"],
    )
    def get(self, request, role_id):
        role = get_object_or_404(Role, pk=role_id)
        serializer = RoleSerializer(role)
        return Response(serializer.data)

    @extend_schema(
        request=RoleSerializer,
        responses={200: RoleSerializer},
        summary="Update a role",
        tags=["User Management"],
    )
    def patch(self, request, role_id):
        role = get_object_or_404(Role, pk=role_id)
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        summary="Delete a role",
        tags=["User Management"],
    )
    def delete(self, request, role_id):
        get_object_or_404(Role, pk=role_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionCategoryListAPIView(APIView):
    @extend_schema(
        request=PermissionSerializer,
        responses={201: PermissionSerializer},
        description="Create a new permission Category.",
        summary="Create a new permission Category",
        tags=["User Management"],
    )
    def post(self, request):
        serializer: PermissionCategorySerializer = PermissionCategorySerializer(
            data=request.data
        )

        if serializer.is_valid():
            permission_category = serializer.save()
            return Response(
                PermissionCategorySerializer(permission_category).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: PermissionCategorySerializer(many=True)},
        description="Retrieve all permission categories.",
        summary="Retrieve all permission categories",
        tags=["User Management"],
    )
    def get(self, request):
        permission_categories = PermissionCategory.objects.all()
        serializer = PermissionCategorySerializer(permission_categories, many=True)
        return Response(serializer.data)


class PermissionCategoryDetailAPIView(APIView):
    @extend_schema(
        responses={200: PermissionCategorySerializer},
        summary="Get a permission category",
        tags=["User Management"],
    )
    def get(self, request, permission_category_id):
        role = get_object_or_404(PermissionCategory, pk=permission_category_id)
        serializer = PermissionCategorySerializer(role)
        return Response(serializer.data)

    @extend_schema(
        request=PermissionCategorySerializer,
        responses={200: PermissionCategorySerializer},
        summary="Update a permission category",
        tags=["User Management"],
    )
    def patch(self, request, permission_category_id):
        role = get_object_or_404(PermissionCategory, pk=permission_category_id)
        serializer = PermissionCategory(role, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        summary="Delete a permission category",
        tags=["User Management"],
    )
    def delete(self, request, permission_category_id):
        get_object_or_404(PermissionCategory, pk=permission_category_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionListAPIView(APIView):
    @extend_schema(
        request=PermissionSerializer,
        responses={201: PermissionSerializer},
        description="Create a new permission.",
        summary="Create a new permission",
        tags=["User Management"],
    )
    def post(self, request):
        serializer: PermissionSerializer = PermissionSerializer(data=request.data)

        if serializer.is_valid():
            permission = serializer.save()
            return Response(
                PermissionSerializer(permission).data, status=status.HTTP_201_CREATED
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: PermissionSerializer(many=True)},
        description="Retrieve all permissions.",
        summary="Retrieve all permissions",
        tags=["User Management"],
    )
    def get(self, request):
        system_permissions = Permission.objects.all()
        serializer = PermissionSerializer(system_permissions, many=True)
        return Response(serializer.data)


class PermissionDetailAPIView(APIView):
    @extend_schema(
        responses={200: PermissionSerializer},
        summary="Get a permission",
        tags=["User Management"],
    )
    def get(self, request, permission_id):
        role = get_object_or_404(Permission, pk=permission_id)
        serializer = PermissionSerializer(role)
        return Response(serializer.data)

    @extend_schema(
        request=PermissionSerializer,
        responses={200: PermissionSerializer},
        summary="Update a permission",
        tags=["User Management"],
    )
    def patch(self, request, permission_id):
        role = get_object_or_404(Permission, pk=permission_id)
        serializer = PermissionSerializer(role, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        summary="Delete a permission",
        tags=["User Management"],
    )
    def delete(self, request, permission_id):
        get_object_or_404(Permission, pk=permission_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ForgotPasswordAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=UserSendForgotPasswordTokenSerializer,
        responses={200: {"detail": "string"}},
        description="Request a password reset link",
        summary="Forgot Password",
        tags=["Authentication"],
    )
    def post(self, request):
        serializer = UserSendForgotPasswordTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data["email"].lower()
        frontend_url = serializer.validated_data.get("frontend_url")

        # user = get_object_or_404(CustomUser, email=email)
        user = CustomUser.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "No user found with this email address."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            # Generate token
            token = create_and_institution_token(
                user=user, purpose="password_reset", expiry_minutes=1440
            )

            # Build reset link
            reset_link = f"{frontend_url}/forgot-password/reset-password/{token}"

            # Send reset email
            send_password_reset_link_to_user(user=user, link=reset_link)

            return Response(
                {"detail": "Password reset link sent successfully."},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"Error in forgot password: {str(e)}")
            return Response(
                {"detail": "An error occurred while processing your request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VerifyTokenAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request={"token": "string"},
        responses={200: {"valid": "boolean"}},
        description="Verify if a password reset token is valid",
        summary="Verify Reset Token",
        tags=["Authentication"],
    )
    def post(self, request):
        token = request.data.get("token")

        if not token:
            return Response(
                {"detail": "Token is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Check if token exists and is not expired
            token_obj = OTPModel.objects.filter(
                value=token,
                purpose="password_reset",
                is_used=False,
                expires_at__gt=timezone.now(),
            ).first()

            return Response({"valid": bool(token_obj)}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error in verify token: {str(e)}")
            return Response(
                {"detail": "An error occurred while verifying the token."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ResetPasswordAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=UserPasswordResetSerializer,
        responses={200: {"detail": "string"}},
        description="Reset password using token",
        summary="Reset Password",
        tags=["Authentication"],
    )
    def post(self, request):
        serializer = UserPasswordResetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            # Validate password
            try:
                validate_password_strength(new_password)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

            # Find token
            token_obj = OTPModel.objects.filter(
                value=token,
                purpose="password_reset",
                is_used=False,
                expires_at__gt=timezone.now(),
            ).first()

            if not token_obj:
                return Response(
                    {"detail": "Invalid or expired token"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Set new password
            user = token_obj.user
            user.set_password(new_password)
            user.save()

            # Mark token as used
            token_obj.is_used = True
            token_obj.save()

            # Mark token as used
            logger.info(f"Password reset successful for user {user.id}")
            return Response(
                {"detail": "Password has been reset successfully"},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error in reset password: {str(e)}")
            return Response(
                {"detail": "An error occurred while resetting your password."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class GoogleAuthURLView(APIView):
    """
    Generate Google OAuth URL for frontend to redirect to
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Generate secure state parameter
        state = secrets.token_urlsafe(32)

        # Store state in cache for 10 minutes (you can also use sessions)
        cache.set(f"google_oauth_state_{state}", True, timeout=600)

        # Build Google OAuth URL
        params = {
            "client_id": settings.GOOGLE_OAUTH2_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_AUTH_REDIRECT_URL,
            "scope": "openid email profile",
            "response_type": "code",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }

        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

        return Response({"auth_url": auth_url}, status=status.HTTP_200_OK)


class GoogleAuthCallbackView(APIView):
    """
    Handle Google OAuth callback and authenticate user
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = request.data.get("code")
        state = request.data.get("state")

        if not code or not state:
            return Response(
                {
                    "detail": "Code and state are required",
                    "custom_code": "MISSING_PARAMS",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": settings.GOOGLE_OAUTH2_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH2_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_AUTH_REDIRECT_URL,
            }

            token_response = requests.post(token_url, data=token_data)
            token_json = token_response.json()

            if "error" in token_json:
                return Response(
                    {
                        "detail": f"Google token exchange failed: {token_json.get('error_description', 'Unknown error')}",
                        "custom_code": "GOOGLE_TOKEN_EXCHANGE_FAILED",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            access_token = token_json.get("access_token")

            user_info_url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
            user_response = requests.get(user_info_url)

            user_data = user_response.json()

            if "error" in user_data:
                return Response(
                    {
                        "detail": "Failed to get user info from Google",
                        "custom_code": "GOOGLE_USER_INFO_FAILED",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            email = user_data.get("email")
            fullname = user_data.get("name", "")

            if not email:
                return Response(
                    {
                        "detail": "Email not provided by Google",
                        "custom_code": "NO_EMAIL_FROM_GOOGLE",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                user = CustomUser.objects.get(email=email)

            except CustomUser.DoesNotExist:
                user = CustomUser.objects.create_user(
                    email=email,
                    fullname=fullname,
                    is_active=True,
                    user_type=UserType.STAFF,
                    is_email_verified=True,
                    is_password_verified=True,
                    password=generate_compliant_password(),
                )

            user_profile, _ = Profile.objects.get_or_create(user=user)

            return Response(
                {
                    "tokens": user.get_token(),
                    "user": ProfileSerializer(user_profile).data,
                    "message": "User authenticated successfully",
                },
                status=status.HTTP_200_OK,
            )

        except requests.RequestException as e:
            return Response(
                {"detail": f"Network error: {str(e)}", "custom_code": "NETWORK_ERROR"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            return Response(
                {
                    "detail": f"Authentication failed: {str(e)}",
                    "custom_code": "AUTH_FAILED",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
