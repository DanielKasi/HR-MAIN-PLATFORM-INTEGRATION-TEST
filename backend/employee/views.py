from django.shortcuts import render

from institution.serializers import UserBranchSerializer
from institution.models import Branch, UserBranch
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .models import Employee, EmployeeAttendance, EmployeeType, WorkType
from .serializers import (
    EmployeeAttendanceSerializer,
    EmployeeSerializer,
    EmployeeTypeSerializer,
    WorkTypeSerializer,
    EmployeeContractSerializer,
)
from .models import (
    Employee,
    EmployeeAttendance,
    EmployeeType,
    WorkType,
    EmployeeContract,
)
from rest_framework.parsers import MultiPartParser, FormParser
from institution.utils import generate_compliant_password
from employee.service import EmployeeBranchService
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse
from drf_spectacular.utils import extend_schema, OpenApiParameter
import logging
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.renderers import JSONRenderer
from utilities.pagination import CustomPageNumberPagination
from django.http import FileResponse
from django.core.exceptions import ValidationError
from users.models import CustomUser
from django.utils import timezone



class EmployeeListAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=EmployeeSerializer,
        responses={200: EmployeeSerializer(many=True)},
        description="Retrieve a list of employees.",
        summary="List Employees",
        tags=["Employee Management"],
    )
    def get(self, request, institution_id):
        """
        Retrieve a list of employees for a specific institution.
        """
        try:
            employees = Employee.objects.filter(
                department__institution_id=institution_id
            ).order_by("-created_at")

            paginator = CustomPageNumberPagination()
            paginated_qs = paginator.paginate_queryset(employees, request)
            serializer = EmployeeSerializer(paginated_qs, many=True)
            return paginator.get_paginated_response(serializer.data)

        except Exception as e:
            return Response(
                {"detail": "Error retrieving employees."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmployeeDetailAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=EmployeeSerializer,
        responses={200: EmployeeSerializer, 404: "Employee not found"},
        description="Retrieve details of a specific employee.",
        summary="Employee Detail",
        tags=["Employee Management"],
    )
    def get(self, request, employee_id):
        """Retrieve details of a specific employee."""
        try:
            employee = Employee.objects.get(id=employee_id)
            serializer = EmployeeSerializer(employee)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND
            )


class EmployeeCreateAPIView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=EmployeeSerializer,
        responses={201: EmployeeSerializer(many=True), 400: "Bad Request"},
        summary="Create Employee(s)",
        description="Create a single employee with form data or multiple employees via CSV/Excel file upload.",
        tags=["Employee Management"],
    )
    def post(self, request):
        print(
            "\n\n\nReceived data:",
            request.data,
        )

        """Create a new employee or multiple employees via file upload."""
        # Check if a file is uploaded
        if "file" in request.FILES:
            return self.handle_bulk_upload(request)

        # Handle single employee creation (existing logic)
        def extract_value(data, key):
            """Extract single value from QueryDict list format"""
            value = data.get(key)
            return value[0] if isinstance(value, list) and value else value

        # Check required fields
        if not all(k in request.data for k in ["user.fullname", "user.email"]):
            return Response(
                {"detail": "Missing required user fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate password for new user
        random_password = generate_compliant_password()

        # Build user data
        user_data = {
            "fullname": extract_value(request.data, "user.fullname"),
            "email": extract_value(request.data, "user.email"),
            "password": random_password,
        }

        # Process all other fields
        final_data = {}
        for key, value in request.data.items():
            if key not in ["user.fullname", "user.email"]:
                final_data[key] = extract_value(request.data, key)

        final_data["selected_branches"] = request.data.getlist("selected_branches", [])

        # Add user data
        final_data["user"] = user_data

        # Convert data types
        if "is_active" in final_data:
            final_data["is_active"] = str(final_data["is_active"]).lower() == "true"

        for field in [
            "position",
            "department",
            "experience",
            "children_count",
            "institutionId",
        ]:
            if field in final_data:
                try:
                    final_data[field] = (
                        int(final_data[field]) if final_data[field] else 0
                    )
                except (ValueError, TypeError):
                    final_data[field] = 0

        # Create employee
        serializer = EmployeeSerializer(data=final_data, context={"request": request})
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        employee = serializer.save()

        # Setup password for new employee
        employee.user.is_password_verified = False
        employee.user.save()
        employee.setup_employee_password(request)

        return Response(
            EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED
        )

    def handle_bulk_upload(self, request):
        """Handle bulk employee creation from uploaded CSV/Excel file."""
        file = request.FILES["file"]
        file_extension = file.name.split(".")[-1].lower()

        if file_extension not in ["csv", "xlsx"]:
            return Response(
                {
                    "detail": "Invalid file format. Only CSV or Excel files are supported."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Read the file
            if file_extension == "csv":
                df = pd.read_csv(file)
            else:  # xlsx
                df = pd.read_excel(file)

            # Validate required columns
            required_columns = ["user.fullname", "user.email"]
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return Response(
                    {
                        "detail": f"Missing required columns: {', '.join(missing_columns)}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Process each row
            employees = []
            errors = []
            with transaction.atomic():  # Ensure all-or-nothing creation
                for index, row in df.iterrows():
                    employee_data = {}
                    user_data = {
                        "fullname": str(row["user.fullname"]).strip(),
                        "email": str(row["user.email"]).strip(),
                        "password": generate_compliant_password(),
                    }
                    employee_data["user"] = user_data

                    # Map other fields
                    for column in df.columns:
                        if column not in ["user.fullname", "user.email"]:
                            value = row[column]
                            if pd.isna(value):
                                employee_data[column] = None
                            else:
                                employee_data[column] = str(value).strip()

                    # Convert data types
                    if "is_active" in employee_data:
                        employee_data["is_active"] = (
                            str(employee_data["is_active"]).lower() == "true"
                        )

                    for field in [
                        "position",
                        "department",
                        "experience",
                        "children_count",
                        "institutionId",
                    ]:
                        if field in employee_data and employee_data[field]:
                            try:
                                employee_data[field] = int(float(employee_data[field]))
                            except (ValueError, TypeError):
                                employee_data[field] = 0

                    # Validate and create employee
                    serializer = EmployeeSerializer(data=employee_data)
                    if serializer.is_valid():
                        employee = serializer.save()
                        employee.user.is_password_verified = False
                        employee.user.save()
                        employee.setup_employee_password(request)
                        employees.append(employee)
                    else:
                        errors.append(
                            {
                                "row": index
                                + 2,  # +2 to account for header row and 1-based indexing
                                "errors": serializer.errors,
                            }
                        )

            if errors:
                return Response(
                    {"detail": "Some employees could not be created", "errors": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                EmployeeSerializer(employees, many=True).data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"detail": f"Error processing file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class EmployeeTemplateDownloadAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: None},
        summary="Download Employee CSV Template",
        description="Download a CSV template for bulk employee creation.",
        tags=["Employee Management"],
    )
    def get(self, request):
        """Generate and return a CSV template for bulk employee upload."""
        # Define template columns based on Employee model
        columns = [
            "user.fullname",
            "user.email",
            "phone_number",
            "position",
            "gender",
            "department",
            "payroll_branch",
            "date_of_birth",
            "work_type",
            "employee_type",
            "date_of_joining",
            "address",
            "country",
            "nin",
            "bank",
            "bank_account_number",
            "is_active",
            "experience",
            "qualifications",
            "skills",
            "emergency_contact_name",
            "emergency_contact_phone",
            "emergency_contact_relationship",
            "marital_status",
            "children_count",
            "salary",
        ]
        df = pd.DataFrame(columns=columns)

        # Create CSV in memory
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)

        # Return CSV as downloadable file
        response = HttpResponse(
            content_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="employee_template.csv"'
            },
        )
        response.write(output.getvalue())
        return response


class EmployeeUpdateAPIView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=EmployeeSerializer,
        responses={200: EmployeeSerializer, 400: "Bad Request", 404: "Not Found"},
        description="Update an existing employee.",
        summary="Update Employee",
        tags=["Employee Management"],
    )
    def patch(self, request, employee_id):
        """Update an existing employee."""
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND
            )

        def extract_value(data, key):
            """Extract single value from QueryDict list format"""
            value = data.get(key)
            return value[0] if isinstance(value, list) and value else value

        # Extract user data and build final data dict
        user_data = {}
        final_data = {}

        if "user.fullname" in request.data:
            user_data["fullname"] = extract_value(request.data, "user.fullname")

        if "user.email" in request.data:
            user_data["email"] = extract_value(request.data, "user.email")

        # Process all other fields except user data
        for key, value in request.data.items():
            if key not in ["user.fullname", "user.email"]:
                final_data[key] = extract_value(request.data, key)

        # Convert data types
        if "is_active" in final_data:
            final_data["is_active"] = str(final_data["is_active"]).lower() == "true"

        for field in ["position", "department", "experience", "children_count"]:
            if field in final_data:
                try:
                    final_data[field] = (
                        int(final_data[field]) if final_data[field] else 0
                    )
                except (ValueError, TypeError):
                    final_data[field] = 0

        # Update employee data
        serializer = EmployeeSerializer(employee, data=final_data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        employee = serializer.save()

        # Handle user updates separately
        if user_data and employee.user:
            user_updated = False

            if "fullname" in user_data:
                employee.user.fullname = user_data["fullname"]
                user_updated = True

            if "email" in user_data and user_data["email"] != employee.user.email:
                from django.contrib.auth import get_user_model

                User = get_user_model()
                if (
                    User.objects.filter(email=user_data["email"])
                    .exclude(id=employee.user.id)
                    .exists()
                ):
                    return Response(
                        {"detail": "Email already exists for another user."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                employee.user.email = user_data["email"]
                employee.user.username = user_data["email"]
                user_updated = True

            if user_updated:
                random_password = generate_compliant_password()
                employee.user.set_password(random_password)
                employee.user.is_password_verified = False
                employee.user.save()
                employee.setup_employee_password(request)

        return Response(EmployeeSerializer(employee).data, status=status.HTTP_200_OK)


class EmployeeDeleteAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses={204: "No Content", 404: "Not Found"},
        description="Delete an existing employee.",
        summary="Delete Employee",
        tags=["Employee Management"],
    )
    def delete(self, request, institution_id, employee_id):
        """Delete an existing employee."""
        try:
            employee = Employee.objects.get(
                id=employee_id, department__institution_id=institution_id
            )
            employee.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND
            )


logger = logging.getLogger(__name__)


@extend_schema(tags=["Employee branch"])
class EmployeeBranchManagementAPIView(APIView):
    """Simple view for managing employee-branch relationships"""

    parser_classes = [JSONParser]

    @extend_schema(
        tags=["Employee branch"],
        request=UserBranchSerializer,
        responses={
            200: UserBranchSerializer(many=True),
        },
        summary="Attach Employee to Branches",
        description="Attaches an employee to one or more branches. One branch must be marked as default.",
    )
    def post(self, request):

        try:
            # Get data from request
            employee_id = request.data.get("employee_id")
            branches_data = request.data.get("branches", [])

            # Basic validation
            if not employee_id:
                return Response(
                    {"error": "employee_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not branches_data:
                return Response(
                    {"error": "branches list cannot be empty"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get employee
            try:
                employee = Employee.objects.get(id=employee_id)
            except Employee.DoesNotExist:
                return Response(
                    {"error": f"Employee with id {employee_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check if employee has a user
            if not employee.user:
                return Response(
                    {"error": "Employee must have a user account"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Process branches
            processed_branches = []
            for branch_data in branches_data:
                branch_id = branch_data.get("branch_id")
                if not branch_id:
                    return Response(
                        {"error": f"branch_id is required for branch at index {i}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                try:
                    branch = Branch.objects.get(id=branch_id)
                    processed_branches.append(
                        {
                            "branch": branch,
                            "is_default": branch_data.get("is_default", False),
                        }
                    )
                except Branch.DoesNotExist:
                    return Response(
                        {"error": f"Branch with id {branch_id} not found"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Attach branches
            result = self._attach_branches(employee, processed_branches, request.user)

            return Response(
                {
                    "message": "Employee attached to branches successfully",
                    "data": result,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            import traceback

            traceback.print_exc()
            import traceback

            traceback.print_exc()
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _attach_branches(self, employee, branches_data, created_by):
        """Attach employee to branches"""

        # Validate default branches
        default_count = sum(1 for bd in branches_data if bd.get("is_default", False))
        if default_count > 1:
            raise ValueError("Only one branch can be set as default")

        # If no default specified, make first one default
        if default_count == 0 and branches_data:
            branches_data[0]["is_default"] = True

        user_branches = []

        with transaction.atomic():
            # Clear existing defaults if setting new default
            if any(bd.get("is_default", False) for bd in branches_data):
                UserBranch.objects.filter(user=employee.user, is_default=True).update(
                    is_default=False
                )

            # Create/update UserBranch records
            for branch_data in branches_data:
                user_branch, created = UserBranch.objects.get_or_create(
                    user=employee.user,
                    branch=branch_data["branch"],
                    defaults={
                        "is_default": branch_data.get("is_default", False),
                        "created_by": created_by,
                    },
                )

                if not created and branch_data.get("is_default", False):
                    user_branch.is_default = True
                    user_branch.save()

                user_branches.append(user_branch)

            # Update employee payroll branch
            default_branch = next(
                (bd["branch"] for bd in branches_data if bd.get("is_default")), None
            )
            if default_branch:
                employee.payroll_branch = default_branch
                employee.save(update_fields=["payroll_branch"])

        # Return summary
        return self._get_branch_summary(employee)

    def _get_branch_summary(self, employee):
        """Get employee branch summary"""
        if not employee.user:
            return {"branches": [], "default_branch": None, "payroll_branch": None}

        user_branches = (
            UserBranch.objects.filter(user=employee.user)
            .select_related("branch")
            .order_by("-is_default", "branch__branch_name")
        )

        branches = []
        default_branch = None

        for i, ub in enumerate(user_branches):

            branch_info = {
                "id": ub.branch.id,
                "name": ub.branch.branch_name,
                "location": getattr(ub.branch, "branch_location", ""),
                "is_default": ub.is_default,
                "attached_date": ub.created_at.isoformat() if ub.created_at else None,
            }
            branches.append(branch_info)

            if ub.is_default:
                default_branch = branch_info

        payroll_branch = None
        if employee.payroll_branch:
            payroll_branch = {
                "id": employee.payroll_branch.id,
                "name": employee.payroll_branch.branch_name,
                "location": getattr(employee.payroll_branch, "branch_location", ""),
            }

        return {
            "branches": branches,
            "default_branch": default_branch,
            "payroll_branch": payroll_branch,
        }

    @extend_schema(
        tags=["Employee branch"],
        responses={
            200: OpenApiResponse(description="User branches retrieved successfully"),
            500: OpenApiResponse(description="Unexpected error"),
        },
        summary="List all Employee-Branch Relationships",
        description="Retrieves a list of all employee-branch relationships in the system.",
    )
    def get(self, request):
        """Get all employee-branch relationships"""
        try:
            user_branches = UserBranch.objects.all().select_related("user", "branch")

            data = []
            for ub in user_branches:
                data.append(
                    {
                        "id": ub.id,
                        "user_id": ub.user.id if ub.user else None,
                        "user_email": ub.user.email if ub.user else None,
                        "branch_id": ub.branch.id,
                        "branch_name": ub.branch.branch_name,
                        "is_default": ub.is_default,
                        "created_at": (
                            ub.created_at.isoformat() if ub.created_at else None
                        ),
                    }
                )

            return Response(
                {"message": "User branches retrieved successfully", "data": data},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(tags=["Employee branch"])
class EmployeeBranchDetailAPIView(APIView):
    """Manage individual employee-branch relationships"""

    parser_classes = [JSONParser]

    @extend_schema(
        tags=["Employee branch"],
        responses={
            200: UserBranchSerializer,
            404: OpenApiResponse(description="Employee not found"),
            500: OpenApiResponse(description="Unexpected error"),
        },
        summary="Get employee's branches",
        description="Returns all branches assigned to an employee, including the default and payroll branches.",
    )
    def get(self, request, employee_id):
        """Get branches for specific employee"""
        try:
            employee = get_object_or_404(Employee, id=employee_id)

            if not employee.user:
                return Response(
                    {
                        "message": "Employee branches retrieved successfully",
                        "data": {
                            "branches": [],
                            "default_branch": None,
                            "payroll_branch": None,
                        },
                    },
                    status=status.HTTP_200_OK,
                )

            user_branches = (
                UserBranch.objects.filter(user=employee.user)
                .select_related("branch")
                .order_by("-is_default", "branch__branch_name")
            )

            branches = []
            default_branch = None

            for ub in user_branches:
                branch_info = {
                    "id": ub.branch.id,
                    "name": ub.branch.branch_name,
                    "location": getattr(ub.branch, "branch_location", ""),
                    "is_default": ub.is_default,
                    "attached_date": (
                        ub.created_at.isoformat() if ub.created_at else None
                    ),
                }
                branches.append(branch_info)

                if ub.is_default:
                    default_branch = branch_info

            payroll_branch = None
            if employee.payroll_branch:
                payroll_branch = {
                    "id": employee.payroll_branch.id,
                    "name": employee.payroll_branch.branch_name,
                    "location": getattr(employee.payroll_branch, "branch_location", ""),
                }

            return Response(
                {
                    "message": "Employee branches retrieved successfully",
                    "data": {
                        "branches": branches,
                        "default_branch": default_branch,
                        "payroll_branch": payroll_branch,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @extend_schema(
        tags=["Employee branch"],
        request=UserBranchSerializer,
        responses={
            200: OpenApiResponse(description="Default branch updated successfully"),
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(description="Employee or branch not found"),
            500: OpenApiResponse(description="Unexpected error"),
        },
        summary="Set default branch for employee",
        description="Sets the default and payroll branch for a specific employee, provided they are already attached to it.",
    )
    def patch(self, request, employee_id):
        try:
            employee = get_object_or_404(Employee, id=employee_id)
            branch_id = request.data.get("branch_id")

            if not branch_id:
                return Response(
                    {"error": "branch_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            branch = get_object_or_404(Branch, id=branch_id)

            # Check if employee is attached to this branch
            user_branch = UserBranch.objects.filter(
                user=employee.user, branch=branch
            ).first()

            if not user_branch:
                return Response(
                    {"error": "Employee is not attached to this branch"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                # Clear existing default branches
                UserBranch.objects.filter(user=employee.user, is_default=True).update(
                    is_default=False
                )

                # Set new default branch
                user_branch.is_default = True
                user_branch.save()

                # Update employee payroll branch
                employee.payroll_branch = branch
                employee.save(update_fields=["payroll_branch"])

            # Get updated summary
            summary = self._get_branch_summary(employee)

            return Response(
                {"message": "Default branch updated successfully", "data": summary},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_branch_summary(self, employee):
        """Get employee branch summary"""
        if not employee.user:
            return {"branches": [], "default_branch": None, "payroll_branch": None}

        user_branches = (
            UserBranch.objects.filter(user=employee.user)
            .select_related("branch")
            .order_by("-is_default", "branch__branch_name")
        )

        branches = []
        default_branch = None

        for ub in user_branches:
            branch_info = {
                "id": ub.branch.id,
                "name": ub.branch.branch_name,
                "location": getattr(ub.branch, "branch_location", ""),
                "is_default": ub.is_default,
                "attached_date": ub.created_at.isoformat() if ub.created_at else None,
            }
            branches.append(branch_info)

            if ub.is_default:
                default_branch = branch_info

        payroll_branch = None
        if employee.payroll_branch:
            payroll_branch = {
                "id": employee.payroll_branch.id,
                "name": employee.payroll_branch.branch_name,
                "location": getattr(employee.payroll_branch, "branch_location", ""),
            }

        return {
            "branches": branches,
            "default_branch": default_branch,
            "payroll_branch": payroll_branch,
        }


@extend_schema(tags=["Employee Attendance"])
class EmployeeAttendanceListCreateAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses=EmployeeAttendanceSerializer(many=True),
        description="Retrieve all attendance records or for a specific employee if employee_id is provided.",
    )
    def get(self, request, employee_id=None):
        date = request.query_params.get("date")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        records = EmployeeAttendance.objects.all()

        # Filter by employee if employee_id is provided
        if employee_id is not None:
            records = records.filter(employee_id=employee_id)

        # Filter by specific date
        if date:
            records = records.filter(date=date)

        # Filter by date range
        if start_date:
            records = records.filter(date__gte=start_date)
        if end_date:
            records = records.filter(date__lte=end_date)

        records = records.order_by("date")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(records, request)
        serializer = EmployeeAttendanceSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=EmployeeAttendanceSerializer,
        responses=EmployeeAttendanceSerializer,
        description="Create a new attendance record",
    )
    def post(self, request, employee_id=None):
        data = request.data.copy()

        employee = data.get("employee")
        date = data.get("date")

        from datetime import date as dt_date

        if not date:
            date = str(dt_date.today())
            data["date"] = date

        existing = EmployeeAttendance.objects.filter(
            employee=employee, date=date
        ).first()

        if existing:
            serializer = EmployeeAttendanceSerializer(existing, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer = EmployeeAttendanceSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Employee Attendance"])
class EmployeeAttendanceDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        return get_object_or_404(EmployeeAttendance, pk=pk)

    @extend_schema(
        responses=EmployeeAttendanceSerializer,
        description="Retrieve an attendance record by ID",
    )
    def get(self, request, pk):
        record = self.get_object(pk)
        serializer = EmployeeAttendanceSerializer(record)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeAttendanceSerializer,
        responses=EmployeeAttendanceSerializer,
        description="Update an attendance record by ID",
    )
    def patch(self, request, pk):
        record = self.get_object(pk)
        serializer = EmployeeAttendanceSerializer(
            record, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete an attendance record by ID", responses={204: None}
    )
    def delete(self, request, pk):
        record = self.get_object(pk)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Employee Type"])
class EmployeeTypeListCreateAPIView(APIView):
    @extend_schema(
        responses=EmployeeTypeSerializer(many=True),
        description="Get list of all employee types",
    )
    def get(self, request):
        data = EmployeeType.objects.all().order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(data, request)
        serializer = EmployeeTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=EmployeeTypeSerializer,
        responses=EmployeeTypeSerializer,
        description="Create a new employee type",
    )
    def post(self, request):
        serializer = EmployeeTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Employee Type"])
class EmployeeTypeDetailAPIView(APIView):
    def get_object(self, pk):
        return get_object_or_404(EmployeeType, pk=pk)

    @extend_schema(
        responses=EmployeeTypeSerializer, description="Get an employee type by ID"
    )
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = EmployeeTypeSerializer(obj)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeTypeSerializer,
        responses=EmployeeTypeSerializer,
        description="Update an employee type",
    )
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = EmployeeTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete an employee type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Work Type"])
class WorkTypeListCreateAPIView(APIView):
    @extend_schema(
        responses=WorkTypeSerializer(many=True),
        description="Get list of all work types",
    )
    def get(self, request):
        data = WorkType.objects.all().order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(data, request)
        serializer = WorkTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=WorkTypeSerializer,
        responses=WorkTypeSerializer,
        description="Create a new work type",
    )
    def post(self, request):
        serializer = WorkTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Work Type"])
class WorkTypeDetailAPIView(APIView):
    def get_object(self, pk):
        return get_object_or_404(WorkType, pk=pk)

    @extend_schema(responses=WorkTypeSerializer, description="Get a work type by ID")
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = WorkTypeSerializer(obj)
        return Response(serializer.data)

    @extend_schema(
        request=WorkTypeSerializer,
        responses=WorkTypeSerializer,
        description="Update a work type",
    )
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = WorkTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete a work type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Employee Type"])
class EmployeeTypeListCreateAPIView(APIView):
    @extend_schema(
        responses=EmployeeTypeSerializer(many=True),
        description="Get list of all employee types",
    )
    def get(self, request):
        data = EmployeeType.objects.all().order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(data, request)
        serializer = EmployeeTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=EmployeeTypeSerializer,
        responses=EmployeeTypeSerializer,
        description="Create a new employee type",
    )
    def post(self, request):
        serializer = EmployeeTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Employee Type"])
class EmployeeTypeDetailAPIView(APIView):
    def get_object(self, pk):
        return get_object_or_404(EmployeeType, pk=pk)

    @extend_schema(
        responses=EmployeeTypeSerializer, description="Get an employee type by ID"
    )
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = EmployeeTypeSerializer(obj)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeTypeSerializer,
        responses=EmployeeTypeSerializer,
        description="Update an employee type",
    )
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = EmployeeTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete an employee type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Work Type"])
class WorkTypeListCreateAPIView(APIView):
    @extend_schema(
        responses=WorkTypeSerializer(many=True),
        description="Get list of all work types",
    )
    def get(self, request):
        data = WorkType.objects.all().order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(data, request)
        serializer = WorkTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=WorkTypeSerializer,
        responses=WorkTypeSerializer,
        description="Create a new work type",
    )
    def post(self, request):
        serializer = WorkTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Work Type"])
class WorkTypeDetailAPIView(APIView):
    def get_object(self, pk):
        return get_object_or_404(WorkType, pk=pk)

    @extend_schema(responses=WorkTypeSerializer, description="Get a work type by ID")
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = WorkTypeSerializer(obj)
        return Response(serializer.data)

    @extend_schema(
        request=WorkTypeSerializer,
        responses=WorkTypeSerializer,
        description="Update a work type",
    )
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = WorkTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete a work type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeContractListAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses=EmployeeContractSerializer(many=True),
        description="Get list of all employee contracts",
        tags=["Employee Contract"],
    )
    def get(self, request):
        contracts = EmployeeContract.objects.all().order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(contracts, request)
        serializer = EmployeeContractSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=EmployeeContractSerializer,
        responses=EmployeeContractSerializer,
        description="Create a new employee contract",
        tags=["Employee Contract"],
    )
    def post(self, request):
        serializer = EmployeeContractSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeContractDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, pk):
        return get_object_or_404(EmployeeContract, pk=pk)

    @extend_schema(
        responses=EmployeeContractSerializer,
        description="Get an employee contract by ID",
        tags=["Employee Contract"],
    )
    def get(self, request, pk):
        contract = self.get_object(pk)
        serializer = EmployeeContractSerializer(contract)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeContractSerializer,
        responses=EmployeeContractSerializer,
        description="Update an employee contract",
        tags=["Employee Contract"],
    )
    def patch(self, request, pk):
        contract = self.get_object(pk)
        serializer = EmployeeContractSerializer(
            contract, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete an employee contract",
        responses={204: None},
        tags=["Employee Contract"],
    )
    def delete(self, request, pk):
        contract = self.get_object(pk)
        contract.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeContractApprovalAPIView(APIView):

    @extend_schema(
        responses=EmployeeContractSerializer,
        description="Approve an employee contract by setting it to active and then converting applicant to employee if applicable",
        tags=["Employee Contract"],
    )
    def post(self, request, pk):
        contract = get_object_or_404(EmployeeContract, pk=pk)
        
        # Check if contract is already active
        if contract.is_active:
            return Response(
                {"error": "Contract is already active"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set contract to active first
        contract.is_active = True
        contract.save()

        # If contract has an applicant and no employee, create Employee instance
        if contract.applicant and not contract.employee:
            try:
                # Check if employee already created for this application
                if hasattr(contract.applicant, "created_employee"):
                    return Response(
                        {"error": "Employee already created for this application"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Create CustomUser if it doesn't exist
                user, created = CustomUser.objects.get_or_create(
                    email=contract.applicant.applicant_email,
                    defaults={
                        'fullname': contract.applicant.applicant_name,
                        'is_active': True,
                    }
                )

                # Create Employee instance
                employee_data = {
                    'user': user,
                    'email': contract.applicant.applicant_email,
                    'phone_number': contract.applicant.applicant_phone,
                    'position': contract.applicant.job_position_advert.job_position,
                    'address': contract.applicant.address,
                    'gender': contract.applicant.gender,
                    'date_of_joining': timezone.now().date(),
                    'is_active': True,
                    'department': contract.applicant.job_position_advert.job_position.department,
                    'salary': contract.applicant.job_position_advert.job_position.salary,
                }

                employee = Employee(**employee_data)
                employee.employee_id = employee.generate_employee_id()
                
                # Validate and save employee
                employee.full_clean()  # Run model validation
                employee.save()
                
                # Update contract to reference employee instead of applicant
                contract.employee = employee
                contract.applicant = None
                contract.save()

            except ValidationError as e:
                return Response(
                    {"error": f"Failed to create employee: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                return Response(
                    {"error": f"Unexpected error creating employee: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = EmployeeContractSerializer(contract)
        return Response(serializer.data, status=status.HTTP_200_OK)