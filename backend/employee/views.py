from django.shortcuts import render

from institution.serializers import UserBranchSerializer
from institution.models import Branch, UserBranch, Department
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from .models import (
    Employee,
    EmployeeAttendance,
    EmployeeType,
    WorkType,
    EmployeeWorkingDays,
    EmployeeContract,
    EmployeeShift,
)
from .serializers import (
    EmployeeAttendanceSerializer,
    EmployeeSerializer,
    EmployeeTypeSerializer,
    WorkTypeSerializer,
    EmployeeContractSerializer,
    EmployeeWorkingDaysSerializer,
    AttendanceReportSerializer,
    AttendanceQueryParamsSerializer,
    EmployeeShiftSerializer,
)
from rest_framework.parsers import MultiPartParser, FormParser
from institution.utils import generate_compliant_password
from employee.service import EmployeeBranchService
from drf_spectacular.utils import (
    extend_schema,
    OpenApiExample,
    OpenApiResponse,
    OpenApiTypes,
)
from drf_spectacular.utils import extend_schema, OpenApiParameter
import logging
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.renderers import JSONRenderer
from utilities.pagination import CustomPageNumberPagination
from django.http import FileResponse
from django.core.exceptions import ValidationError
from users.models import CustomUser, Profile, UserRole
from django.utils import timezone
from datetime import datetime
from django.contrib.auth.hashers import make_password
import re
import pandas as pd
import io
from openpyxl import Workbook
from recruitment.models import JobPosition
from django.http import HttpResponse
from openpyxl.styles import Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from decimal import Decimal, InvalidOperation
from django.contrib.auth import get_user_model
from django.http import FileResponse
from payroll.utils import generate_attendance_excel
from django.utils.encoding import escape_uri_path
from datetime import datetime, date
from django.utils.dateparse import parse_date
from .service import build_attendance_report_data
from institution.models import Institution
from utilities.helpers import get_or_create_default_role_with_permissions, custom_parse_date
from django.db.models import Q
from datetime import datetime, date
from institution.models import Institution
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers
from utilities.employee_analytics import (
    get_employee_demographics_analytics,
    get_employee_attendance_analytics,
    get_employee_salary_analytics,
)

from .tasks import send_employee_welcome_email
import string
import secrets

def generate_compliant_password(length=12):
    """Generate a password that meets Django's validation requirements"""
    # Define character sets (excluding problematic special characters)
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    # Use a safer subset of special characters to avoid validation issues
    special = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Ensure we have at least one character from each required set
    password_chars = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    
    # Fill the rest of the password length
    all_characters = lowercase + uppercase + digits + special
    for _ in range(length - 4):
        password_chars.append(secrets.choice(all_characters))
    
    # Shuffle to avoid predictable patterns
    secrets.SystemRandom().shuffle(password_chars)
    return "".join(password_chars)

class EmployeeListAPIView(APIView):

    @extend_schema(
        request=None,
        responses={200: EmployeeSerializer(many=True)},
        description="Retrieve a list of employees.",
        summary="List Employees",
        tags=["Employee Management"],
    )
    def get(self, request, institution_id):
        """
        Retrieve a list of employees for a specific institution,
        with optional filtering via query parameters.
        """
        search_query = request.query_params.get("search", None)
        try:
            employees = Employee.objects.filter(
                department__institution_id=institution_id, deleted_at__isnull=True
            )

            query_params = request.query_params.dict()
            model_fields = {field.name for field in Employee._meta.get_fields()}

            filters = {
                k: v
                for k, v in query_params.items()
                if k.split("__")[0] in model_fields
            }

            if filters:
                employees = employees.filter(**filters)

            employees = employees.order_by("-created_at")
            if search_query:
                employees = employees.filter(
                    Q(employee_id__icontains=search_query)
                    | Q(user__fullname__icontains=search_query)
                    | Q(work_type__name__icontains=search_query)
                    | Q(employee_type__name__icontains=search_query)
                    | Q(position__name__icontains=search_query)
                    | Q(user__email__icontains=search_query)
                    | Q(department__name__icontains=search_query)
                )

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
    permission_classes = [IsAuthenticated]

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


class EmployeeWorkingDaysDetailAPIView(APIView):
    @extend_schema(
        responses={200: EmployeeWorkingDaysSerializer, 404: "Employee not found"},
        description="Retrieve details of a specific employee working days.",
        tags=["Employee Management"],
    )
    def get(self, request, employee_id):
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND
            )

        working_days = EmployeeWorkingDays.objects.get(employee=employee)

        return Response(EmployeeWorkingDaysSerializer(working_days).data)


    @extend_schema(
        request=EmployeeWorkingDaysSerializer,
        responses={200: EmployeeWorkingDaysSerializer, 404: "Employee not found"},
        description="Retrieve or update working days for a specific employee.",
        summary="Employee Working Days Detail",
        tags=["Employee Management"],
    )
    def patch(self, request, employee_id):
        """Retrieve or update working days for a specific employee."""
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND
            )

        working_days_instance, _ = EmployeeWorkingDays.objects.get_or_create(
            employee=employee
        )

        serializer = EmployeeWorkingDaysSerializer(
            instance=working_days_instance, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=EmployeeSerializer,
        responses={201: EmployeeSerializer(many=True), 400: "Bad Request"},
        summary="Create Employee(s)",
        description="Create a single employee with form data or multiple employees via CSV/Excel file upload.",
        tags=["Employee Management"],
    )
    def post(self, request):
        """Create a new employee or multiple employees via file upload."""
        if "file" in request.FILES:
            return self.handle_bulk_upload(request)

        def extract_value(data, key):
            """Extract single value from QueryDict list format"""
            value = data.get(key)
            return value[0] if isinstance(value, list) and value else value

        if not all(k in request.data for k in ["user.fullname", "user.email"]):
            return Response(
                {"detail": "Missing required user fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        random_password = generate_compliant_password()
        user_data = {
            "fullname": extract_value(request.data, "user.fullname"),
            "email": extract_value(request.data, "user.email"),
            "password": random_password,
        }

        final_data = {}
        for key, value in request.data.items():
            if key not in ["user.fullname", "user.email"]:
                final_data[key] = extract_value(request.data, key)

        final_data["selected_branches"] = request.data.getlist("selected_branches", [])
        final_data["user"] = user_data

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

        serializer = EmployeeSerializer(data=final_data, context={"request": request})
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        employee = serializer.save()
        employee.user.is_password_verified = True
        employee.user.is_email_verified = True
        employee.user.save()

        # Send welcome email asynchronously using Celery
        send_employee_welcome_email.delay_on_commit(
            employee.user.email, employee.user.fullname, random_password
        )

        return Response(
            EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED
        )

    def handle_bulk_upload(self, request):
        """Handle bulk employee creation from uploaded CSV/Excel file."""
        start_time = datetime.now()
        print(f"Starting bulk upload at {start_time}")

        # Fetch institution and default role once (mirroring single creation)
        institution = getattr(request.user.profile, "institution", None)
        if not institution:
            return Response(
                {
                    "detail": "No institution associated with the requesting user.",
                    "created_count": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = get_or_create_default_role_with_permissions(institution)

        file = request.FILES["file"]
        file_extension = file.name.split(".")[-1].lower()

        if file_extension not in ["csv", "xlsx"]:
            return Response(
                {
                    "detail": "Invalid file format. Only CSV or Excel files are supported.",
                    "created_count": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dtype_dict = {
                "phone_number": str,
                "emergency_contact_phone": str,
                "bank_account_number": str,
                "nin": str,
            }
            if file_extension == "csv":
                df = pd.read_csv(file, dtype=dtype_dict)
            else:
                df = pd.read_excel(file, dtype=dtype_dict)

            print(f"Excel/CSV columns: {df.columns.tolist()}")
            print(f"Excel/CSV row count: {len(df)}")

            required_columns = ["user.fullname", "user.email"]
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return Response(
                    {
                        "detail": f"Missing required columns: {', '.join(missing_columns)}",
                        "created_count": 0,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Compute lower case columns for department and position if present
            if "department" in df.columns:
                df["department_lower"] = df["department"].apply(
                    lambda x: (
                        str(x).strip().lower()
                        if pd.notna(x) and str(x).strip()
                        else None
                    )
                )
            if "position" in df.columns:
                df["position_lower"] = df["position"].apply(
                    lambda x: (
                        str(x).strip().lower()
                        if pd.notna(x) and str(x).strip()
                        else None
                    )
                )

            # Define mappings for choice fields
            gender_map = {
                "male": "male",
                "female": "female",
                "other": "other",
            }
            marital_status_map = {
                "single": "single",
                "married": "married",
                "divorced": "divorced",
                "widowed": "widowed",
            }

            # Check for duplicate emails in the input file and existing database
            print("Checking for duplicate emails")
            emails = df["user.email"].str.strip().dropna().tolist()
            duplicate_emails_in_file = [
                email
                for email, count in pd.Series(emails).value_counts().items()
                if count > 1
            ]
            if duplicate_emails_in_file:
                duplicate_rows = df[df["user.email"].isin(duplicate_emails_in_file)][
                    ["user.email"]
                ].index.tolist()
                return Response(
                    {
                        "detail": "Duplicate email addresses found in the uploaded file",
                        "created_count": 0,
                        "errors": [
                            {
                                "row": idx + 2,
                                "errors": {
                                    "user.email": {
                                        "error": f"Email '{df.loc[idx, 'user.email']}' is duplicated in the file"
                                    }
                                },
                            }
                            for idx in duplicate_rows
                        ],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing_emails = CustomUser.objects.filter(email__in=emails).values_list(
                "email", flat=True
            )
            if existing_emails:
                duplicate_rows = df[df["user.email"].isin(existing_emails)][
                    ["user.email"]
                ].index.tolist()
                return Response(
                    {
                        "detail": "Some email addresses already exist in the database",
                        "created_count": 0,
                        "errors": [
                            {
                                "row": idx + 2,
                                "errors": {
                                    "user.email": {
                                        "error": f"Email '{df.loc[idx, 'user.email']}' already exists"
                                    }
                                },
                            }
                            for idx in duplicate_rows
                        ],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Pre-validate all rows
            print("Pre-validating all rows")
            errors = []
            for index, row in df.iterrows():
                row_errors = {}  # Dict of field: {"error": "msg"} per row
                user_data = {
                    "fullname": (
                        str(row["user.fullname"]).strip()
                        if pd.notna(row["user.fullname"])
                        else ""
                    ),
                    "email": (
                        str(row["user.email"]).strip()
                        if pd.notna(row["user.email"])
                        else ""
                    ),
                }

                # Basic validation for user data
                if not user_data["fullname"]:
                    row_errors["user.fullname"] = {"error": "This field is required."}
                if not user_data["email"]:
                    row_errors["user.email"] = {"error": "This field is required."}

                for column in df.columns:
                    if column not in [
                        "user.fullname",
                        "user.email",
                        "department_lower",
                        "position_lower",
                    ]:
                        value = row[column]
                        if pd.isna(value):
                            continue
                        value = str(value).strip()
                        if not value:  # Skip empty strings
                            continue

                        if column == "gender" and value:
                            mapped = gender_map.get(value.lower())
                            if mapped is None:
                                row_errors["gender"] = {
                                    "error": f'"{value}" is not a valid choice.'
                                }
                        elif column == "marital_status" and value:
                            mapped = marital_status_map.get(value.lower())
                            if mapped is None:
                                row_errors["marital_status"] = {
                                    "error": f'"{value}" is not a valid choice.'
                                }

                # Additional validations
                if "date_of_birth" in df.columns and not pd.isna(
                    row.get("date_of_birth")
                ):
                    value = str(row["date_of_birth"]).strip()
                    if value:
                        try:
                            dob = custom_parse_date(value)
                            if dob:
                                msgs = []
                                if dob > date.today():
                                    msgs.append(
                                        "Date of birth cannot be in the future."
                                    )

                                age = (date.today() - dob).days // 365
                                if age < 18:
                                    msgs.append(
                                        f"Employee must be at least 18 years old. Current age: {age}."
                                    )

                                if msgs:
                                    row_errors["date_of_birth"] = {
                                        "error": " ".join(msgs)
                                    }
                        except ValueError as e:
                            row_errors["date_of_birth"] = {"error": str(e)}

                if "date_of_joining" in df.columns and not pd.isna(
                    row.get("date_of_joining")
                ):
                    value = str(row["date_of_joining"]).strip()
                    if value:
                        try:
                            datetime.strptime(value, "%Y-%m-%d")
                        except ValueError:
                            row_errors["date_of_joining"] = {
                                "error": "Invalid date format. Use YYYY-MM-DD."
                            }

                for field in ["experience", "children_count"]:
                    if field in df.columns and not pd.isna(row.get(field)):
                        value = str(row[field]).strip()
                        if value:
                            try:
                                int(float(value.replace(" years", "")))
                            except (ValueError, TypeError):
                                row_errors[field] = {"error": "Must be a valid number."}

                if row_errors:
                    errors.append(
                        {
                            "row": index + 2,
                            "errors": row_errors,
                        }
                    )

            if errors:
                return Response(
                    {
                        "detail": "Validation errors found in the uploaded data. No employees created.",
                        "created_count": 0,
                        "errors": errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # If no validation errors, proceed to creation within a transaction
            with transaction.atomic():
                # Cache foreign key mappings and create missing instances
                print("Fetching and creating foreign key mappings")
                field_mappings = {
                    "department": Department,
                    "work_type": WorkType,
                    "employee_type": EmployeeType,
                    "payroll_branch": Branch,
                }
                mappings = {}
                instance_mappings = {}  # Store model instances
                for field, model in field_mappings.items():
                    mappings[field] = {}
                    instance_mappings[field] = {}

                    if field in df.columns:
                        # Get unique non-null, non-empty values
                        unique_values = df[field].dropna().astype(str).str.strip()
                        unique_values = unique_values[unique_values != ""].unique()

                        if len(unique_values) > 0:
                            print(f"Processing {field} with values: {unique_values}")

                            # Determine if the model has institution field
                            has_institution = True  # All models have institution
                            filter_kwargs = {"name__in": unique_values}
                            if has_institution:
                                filter_kwargs["institution"] = institution

                            # Fetch existing records
                            existing = model.objects.filter(**filter_kwargs)
                            print(
                                f"Found existing {field} values: {[item.name for item in existing]}"
                            )

                            # Create mappings for existing records
                            for item in existing:
                                mappings[field][item.name.lower()] = item.id
                                instance_mappings[field][item.name.lower()] = item

                            # Find missing records
                            existing_names_lower = [
                                item.name.lower() for item in existing
                            ]
                            missing = [
                                name
                                for name in unique_values
                                if name.lower() not in existing_names_lower
                            ]

                            if missing:
                                print(f"Creating missing {field}s: {missing}")
                                created_instances = []
                                for name in missing:
                                    # Basic creation with minimal required fields
                                    kwargs = {"name": name.strip()}
                                    if has_institution:
                                        kwargs["institution"] = institution
                                    if field == "department":
                                        kwargs["description"] = (
                                            "Auto-created during bulk upload"
                                        )

                                    try:
                                        instance = model.objects.create(**kwargs)
                                        mappings[field][name.lower()] = instance.id
                                        instance_mappings[field][
                                            name.lower()
                                        ] = instance
                                        created_instances.append(instance)
                                        print(f"Created {field}: {name}")
                                    except Exception as e:
                                        print(
                                            f"Error creating {field} '{name}': {str(e)}"
                                        )
                                        raise

                                print(
                                    f"Successfully created {len(created_instances)} {field} instances"
                                )

                # Handle job positions separately, tied to departments
                print("Handling job positions")
                position_mappings = {}  # Key: (dep_lower or None, pos_lower): instance

                if "position" in df.columns:
                    print("Processing job positions with departments")

                    # Get unique department-position pairs from the dataframe
                    if "department" in df.columns:
                        # Filter out rows where position is null or empty
                        valid_rows = df[
                            (df["position"].notna())
                            & (df["position"].astype(str).str.strip() != "")
                        ].copy()

                        if len(valid_rows) > 0:
                            # Get unique department-position pairs
                            dept_pos_pairs = valid_rows[
                                ["department", "position"]
                            ].drop_duplicates()

                            print(
                                f"Found {len(dept_pos_pairs)} unique department-position pairs"
                            )

                            for _, row in dept_pos_pairs.iterrows():
                                dept_name = (
                                    str(row["department"]).strip()
                                    if pd.notna(row["department"])
                                    else None
                                )
                                pos_name = str(row["position"]).strip()

                                dept_lower = dept_name.lower() if dept_name else None
                                pos_lower = pos_name.lower()

                                print(
                                    f"Processing position: '{pos_name}' for department: '{dept_name}'"
                                )

                                # Get department instance
                                dept_instance = None
                                if dept_lower and dept_lower in instance_mappings.get(
                                    "department", {}
                                ):
                                    dept_instance = instance_mappings["department"][
                                        dept_lower
                                    ]
                                    print(
                                        f"Found department instance: {dept_instance.name}"
                                    )
                                else:
                                    print(
                                        f"Department '{dept_name}' not found in mappings"
                                    )

                                # Check if this exact position already exists for this department
                                filter_kwargs = {"name__iexact": pos_name}
                                if dept_instance:
                                    filter_kwargs["department"] = dept_instance
                                else:
                                    filter_kwargs["department__isnull"] = True

                                existing_pos = JobPosition.objects.filter(
                                    **filter_kwargs
                                ).first()

                                if existing_pos:
                                    position_mappings[(dept_lower, pos_lower)] = (
                                        existing_pos
                                    )
                                    print(
                                        f"Found existing position: {pos_name} (dept: {dept_name})"
                                    )
                                else:
                                    # Create new position with correct department
                                    try:
                                        new_pos = JobPosition.objects.create(
                                            name=pos_name,
                                            description="Auto-created during bulk upload",
                                            department=dept_instance,
                                        )
                                        position_mappings[(dept_lower, pos_lower)] = (
                                            new_pos
                                        )
                                        print(
                                            f"✓ Created position: '{pos_name}' for department: '{dept_name}'"
                                        )
                                    except Exception as e:
                                        print(
                                            f"✗ Error creating position '{pos_name}' for dept '{dept_name}': {str(e)}"
                                        )
                                        raise
                    else:
                        # No department column, create positions without departments
                        position_values = (
                            df["position"].dropna().astype(str).str.strip()
                        )
                        position_values = position_values[
                            position_values != ""
                        ].unique()

                        for pos_name in position_values:
                            pos_lower = pos_name.lower()

                            existing_pos = JobPosition.objects.filter(
                                name__iexact=pos_name, department__isnull=True
                            ).first()

                            if existing_pos:
                                position_mappings[(None, pos_lower)] = existing_pos
                                print(f"Found existing position: {pos_name} (no dept)")
                            else:
                                try:
                                    new_pos = JobPosition.objects.create(
                                        name=pos_name,
                                        description="Auto-created during bulk upload",
                                        department=None,
                                    )
                                    position_mappings[(None, pos_lower)] = new_pos
                                    print(f"Created position: {pos_name} (no dept)")
                                except Exception as e:
                                    print(
                                        f"Error creating position '{pos_name}': {str(e)}"
                                    )
                                    raise

                # Process employees in batches
                batch_size = 50
                employees = []
                created_count = 0

                print(f"Starting batch processing with batch size {batch_size}")
                for start_idx in range(0, len(df), batch_size):
                    batch = df[start_idx : start_idx + batch_size]
                    batch_start_time = datetime.now()
                    print(
                        f"Processing batch {start_idx//batch_size + 1} (rows {start_idx + 1} to {start_idx + len(batch)})"
                    )

                    user_objects = []
                    employee_data_list = []
                    plain_passwords = []  # Collect plain passwords for emailing

                    for index, row in batch.iterrows():
                        employee_data = {}

                        # Create user data
                        fullname = (
                            str(row["user.fullname"]).strip()
                            if pd.notna(row["user.fullname"])
                            else ""
                        )
                        email = (
                            str(row["user.email"]).strip()
                            if pd.notna(row["user.email"])
                            else ""
                        )

                        if not fullname or not email:
                            print(
                                f"Skipping row {index + 2}: missing fullname or email"
                            )
                            continue

                        plain_password = generate_compliant_password()
                        plain_passwords.append(plain_password)

                        user_data = {
                            "fullname": fullname,
                            "email": email,
                            "password": make_password(plain_password),
                            "is_active": True,
                            "is_email_verified": True,
                            "is_password_verified": True,
                            "user_type": "staff",
                            "created_at": datetime.now(),
                            "updated_at": datetime.now(),
                        }

                        # Process employee data
                        for column in df.columns:
                            if column not in [
                                "user.fullname",
                                "user.email",
                                "department_lower",
                                "position_lower",
                            ]:
                                value = row[column]
                                if pd.isna(value):
                                    employee_data[column] = None
                                    continue

                                value = str(value).strip()
                                if not value:  # Skip empty strings
                                    employee_data[column] = None
                                    continue

                                if column in field_mappings:
                                    # Map to foreign key instance
                                    instance = instance_mappings.get(column, {}).get(
                                        value.lower()
                                    )
                                    employee_data[column] = instance
                                elif column == "position":
                                    # Handle position mapping
                                    dept_value = (
                                        str(row.get("department", "")).strip()
                                        if pd.notna(row.get("department"))
                                        else None
                                    )
                                    dept_lower = (
                                        dept_value.lower() if dept_value else None
                                    )
                                    pos_lower = value.lower()

                                    position_instance = position_mappings.get(
                                        (dept_lower, pos_lower)
                                    )
                                    employee_data[column] = position_instance
                                elif column == "gender":
                                    employee_data[column] = gender_map.get(
                                        value.lower()
                                    )
                                elif column == "marital_status":
                                    employee_data[column] = marital_status_map.get(
                                        value.lower()
                                    )
                                else:
                                    employee_data[column] = value

                        # Set employee email from user email
                        employee_data["email"] = user_data["email"]

                        # Process boolean fields
                        if (
                            "is_active" in employee_data
                            and employee_data["is_active"] is not None
                        ):
                            employee_data["is_active"] = (
                                str(employee_data["is_active"]).lower() == "true"
                            )

                        # Process date fields
                        if (
                            "date_of_birth" in employee_data
                            and employee_data["date_of_birth"]
                        ):
                            try:
                                employee_data["date_of_birth"] = custom_parse_date(
                                    employee_data["date_of_birth"]
                                )
                            except Exception as e:
                                print(
                                    f"Error parsing date_of_birth for row {index + 2}: {e}"
                                )
                                employee_data["date_of_birth"] = None

                        if (
                            "date_of_joining" in employee_data
                            and employee_data["date_of_joining"]
                        ):
                            try:
                                employee_data["date_of_joining"] = datetime.strptime(
                                    employee_data["date_of_joining"], "%Y-%m-%d"
                                ).date()
                            except Exception as e:
                                print(
                                    f"Error parsing date_of_joining for row {index + 2}: {e}"
                                )
                                employee_data["date_of_joining"] = None

                        # Process numeric fields
                        for field in ["experience", "children_count"]:
                            if (
                                field in employee_data
                                and employee_data[field] is not None
                            ):
                                try:
                                    employee_data[field] = int(
                                        float(
                                            str(employee_data[field]).replace(
                                                " years", ""
                                            )
                                        )
                                    )
                                except (ValueError, TypeError):
                                    employee_data[field] = 0

                        # Add timestamps
                        employee_data["created_at"] = datetime.now()
                        employee_data["updated_at"] = datetime.now()

                        # Add to creation lists
                        user_objects.append(CustomUser(**user_data))
                        employee_data["user"] = len(user_objects) - 1  # Temporary index
                        employee_data_list.append(employee_data)

                    if not employee_data_list:
                        print("No valid rows in batch, skipping creation")
                        continue

                    # Bulk create users
                    print(f"Creating {len(user_objects)} users")
                    created_users = CustomUser.objects.bulk_create(user_objects)
                    print(f"Created {len(created_users)} users")

                    # Bulk create profiles for the new users
                    profile_objects = [
                        Profile(user=user, institution=institution, bio="")
                        for user in created_users
                    ]
                    Profile.objects.bulk_create(profile_objects)
                    print(f"Created {len(profile_objects)} profiles")

                    # Bulk create user roles
                    userrole_objects = [
                        UserRole(user=user, role=role) for user in created_users
                    ]
                    UserRole.objects.bulk_create(userrole_objects)
                    print(f"Created {len(userrole_objects)} user roles")

                    # Create Employee instances with actual CustomUser objects
                    employee_objects = []
                    for employee_data in employee_data_list:
                        user_index = employee_data.pop("user")  # Remove temporary index
                        employee_data["user"] = created_users[
                            user_index
                        ]  # Assign CustomUser instance
                        employee_objects.append(Employee(**employee_data))

                    # Bulk create employees
                    print(f"Creating {len(employee_objects)} employees")
                    created_employees = Employee.objects.bulk_create(employee_objects)
                    print(f"Created {len(created_employees)} employees")

                    # After bulk create, handle post-creation logic
                    prefix = "EMP"
                    last_employee = (
                        Employee.objects.filter(employee_id__startswith=prefix)
                        .order_by("-employee_id")
                        .first()
                    )
                    last_number = (
                        int(last_employee.employee_id.replace(prefix, ""))
                        if last_employee and last_employee.employee_id
                        else 0
                    )

                    fields_to_update = ["employee_id", "salary", "payroll_branch"]

                    for employee in created_employees:
                        last_number += 1
                        employee.employee_id = f"{prefix}{last_number:05d}"

                        if (
                            employee.position
                            and hasattr(employee.position, "salary_min")
                            and not employee.salary
                        ):
                            employee.salary = employee.position.salary_min

                        if employee.user and not employee.payroll_branch:
                            employee.payroll_branch = employee.get_default_branch()

                        # Sync leave balances and working days
                        try:
                            if employee.is_active and employee.department:
                                employee.sync_leave_balances()
                            if employee.is_active:
                                employee.sync_employee_working_days()
                        except Exception as e:
                            print(
                                f"Error syncing employee data for {employee.user.email}: {e}"
                            )

                    # Bulk update the updated fields
                    Employee.objects.bulk_update(created_employees, fields_to_update)

                    # Send password setup emails asynchronously using Celery
                    for idx, employee in enumerate(created_employees):
                        try:
                            send_employee_welcome_email.delay_on_commit(
                                employee.user.email,
                                employee.user.fullname,
                                plain_passwords[idx]
                            )
                        except Exception as e:
                            print(
                                f"Error queuing email for employee {employee.user.email}: {str(e)}"
                            )

                    employees.extend(created_employees)
                    created_count += len(created_employees)

                    print(
                        f"Batch {start_idx//batch_size + 1} completed in {(datetime.now() - batch_start_time).total_seconds()} seconds"
                    )

            # Set default employee role if not already set (once after all batches)
            if not institution.default_employee_role:
                institution.default_employee_role = role
                institution.save()

            print(
                f"Total upload time: {(datetime.now() - start_time).total_seconds()} seconds"
            )

            return Response(
                {
                    "detail": "All employees created successfully",
                    "created_count": created_count,
                    "data": EmployeeSerializer(
                        employees, many=True, context={"request": request}
                    ).data,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            import traceback

            print(f"Error processing file: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response(
                {
                    "detail": f"Error processing file: {str(e)}",
                    "created_count": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class EmployeeTemplateDownloadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: None},
        summary="Download Employee Excel Template",
        description="Download an Excel template for bulk employee creation.",
        tags=["Employee Management"],
    )
    def get(self, request, format_type="xlsx"):
        """Generate and return an Excel template for bulk employee upload."""
        columns = [
            "user.fullname",
            "user.email",
            "phone_number",
            "position",
            "gender",
            "department",
            "date_of_birth",
            "work_type",
            "employee_type",
            "date_of_joining",
            "address",
            "country",
            "nin",
            "bank",
            "bank_account_number",
            "experience",
            "qualifications",
            "skills",
            "emergency_contact_name",
            "emergency_contact_phone",
            "emergency_contact_relationship",
            "marital_status",
            "children_count",
        ]

        # Sample data for the first row
        sample_data = {
            "user.fullname": "John Doe",
            "user.email": "john.doe@example.com",
            "phone_number": "+1234567890",
            "position": "Software Engineer",
            "gender": "Male",
            "department": "IT",
            "date_of_birth": "1990-01-01",
            "work_type": "Full-Time",
            "employee_type": "Permanent",
            "date_of_joining": "2023-01-01",
            "address": "123 Main St, City",
            "country": "USA",
            "nin": "123456789",
            "bank": "National Bank",
            "bank_account_number": "123456789012",
            "experience": "5",
            "qualifications": "BSc Computer Science",
            "skills": "Python, Django",
            "emergency_contact_name": "Jane Doe",
            "emergency_contact_phone": "+1234567891",
            "emergency_contact_relationship": "Spouse",
            "marital_status": "Married",
            "children_count": "2",
        }

        if format_type == "csv":
            df = pd.DataFrame([sample_data], columns=columns)
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)

            response = HttpResponse(
                content_type="text/csv",
                headers={
                    "Content-Disposition": 'attachment; filename="employee_template.csv"'
                },
            )
            response.write(output.getvalue())
        else:
            wb = Workbook()
            ws = wb.active
            ws.title = "Employee Template"

            # Add headers
            for col_num, column_title in enumerate(columns, 1):
                cell = ws.cell(row=1, column=col_num)
                cell.value = column_title
                cell.font = cell.font.copy(bold=True)

            # Add sample data
            for col_num, column_title in enumerate(columns, 1):
                ws.cell(row=2, column=col_num).value = sample_data.get(column_title, "")

            # Auto-adjust column widths
            for col_num, column_title in enumerate(columns, 1):
                column_letter = get_column_letter(col_num)
                max_length = max(
                    len(str(sample_data.get(column_title, ""))), len(column_title)
                )
                adjusted_width = max_length + 2
                ws.column_dimensions[column_letter].width = adjusted_width

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)

            response = HttpResponse(
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": 'attachment; filename="employee_template.xlsx"'
                },
            )
            response.write(output.getvalue())

        return response


class EmployeeUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]
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

        if "salary" in final_data:
            try:
                final_data["salary"] = Decimal(final_data["salary"])
            except (InvalidOperation, TypeError, ValueError):
                final_data["salary"] = None

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
                user_updated = True

            if user_updated:
                random_password = generate_compliant_password()
                employee.user.set_password(random_password)
                employee.user.is_password_verified = False
                employee.user.save()
                employee.setup_employee_password(request)

        # if "salary" in final_data:
        #     employee.salary = final_data["salary"]
        #     employee.save()

        return Response(EmployeeSerializer(employee).data, status=status.HTTP_200_OK)


class EmployeeDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
            employee.delete()  # Custom delete method to handle soft delete
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
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=EmployeeAttendanceSerializer(many=True),
        description="Retrieve all attendance records or for a specific employee if employee_id is provided either in path or query param.",
    )
    def get(self, request, employee_id=None):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        employee_id = employee_id or request.query_params.get("employee_id")

        date = request.query_params.get("date")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found"}, status=status.HTTP_404_NOT_FOUND
            )
        records = EmployeeAttendance.objects.filter(
            employee__department__institution=institution, deleted_at__isnull=True
        ).order_by("date")

        if employee_id:
            records = records.filter(employee_id=employee_id)

        if date:
            records = records.filter(date=date)

        if start_date:
            records = records.filter(date__gte=start_date)
        if end_date:
            records = records.filter(date__lte=end_date)

        if search_query:
            records = records.filter(
                Q(employee__user__fullname__icontains=search_query)
                | Q(employee__user__email__icontains=search_query)
                | Q(date__icontains=search_query)
            )

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

        # Prepare the context to pass to the serializer
        context = {"request": request}

        if existing:
            # Pass context to the serializer for updates
            serializer = EmployeeAttendanceSerializer(
                existing, data=data, partial=True, context=context
            )
            if serializer.is_valid():
                serializer.save()

            
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Pass context to the serializer for creation
            serializer = EmployeeAttendanceSerializer(data=data, context=context)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Employee Attendance"])
class EmployeeAttendanceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
    def get(self, request, institution_id):
        search_query = request.query_params.get("search", None)
        user = request.user.profile

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = EmployeeType.objects.filter(
            institution_id=institution_id, deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            data = data.filter(
                Q(name__icontains=search_query) | Q(description__icontains=search_query)
            )

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(data, request)
        serializer = EmployeeTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=EmployeeTypeSerializer,
        responses=EmployeeTypeSerializer,
        description="Create a new employee type",
    )
    def post(self, request, institution_id):
        data = request.data.copy()
        data["institution"] = institution_id
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
        obj.delete()  # Custom delete method that handles soft delete
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Work Type"])
class WorkTypeListCreateAPIView(APIView):
    @extend_schema(
        responses=WorkTypeSerializer(many=True),
        description="Get list of all work types",
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get("search", None)
        user = request.user.profile

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = WorkType.objects.filter(
            institution=institution, deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            data = data.filter(
                Q(name__icontains=search_query) | Q(description__icontains=search_query)
            )

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(data, request)
        serializer = WorkTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=WorkTypeSerializer,
        responses=WorkTypeSerializer,
        description="Create a new work type",
    )
    def post(self, request, institution_id):
        data = request.data.copy()
        data["institution"] = institution_id
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
        obj.delete()  # Custom delete method that handles soft delete
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        obj.delete()  # Custom method to handle soft delete
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        obj.delete()  # Custom delete method to handle soft delete
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeContractListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=EmployeeContractSerializer(many=True),
        description="Get list of all employee contracts",
        tags=["Employee Contract"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        employee_id = request.query_params.get("employee_id")

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contracts = EmployeeContract.objects.filter(
            Q(employee__department__institution=institution)
            | Q(
                applicant__job_position_advert__job_position__department__institution=institution
            ),
            deleted_at__isnull=True,
        ).order_by("-created_at")

        if employee_id:
            contracts = contracts.filter(employee__id=employee_id)

        if search_query:
            contracts = contracts.filter(
                Q(applicant__applicant_name__icontains=search_query)
                | Q(employee__user__fullname__icontains=search_query)
                | Q(contract_reference__icontains=search_query)
            )
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
    permission_classes = [IsAuthenticated]

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
        contract.delete()  # Custom delete method to handle soft delete
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
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Set contract to active first
        contract.is_active = True
        contract.status = "APPROVED"
        contract.save()

        # If contract has an applicant and no employee, create Employee instance
        if contract.applicant and not contract.employee:
            try:
                # Check if employee already created for this application
                if hasattr(contract.applicant, "created_employee"):
                    return Response(
                        {"error": "Employee already created for this application"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Create CustomUser if it doesn't exist
                user, created = CustomUser.objects.get_or_create(
                    email=contract.applicant.applicant_email,
                    defaults={
                        "fullname": contract.applicant.applicant_name,
                        "is_active": True,
                    },
                )

                # Create Employee instance
                employee_data = {
                    "user": user,
                    "email": contract.applicant.applicant_email,
                    "phone_number": contract.applicant.applicant_phone,
                    "position": contract.applicant.job_position_advert.job_position,
                    "address": contract.applicant.address,
                    "gender": contract.applicant.gender,
                    "date_of_joining": timezone.now().date(),
                    "is_active": True,
                    "department": contract.applicant.job_position_advert.job_position.department,
                    "salary": contract.applicant.job_position_advert.job_position.salary_min,
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

                context = {
                    "salutation": (
                        "Madam" if contract.applicant.gender == "female" else "Mr."
                    ),
                    "employee_name": contract.applicant.applicant_name,
                    "position": contract.applicant.job_position_advert.job_position,
                    "department": contract.applicant.job_position_advert.job_position.department,
                    "date_of_joining": timezone.now().date(),
                    "email": contract.applicant.applicant_email,
                    "phone_number": contract.applicant.applicant_phone,
                }

                html_message = render_to_string("emails/onboarding_email.html", context)
                plain_message = render_to_string("emails/onboarding_email.txt", context)

                send_mail(
                    subject="Welcome to the Team!",
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[self.application.applicant_email],
                    html_message=html_message,
                    fail_silently=False,
                )

            except ValidationError as e:
                return Response(
                    {"error": f"Failed to create employee: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception as e:
                return Response(
                    {"error": f"Unexpected error creating employee: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = EmployeeContractSerializer(contract)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExportAttendanceExcelView(APIView):
    """
    API endpoint to generate and download an Attendance Excel Report.
    Access this endpoint with a POST request containing start_date, end_date, and any applicable filters.
    """

    @extend_schema(
        tags=["export-attendance2excel"],
        request=AttendanceReportSerializer,
        responses={
            200: None,
            400: None,
            404: None,
            500: None,
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = AttendanceReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]
        context = serializer.get_report_context()

        try:
            excel_file = generate_attendance_excel(start_date, end_date, context)

            filename = f"ATTENDANCE_REPORT_{start_date}_{end_date}_{datetime.now().strftime('%Y%m%d')}.xlsx"
            response = HttpResponse(
                excel_file.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{escape_uri_path(filename)}"'
            )
            return response

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            print(f"Unexpected error during attendance export: {e}")
            return Response(
                {
                    "error": "An internal server error occurred while generating the Excel."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AttendanceReportGetView(APIView):
    """
    Returns attendance data as JSON.
    Defaults to past 30 days and all employees.
    """

    @extend_schema(
        tags=["attendance-data"],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request, *args, **kwargs):

        user = request.user.profile

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AttendanceQueryParamsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]
        context = serializer.get_filter_context()

        try:
            report_data = build_attendance_report_data(
                start_date,
                end_date,
                context,
                institution,
            )
            return Response(report_data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Error generating attendance report: {e}")
            return Response(
                {"error": "Internal server error while generating report."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmployeeShiftListCreateView(APIView):
    @extend_schema(
        summary="List all employee shifts or create a new shift",
        description=(
                "GET returns all shifts of the logged-in employee if 'is_employee_specific' "
                "is true, or all shifts for the institution if false. POST creates a shift."
        ),
        request=EmployeeShiftSerializer,
        responses=EmployeeShiftSerializer,
        tags=["Shifts-Allocations/Requests"],
    )
    def get(self, request):
        user = request.user
        is_employee_specific = request.query_params.get("is_employee_specific", "true").lower() == "true"

        print(is_employee_specific)

        if is_employee_specific:
            if hasattr(user, "employee"):
                shifts = EmployeeShift.objects.filter(employee=user.employee)
            else:
                return Response({"detail": "Unrecognized Employee"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            institution = user.profile.institution
            shifts = EmployeeShift.objects.filter(shift__branch__institution=institution)

        paginator = CustomPageNumberPagination()
        paginated_shifts = paginator.paginate_queryset(shifts, request)
        serializer = EmployeeShiftSerializer(paginated_shifts, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create a new employee shift",
        description="POST creates a new employee shift. Context controls whether it is a request (logged-in employee) or allocation (employee must be specified).",
        request=EmployeeShiftSerializer,
        responses=EmployeeShiftSerializer,
        tags=["Shifts-Allocations/Requests"],
    )
    def post(self, request):
        serializer = EmployeeShiftSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            shift = serializer.save()
            return Response(
                EmployeeShiftSerializer(shift).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeShiftDetailView(APIView):
    @extend_schema(
        summary="Retrieve an employee shift",
        description="GET a shift by its ID",
        responses=EmployeeShiftSerializer,
        tags=["Shifts-Allocations/Requests"],
    )
    def get(self, request, pk):
        try:
            shift = EmployeeShift.objects.get(pk=pk)
        except EmployeeShift.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmployeeShiftSerializer(shift)
        return Response(serializer.data)

    @extend_schema(
        summary="Update an employee shift",
        description="PATCH updates fields of an employee shift",
        request=EmployeeShiftSerializer,
        responses=EmployeeShiftSerializer,
        tags=["Shifts-Allocations/Requests"],
    )
    def patch(self, request, pk):
        try:
            shift = EmployeeShift.objects.get(pk=pk)
        except EmployeeShift.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployeeShiftSerializer(
            shift, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            shift = serializer.save()
            return Response(EmployeeShiftSerializer(shift).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete an employee shift",
        description="DELETE removes an employee shift by ID",
        responses={204: None},
        tags=["Shifts-Allocations/Requests"],
    )
    def delete(self, request, pk):
        try:
            shift = EmployeeShift.objects.get(pk=pk)
        except EmployeeShift.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        shift.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



class EmployeeAnalyticsAPI(APIView):
    """
    API view for employee analytics and workforce composition.
    The core logic is now in a separate service file.
    """
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Employee demographics and workforce composition analytics",
                response=inline_serializer(
                    name='EmployeeAnalyticsResponse',
                    fields={
                        'headcount': serializers.IntegerField(help_text="Total number of active employees."),
                        'headcount_by_department': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Employee count by department."),
                        'headcount_by_position': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Employee count by job position."),
                        'headcount_by_gender': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Employee count by gender."),
                        'headcount_by_employee_type': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Employee count by employee type."),
                        'headcount_by_work_type': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Employee count by work type."),
                        'age_distribution': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Distribution of employees by age bracket."),
                    }
                ),
            ),
            404: OpenApiResponse(description="No employee data found for this institution."),
        },
        summary="Get Employee Analytics",
        description="Provides key analytics on the workforce composition and demographics.",
        tags=["Employee Analytics"],
    )
    def get(self, request, institution_id):
        analytics_data = get_employee_demographics_analytics(institution_id)
        if analytics_data is None:
            return Response({"detail": "No employee data found for this institution."}, status=status.HTTP_404_NOT_FOUND)
        return Response(analytics_data, status=status.HTTP_200_OK)


class EmployeeAttendanceAnalyticsAPI(APIView):
    """
    API view for employee attendance and productivity analytics.
    The core logic is now in a separate service file.
    """
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Employee attendance and productivity analytics",
                response=inline_serializer(
                    name='AttendanceAnalyticsResponse',
                    fields={
                        'total_hours_worked': serializers.FloatField(help_text="Total hours worked."),
                        'total_late_minutes': serializers.IntegerField(help_text="Total minutes late."),
                        'total_overtime_hours': serializers.FloatField(help_text="Total overtime hours."),
                        'attendance_metrics': serializers.DictField(help_text="Counts and rates for attendance statuses."),
                    }
                ),
            ),
            404: OpenApiResponse(description="No attendance data found for this institution."),
        },
        summary="Get Employee Attendance Analytics",
        description="Provides key analytics on employee attendance.",
        tags=["Employee Analytics"],
    )
    def get(self, request, institution_id):
        analytics_data = get_employee_attendance_analytics(institution_id)
        if analytics_data is None:
            return Response({"detail": "No attendance data found for this institution."}, status=status.HTTP_404_NOT_FOUND)
        return Response(analytics_data, status=status.HTTP_200_OK)


class EmployeeSalaryAnalyticsAPI(APIView):
    """
    API view for employee salary and compensation analytics.
    The core logic is now in a separate service file.
    """
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Employee salary and compensation analytics",
                response=inline_serializer(
                    name='SalaryAnalyticsResponse',
                    fields={
                        'average_salary_by_department': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Average salary by department."),
                        'average_salary_by_position': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Average salary by position."),
                        'salary_distribution': serializers.ListField(child=serializers.DictField(child=serializers.CharField()), help_text="Distribution of employees by salary bracket."),
                        'gender_pay_gap': serializers.DictField(child=serializers.FloatField(), help_text="Average salary breakdown by gender."),
                    }
                ),
            ),
            404: OpenApiResponse(description="No salary data found for this institution."),
        },
        summary="Get Employee Salary Analytics",
        description="Provides key analytics on employee salaries and a gender pay gap analysis.",
        tags=["Employee Analytics"],
    )
    def get(self, request, institution_id):
        analytics_data = get_employee_salary_analytics(institution_id)
        if analytics_data is None:
            return Response({"detail": "No salary data found for this institution."}, status=status.HTTP_404_NOT_FOUND)
        return Response(analytics_data, status=status.HTTP_200_OK)