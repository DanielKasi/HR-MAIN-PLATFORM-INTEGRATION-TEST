from .models import (
    Employee,
    EmployeeAttendance,
    EmployeeType,
    WorkType,
    EmployeeContract,
)
from rest_framework import serializers
from users.serializers import CustomUserSerializer
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import transaction
from institution.models import Branch, UserBranch
from employee.models import EmployeeContract
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
import os
from django.conf import settings
from recruitment.models import JobAdvertApplication
from django.template.loader import render_to_string
from weasyprint import HTML
from django.utils.text import slugify
from docx import Document
from weasyprint import HTML
from utilities.helpers import get_or_create_default_role_with_permissions
from django.core.validators import FileExtensionValidator
import PyPDF2
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from settings.serializers import SystemDaySerializer
from settings.models import SystemDay
from .models import EmployeeWorkingDays
from institution.models import Department
from recruitment.models import JobPosition
from datetime import date, timedelta


class EmployeeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeType
        fields = "__all__"


class WorkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = "__all__"


class EmployeeSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer()
    department_details = serializers.SerializerMethodField()
    position_details = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    selected_branches = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    employee_working_days = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = "__all__"

    def validate_date_of_birth(self, value):
        """
        Ensure the employee is at least 18 years old based on their date of birth.
        """
        if value:
            today = date.today()
            age = relativedelta(today, value).years
            if age < 18:
                raise serializers.ValidationError(
                    {"error": f"Employee must be at least 18 years old."}
                )
        return value

    @transaction.atomic
    def create(self, validated_data):

        request = self.context.get("request")

        user_data = validated_data.pop("user", None)

        selected_branches = validated_data.pop("selected_branches", None)

        if user_data:
            user_serializer = CustomUserSerializer(data=user_data)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()
            validated_data["user"] = user

            institution = getattr(request.user.profile, "institution", None)

            institution_id = getattr(institution, "id", None) if institution else None

            if institution_id:
                from institution.models import Institution

                try:
                    institution = Institution.objects.get(id=institution_id)

                    role = get_or_create_default_role_with_permissions(institution)

                    from users.models import UserRole, Profile

                    UserRole.objects.get_or_create(user=user, role=role)
                    Profile.objects.create(user=user, institution=institution, bio="")

                    if not institution.default_employee_role:
                        institution.default_employee_role = role
                        institution.save()

                except Institution.DoesNotExist:
                    raise serializers.ValidationError(
                        {"error": f"Institution does not exist for the provided user."}
                    )

        employee = Employee.objects.create(**validated_data)

        for i, branch_id in enumerate(selected_branches or []):
            try:
                branch = Branch.objects.get(id=branch_id)
                UserBranch.objects.get_or_create(
                    user=employee.user,
                    branch=branch,
                    defaults={
                        "is_default": i == 0,
                    },
                )
            except Branch.DoesNotExist:
                raise serializers.ValidationError(
                    {"error": f"Branch with ID {branch_id} does not exist."}
                )

        return employee

    @transaction.atomic
    def update(self, instance, validated_data):

        print("==> Validated data passed to update():", validated_data)
        user_data = validated_data.pop("user", None)

        if user_data:
            user_serializer = CustomUserSerializer(
                instance.user, data=user_data, partial=True
            )
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()

        # Update employee fields
        salary_value = validated_data.pop("salary", None)

        print(f"\n\n\n{validated_data}")
        for attr, value in validated_data.items():
            print(f"Setting {attr} = {value}")
            setattr(instance, attr, value)
        instance.save()

        if salary_value is not None:
            Employee.objects.filter(id=instance.id).update(salary=salary_value)

        instance.refresh_from_db()
        print("\n\nFinal employee salary in memory:", instance.salary)
        print(
            "Final employee salary in DB:", Employee.objects.get(id=instance.id).salary
        )

        return instance

    def get_roles(self, obj):
        """Get roles for the employee's user"""
        if obj.user:
            try:
                from .models import (
                    UserRole,
                )

                user_roles = UserRole.objects.filter(user=obj.user).select_related(
                    "role"
                )
                return [
                    {"id": user_role.role.id, "name": user_role.role.name}
                    for user_role in user_roles
                ]
            except:
                return []
        return []

    def get_department_details(self, obj):
        if obj.department:
            return {
                "id": obj.department.id,
                "name": obj.department.name,
                "institution_id": obj.department.institution.id,
            }
        return None

    def get_position_details(self, obj):
        if obj.position:
            return {
                "id": obj.position.id,
                "name": obj.position.name,
                "department_id": (
                    obj.position.department.id if obj.position.department else None
                ),
            }
        return None

    def get_employee_working_days(self, obj):
        try:
            working_days = EmployeeWorkingDays.objects.get(employee=obj)
            return EmployeeWorkingDaysSerializer(working_days).data
        except EmployeeWorkingDays.DoesNotExist:
            return None

    def to_representation(self, instance):
        """Override to include department and position names in the main fields"""
        data = super().to_representation(instance)

        if data["department_details"]:
            data["department"] = data["department_details"]

        if data["position_details"]:
            data["position"] = data["position_details"]

        data.pop("department_details", None)
        data.pop("position_details", None)

        return data


class EmployeeWorkingDaysSerializer(serializers.ModelSerializer):
    days = serializers.PrimaryKeyRelatedField(
        queryset=SystemDay.objects.all(),
        many=True,
    )

    class Meta:
        model = EmployeeWorkingDays
        fields = "__all__"
        read_only_fields = ["id", "employee"]

    def validate(self, data):
        selected_days = data.get("days")
        instance = self.instance
        employee = data.get("employee") or (instance.employee if instance else None)

        if (
            not employee
            or not employee.department
            or not employee.department.institution
        ):
            raise serializers.ValidationError(
                {"error": f"Employee must belong to a department and institution."}
            )

        institution = employee.department.institution

        if not hasattr(institution, "working_days"):
            raise serializers.ValidationError(
                {"error": f"Institution does not have working days defined."}
            )

        allowed_days = institution.working_days.days.all()

        for day in selected_days:
            if day not in allowed_days:
                raise serializers.ValidationError(
                    {"error": f"{day.day_name} is not a valid working day for this institution."}
                )

        return data

    def update(self, instance, validated_data):
        days = validated_data.pop("days", None)

        if days is not None:
            instance.days.set(days)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["days"] = SystemDaySerializer(instance.days.all(), many=True).data
        return rep


class EmployeeAttendanceSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())

    class Meta:
        model = EmployeeAttendance
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        return rep


class EmployeeActivationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(
        max_length=20, required=False, allow_blank=True
    )
    full_name = serializers.CharField(max_length=100, required=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    gender = serializers.ChoiceField(
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        required=False,
        allow_blank=True,
    )
    # Optional fields for branch and department assignment
    branch_location = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    date_of_joining = serializers.DateField(required=False, allow_null=True)


def validate_pdf(file):
    """Validate that the file is a valid PDF."""
    print(f"Validating PDF: {file.name}")
    try:
        file.seek(0)
        PyPDF2.PdfReader(BytesIO(file.read()))
        file.seek(0)
        print("PDF validation successful")
    except Exception as e:
        print(f"PDF validation failed: {str(e)}")
        raise serializers.ValidationError({"error": f"Invalid PDF file: {str(e)}"})
    return file


class EmployeeContractSerializer(serializers.ModelSerializer):

    applicant = serializers.PrimaryKeyRelatedField(
        queryset=JobAdvertApplication.objects.all(), required=False, allow_null=True
    )
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False, allow_null=True
    )
    original_contract = serializers.FileField(
        validators=[FileExtensionValidator(allowed_extensions=["pdf"]), validate_pdf],
        required=False,
    )
    signed_contract = serializers.FileField(
        validators=[FileExtensionValidator(allowed_extensions=["pdf"]), validate_pdf],
        required=False,
    )

    class Meta:
        model = EmployeeContract
        fields = [
            "id",
            "applicant",
            "employee",
            "is_active",
            "contract_reference",
            "original_contract",
            "signed_contract",
            "created_at",
            "updated_at",
            "status",
            "differences",
        ]
        read_only_fields = ["contract_reference", "created_at", "status"]

    def create(self, validated_data):
        # Generate contract_reference
        contract = EmployeeContract(**validated_data)
        contract.contract_reference = contract.generate_contract_reference()
        contract.save()
        return contract

    def update(self, instance, validated_data):
        if "signed_contract" in validated_data:
            signed_contract = validated_data["signed_contract"]
        if "signed_contract" in validated_data:
            signed_contract = validated_data["signed_contract"]
            try:
                signed_contract.seek(0)
                content = signed_contract.read()
                validated_data["signed_contract"] = ContentFile(
                    content, name=signed_contract.name
                )
                validated_data["signed_contract"] = ContentFile(
                    content, name=signed_contract.name
                )
            except Exception as e:
                raise serializers.ValidationError({"error":
                    f"Failed to read signed_contract: {str(e)}"
                })
                raise serializers.ValidationError({"error":
                    f"Failed to read signed_contract: {str(e)}"
                })

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Save the instance to persist signed_contract
        instance.save()

        # Run comparison after saving to set status
        if "signed_contract" in validated_data and instance.original_contract:
            instance.compare_contracts()
            instance.save()  # Save again to persist status

        return instance

    def to_representation(self, instance):
        from recruitment.serializers import JobAdvertApplicationSerializer

        rep = super().to_representation(instance)
        rep["applicant"] = (
            JobAdvertApplicationSerializer(instance.applicant).data
            if instance.applicant
            else None
        )
        rep["employee"] = (
            EmployeeSerializer(instance.employee).data if instance.employee else None
        )
        return rep
        rep["applicant"] = (
            JobAdvertApplicationSerializer(instance.applicant).data
            if instance.applicant
            else None
        )
        rep["employee"] = (
            EmployeeSerializer(instance.employee).data if instance.employee else None
        )
        return rep

    # def validate(self, data):
    #     # Ensure either applicant or employee is provided, not both
    #     applicant = data.get("applicant")
    #     employee = data.get("employee")
    #     if applicant and employee:
    #         raise serializers.ValidationError("Cannot set both applicant and employee.")
    #     if not applicant and not employee:
    #         raise serializers.ValidationError(
    #             "Either applicant or employee must be provided."
    #         )
    #     return data


class AttendanceReportSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    target_employees = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    target_departments = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Department.objects.all()),
        required=False,
    )
    target_job_positions = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=JobPosition.objects.all()),
        required=False,
    )

    def validate(self, data):
        if not (
            data.get("target_employees")
            or data.get("target_departments")
            or data.get("target_job_positions")
        ):
            raise serializers.ValidationError(
                {"error": f"You must provide at least one of: target_employees, target_departments, or target_job_positions."
            })
        return data

    def get_report_context(self):
        return {
            "target_employees": self.validated_data.get("target_employees", []),
            "target_departments": self.validated_data.get("target_departments", []),
            "target_job_positions": self.validated_data.get("target_job_positions", []),
        }


class AttendanceQueryParamsSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    target_employees = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    target_departments = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Department.objects.all()),
        required=False,
    )
    target_job_positions = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=JobPosition.objects.all()),
        required=False,
    )

    def validate(self, data):
        today = date.today()

        # Set defaults if missing
        data["end_date"] = data.get("end_date", today)
        data["start_date"] = data.get("start_date", today - timedelta(days=30))

        # Optional: Ensure start <= end
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError({"error": f"start_date cannot be after end_date."})

        return data

    def get_filter_context(self):
        return {
            "target_employees": self.validated_data.get("target_employees", []),
            "target_departments": self.validated_data.get("target_departments", []),
            "target_job_positions": self.validated_data.get("target_job_positions", []),
        }
