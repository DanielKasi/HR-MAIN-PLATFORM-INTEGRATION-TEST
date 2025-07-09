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
    create_and_institution_otp,
    send_password_link_to_user,
    create_and_institution_token,
    send_activation_confirmation_email,
)
from users.models import Profile, System

from .models import Department, Institution, Branch, UserBranch
from users.serializers import ProfileSerializer
from .serializers import (
    DepartmentSerializer,
    ErrorResponseSerializer,
    InstitutionActivationSerializer,
    InstitutionSerializer,
    BranchSerializer,
    SuccessResponseSerializer,
    UserBranchSerializer,
)
from django.shortcuts import get_object_or_404
from .utils import generate_compliant_password
from utilities.pagination import CustomPageNumberPagination
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.db.models import Q
from django.contrib.auth import get_user_model
import logging
from django.db import transaction

User = get_user_model()
logger = logging.getLogger(__name__)


class InstitutionListAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=InstitutionSerializer,
        responses={201: InstitutionSerializer},
        description="Create a new institution with name, address, and owner.",
        summary="Create a new institution",
        tags=["Institution Management"],
    )
    def post(self, request):
        if Institution.objects.filter(
            institution_owner__id=request.data.get("institution_owner_id"),
            institution_name=request.data.get("institution_name"),
        ).exists():
            return Response(
                {"detail": "User Already has an Institution with the same name."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = InstitutionSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            institution = serializer.save()
            return Response(
                InstitutionSerializer(institution).data,
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
        serializer = InstitutionSerializer(institutions, many=True)
        return Response(serializer.data)


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

        serializer = BranchSerializer(branches, many=True)
        return Response(serializer.data)


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

        serializer = BranchSerializer(branches, many=True)
        return Response(serializer.data)


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
                print("User is not staff or institution owner")
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
        user_branches = UserBranch.objects.all()
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
        departments = Department.objects.filter(institution_id=institution_id)
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)


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
        user_branch.delete()
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
    For activating hr system from the external systems.
    """

    def get_system_from_api_key(self, api_key):
        """ "
        Validate API key and return the system
        """
        try:
            return System.objects.get(api_key=api_key, system_type__is_active=True)
        except System.DoesNotExist:
            return None

    def create_or_get_user(self, employee_data):
        """Create or get user for employee"""
        email = employee_data.get("email")
        full_name = employee_data.get("full_name")
        phone_number = employee_data.get("phone_number")

        if email:
            user, created = User.objects.get_or_create(
                email=email, defaults={"fullname": full_name, "is_active": True}
            )
            return user
        return None

    def create_departments(self, institution, departments_data, owner_user):
        """Create departments for the institution"""
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
        """Create institution and its branches"""
        try:
            # Extract nested data before creating institution
            branches_data = validated_data.pop("branches", [])
            employees_data = validated_data.pop("employees", [])
            departments_data = validated_data.pop("departments", [])
            owner_data = validated_data.pop("owner", {})

            # Create institution
            institution = Institution.objects.create(
                institution_owner=owner_user, created_by=owner_user, **validated_data
            )

            # Create branches
            created_branches = []
            for branch_data in branches_data:
                branch = Branch.objects.create(
                    institution=institution, created_by=owner_user, **branch_data
                )
                created_branches.append(branch)

            # Create departments
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
        """Create employees for the institution"""
        created_employees = []

        # Create a mapping of branch locations to branch objects
        branch_map = {branch.branch_location: branch for branch in branches}

        # Create a mapping of department names to department objects
        department_map = {dept.name: dept for dept in departments}

        for employee_data in employees_data:
            try:
                # Get the branch for this employee (use first branch if not specified)
                branch_location = employee_data.get("branch_location")
                branch = (
                    branch_map.get(branch_location)
                    if branch_location
                    else (branches[0] if branches else None)
                )

                if not branch:
                    logger.warning(
                        f"No branch available for employee: {employee_data.get('email')}"
                    )
                    continue

                # Get department if specified
                department_name = employee_data.get("department")
                department = (
                    department_map.get(department_name) if department_name else None
                )

                # Create or get user for employee
                employee_user = self.create_or_get_user(employee_data)

                if not employee_user:
                    logger.warning(
                        f"Could not create user for employee: {employee_data}"
                    )
                    continue

                # Create employee
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

    def create_owner_employee(self, owner_user, institution, branches, departments):
        """Create employee record for the owner"""
        try:
            # Use the first branch for the owner
            branch = branches[0] if branches else None

            # Create employee record for owner
            owner_employee = Employee.objects.create(
                user=owner_user,
                email=owner_user.email,
                phone_number=getattr(owner_user, "phone_number", None),
                payroll_branch=branch,
                department=departments[0] if departments else None,
                date_of_joining=datetime.now().date(),
            )

            return owner_employee

        except Exception as e:
            logger.error(f"Error creating owner employee: {str(e)}")
            return None

    def post(self, request):
        """Handle HR system activation"""

        print("\n\n\n\ Hit system activation endpoint ...\n\n\n ")
        # Get API key from header
        api_key = request.headers.get("X-API-Key") or request.headers.get(
            "Authorization"
        )

        if not api_key:
            return Response(
                {"error": "API key is required in X-API-Key header"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Clean API key (remove Bearer prefix if present)
        if api_key.startswith("Bearer "):
            api_key = api_key[7:]

        # Validate system
        system = self.get_system_from_api_key(api_key)
        if not system:
            return Response(
                {"error": "Invalid API key"}, status=status.HTTP_401_UNAUTHORIZED
            )

        # Validate request data - strict validation
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

                # Create or get owner user
                owner_data = validated_data.get("owner", {})
                owner_user = self.create_or_get_user(owner_data)

                if not owner_user:
                    return Response(
                        {"error": "Owner data is required and must include email"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Create institution, branches, departments, and get employees data
                institution, branches, departments, employees_data, owner_data = (
                    self.create_institution_and_branches(validated_data, owner_user)
                )

                # Set the system for the institution
                institution.system = system
                institution.save()

                all_employees = []

                # Create owner employee record
                owner_employee = self.create_owner_employee(
                    owner_user, institution, branches, departments
                )

                # Create employees
                employees = self.create_employees(
                    institution, branches, departments, employees_data
                )

                if employees or owner_employee:
                    if employees:
                        all_employees.extend(employees)
                    if owner_employee:
                        all_employees.append(owner_employee)

                # Prepare response
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

                # Sending email to the owner confirming the activation
                send_activation_confirmation_email(
                    owner_fullname=owner_user.fullname,
                    owner_email=owner_user.email,
                    institution_name=institution.institution_name,
                    branches=branches,
                    departments=departments,
                    employees=all_employees,
                )

                return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error during system activation: {str(e)}")
            return Response(
                {"error": "Failed to activate HR system", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
