from django.conf import settings
from django.shortcuts import render

from utilities.sortable_api import SortableAPIMixin
from spotcheck.models import EmployeeSpotCheck
from institution.serializers import UserBranchSerializer
from institution.models import Branch, UserBranch, Department
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from datetime import timedelta
from spotcheck.utilities import create_spotchecks_for_today
from .models import (
    Employee,
    EmployeeAttendance,
    EmployeeType,
    WorkType,
    EmployeeWorkingDays,
    EmployeeContract,
    EmployeeShift,
    QualificationAward,
)
from .serializers import (
    EmployeeAttendanceSerializer,
    EmployeeSerializer,
    EmployeeTypeSerializer,
    QualificationAwardSerializer,
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
from django.template.loader import render_to_string
from django.core.mail import send_mail
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
from utilities.helpers import (
    get_or_create_default_role_with_permissions,
    custom_parse_date,
)
from django.db.models import Q
from datetime import datetime, date
from institution.models import Institution, InstitutionBankType
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers
from django.db.models import F, ExpressionWrapper, DurationField
from .tasks import send_employee_welcome_email
import string
import secrets
from django.db.models import Count, F, ExpressionWrapper, FloatField, Avg
import json
from .utilities import generate_employee_excel
from collections import defaultdict


class QualificationAwardListCreateAPIView(APIView):
    @extend_schema(
        summary="List all Qualification Awards",
        responses={200: QualificationAwardSerializer(many=True)}
    )
    def get(self, request):
        awards = QualificationAward.objects.all()
        serializer = QualificationAwardSerializer(awards, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create a new Qualification Award",
        request=QualificationAwardSerializer,
        responses={201: QualificationAwardSerializer}
    )
    def post(self, request):
        serializer = QualificationAwardSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QualificationAwardDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a Qualification Award by ID",
        responses={200: QualificationAwardSerializer}
    )
    def get(self, request, pk):
        award = get_object_or_404(QualificationAward, pk=pk)
        serializer = QualificationAwardSerializer(award)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a Qualification Award by ID",
        request=QualificationAwardSerializer,
        responses={200: QualificationAwardSerializer}
    )
    def patch(self, request, pk):
        award = get_object_or_404(QualificationAward, pk=pk)
        serializer = QualificationAwardSerializer(award, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete a Qualification Award by ID",
        responses={204: None}
    )
    def delete(self, request, pk):
        award = get_object_or_404(QualificationAward, pk=pk)
        award.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class EmployeeExportView(APIView):

    # Requires Swag Documentation Later

    def get(self, request, institution_id):

        employees = Employee.objects.filter(
            department__institution_id=institution_id, deleted_at__isnull=True
        ).select_related("user", "department", "employee_type")

        if not employees.exists():
            return Response({"detail": "No employees found."}, status=404)

        return generate_employee_excel(employees)


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
        working_days_instance.approval_status = "under_update"

        serializer = EmployeeWorkingDaysSerializer(
            instance=working_days_instance, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            working_days_instance.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ["user", "email", "department", "is_active", "position"]
    default_ordering = ["user"]

    @extend_schema(
        request=None,
        responses={200: EmployeeSerializer(many=True)},
        description="Retrieve a list of employees.",
        summary="List Employees",
        tags=["Employee Management"],
    )
    def get(self, request, institution_id):
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

            try:
                employees = self.apply_sorting(employees, request)
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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
        responses={200: EmployeeSerializer, 404: "Employee not found"},
        description="Retrieve details of a specific employee by employee ID or user ID.",
        summary="Employee Detail",
        tags=["Employee Management"],
        parameters=[
            OpenApiParameter(
                name="employee_id",
                description="ID of the employee",
                required=True,
                type=int,
                location=OpenApiParameter.PATH,
            ),
            OpenApiParameter(
                name="by_user",
                description="If true, treats employee_id as user_id instead",
                required=False,
                type=bool,
                location=OpenApiParameter.QUERY,
            ),
        ],
    )
    def get(self, request, employee_id):
        """
        Retrieve details of a specific employee.

        By default, looks up employee by employee ID.
        Use ?by_user=true to lookup by user ID instead.
        """
        by_user = request.query_params.get("by_user", "").lower() == "true"

        try:
            if by_user:
                employee = Employee.objects.get(user_id=employee_id)
            else:
                employee = Employee.objects.get(id=employee_id)

            serializer = EmployeeSerializer(employee)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Employee.DoesNotExist:
            lookup_type = "user ID" if by_user else "employee ID"
            return Response(
                {"detail": f"Employee not found for the specified {lookup_type}."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": "An error occurred while retrieving employee details."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmployeeCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def parse_nested_multipart(self, query_dict):
        """Parse multipart/form-data into a nested structure."""
        final_data = defaultdict(list)
        nested_fields = [
            "bank_accounts",
            "next_of_kin",
            "educations",
            "work_experiences",
            "children",
            "spouse",
        ]

        # Initialize lists for array fields and dict for spouse
        for field in nested_fields:
            if field != "spouse":
                final_data[field] = []
            else:
                final_data[field] = {}

        # Process all keys in the QueryDict
        for key, values in query_dict.lists():
            # Handle scalar fields
            if key in [
                "institutionId",
                "user.fullname",
                "user.email",
                "email",
                "phone_number",
                "gender",
                "date_of_birth",
                "date_of_joining",
                "address",
                "country",
                "nin",
                "tin",
                "nssf_no",
                "salary",
                "is_active",
                "skills",
                "marital_status",
                "selected_branches",
                "work_type",
                "employee_type",
                "position",
                "department",
            ]:
                final_data[key.replace("[]", "")] = values[0] if len(values) == 1 else values
                continue

            # Handle nested fields
            for field in nested_fields:
                if field == "spouse" and key.startswith("spouse."):
                    # Handle spouse fields (e.g., spouse.name, spouse.phone_number)
                    subfield = key[len("spouse."):].replace("[]", "")
                    final_data[field][subfield] = values[0] if values else None
                elif key.startswith(field + "["):
                    try:
                        index_str, subfield = key[len(field + "["):].split("].", 1)
                        index = int(index_str) if field != "spouse" else None
                    except (ValueError, IndexError):
                        continue

                    # Ensure the list for this field has enough entries
                    if field != "spouse":
                        while len(final_data[field]) <= index:
                            final_data[field].append({})
                        final_data[field][index][subfield] = values[0] if values else None

        # Transform the defaultdict to a regular dict
        final_data = dict(final_data)

        # Structure user data
        if "user.fullname" in final_data and "user.email" in final_data:
            random_password = generate_compliant_password()
            final_data["user"] = {
                "fullname": final_data.pop("user.fullname"),
                "email": final_data.pop("user.email"),
                "password": random_password,
            }

        # Fix field names and ensure proper types
        if "bank_accounts" in final_data:
            for bank in final_data["bank_accounts"]:
                bank["account_name"] = bank.get("account_name", final_data["user"]["fullname"])
                bank["account_number"] = bank.get("account_number", "")

        if "next_of_kin" in final_data:
            for kin in final_data["next_of_kin"]:
                if "contact" in kin:
                    kin["phone_number"] = kin.pop("contact")
                kin["phone_number"] = kin.get("phone_number") or None
                kin["address"] = kin.get("address", "Unknown")
                kin["relationship"] = kin.get("relationship", "other")

        if "educations" in final_data:
            for edu in final_data["educations"]:
                if "institute" in edu:
                    edu["institution"] = edu.pop("institute")
                if "award" in edu:
                    edu["name"] = edu.pop("award")
                if "year" in edu:
                    try:
                        edu["year"] = int(edu["year"])
                    except (ValueError, TypeError):
                        edu["year"] = None
                if "qualification" in edu and edu["qualification"]:
                    try:
                        qual = QualificationAward.objects.get(name=edu["qualification"])
                        edu["qualification_id"] = qual.id
                    except QualificationAward.DoesNotExist:
                        qual = QualificationAward.objects.create(name=edu["qualification"])
                        edu["qualification_id"] = qual.id
                else:
                    edu["qualification_id"] = None

        if "spouse" in final_data and final_data["spouse"]:
            if not final_data["spouse"].get("name"):
                final_data["spouse"]["name"] = final_data["user"]["fullname"] + " Spouse"
            final_data["spouse"]["phone_number"] = final_data["spouse"].get("phone_number") or None
        else:
            final_data["spouse"] = None

        # Convert selected_branches to a list of integers
        if "selected_branches" in final_data:
            if isinstance(final_data["selected_branches"], str):
                final_data["selected_branches"] = [int(final_data["selected_branches"])]
            elif isinstance(final_data["selected_branches"], list):
                final_data["selected_branches"] = [int(x) for x in final_data["selected_branches"] if x]

        # Convert scalar fields to appropriate types
        scalar_fields = [
            "position",
            "department",
            "work_type",
            "employee_type",
            "salary",
        ]
        for field in scalar_fields:
            if field in final_data and final_data[field]:
                try:
                    final_data[field] = (
                        float(final_data[field]) if field == "salary" else int(final_data[field])
                    )
                except (ValueError, TypeError):
                    final_data[field] = None

        if "is_active" in final_data:
            final_data["is_active"] = str(final_data["is_active"]).lower() == "true"

        # Ensure empty nested fields are included
        for field in ["next_of_kin", "educations", "work_experiences", "children"]:
            final_data[field] = final_data.get(field, [])

        print(f"Parsed final_data: {final_data}")  # Debug log
        return final_data
    
    @extend_schema(
        operation_id="create_employee",
        tags=["Employee Management"],
        summary="Create employee",
        description="Create a new employee with personal details, bank accounts, next of kin, etc. Supports JSON or form-data with file upload for bulk creation.",
        request=EmployeeSerializer,
        responses={
            201: EmployeeSerializer,
            400: {
                "description": "Validation errors",
                "examples": {
                    "missing_fields": {
                        "summary": "Missing required fields",
                        "value": {"detail": "Missing required user fields"},
                    },
                    "validation_errors": {
                        "summary": "Field validation errors",
                        "value": {
                            "detail": {
                                "date_of_birth": [
                                    "Employee must be at least 18 years old."
                                ]
                            }
                        },
                    },
                },
            },
            500: {"description": "Server error"},
        },
        examples=[
            OpenApiExample(
                name="Complete Employee",
                value={
                    "user": {"fullname": "John Doe", "email": "john@company.com"},
                    "position": 1,
                    "department": 1,
                    "work_type": 1,
                    "employee_type": 1,
                    "gender": "male",
                    "marital_status": "married",
                    "date_of_birth": "1990-01-01",
                    "selected_branches": [1],
                    "is_active": True,
                    "bank_accounts": [{"bank_id": 1, "account_number": "1234567890"}],
                    "next_of_kin": [
                        {
                            "name": "Jane Doe",
                            "phone_number": "+1234567890",
                            "relationship": "spouse",
                        }
                    ],
                },
            ),
            OpenApiExample(
                name="Minimal Employee",
                value={
                    "user": {"fullname": "Jane Smith", "email": "jane@company.com"},
                    "position": 1,
                    "department": 1,
                    "work_type": 1,
                    "employee_type": 1,
                    "gender": "female",
                    "date_of_birth": "1992-03-15",
                    "selected_branches": [1],
                },
            ),
        ],
    )
    def post(self, request):
        if "file" in request.FILES:
            return self.handle_bulk_upload(request)

        # Handle JSON payload
        if request.content_type == "application/json":
            data = request.data
            serializer = EmployeeSerializer(data=data, context={"request": request})
            if not serializer.is_valid():
                return Response(
                    {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )
            try:
                employee = serializer.save()
                if not employee.user.password:
                    random_password = generate_compliant_password()
                    employee.user.set_password(random_password)
                    employee.user.is_password_verified = True
                    employee.user.is_email_verified = True
                    employee.user.welcome_email_sent = True
                    employee.user.save()
                    send_employee_welcome_email.delay_on_commit(
                        employee.user.email, employee.user.fullname, random_password
                    )
                employee.confirm_create()
                return Response(
                    EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response(
                    {"detail": f"Error creating employee: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # Handle multipart/form-data
        if not all(k in request.data for k in ["user.fullname", "user.email"]):
            return Response(
                {"detail": "Missing required user fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse multipart data
        final_data = self.parse_nested_multipart(request.data)
        print(f"Parsed final_data: {final_data}")  # Debug log

        serializer = EmployeeSerializer(data=final_data, context={"request": request})
        if not serializer.is_valid():
            print(f"Serializer errors: {serializer.errors}")  # Debug log
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            employee = serializer.save()
            employee.user.is_password_verified = True
            employee.user.is_email_verified = True
            employee.user.welcome_email_sent = True
            employee.user.save()
            employee.confirm_create()
            send_employee_welcome_email.delay_on_commit(
                employee.user.email, employee.user.fullname, final_data["user"]["password"]
            )
            return Response(
                EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": f"Error creating employee: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # Updated View Method
    def handle_bulk_upload(self, request):
        start_time = timezone.now()
        institution = getattr(request.user.profile, "institution", None)
        if not institution:
            return Response(
                {"detail": "No institution associated with the requesting user.", "created_count": 0, "updated_count": 0, "warnings": []},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = get_or_create_default_role_with_permissions(institution)

        file = request.FILES["file"]
        file_extension = file.name.split(".")[-1].lower()

        if file_extension not in ["csv", "xlsx"]:
            return Response(
                {"detail": "Invalid file format. Only CSV or Excel files are supported.", "created_count": 0, "updated_count": 0, "warnings": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dtype_dict = {
                "employee_id": str,
                "phone_number": str,
                "nin": str,
                "nssf_no": str,
                "tin": str,
                "bank_account_number": str,
                "emergency_contact_phone": str,
            }
            if file_extension == "csv":
                df = pd.read_csv(file, dtype=dtype_dict)
            else:
                df = pd.read_excel(file, dtype=dtype_dict)

            required_columns = ["user.fullname", "user.email"]
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return Response(
                    {"detail": f"Missing required columns: {', '.join(missing_columns)}", "created_count": 0, "updated_count": 0, "warnings": []},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check for duplicate employee_id within the file
            if "employee_id" in df.columns:
                employee_ids = df["employee_id"].str.strip().dropna().tolist()
                duplicate_employee_ids = [eid for eid, count in pd.Series(employee_ids).value_counts().items() if count > 1]
                if duplicate_employee_ids:
                    duplicate_rows = df[df["employee_id"].isin(duplicate_employee_ids)][["employee_id"]].index.tolist()
                    return Response(
                        {
                            "detail": "Duplicate employee IDs found in the uploaded file",
                            "created_count": 0,
                            "updated_count": 0,
                            "warnings": [],
                            "errors": [
                                {
                                    "row": idx + 2,
                                    "errors": {"employee_id": {"error": f"Employee ID '{df.loc[idx, 'employee_id']}' is duplicated in the file"}}
                                } for idx in duplicate_rows
                            ],
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            errors = []
            warnings = []
            employees = []
            created_count = 0
            updated_count = 0

            # Pre-fetch or create related objects
            field_mappings = {
                "department": (Department, "name"),
                "work_type": (WorkType, "name"),
                "employee_type": (EmployeeType, "name"),
                "payroll_branch": (Branch, "name"),
                "bank": (InstitutionBankType, "bank_fullname"),
                "qualification": (QualificationAward, "name"),
            }
            instance_mappings = {field: {} for field in field_mappings}

            for field, (model, lookup_field) in field_mappings.items():
                if field in df.columns:
                    unique_values = set(df[field].dropna().astype(str).str.strip())
                    unique_values = [v for v in unique_values if v]
                    if unique_values:
                        filter_kwargs = {f"{lookup_field}__in": unique_values}
                        if field not in ["bank", "qualification"]:
                            filter_kwargs["institution"] = institution
                        existing = model.objects.filter(**filter_kwargs)
                        for item in existing:
                            instance_mappings[field][str(getattr(item, lookup_field)).lower()] = item
                        missing = [v for v in unique_values if v.lower() not in [str(getattr(item, lookup_field)).lower() for item in existing]]
                        for value in missing:
                            kwargs = {lookup_field: value}
                            if field not in ["bank", "qualification"]:
                                kwargs["institution"] = institution
                                if field == "department":
                                    kwargs["description"] = "Auto-created during bulk upload"
                            instance = model.objects.create(**kwargs)
                            instance_mappings[field][value.lower()] = instance

            position_mappings = {}
            if "position" in df.columns:
                valid_rows = df[(df["position"].notna()) & (df["position"].astype(str).str.strip() != "")].copy()
                if len(valid_rows) > 0:
                    dept_pos_pairs = valid_rows[["department", "position"]].drop_duplicates()
                    for _, row in dept_pos_pairs.iterrows():
                        dept_name = str(row["department"]).strip() if pd.notna(row["department"]) else None
                        pos_name = str(row["position"]).strip()
                        dept_lower = dept_name.lower() if dept_name else None
                        pos_lower = pos_name.lower()
                        dept_instance = instance_mappings.get("department", {}).get(dept_lower) if dept_lower else None
                        filter_kwargs = {"name__iexact": pos_name}
                        if dept_instance:
                            filter_kwargs["department"] = dept_instance
                        else:
                            filter_kwargs["department__isnull"] = True
                        existing_pos = JobPosition.objects.filter(**filter_kwargs).first()
                        if existing_pos:
                            position_mappings[(dept_lower, pos_lower)] = existing_pos
                        else:
                            new_pos = JobPosition.objects.create(
                                name=pos_name,
                                description="Auto-created during bulk upload",
                                department=dept_instance,
                            )
                            position_mappings[(dept_lower, pos_lower)] = new_pos

            with transaction.atomic():
                for index, row in df.iterrows():
                    row_errors = {}
                    row_warnings = []
                    employee_data = {
                        "user": {
                            "fullname": str(row["user.fullname"]).strip() if pd.notna(row["user.fullname"]) else "",
                            "email": str(row["user.email"]).strip() if pd.notna(row["user.email"]) else "",
                        },
                        "selected_branches": [],
                        "bank_accounts": [],
                        "next_of_kin": [],
                        "educations": [],
                        "email": str(row["user.email"]).strip() if pd.notna(row["user.email"]) else "",  # Sync employee.email
                    }

                    # Handle employee_id
                    employee_id = str(row["employee_id"]).strip() if "employee_id" in df.columns and pd.notna(row["employee_id"]) else None
                    if employee_id:
                        employee_data["employee_id"] = employee_id

                    if not employee_data["user"]["fullname"]:
                        row_errors["user.fullname"] = {"error": "This field is required."}
                    if not employee_data["user"]["email"]:
                        row_errors["user.email"] = {"error": "This field is required."}

                    # Check if employee exists based on employee_id
                    existing_employee = None
                    email_changed = False
                    new_password = None
                    if employee_id:
                        existing_employee = Employee.objects.filter(employee_id=employee_id).first()
                        if existing_employee and existing_employee.user.email != employee_data["user"]["email"]:
                            # Check if the new email is already taken by another user
                            if CustomUser.objects.exclude(id=existing_employee.user.id).filter(email=employee_data["user"]["email"]).exists():
                                row_errors["user.email"] = {"error": f"Email '{employee_data['user']['email']}' is already in use by another user."}
                            else:
                                # Email is changing, generate new password and prepare to send welcome email
                                email_changed = True
                                new_password = generate_compliant_password()
                                employee_data["user"]["password"] = new_password
                                employee_data["email"] = employee_data["user"]["email"]

                    # Check for existing user by email
                    existing_user = CustomUser.objects.filter(email=employee_data["user"]["email"]).first()

                    if not existing_employee and existing_user:
                        # If no employee exists but user exists, check if user is linked to another employee
                        if Employee.objects.filter(user=existing_user).exists():
                            row_errors["user.email"] = {"error": f"User with email '{employee_data['user']['email']}' is already linked to another employee."}
                        else:
                            # Update user fullname if different and link to new employee
                            if existing_user.fullname != employee_data["user"]["fullname"]:
                                existing_user.fullname = employee_data["user"]["fullname"]
                                existing_user.save()
                            employee_data["user"] = existing_user
                            employee_data["email"] = existing_user.email  # Sync employee.email

                    if not employee_id and not existing_employee:
                        employee_data["employee_id"] = self.generate_unique_employee_id()
                        if not existing_user:
                            new_password = generate_compliant_password()
                            employee_data["user"]["password"] = new_password
                            employee_data["user"]["welcome_email_sent"] = True

                    if row_errors:
                        errors.append({"row": index + 2, "errors": row_errors})
                        if row_warnings:
                            warnings.append({"row": index + 2, "warnings": row_warnings})
                        continue

                    # Map scalar fields
                    scalar_fields = [
                        "department", "work_type", "employee_type", "payroll_branch", "gender",
                        "marital_status", "is_active", "date_of_birth", "date_of_joining",
                        "phone_number", "address", "country", "nin", "nssf_no", "tin", "skills"
                    ]
                    gender_map = {"male": "male", "female": "female", "other": "other"}
                    marital_status_map = {"single": "single", "married": "married", "divorced": "divorced", "widowed": "widowed"}

                    for field in scalar_fields:
                        if field in df.columns and pd.notna(row[field]):
                            value = str(row[field]).strip()
                            if not value:
                                continue
                            if field in field_mappings:
                                instance = instance_mappings[field].get(value.lower())
                                if instance:
                                    employee_data[field] = instance.id
                                else:
                                    row_errors[field] = {"error": f"Invalid {field}: {value}"}
                            elif field == "gender":
                                mapped = gender_map.get(value.lower())
                                if mapped:
                                    employee_data[field] = mapped
                                else:
                                    row_errors[field] = {"error": f'"{value}" is not a valid choice.'}
                            elif field == "marital_status":
                                mapped = marital_status_map.get(value.lower())
                                if mapped:
                                    employee_data[field] = mapped
                                else:
                                    row_errors[field] = {"error": f'"{value}" is not a valid choice.'}
                            elif field == "is_active":
                                employee_data[field] = value.lower() == "true"
                            elif field in ["date_of_birth", "date_of_joining"]:
                                try:
                                    dob = custom_parse_date(value)
                                    if dob:
                                        if field == "date_of_birth":
                                            if dob > date.today():
                                                row_errors[field] = {"error": "Date of birth cannot be in the future."}
                                            age = (date.today() - dob).days // 365
                                            if age < 18:
                                                row_errors[field] = {"error": f"Employee must be at least 18 years old. Current age: {age}."}
                                            else:
                                                employee_data[field] = dob
                                        else:
                                            employee_data[field] = dob
                                except ValueError as e:
                                    row_errors[field] = {"error": str(e)}
                            else:
                                employee_data[field] = value

                    # Map position
                    if "position" in df.columns and pd.notna(row["position"]):
                        pos_name = str(row["position"]).strip()
                        dept_name = str(row.get("department", "")).strip() if pd.notna(row.get("department")) else None
                        dept_lower = dept_name.lower() if dept_name else None
                        pos_lower = pos_name.lower()
                        position_instance = position_mappings.get((dept_lower, pos_lower))
                        if position_instance:
                            employee_data["position"] = position_instance.id
                        else:
                            row_errors["position"] = {"error": f"Invalid position: {pos_name}"}

                    # Map emergency contact to NextOfKin
                    if "emergency_contact_phone" in df.columns and pd.notna(row["emergency_contact_phone"]) and row["emergency_contact_phone"].strip():
                        relationship = str(row.get("emergency_contact_relationship", "other")).strip().lower() if "emergency_contact_relationship" in df.columns else "other"
                        valid_relationships = ["father", "mother", "spouse", "child", "other"]
                        if relationship not in valid_relationships:
                            row_warnings.append({
                                "field": "emergency_contact_relationship",
                                "message": f"Invalid relationship '{relationship}' mapped to 'other'"
                            })
                            relationship = "other"
                        next_of_kin_data = {
                            "name": str(row.get("emergency_contact_name", "Primary Contact")).strip() if "emergency_contact_name" in df.columns else "Primary Contact",
                            "phone_number": str(row["emergency_contact_phone"]).strip(),
                            "address": str(row.get("address", "Unknown")).strip(),
                            "relationship": relationship,
                        }
                        employee_data["next_of_kin"].append(next_of_kin_data)

                    # Map bank details to EmployeeBankAccount
                    if "bank" in df.columns and "bank_account_number" in df.columns:
                        bank_name = str(row["bank"]).strip() if pd.notna(row["bank"]) else None
                        account_number = str(row["bank_account_number"]).strip() if pd.notna(row["bank_account_number"]) else None
                        if bank_name and account_number:
                            bank_instance = instance_mappings["bank"].get(bank_name.lower())
                            if not bank_instance:
                                try:
                                    bank_instance = InstitutionBankType.objects.create(bank_fullname=bank_name)
                                    instance_mappings["bank"][bank_name.lower()] = bank_instance
                                except Exception as e:
                                    row_errors["bank"] = {"error": f"Failed to create bank '{bank_name}': {str(e)}"}
                                    bank_instance = None
                            if bank_instance:
                                bank_data = {
                                    "bank": bank_instance,
                                    "account_name": employee_data["user"]["fullname"] if "user" in employee_data else "Unknown",
                                    "account_number": account_number,
                                }
                                employee_data["bank_accounts"].append(bank_data)
                        elif bank_name or account_number:
                            row_warnings.append({
                                "field": "bank/bank_account_number",
                                "message": f"Both bank and bank_account_number must be provided, found bank='{bank_name}', account_number='{account_number}'"
                            })

                    # Map qualification to Education
                    if "qualification" in df.columns and pd.notna(row["qualification"]) and row["qualification"].strip():
                        qualification_name = str(row["qualification"]).strip()
                        if qualification_name:
                            qualification_instance = instance_mappings["qualification"].get(qualification_name.lower())
                            if not qualification_instance:
                                try:
                                    qualification_instance = QualificationAward.objects.create(
                                        name=qualification_name,
                                        description="Auto-created during bulk upload"
                                    )
                                    instance_mappings["qualification"][qualification_name.lower()] = qualification_instance
                                except Exception as e:
                                    row_errors["qualification"] = {"error": f"Failed to create qualification '{qualification_name}': {str(e)}"}
                            if qualification_instance:
                                education_data = {
                                    "qualification": qualification_instance,
                                    "institution": "Unknown Institution",
                                    "year": date.today().year,
                                }
                                employee_data["educations"].append(education_data)

                    # Map selected_branches
                    if "selected_branches" in df.columns and pd.notna(row["selected_branches"]):
                        branches = row["selected_branches"]
                        if isinstance(branches, str):
                            try:
                                branches = json.loads(branches)
                            except json.JSONDecodeError:
                                row_errors["selected_branches"] = {"error": "Invalid JSON format for selected_branches"}
                            else:
                                employee_data["selected_branches"] = branches
                        elif isinstance(branches, list):
                            employee_data["selected_branches"] = branches
                        else:
                            employee_data["selected_branches"] = []

                    if row_errors:
                        errors.append({"row": index + 2, "errors": row_errors})
                        if row_warnings:
                            warnings.append({"row": index + 2, "warnings": row_warnings})
                        continue

                    # Validate with EmployeeSerializer
                    serializer_context = {"request": request}
                    if existing_employee:
                        serializer = EmployeeSerializer(instance=existing_employee, data=employee_data, context=serializer_context, partial=True)
                    else:
                        serializer = EmployeeSerializer(data=employee_data, context=serializer_context)

                    if not serializer.is_valid():
                        errors.append({"row": index + 2, "errors": serializer.errors})
                        if row_warnings:
                            warnings.append({"row": index + 2, "warnings": row_warnings})
                        continue

                    try:
                        employee = serializer.save()
                        employees.append(employee)
                        if existing_employee:
                            updated_count += 1
                            if email_changed:
                                # Resend welcome email with new password for email change
                                send_employee_welcome_email.delay_on_commit(
                                    employee.user.email,
                                    employee.user.fullname,
                                    new_password,
                                )
                        else:
                            created_count += 1
                            if not existing_user:
                                # Send welcome email for new user
                                send_employee_welcome_email.delay_on_commit(
                                    employee.user.email,
                                    employee.user.fullname,
                                    new_password or employee_data["user"].get("password", ""),
                                )
                        if row_warnings:
                            warnings.append({"row": index + 2, "warnings": row_warnings})
                    except Exception as e:
                        errors.append({"row": index + 2, "errors": {"non_field_errors": str(e)}})
                        if row_warnings:
                            warnings.append({"row": index + 2, "warnings": row_warnings})

            if errors:
                return Response(
                    {
                        "detail": "Some rows failed validation or processing",
                        "created_count": created_count,
                        "updated_count": updated_count,
                        "warnings": warnings,
                        "errors": errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not institution.default_employee_role:
                institution.default_employee_role = role
                institution.save()

            return Response(
                {
                    "detail": "Employees processed successfully",
                    "created_count": created_count,
                    "updated_count": updated_count,
                    "warnings": warnings,
                    "data": EmployeeSerializer(employees, many=True, context={"request": request}).data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"detail": f"Error processing file: {str(e)}", "created_count": 0, "updated_count": 0, "warnings": []},
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
        columns = [
            "employee_id",
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
            "nssf_no",
            "tin",
            "skills",
            "marital_status",
        ]

        sample_data = {
            "employee_id": "SPWA-Q1615",
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
            "nssf_no": "NSSF123456",
            "tin": "TIN123456",
            "skills": "Python, Django",
            "marital_status": "Married",
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
            for col_num, column_title in enumerate(columns, 1):
                cell = ws.cell(row=1, column=col_num)
                cell.value = column_title
                cell.font = cell.font.copy(bold=True)
            for col_num, column_title in enumerate(columns, 1):
                ws.cell(row=2, column=col_num).value = sample_data.get(column_title, "")
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def parse_nested_multipart(self, query_dict, employee):
        """Parse multipart/form-data into a nested structure."""
        final_data = defaultdict(list)
        nested_fields = [
            "bank_accounts",
            "next_of_kin",
            "educations",
            "work_experiences",
            "children",
            "spouse",
        ]

        # Initialize lists for array fields and dict for spouse
        for field in nested_fields:
            if field != "spouse":
                final_data[field] = []
            else:
                final_data[field] = {}

        # Process all keys in the QueryDict
        for key, values in query_dict.lists():
            # Handle scalar fields
            if key in [
                "user.fullname",
                "user.email",
                "email",
                "phone_number",
                "gender",
                "date_of_birth",
                "date_of_joining",
                "address",
                "country",
                "nin",
                "tin",
                "nssf_no",
                "salary",
                "is_active",
                "skills",
                "marital_status",
                "selected_branches",
                "work_type",
                "employee_type",
                "position",
                "department",
            ]:
                final_data[key.replace("[]", "")] = values[0] if len(values) == 1 else values
                continue

            # Handle nested fields
            for field in nested_fields:
                if field == "spouse" and key.startswith("spouse."):
                    # Handle spouse fields (e.g., spouse.name, spouse.phone_number)
                    subfield = key[len("spouse."):].replace("[]", "")
                    final_data[field][subfield] = values[0] if values else None
                elif key.startswith(field + "["):
                    try:
                        index_str, subfield = key[len(field + "["):].split("].", 1)
                        index = int(index_str) if field != "spouse" else None
                    except (ValueError, IndexError):
                        continue

                    # Ensure the list for this field has enough entries
                    if field != "spouse":
                        while len(final_data[field]) <= index:
                            final_data[field].append({})
                        final_data[field][index][subfield] = values[0] if values else None

        # Transform the defaultdict to a regular dict
        final_data = dict(final_data)

        # Structure user data
        if "user.fullname" in final_data or "user.email" in final_data:
            final_data["user"] = {
                "fullname": final_data.pop("user.fullname", employee.user.fullname),
                "email": final_data.pop("user.email", employee.user.email),
            }

        # Fix field names and ensure proper types
        if "bank_accounts" in final_data:
            for bank in final_data["bank_accounts"]:
                bank["account_name"] = bank.get("account_name", final_data["user"]["fullname"])
                bank["account_number"] = bank.get("account_number", "")

        if "next_of_kin" in final_data:
            for kin in final_data["next_of_kin"]:
                if "contact" in kin:
                    kin["phone_number"] = kin.pop("contact")
                kin["phone_number"] = kin.get("phone_number") or None
                kin["address"] = kin.get("address", "Unknown")
                kin["relationship"] = kin.get("relationship", "other")

        if "educations" in final_data:
            for edu in final_data["educations"]:
                if "institute" in edu:
                    edu["institution"] = edu.pop("institute")
                if "award" in edu:
                    edu["name"] = edu.pop("award")
                if "year" in edu:
                    try:
                        edu["year"] = int(edu["year"])
                    except (ValueError, TypeError):
                        edu["year"] = None
                if "qualification" in edu and edu["qualification"]:
                    try:
                        qual = QualificationAward.objects.get(name=edu["qualification"])
                        edu["qualification_id"] = qual.id
                    except QualificationAward.DoesNotExist:
                        qual = QualificationAward.objects.create(name=edu["qualification"])
                        edu["qualification_id"] = qual.id
                else:
                    edu["qualification_id"] = None

        if "spouse" in final_data and final_data["spouse"]:
            if not final_data["spouse"].get("name"):
                final_data["spouse"]["name"] = final_data["user"]["fullname"] + " Spouse"
            final_data["spouse"]["phone_number"] = final_data["spouse"].get("phone_number") or None
        else:
            final_data["spouse"] = None

        # Convert selected_branches to a list of integers
        if "selected_branches" in final_data:
            if isinstance(final_data["selected_branches"], str):
                final_data["selected_branches"] = [int(final_data["selected_branches"])]
            elif isinstance(final_data["selected_branches"], list):
                final_data["selected_branches"] = [int(x) for x in final_data["selected_branches"] if x]

        # Convert scalar fields to appropriate types
        scalar_fields = [
            "position",
            "department",
            "work_type",
            "employee_type",
            "salary",
        ]
        for field in scalar_fields:
            if field in final_data and final_data[field]:
                try:
                    final_data[field] = (
                        float(final_data[field]) if field == "salary" else int(final_data[field])
                    )
                except (ValueError, TypeError):
                    final_data[field] = None

        if "is_active" in final_data:
            final_data["is_active"] = str(final_data["is_active"]).lower() == "true"

        # Ensure empty nested fields are included
        for field in ["next_of_kin", "educations", "work_experiences", "children"]:
            final_data[field] = final_data.get(field, [])

        print(f"Parsed final_data: {final_data}")  # Debug log
        return final_data

    @extend_schema(
        request=EmployeeSerializer,
        responses={
            200: EmployeeSerializer,
            400: {
                "description": "Validation errors",
                "examples": {
                    "validation_errors": {
                        "summary": "Field validation errors",
                        "value": {
                            "detail": {
                                "date_of_birth": [
                                    "Employee must be at least 18 years old."
                                ]
                            }
                        },
                    }
                },
            },
            404: {"description": "Employee not found"},
            500: {"description": "Server error"},
        },
        description="Update an existing employee's details, including personal information, bank accounts, next of kin, etc. Supports JSON or form-data.",
        summary="Update Employee",
        tags=["Employee Management"],
    )
    def patch(self, request, employee_id):
        try:
            employee = Employee.objects.get(pk=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Handle JSON payload
        if request.content_type == "application/json":
            data = request.data
            serializer = EmployeeSerializer(
                employee, data=data, context={"request": request}, partial=True
            )
            if not serializer.is_valid():
                return Response(
                    {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )
            try:
                employee = serializer.save()
                return Response(
                    EmployeeSerializer(employee).data, status=status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {"detail": f"Error updating employee: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # Handle multipart/form-data
        final_data = self.parse_nested_multipart(request.data, employee)
        serializer = EmployeeSerializer(
            employee, data=final_data, context={"request": request}, partial=True
        )
        if not serializer.is_valid():
            print(f"Serializer errors: {serializer.errors}")  # Debug log
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            employee = serializer.save()
            return Response(
                EmployeeSerializer(employee).data, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": f"Error updating employee: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmployeeDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={204: "No Content", 404: "Not Found"},
        description="Delete an existing employee.",
        summary="Delete Employee",
        tags=["Employee Management"],
    )
    def delete(self, request, institution_id, employee_id):
        try:
            employee = Employee.objects.get(
                id=employee_id, department__institution_id=institution_id
            )
            employee.approval_status = "under_deletion"
            employee.delete()
            employee.confirm_delete()
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
            employee.approval_status = "under_update"
            employee.save()
            result = self._attach_branches(employee, processed_branches, request.user)
            employee.confirm_update()

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
                employee.approval_status = "under_update"
                employee.payroll_branch = branch
                employee.save(update_fields=["payroll_branch", "approval_status"])
                employee.confirm_update()

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
class EmployeeAttendanceListCreateAPIView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = [
        "employee",
        "created_at",
        "date",
        "is_active",
        "check_in_time",
        "check_out_time",
    ]
    default_ordering = ["employee"]

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

        try:
            records = self.apply_sorting(records, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            existing.approval_status = "under_update"
            if serializer.is_valid():
                serializer.save()
                existing.confirm_update()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Pass context to the serializer for creation
            serializer = EmployeeAttendanceSerializer(data=data, context=context)
            if serializer.is_valid():
                attendance = serializer.save()
                attendance.confirm_create()
                employee_instance = Employee.objects.get(id=employee)
                create_spotchecks_for_today(employee_instance)
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
        record.approval_status = "under_update"
        serializer = EmployeeAttendanceSerializer(
            record, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            record.confirm_update()
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
class EmployeeTypeListCreateAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ["name", "created_at", "description", "is_active"]
    default_ordering = ["name"]

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

        try:
            data = self.apply_sorting(data, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            record = serializer.save()
            record.confirm_create()
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
        obj.approval_status = "under_update"
        if serializer.is_valid():
            serializer.save()
            obj.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete an employee type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.approval_status = "under_deletion"
        obj.delete()  # Custom delete method that handles soft delete
        obj.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Work Type"])
class WorkTypeListCreateAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ["name", "created_at", "description", "is_active"]
    default_ordering = ["name"]

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

        try:
            data = self.apply_sorting(data, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            record = serializer.save()
            record.confirm_create()
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
        obj.approval_status = "under_update"
        serializer = WorkTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            obj.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete a work type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.approval_status = "under_deletion"
        obj.delete()  # Custom delete method that handles soft delete
        obj.confirm_delete()
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
        obj.approval_status = "under_update"
        serializer = EmployeeTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            obj.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete an employee type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.approval_status = "under_deletion"
        obj.delete()  # Custom method to handle soft delete
        obj.confirm_delete()
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
        obj.approval_status = "under_update"
        serializer = WorkTypeSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            obj.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description="Delete a work type", responses={204: None})
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.approval_status = "under_deletion"
        obj.delete()  # Custom delete method to handle soft delete
        obj.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeContractListAPIView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ["employee", "created_at", "status", "is_active"]
    default_ordering = ["employee"]

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

        try:
            contracts = self.apply_sorting(contracts, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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
            instance = serializer.save()
            instance.confirm_create()
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
        contract.approval_status = "under_update"
        serializer = EmployeeContractSerializer(
            contract, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            contract.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete an employee contract",
        responses={204: None},
        tags=["Employee Contract"],
    )
    def delete(self, request, pk):
        contract = self.get_object(pk)
        contract.approval_status = "under_deletion"
        contract.delete()  # Custom delete method to handle soft delete
        contract.confirm_delete()
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

    permission_classes = [IsAuthenticated]

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
        user = request.user.profile

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            logger.error(f"Institution not found for user {request.user.id}")
            return Response(
                {"error": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AttendanceReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]
        context = serializer.get_report_context()

        try:
            logger.info(
                f"Generating Excel for {start_date} to {end_date}, context: {context}"
            )
            excel_file = generate_attendance_excel(
                start_date, end_date, context, institution
            )
            filename = f"ATTENDANCE_REPORT_{start_date}_{end_date}_{timezone.now().strftime('%Y%m%d')}.xlsx"
            response = HttpResponse(
                excel_file.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{escape_uri_path(filename)}"'
            )
            return response

        except ValueError as e:
            logger.error(f"ValueError in generate_attendance_excel: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(
                f"Unexpected error in generate_attendance_excel: {str(e)}",
                exc_info=True,
            )
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
            return Response(
                {"error": "Internal server error while generating report."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmployeeShiftListCreateView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "employee",
        "created_at",
        "shift",
        "context",
        "shift_status",
        "date" "is_active",
    ]
    default_ordering = ["employee"]

    @extend_schema(
        summary="List all employee shifts or create a new shift",
        request=EmployeeShiftSerializer,
        responses=EmployeeShiftSerializer,
        tags=["Shifts-Allocations/Requests"],
    )
    def get(self, request):
        user = request.user

        profile = getattr(user, "profile", None)

        if not profile or not profile.institution:
            return Response({"detail": "No institution linked"}, status=400)

        institution = profile.institution

        query_context = request.query_params.get("context", "all").upper()
        search = request.query_params.get("search")
        is_employee_specific = request.query_params.get("is_employee_specific")
        employee_id = request.query_params.get("employee_id")

        shifts = EmployeeShift.objects.filter(
            shift__branch__institution=institution, is_active=True
        )

        if query_context in ["ALLOCATION", "REQUEST"]:
            shifts = shifts.filter(context=query_context)

        if is_employee_specific == "true" and employee_id:
            shifts = shifts.filter(employee=int(employee_id))

        if search:
            shifts = shifts.filter(
                Q(employee__user__fullname__icontains=search)
                | Q(employee__user__email__icontains=search)
            )

        try:
            shifts = self.apply_sorting(shifts, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            shift.confirm_create()
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

        shift.approval_status = "under_update"
        serializer = EmployeeShiftSerializer(
            shift, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            shift = serializer.save()
            shift.confirm_update()
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

        shift.approval_status = "under_deletion"
        shift.delete()
        shift.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeDashboardAPIView(APIView):
    """
    API endpoint for employee dashboard analytics.
    Provides aggregated metrics on employees, employee types, work types, shifts, and demographics,
    filtered by the authenticated user's institution.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Employee Dashboard"],
        description=(
            "Retrieves key analytics for the employee module dashboard, filtered by the authenticated user's institution. "
            "Metrics include employee counts, demographics, employee types, work types, shift statuses, "
            "average age, average tenure, and recent hires."
        ),
        responses={
            200: {
                "type": "object",
                "properties": {
                    "total_employees": {
                        "type": "integer",
                        "description": "Total active employees",
                    },
                    "employees_by_gender": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "gender": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Employee count by gender",
                    },
                    "employees_by_employee_type": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "employee_type": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Employee count by employee type",
                    },
                    "employees_by_work_type": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "work_type": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Employee count by work type",
                    },
                    "employees_by_department": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "department": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Employee count by department",
                    },
                    "shift_statuses": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "status": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Shift counts by status (last 30 days)",
                    },
                    "average_age": {
                        "type": "integer",
                        "description": "Average employee age",
                    },
                    "average_tenure_years": {
                        "type": "number",
                        "description": "Average years of tenure",
                    },
                    "recent_hires": {
                        "type": "integer",
                        "description": "Employees hired in last 30 days",
                    },
                    "employees_by_marital_status": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "marital_status": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Employee count by marital status",
                    },
                },
            },
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
        },
    )
    def get(self, request):
        from datetime import date
        from django.db.models import (
            Avg,
            Count,
            F,
            ExpressionWrapper,
            IntegerField,
            FloatField,
            Case,
            When,
        )
        from django.utils import timezone
        from datetime import timedelta

        user = request.user
        institution = getattr(user.profile, "institution", None)

        if not institution:
            return Response(
                {"error": "User is not associated with any institution"}, status=400
            )

        # Filter employees by institution
        employees = Employee.objects.filter(
            department__institution=institution, deleted_at__isnull=True
        )

        # Total employees
        total_employees = employees.count()

        # Employees by gender
        employees_by_gender = list(
            employees.values("gender").annotate(count=Count("id")).order_by("gender")
        )

        # Employees by employee type
        employees_by_employee_type = list(
            employees.values("employee_type__name")
            .annotate(count=Count("id"))
            .order_by("employee_type__name")
        )

        # Employees by work type
        employees_by_work_type = list(
            employees.values("work_type__name")
            .annotate(count=Count("id"))
            .order_by("work_type__name")
        )

        # Employees by department
        employees_by_department = list(
            employees.values("department__name")
            .annotate(count=Count("id"))
            .order_by("department__name")
        )

        # Shift statuses (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        shift_statuses = list(
            EmployeeShift.objects.filter(
                employee__department__institution=institution,
                date__gte=thirty_days_ago,
                employee__deleted_at__isnull=True,
            )
            .values("shift_status")
            .annotate(count=Count("id"))
            .order_by("shift_status")
        )

        # Method 1: Calculate average age using database aggregation (More efficient for large datasets)
        current_date = timezone.now().date()

        # Calculate age in days then convert to years
        avg_age_result = employees.filter(date_of_birth__isnull=False).aggregate(
            avg_age=Avg(
                ExpressionWrapper(
                    F("date_of_birth__year") * -1
                    + current_date.year
                    + Case(
                        When(date_of_birth__month__gt=current_date.month, then=-1),
                        When(
                            date_of_birth__month=current_date.month,
                            date_of_birth__day__gt=current_date.day,
                            then=-1,
                        ),
                        default=0,
                        output_field=IntegerField(),
                    ),
                    output_field=FloatField(),
                )
            )
        )
        average_age = (
            round(avg_age_result["avg_age"]) if avg_age_result["avg_age"] else 0
        )

        # Method 2: Alternative calculation using Python (More accurate but less efficient for large datasets)
        # employees_with_birth_date = employees.filter(date_of_birth__isnull=False)
        # if employees_with_birth_date.exists():
        #     ages = []
        #     for emp in employees_with_birth_date:
        #         age = current_date.year - emp.date_of_birth.year
        #         if (current_date.month, current_date.day) < (emp.date_of_birth.month, emp.date_of_birth.day):
        #             age -= 1
        #         ages.append(age)
        #     average_age = round(sum(ages) / len(ages))
        # else:
        #     average_age = 0

        # Calculate average tenure (in years) - Fixed calculation
        avg_tenure_result = employees.filter(date_of_joining__isnull=False).aggregate(
            avg_tenure=Avg(
                ExpressionWrapper(
                    current_date.year
                    - F("date_of_joining__year")
                    + Case(
                        When(date_of_joining__month__gt=current_date.month, then=-1),
                        When(
                            date_of_joining__month=current_date.month,
                            date_of_joining__day__gt=current_date.day,
                            then=-1,
                        ),
                        default=0,
                        output_field=IntegerField(),
                    ),
                    output_field=FloatField(),
                )
            )
        )
        average_tenure_years = (
            round(avg_tenure_result["avg_tenure"], 1)
            if avg_tenure_result["avg_tenure"]
            else 0
        )

        # Alternative Python-based tenure calculation (more precise)
        # employees_with_join_date = employees.filter(date_of_joining__isnull=False)
        # if employees_with_join_date.exists():
        #     tenures = []
        #     for emp in employees_with_join_date:
        #         tenure_years = current_date.year - emp.date_of_joining.year
        #         if (current_date.month, current_date.day) < (emp.date_of_joining.month, emp.date_of_joining.day):
        #             tenure_years -= 1
        #         # Add fractional part for more precision
        #         if emp.date_of_joining.month <= current_date.month:
        #             months_diff = current_date.month - emp.date_of_joining.month
        #             if emp.date_of_joining.day <= current_date.day:
        #                 days_diff = current_date.day - emp.date_of_joining.day
        #             else:
        #                 months_diff -= 1
        #                 days_diff = (current_date.replace(day=1) - timedelta(days=1)).day - emp.date_of_joining.day + current_date.day
        #         else:
        #             months_diff = 12 - emp.date_of_joining.month + current_date.month
        #             tenure_years -= 1
        #             days_diff = current_date.day - emp.date_of_joining.day if emp.date_of_joining.day <= current_date.day else 0
        #
        #         tenure_precise = tenure_years + (months_diff + days_diff/30.44) / 12  # 30.44 is average days per month
        #         tenures.append(tenure_precise)
        #     average_tenure_years = round(sum(tenures) / len(tenures), 1)
        # else:
        #     average_tenure_years = 0

        # Recent hires (last 30 days)
        recent_hires = employees.filter(
            date_of_joining__gte=thirty_days_ago.date()
        ).count()

        # Employees by marital status
        employees_by_marital_status = list(
            employees.values("marital_status")
            .annotate(count=Count("id"))
            .order_by("marital_status")
        )

        data = {
            "total_employees": total_employees,
            "employees_by_gender": [
                {"gender": item["gender"] or "Unknown", "count": item["count"]}
                for item in employees_by_gender
            ],
            "employees_by_employee_type": [
                {"employee_type": item["employee_type__name"], "count": item["count"]}
                for item in employees_by_employee_type
                if item["employee_type__name"]
            ],
            "employees_by_work_type": [
                {"work_type": item["work_type__name"], "count": item["count"]}
                for item in employees_by_work_type
                if item["work_type__name"]
            ],
            "employees_by_department": [
                {"department": item["department__name"], "count": item["count"]}
                for item in employees_by_department
                if item["department__name"]
            ],
            "shift_statuses": shift_statuses,
            "average_age": average_age,
            "average_tenure_years": average_tenure_years,
            "recent_hires": recent_hires,
            "employees_by_marital_status": employees_by_marital_status,
        }

        return Response(data)


class AttendanceDashboardAPIView(APIView):
    """
    API endpoint for attendance dashboard analytics.
    Provides aggregated metrics on employee attendance and spot checks,
    filtered by the authenticated user's institution.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Attendance Dashboard"],
        description=(
            "Retrieves key analytics for the attendance module dashboard, filtered by the authenticated user's institution. "
            "Metrics include attendance status distribution, average overtime hours, average late minutes, "
            "spot check response rates, and attendance trends over the last 30 days."
        ),
        responses={
            200: {
                "type": "object",
                "properties": {
                    "total_attendance_records": {
                        "type": "integer",
                        "description": "Total attendance records (last 30 days)",
                    },
                    "attendance_by_status": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "status": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Attendance records by status (last 30 days)",
                    },
                    "average_overtime_hours": {
                        "type": "number",
                        "description": "Average overtime hours per record",
                    },
                    "average_late_minutes": {
                        "type": "integer",
                        "description": "Average late minutes per record",
                    },
                    "average_early_checkout_minutes": {
                        "type": "integer",
                        "description": "Average early checkout minutes per record",
                    },
                    "spot_check_response_rate": {
                        "type": "number",
                        "description": "Percentage of spot checks responded to",
                    },
                    "spot_checks_by_status": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "status": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Spot check counts by status (last 30 days)",
                    },
                    "attendance_over_time": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "date": {"type": "string"},
                                "count": {"type": "integer"},
                            },
                        },
                        "description": "Daily attendance records over the last 30 days",
                    },
                },
            },
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
        },
    )
    def get(self, request):
        user = request.user
        institution = getattr(user.profile, "institution", None)

        if not institution:
            return Response(
                {"error": "User is not associated with any institution"}, status=400
            )

        # Filter by institution and last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        attendance_records = EmployeeAttendance.objects.filter(
            employee__department__institution=institution,
            date__gte=thirty_days_ago,
            employee__deleted_at__isnull=True,
        )

        # Total attendance records
        total_attendance_records = attendance_records.count()

        # Attendance by status
        attendance_by_status = list(
            attendance_records.values("attendance_status")
            .annotate(count=Count("id"))
            .order_by("attendance_status")
        )

        # Average overtime hours
        avg_overtime = attendance_records.aggregate(avg_overtime=Avg("overtime_hours"))[
            "avg_overtime"
        ]
        average_overtime_hours = round(float(avg_overtime), 2) if avg_overtime else 0.0

        # Average late minutes
        avg_late = attendance_records.aggregate(avg_late=Avg("late_minutes"))[
            "avg_late"
        ]
        average_late_minutes = round(avg_late) if avg_late else 0

        # Average early checkout minutes
        avg_early_checkout = attendance_records.aggregate(
            avg_early_checkout=Avg("early_checkout_minutes")
        )["avg_early_checkout"]
        average_early_checkout_minutes = (
            round(avg_early_checkout) if avg_early_checkout else 0
        )

        # Spot checks (last 30 days)
        spot_checks = EmployeeSpotCheck.objects.filter(
            employee__department__institution=institution,
            spotcheck_time__gte=thirty_days_ago,
            employee__deleted_at__isnull=True,
        )
        total_spot_checks = spot_checks.count()
        responded_spot_checks = spot_checks.filter(responded_at__isnull=False).count()
        spot_check_response_rate = (
            round((responded_spot_checks / total_spot_checks * 100), 1)
            if total_spot_checks > 0
            else 0.0
        )

        # Spot checks by status
        spot_checks_by_status = list(
            spot_checks.values("status__status_name")
            .annotate(count=Count("id"))
            .order_by("status__status_name")
        )

        # Attendance over time (daily counts)
        attendance_over_time = list(
            attendance_records.values("date")
            .annotate(count=Count("id"))
            .order_by("date")
            .values("date", "count")
        )
        attendance_over_time = [
            {"date": item["date"].strftime("%Y-%m-%d"), "count": item["count"]}
            for item in attendance_over_time
        ]

        data = {
            "total_attendance_records": total_attendance_records,
            "attendance_by_status": [
                {"status": item["attendance_status"], "count": item["count"]}
                for item in attendance_by_status
            ],
            "average_overtime_hours": average_overtime_hours,
            "average_late_minutes": average_late_minutes,
            "average_early_checkout_minutes": average_early_checkout_minutes,
            "spot_check_response_rate": spot_check_response_rate,
            "spot_checks_by_status": [
                {"status": item["status__status_name"], "count": item["count"]}
                for item in spot_checks_by_status
            ],
            "attendance_over_time": attendance_over_time,
        }

        return Response(data)
