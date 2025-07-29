from .models import Employee, EmployeeAttendance, EmployeeType, WorkType, EmployeeContract
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

from django.template.loader import render_to_string
from weasyprint import HTML
from django.utils.text import slugify


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
                    "Employee must be at least 18 years old."
                )
        return value

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop("user", None)

        selected_branches = validated_data.pop("selected_branches", None)

        if user_data:
            user_serializer = CustomUserSerializer(data=user_data)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()
            validated_data["user"] = user

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
                    f"Branch with ID {branch_id} does not exist."
                )

        # === Create Contract and Send Email ===
        job_position = employee.position

        template = job_position.contract_template if job_position else None

        if template and template.content:
            content = template.content
            placeholders = template.placeholders or []

            placeholder_mapping = {
                "employee_name": employee.user.fullname,
                "governing_law_jurisdiction": employee.department.institution.location,
                "company_name": employee.department.institution.institution_name,
                "job_title": (
                    employee.position.name if employee.position else "Unknown Position"
                ),
                "salary_amount": employee.salary,
                "salary_period": "Monthly",
                "start_date": employee.date_of_joining.strftime("%Y-%m-%d"),
                "end_time": "5:00 PM",
                "start_time": "9:00 AM",
                "working_days": "Monday to Friday",
                "work_hours": "40",
                "notice_period": "30 days",
            }

            for placeholder in placeholders:
                key = placeholder.strip("{{}}")
                value = str(placeholder_mapping.get(key, ""))
                content = content.replace(placeholder, value)

            filename = f"{slugify(employee.user.fullname)}_contract_{employee.id}.pdf"
            relative_path = os.path.join("contracts/original", filename)
            full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            html_content = render_to_string(
                "contracts/contract_template.html", {"content": content}
            )

            # Generate and write PDF
            HTML(string=html_content).write_pdf(full_path)

            EmployeeContract.objects.create(
                employee=employee,
                is_active=False,
                original_contract=relative_path,
            )

            context_data = {
                "position_title": (
                    job_position.name if job_position else "Unknown Position"
                ),
                "employee_name": employee.user.fullname,
                "institution_name": (
                    employee.department.institution.institution_name
                    if employee.department
                    else "Unknown Institution"
                ),
            }

            if employee.user and employee.user.email:
                subject = f"Employment Contract for {context_data['position_title']}"
                body = render_to_string("emails/contract_email.txt", context_data)
                email = EmailMessage(
                    subject=subject,
                    body=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[employee.user.email],
                )
                email.attach_file(full_path)
                email.send()

        return employee

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)

        if user_data:
            user_serializer = CustomUserSerializer(
                instance.user, data=user_data, partial=True
            )
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()

        # Update employee fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance

    def get_roles(self, obj):
        """Get roles for the employee's user"""
        if obj.user:
            try:
                from .models import (
                    UserRole,
                )  # Import UserRole model here to avoid circular import issues

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

    def to_representation(self, instance):
        """Override to include department and position names in the main fields"""
        data = super().to_representation(instance)

        # Replace department ID with department object containing name
        if data["department_details"]:
            data["department"] = data["department_details"]

        # Replace position ID with position object containing name
        if data["position_details"]:
            data["position"] = data["position_details"]

        # Remove the separate detail fields from final output
        data.pop("department_details", None)
        data.pop("position_details", None)

        return data


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

class EmployeeContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeContract
        fields = ['id', 'applicant', 'employee', 'is_active', 'contract_reference', 'original_contract', 'signed_contract', 'created_at', 'updated_at']
        read_only_fields = ['contract_reference', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Generate contract_reference
        contract = EmployeeContract(**validated_data)
        contract.contract_reference = contract.generate_contract_reference()
        contract.save()
        return contract

    def validate(self, data):
        # Ensure either applicant or employee is provided, not both
        applicant = data.get('applicant')
        employee = data.get('employee')
        if applicant and employee:
            raise serializers.ValidationError("Cannot set both applicant and employee.")
        if not applicant and not employee:
            raise serializers.ValidationError("Either applicant or employee must be provided.")
        return data    
