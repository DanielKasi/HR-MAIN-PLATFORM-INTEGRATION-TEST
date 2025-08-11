from datetime import datetime
from employee.models import Employee
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.permissions import AllowAny
from utilities.helpers import (
    build_password_link,
    send_password_link_to_user,
    create_and_institution_token,
    send_activation_confirmation_email,
)
from users.models import Profile, System

from .models import (
    Department,
    Institution,
    Branch,
    UserBranch,
    InstitutionBankAccount,
    InstitutionBankType,
    InstitutionWorkingDays,
    InstitutionTax,
    InstitutionTaxRule,
)
from users.serializers import ProfileSerializer
from .serializers import (
    DepartmentSerializer,
    ErrorResponseSerializer,
    InstitutionActivationSerializer,
    InstitutionSerializer,
    BranchSerializer,
    SuccessResponseSerializer,
    UserBranchSerializer,
    InstitutionBankTypeSerializer,
    InstitutionBankAccountSerializer,
    InstitutionWorkingDaysSerializer,
    InstitutionTaxSerializer,
    InstitutionTaxRuleSerializer,
)
from django.shortcuts import get_object_or_404
from .utils import generate_compliant_password
from utilities.pagination import CustomPageNumberPagination
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.db.models import Q
from django.contrib.auth import get_user_model
import logging
from django.db import transaction
from utilities.default_data import default_data
import json
import uuid

User = get_user_model()
logger = logging.getLogger(__name__)


class DefaultDataAPIView(APIView):
    @extend_schema(
        responses={200: dict},
        description="Retrieve default departments and their job positions",
        summary="Get default departments and job positions",
        tags=["Institution Management"],
    )
    def get(self, request):
        # Add unique IDs to default data
        modified_data = [
            {
                "id": str(uuid.uuid4()),
                "name": dept["name"],
                "description": dept["description"],
                "job_positions": [
                    {
                        "id": str(uuid.uuid4()),
                        "name": job["name"],
                        "description": job["description"],
                    }
                    for job in dept["job_positions"]
                ],
            }
            for dept in default_data
        ]
        return Response(modified_data, status=status.HTTP_200_OK)


class InstitutionListAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=InstitutionSerializer,
        responses={201: InstitutionSerializer},
        description="Create a new institution with name, address, owner, and optional departments",
        summary="Create a new institution",
        tags=["Institution Management"],
    )
    def post(self, request):
        if Institution.objects.filter(
            institution_owner__id=request.data.get("institution_owner_id"),
            institution_name=request.data.get("institution_name"),
        ).exists():
            return Response(
                {"detail": "User already has an institution with the same name."},
                status=status.HTTP_409_CONFLICT,
            )

        # Parse departments JSON string if present
        departments_data = request.data.get("departments", [])
        if isinstance(departments_data, str):
            try:
                departments_data = json.loads(departments_data)
            except json.JSONDecodeError:
                return Response(
                    {"detail": "Invalid departments data format. Expected valid JSON."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = InstitutionSerializer(
            data=request.data,
            context={
                "request": request,
                "user": request.user,
                "departments": departments_data,
            },
        )
        if serializer.is_valid():
            institution = serializer.save()
            return Response(
                InstitutionSerializer(institution, context={"user": request.user}).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: InstitutionSerializer(many=True)},
        description="Retrieve all institutions.",
        summary="Get all institutions",
        tags=["Institution Management"],
    )
    def get(self, request, institution_id=None):

        if request.user.is_staff:
            institutions = Institution.objects.all()
        else:
            institutions = Institution.objects.filter(institution_owner=request.user)

        institutions = institutions.order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(institutions, request)
        serializer = InstitutionSerializer(paginator_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class InstitutionDetailAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: InstitutionSerializer},
        description="Retrieve an institution.",
        summary="Get an institution",
        tags=["Institution Management"],
    )
    def get(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
            if institution.institution_owner != request.user:
                return Response({"detail": "Access denied."}, status=403)
            serializer = InstitutionSerializer(institution)
            return Response(serializer.data)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

    @extend_schema(
        request=InstitutionSerializer,
        responses={200: InstitutionSerializer},
        description="Update an existing institution.",
        summary="Update an institution",
        tags=["Institution Management"],
    )
    def patch(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
            if institution.institution_owner != request.user:
                return Response({"detail": "Access denied."}, status=403)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        serializer = InstitutionSerializer(institution, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing institution.",
        summary="Delete as institution",
        tags=["Institution Management"],
    )
    def delete(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
            if institution.institution_owner != request.user:
                return Response({"detail": "Access denied."}, status=403)
            institution.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)


class InstitutionBankTypeListAPIView(APIView):
    @extend_schema(
        responses={200: InstitutionBankTypeSerializer(many=True)},
        description="Retrieve all attached banks .",
        summary="Get all attached banks ",
        tags=["Bank Type Management"],
    )
    def get(self, request):
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        bank_types = InstitutionBankType.objects.filter(
            institution=institution
        ).order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(bank_types, request)

        serializer = InstitutionBankTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=InstitutionBankTypeSerializer,
        responses={201: InstitutionBankTypeSerializer},
        description="Create a new bank type.",
        summary="Create a new bank type",
        tags=["Bank Type Management"],
    )
    def post(self, request):
        serializer = InstitutionBankTypeSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            bank_type = serializer.save()
            return Response(
                InstitutionBankTypeSerializer(bank_type).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionBankTypeDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionBankTypeSerializer},
        description="Retrieve a bank type.",
        summary="Get a bank type",
        tags=["Bank Type Management"],
    )
    def get(self, request, bank_type_id):
        try:
            bank_type = InstitutionBankType.objects.get(id=bank_type_id)
            serializer = InstitutionBankTypeSerializer(bank_type)
            return Response(serializer.data)
        except InstitutionBankType.DoesNotExist:
            return Response({"detail": "Bank type not found."}, status=404)

    @extend_schema(
        request=InstitutionBankTypeSerializer,
        responses={200: InstitutionBankTypeSerializer},
        description="Update an existing bank type.",
        summary="Update a bank type",
        tags=["Bank Type Management"],
    )
    def patch(self, request, bank_type_id):
        try:
            bank_type = InstitutionBankType.objects.get(id=bank_type_id)
        except InstitutionBankType.DoesNotExist:
            return Response({"detail": "Bank type not found."}, status=404)

        serializer = InstitutionBankTypeSerializer(
            bank_type, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing bank type.",
        summary="Delete a bank type",
        tags=["Bank Type Management"],
    )
    def delete(self, request, bank_type_id):
        try:
            bank_type = InstitutionBankType.objects.get(id=bank_type_id)
            bank_type.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except InstitutionBankType.DoesNotExist:
            return Response({"detail": "Bank type not found."}, status=404)


class InstitutionBankAccountListAPIView(APIView):
    @extend_schema(
        responses={200: InstitutionBankAccountSerializer(many=True)},
        description="Retrieve all bank accounts.",
        summary="Get all bank accounts",
        tags=["Bank Account Management"],
    )
    def get(self, request):
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        bank_accounts = InstitutionBankAccount.objects.filter(
            institution_bank__institution=institution
        ).order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(bank_accounts, request)

        serializer = InstitutionBankAccountSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=InstitutionBankAccountSerializer,
        responses={201: InstitutionBankAccountSerializer},
        description="Create a new bank account.",
        summary="Create a new bank account",
        tags=["Bank Account Management"],
    )
    def post(self, request):
        serializer = InstitutionBankAccountSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            bank_account = serializer.save()
            return Response(
                InstitutionBankAccountSerializer(bank_account).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionBankAccountDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionBankAccountSerializer},
        description="Retrieve a bank account.",
        summary="Get a bank account",
        tags=["Bank Account Management"],
    )
    def get(self, request, bank_account_id):
        try:
            bank_account = InstitutionBankAccount.objects.get(id=bank_account_id)
            serializer = InstitutionBankAccountSerializer(bank_account)
            return Response(serializer.data)
        except InstitutionBankAccount.DoesNotExist:
            return Response({"detail": "Bank account not found."}, status=404)

    @extend_schema(
        request=InstitutionBankAccountSerializer,
        responses={200: InstitutionBankAccountSerializer},
        description="Update an existing bank account.",
        summary="Update a bank account",
        tags=["Bank Account Management"],
    )
    def patch(self, request, bank_account_id):
        try:
            bank_account = InstitutionBankAccount.objects.get(id=bank_account_id)
        except InstitutionBankAccount.DoesNotExist:
            return Response({"detail": "Bank account not found."}, status=404)

        serializer = InstitutionBankAccountSerializer(
            bank_account, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing bank account.",
        summary="Delete a bank account",
        tags=["Bank Account Management"],
    )
    def delete(self, request, bank_account_id):
        try:
            bank_account = InstitutionBankAccount.objects.get(id=bank_account_id)
            bank_account.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except InstitutionBankAccount.DoesNotExist:
            return Response({"detail": "Bank account not found."}, status=404)


class InstitutionWorkingDaysListAPIView(APIView):
    @extend_schema(
        responses={200: InstitutionWorkingDaysSerializer(many=True)},
        description="Retrieve all working days for an institution.",
        summary="Get all working days",
        tags=["Working Days Management"],
    )
    def get(self, request):
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        working_days = InstitutionWorkingDays.objects.filter(institution=institution)

        serializer = InstitutionWorkingDaysSerializer(working_days, many=True)

        return Response(serializer.data)

    @extend_schema(
        request=InstitutionWorkingDaysSerializer,
        responses={201: InstitutionWorkingDaysSerializer},
        description="Create a new working days configuration for an institution.",
        summary="Create working days",
        tags=["Working Days Management"],
    )
    def post(self, request):
        serializer = InstitutionWorkingDaysSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            working_days = serializer.save()
            return Response(
                InstitutionWorkingDaysSerializer(working_days).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionWorkingDaysDetailView(APIView):
    @extend_schema(
        request=InstitutionWorkingDaysSerializer,
        responses={200: InstitutionWorkingDaysSerializer},
        description="Update existing working days configuration for an institution.",
        summary="Update working days",
        tags=["Working Days Management"],
    )
    def patch(self, request, pk):
        try:
            working_days = InstitutionWorkingDays.objects.get(id=pk)
        except InstitutionWorkingDays.DoesNotExist:
            return Response(
                {"detail": "Working days configuration not found."}, status=404
            )

        serializer = InstitutionWorkingDaysSerializer(
            working_days, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionTaxListAPIView(APIView):
    @extend_schema(
        responses={200: InstitutionTaxSerializer(many=True)},
        description="Retrieve all tax configurations for an institution.",
        summary="Get all tax configurations",
        tags=["Tax Management"],
    )
    def get(self, request):
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        taxes = InstitutionTax.objects.filter(institution=institution)

        serializer = InstitutionTaxSerializer(taxes, many=True)

        return Response(serializer.data)

    @extend_schema(
        request=InstitutionTaxSerializer,
        responses={201: InstitutionTaxSerializer},
        description="Create a new tax configuration for an institution.",
        summary="Create tax configuration",
        tags=["Tax Management"],
    )
    def post(self, request):
        serializer = InstitutionTaxSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            tax = serializer.save()
            return Response(
                InstitutionTaxSerializer(tax).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionTaxDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionTaxSerializer},
        description="Retrieve a tax configuration for an institution.",
        summary="Get a tax configuration",
        tags=["Tax Management"],
    )
    def get(self, request, tax_id):
        try:
            tax = InstitutionTax.objects.get(id=tax_id)
            serializer = InstitutionTaxSerializer(tax)
            return Response(serializer.data)
        except InstitutionTax.DoesNotExist:
            return Response({"detail": "Tax configuration not found."}, status=404)

    @extend_schema(
        request=InstitutionTaxSerializer,
        responses={200: InstitutionTaxSerializer},
        description="Update an existing tax configuration for an institution.",
        summary="Update tax configuration",
        tags=["Tax Management"],
    )
    def patch(self, request, tax_id):
        try:
            tax = InstitutionTax.objects.get(id=tax_id)
        except InstitutionTax.DoesNotExist:
            return Response({"detail": "Tax configuration not found."}, status=404)

        serializer = InstitutionTaxSerializer(
            tax, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing tax configuration for an institution.",
        summary="Delete a tax configuration",
        tags=["Tax Management"],
    )
    def delete(self, request, tax_id):
        try:
            tax = InstitutionTax.objects.get(id=tax_id)
            tax.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except InstitutionTax.DoesNotExist:
            return Response({"detail": "Tax configuration not found."}, status=404)


class InstitutionTaxRuleListAPIView(APIView):
    @extend_schema(
        responses={200: InstitutionTaxRuleSerializer(many=True)},
        description="Retrieve all tax rules for an institution.",
        summary="Get all tax rules",
        tags=["Tax Rule Management"],
    )
    def get(self, request):
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        tax_rules = InstitutionTaxRule.objects.filter(
            institution_tax__institution=institution
        )

        serializer = InstitutionTaxRuleSerializer(tax_rules, many=True)

        return Response(serializer.data)

    @extend_schema(
        request=InstitutionTaxRuleSerializer,
        responses={201: InstitutionTaxRuleSerializer},
        description="Create a new tax rule for an institution.",
        summary="Create tax rule",
        tags=["Tax Rule Management"],
    )
    def post(self, request):
        serializer = InstitutionTaxRuleSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            tax_rule = serializer.save()
            return Response(
                InstitutionTaxRuleSerializer(tax_rule).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionTaxRuleDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionTaxRuleSerializer},
        description="Retrieve a tax rule for an institution.",
        summary="Get a tax rule",
        tags=["Tax Rule Management"],
    )
    def get(self, request, tax_rule_id):
        try:
            tax_rule = InstitutionTaxRule.objects.get(id=tax_rule_id)
            serializer = InstitutionTaxRuleSerializer(tax_rule)
            return Response(serializer.data)
        except InstitutionTaxRule.DoesNotExist:
            return Response({"detail": "Tax rule not found."}, status=404)

    @extend_schema(
        request=InstitutionTaxRuleSerializer,
        responses={200: InstitutionTaxRuleSerializer},
        description="Update an existing tax rule for an institution.",
        summary="Update tax rule",
        tags=["Tax Rule Management"],
    )
    def patch(self, request, tax_rule_id):
        try:
            tax_rule = InstitutionTaxRule.objects.get(id=tax_rule_id)
        except InstitutionTaxRule.DoesNotExist:
            return Response({"detail": "Tax rule not found."}, status=404)

        serializer = InstitutionTaxRuleSerializer(
            tax_rule, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing tax rule for an institution.",
        summary="Delete a tax rule",
        tags=["Tax Rule Management"],
    )
    def delete(self, request, tax_rule_id):
        try:
            tax_rule = InstitutionTaxRule.objects.get(id=tax_rule_id)
            tax_rule.delete()
            return Response(status=204)
        except InstitutionTaxRule.DoesNotExist:
            return Response({"detail": "Tax rule not found."}, status=404)


class BranchListAPIView(APIView):
    @extend_schema(
        request=BranchSerializer,
        responses={201: BranchSerializer},
        description="Create a new branch.",
        summary="Create a new branch",
        tags=["Branch Management"],
    )
    def post(self, request):
        serializer = BranchSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            branch = serializer.save()
            return Response(
                BranchSerializer(branch).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: BranchSerializer(many=True)},
        description="Retrieve all branches.",
        summary="Get all branches",
        tags=["Branch Management"],
    )
    def get(self, request):
        if request.user.is_staff:
            branches = Branch.objects.all()
        else:
            branches = Branch.objects.filter(
                institution__institution_owner=request.user
            )

        branches = branches.order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(branches, request)

        serializer = BranchSerializer(paginator_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class BranchDetailAPIView(APIView):
    @extend_schema(
        responses={200: BranchSerializer},
        description="Retrieve a branch.",
        summary="Get a branch",
        tags=["Branch Management"],
    )
    def get(self, request, branch_id):
        try:
            branch = Branch.objects.get(id=branch_id)
            if (
                not request.user.is_staff
                and branch.institution.institution_owner != request.user
            ):
                return Response({"detail": "Access denied."}, status=403)
            serializer = BranchSerializer(branch)
            return Response(serializer.data)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found."}, status=404)

    @extend_schema(
        request=BranchSerializer,
        responses={200: BranchSerializer},
        description="Update an existing branch.",
        summary="Update a branch",
        tags=["Branch Management"],
    )
    def patch(self, request, branch_id):

        try:
            branch = Branch.objects.get(id=branch_id)
            if (
                not request.user.is_staff
                and branch.institution.institution_owner != request.user
            ):
                return Response({"detail": "Access denied."}, status=403)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found."}, status=404)

        serializer = BranchSerializer(branch, data=request.data, partial=True)
        if serializer.is_valid():

            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing branch.",
        summary="Delete a branch",
        tags=["Branch Management"],
    )
    def delete(self, request, branch_id):
        try:
            branch = Branch.objects.get(id=branch_id)
            if (
                not request.user.is_staff
                and branch.institution.institution_owner != request.user
            ):
                return Response({"detail": "Access denied."}, status=403)
            branch.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found."}, status=404)


class InstitutionBranchAPIView(APIView):
    @extend_schema(
        responses={200: BranchSerializer(many=True)},
        description="Retrieve all branches associated to a institution whose ID is given",
        summary="Get branches by Institution ID",
        tags=["Branch Management"],
    )
    def get(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if request.user == institution.institution_owner:
            branches = Branch.objects.filter(institution_id=institution_id)
        else:
            branches = Branch.objects.filter(
                institution_id=institution_id,
                id__in=UserBranch.objects.filter(user=request.user).values_list(
                    "branch_id", flat=True
                ),
            )

        branches = branches.order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(branches, request)
        serializer = BranchSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class UserProfileListAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=ProfileSerializer,
        responses={201: ProfileSerializer},
        description="Create a new user with profile.",
        summary="Create a new user profile",
        tags=["User Management"],
    )
    def post(self, request):
        random_password = generate_compliant_password()
        mutable_data = request.data.copy()
        user_data = mutable_data.get("user", {})
        user_data["password"] = random_password
        mutable_data["user"] = user_data

        serializer = ProfileSerializer(data=mutable_data)
        if serializer.is_valid():
            profile = serializer.save()
            profile.user.is_password_verified = False
            profile.user.save()

            token = create_and_institution_token(
                user=profile.user, purpose="registration", expiry_minutes=15
            )
            password_link = build_password_link(request=request, token=token)
            send_password_link_to_user(user=profile.user, link=password_link)

            return Response(
                ProfileSerializer(profile).data, status=status.HTTP_201_CREATED
            )

        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class UserProfileDetailAPIView(APIView):
    @extend_schema(
        responses={200: ProfileSerializer(many=True)},
        description="Retrieve the user profile of all users attached to the institution.",
        summary="Get all user profiles",
        tags=["User Management"],
    )
    def get(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        user = request.user

        if not user.is_staff and institution.institution_owner != user:
            try:
                profile = user.profile
                if profile.institution_id != institution.id:
                    return Response({"detail": "Access denied."}, status=403)
            except Profile.DoesNotExist:
                return Response({"detail": "Access denied."}, status=403)

        profiles = Profile.objects.filter(institution=institution_id)
        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(profiles, request)
        serializer = ProfileSerializer(
            paginator_qs, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)


class InstitutionUserProfileAPIView(APIView):
    @extend_schema(
        request=ProfileSerializer(partial=True),
        responses={200: ProfileSerializer},
        description="Update a institution user's profile (partial update).",
        summary="Update institution user details",
        tags=["User Management"],
    )
    def patch(self, request, user_id):
        if user_id:
            try:
                user = Profile.objects.get(user_id=user_id)
                serializer = Profile(user, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(
                        {
                            "message": "Institution User updated successfully",
                            "user": serializer.data,
                        },
                        status=status.HTTP_200_OK,
                    )
                return Response(
                    {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )
            except Profile.DoesNotExist:
                return Response(
                    {"detail": "Institution User not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        return Response(
            {"detail": "User ID is required for updating."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class UserBranchListCreateView(APIView):
    @extend_schema(
        request=UserBranchSerializer,
        responses={201: UserBranchSerializer},
        description="Create a new user-branch relationship.",
        summary="Create a new user-branch relationship",
        tags=["User Management"],
    )
    def post(self, request):
        serializer = UserBranchSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            user_branch = serializer.save()

            from employee.models import Employee

            try:
                employee = Employee.objects.get(user=user_branch.user)
                if user_branch.is_default:
                    employee.payroll_branch = user_branch.branch
                    employee.save(update_fields=["payroll_branch"])
            except Employee.DoesNotExist:
                pass

            return Response(
                UserBranchSerializer(user_branch).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    def get(self, request):
        user_branches = UserBranch.objects.all().order_by("-created_at")
        serializer = UserBranchSerializer(user_branches, many=True)
        return Response(serializer.data)


class UserBranchDetailAPIView(APIView):
    @extend_schema(
        responses={200: UserBranchSerializer},
        description="Retrieve a user-branch relationship.",
        summary="Get a user-branch relationship",
        tags=["User Management"],
    )
    def get(self, request, user_branch_id):
        try:
            user_branch = UserBranch.objects.get(id=user_branch_id)
            serializer = UserBranchSerializer(user_branch)
            return Response(serializer.data)
        except UserBranch.DoesNotExist:
            return Response(
                {"detail": "User-branch relationship not found."}, status=404
            )

    @extend_schema(
        request=UserBranchSerializer,
        responses={200: UserBranchSerializer},
        description="Update an existing user-branch relationship.",
        summary="Update a user-branch relationship",
        tags=["User Management"],
    )
    def patch(self, request, user_branch_id):
        user_branch = get_object_or_404(UserBranch, id=user_branch_id)
        serializer = UserBranchSerializer(user_branch, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class DepartmentListAPIView(APIView):
    @extend_schema(
        request=DepartmentSerializer,
        responses={201: DepartmentSerializer},
        description="Create a new department.",
        summary="Create a new department",
        tags=["Department Management"],
    )
    def post(self, request, institution_id=None):
        if not institution_id:
            return Response(
                {"detail": "Institution ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            department = serializer.save()
            return Response(
                DepartmentSerializer(department).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: DepartmentSerializer(many=True)},
        description="Retrieve all departments.",
        summary="Get all departments",
        tags=["Department Management"],
    )
    def get(self, request, institution_id=None):
        departments = Department.objects.filter(institution_id=institution_id).order_by(
            "-created_at"
        )
        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(departments, request)
        serializer = DepartmentSerializer(paginator_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class DepartmentDetailAPIView(APIView):
    @extend_schema(
        responses={200: DepartmentSerializer},
        description="Retrieve a department.",
        summary="Get a department",
        tags=["Department Management"],
    )
    def get(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
            serializer = DepartmentSerializer(department)
            return Response(serializer.data)
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=404)

    @extend_schema(
        request=DepartmentSerializer,
        responses={200: DepartmentSerializer},
        description="Update an existing department.",
        summary="Update a department",
        tags=["Department Management"],
    )
    def patch(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
            serializer = DepartmentSerializer(
                department, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=404)

    @extend_schema(
        responses={204: None},
        description="Delete an existing department.",
        summary="Delete a department",
        tags=["Department Management"],
    )
    def delete(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
            department.delete()
            return Response(status=204)
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=404)


# TODO: Make sure a user who does this has permissions to do so
@extend_schema(
    responses={204: None},
    description="Delete an existing user-branch relationship by user and branch IDs.",
    summary="Delete a user-branch relationship by user and branch",
    tags=["User Management"],
)
@api_view(["DELETE"])
def delete_user_branch_by_ids(request, user_id, branch_id):
    try:
        user_branch = UserBranch.objects.get(user_id=user_id, branch_id=branch_id)
        user_branch.is_active = False
        user_branch.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except UserBranch.DoesNotExist:
        return Response(
            {"detail": "User-branch relationship not found."},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    summary="Activate HR System",
    description="Accepts validated institution, branches, and employee data...",
    request=InstitutionActivationSerializer,
    responses={
        201: OpenApiResponse(
            response=SuccessResponseSerializer,  # if you define one
            description="Successful Activation",
        ),
        400: OpenApiResponse(
            response=ErrorResponseSerializer, description="Validation Error"
        ),
        401: OpenApiResponse(
            response=ErrorResponseSerializer, description="Unauthorized"
        ),
        500: OpenApiResponse(
            response=ErrorResponseSerializer, description="Internal Server Error"
        ),
    },
    parameters=[
        OpenApiParameter(
            name="X-API-Key",
            location=OpenApiParameter.HEADER,
            required=True,
            description="API key for authenticating the external system",
            type=str,
        )
    ],
    tags=["System Activation"],
)
class SystemActivationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    """
    For activating HR system from the external systems.
    """

    def get_system_from_api_key(self, api_key):
        """Validate API key and return the system."""
        try:
            system = System.objects.get(api_key=api_key, system_type__is_active=True)
            return system
        except System.DoesNotExist:
            return None

    def create_or_get_user(self, employee_data):
        """Create or get user for employee."""
        email = employee_data.get("email")
        full_name = employee_data.get("full_name")
        phone_number = employee_data.get("phone_number")
        gender = employee_data.get("gender")

        if email:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "fullname": full_name,
                    "is_active": True,
                    "gender": gender,
                },
            )

            return user

        return None

    def create_departments(self, institution, departments_data, owner_user):
        """Create departments for the institution."""
        created_departments = []

        for dept_data in departments_data:
            try:
                department = Department.objects.create(
                    institution=institution,
                    name=dept_data.get("name"),
                    description=dept_data.get("description", ""),
                    created_by=owner_user,
                )
                created_departments.append(department)
            except Exception as e:
                logger.error(f"Error creating department: {str(e)}")
                continue

        return created_departments

    def create_institution_and_branches(self, validated_data, owner_user):
        """Create institution and its branches."""

        try:
            branches_data = validated_data.pop("branches", [])
            employees_data = validated_data.pop("employees", [])
            departments_data = validated_data.pop("departments", [])
            owner_data = validated_data.pop("owner", {})

            institution = Institution.objects.create(
                institution_owner=owner_user, created_by=owner_user, **validated_data
            )

            created_branches = []
            for branch_data in branches_data:
                branch = Branch.objects.create(
                    institution=institution, created_by=owner_user, **branch_data
                )
                created_branches.append(branch)

            created_departments = self.create_departments(
                institution, departments_data, owner_user
            )

            return (
                institution,
                created_branches,
                created_departments,
                employees_data,
                owner_data,
            )

        except Exception as e:
            logger.error(f"Error creating institution and branches: {str(e)}")
            raise

    def create_employees(self, institution, branches, departments, employees_data):
        """Create employees for the institution."""
        created_employees = []

        branch_map = {branch.branch_location: branch for branch in branches}
        department_map = {dept.name: dept for dept in departments}

        for employee_data in employees_data:
            try:
                branch_location = employee_data.get("branch_location")
                branch = (
                    branch_map.get(branch_location)
                    if branch_location
                    else (branches[0] if branches else None)
                )

                if not branch:
                    continue

                department_name = employee_data.get("department")
                department = (
                    department_map.get(department_name) if department_name else None
                )

                employee_user = self.create_or_get_user(employee_data)
                if not employee_user:
                    continue

                employee = Employee.objects.create(
                    user=employee_user,
                    email=employee_data.get("email"),
                    phone_number=employee_data.get("phone_number"),
                    gender=employee_data.get("gender"),
                    date_of_birth=employee_data.get("date_of_birth"),
                    address=employee_data.get("address"),
                    payroll_branch=branch,
                    department=department,
                    date_of_joining=employee_data.get(
                        "date_of_joining", datetime.now().date()
                    ),
                )
                created_employees.append(employee)

            except Exception as e:
                logger.error(f"Error creating employee: {str(e)}")
                continue

        return created_employees

    def post(self, request):
        """Handle HR system activation."""

        api_key = request.headers.get("X-API-Key") or request.headers.get(
            "Authorization"
        )

        if not api_key:
            return Response(
                {"error": "API key is required in X-API-Key header"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if api_key.startswith("Bearer "):
            api_key = api_key[7:]

        system = self.get_system_from_api_key(api_key)
        if not system:
            return Response(
                {"error": "Invalid API key"}, status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = InstitutionActivationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Data does not conform to HR system requirements",
                    "details": serializer.errors,
                    "message": "Please ensure your data matches the HR system contract",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                validated_data = serializer.validated_data.copy()

                owner_data = validated_data.get("owner", {})
                owner_user = self.create_or_get_user(owner_data)

                if not owner_user:
                    return Response(
                        {"error": "Could not create owner user"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                owner_email = owner_data.get("email")

                institution, branches, departments, employees_data, owner_data = (
                    self.create_institution_and_branches(validated_data, owner_user)
                )

                institution.system = system
                institution.save()

                employees = self.create_employees(
                    institution, branches, departments, employees_data
                )

                owner_employee = None
                if owner_email:
                    for employee in employees:
                        if employee.email == owner_email:
                            owner_employee = employee
                            break

                response_data = {
                    "success": True,
                    "message": "HR system activated successfully",
                    "data": {
                        "institution": {
                            "id": institution.id,
                            "institution_name": institution.institution_name,
                            "location": institution.location,
                            "institution_email": institution.institution_email,
                        },
                        "owner": {
                            "id": owner_user.id,
                            "email": owner_user.email,
                            "fullname": owner_user.fullname,
                            "employee_created": owner_employee is not None,
                        },
                        "branches_created": len(branches),
                        "departments_created": len(departments),
                        "employees_created": len(employees),
                        "system_type": system.system_type.name,
                        "system_code": system.code,
                    },
                }

                send_activation_confirmation_email(
                    owner_fullname=owner_user.fullname,
                    owner_email=owner_user.email,
                    institution_name=institution.institution_name,
                    branches=branches,
                    departments=departments,
                    employees=employees,
                )

                return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error during system activation: {str(e)}")
            return Response(
                {"error": "Failed to activate HR system", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
