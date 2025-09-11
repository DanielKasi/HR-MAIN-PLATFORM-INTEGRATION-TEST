from approval.serializers import BaseApprovableSerializer
from .models import (
    Child,
    Education,
    Employee,
    EmployeeAttendance,
    EmployeeBankAccount,
    EmployeeType,
    NextOfKin,
    QualificationAward,
    Spouse,
    WorkExperience,
    WorkType,
    EmployeeContract,
    EmployeeDay,
    EmployeeShift,
)
from rest_framework import serializers
from users.serializers import CustomUserSerializer
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import transaction
from institution.models import Branch, InstitutionBankType, UserBranch
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
from institution.models import Department, BranchShift
from recruitment.models import JobPosition
from datetime import date, timedelta, datetime
from users.models import CustomUser
from institution.serializers import BranchSerializer


class EmployeeTypeSerializer(BaseApprovableSerializer):
    class Meta:
        model = EmployeeType
        fields = "__all__"


class WorkTypeSerializer(BaseApprovableSerializer):
    class Meta:
        model = WorkType
        fields = "__all__"

class NextOfKinSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        write_only=True
    )

    class Meta:
        model = NextOfKin
        fields = '__all__'

    def validate(self, data):
        required_fields = ["name", "address", "relationship"]
        errors = {}
        for field in required_fields:
            if field not in data or data[field] is None:
                errors[field] = f"{field} is required."
        if errors:
            raise serializers.ValidationError(errors)
        return data

class QualificationAwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualificationAward
        fields = '__all__'

class EducationSerializer(serializers.ModelSerializer):
    qualification = QualificationAwardSerializer(read_only=True)
    qualification_id = serializers.PrimaryKeyRelatedField(
        queryset=QualificationAward.objects.all(),
        source='qualification',
        write_only=True,
        required=True
    )
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Education
        fields = '__all__'

class WorkExperienceSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        write_only=True
    )
    class Meta:
        model = WorkExperience
        fields = '__all__'

class ChildSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        write_only=True
    )
    class Meta:
        model = Child
        fields = '__all__'

class SpouseSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Spouse
        fields = ['name', 'date_of_birth', 'phone_number', 'employee']

    def validate_name(self, value):
        return value or "Unknown Spouse"

    def validate_phone_number(self, value):
        return value or None

    def validate_date_of_birth(self, value):
        if value:
            today = date.today()
            age = relativedelta(today, value).years
            if value > today:
                raise serializers.ValidationError("Spouse's date of birth cannot be in the future.")
        return value 

class BankAccountSerializer(serializers.ModelSerializer):
    bank = serializers.SerializerMethodField(read_only=True)
    bank_id = serializers.PrimaryKeyRelatedField(
        queryset=InstitutionBankType.objects.all(),
        source='bank',
        write_only=True,
        required=True
    )
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        write_only=True
    )

    class Meta:
        model = EmployeeBankAccount
        fields = ['bank', 'bank_id', 'account_name', 'account_number', 'employee']

    def get_bank(self, obj):
        from institution.serializers import InstitutionBankTypeSerializer
        return InstitutionBankTypeSerializer(obj.bank).data

    def validate(self, data):
        data["account_name"] = data.get("account_name") or ""
        data["account_number"] = data.get("account_number") or ""
        return data

    # def validate(self, data):
    #     required_fields = ["account_name", "account_number"]
    #     errors = {}
    #     for field in required_fields:
    #         if field not in data or data[field] is None:
    #             errors[field] = f"{field} is required."
    #     if errors:
    #         raise serializers.ValidationError(errors)
    #     return data
    
class EmployeeSerializer(BaseApprovableSerializer):
    date_of_birth = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d"])
    user = CustomUserSerializer()
    department_details = serializers.SerializerMethodField()
    position_details = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    selected_branches = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    employee_working_days = serializers.SerializerMethodField()
    work_type = serializers.PrimaryKeyRelatedField(queryset=WorkType.objects.all())
    employee_type = serializers.PrimaryKeyRelatedField(
        queryset=EmployeeType.objects.all()
    )
    bank_accounts = BankAccountSerializer(many=True, required=False)
    next_of_kin = NextOfKinSerializer(many=True, required=False)
    educations = EducationSerializer(many=True, required=False)
    work_experiences = WorkExperienceSerializer(many=True, required=False)
    children = ChildSerializer(many=True, required=False)
    spouse = SpouseSerializer(required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = "__all__"

    def validate_date_of_birth(self, value):
        print(f"Validating date_of_birth: {value}, type: {type(value)}")
        if value:
            today = date.today()
            msgs = []
            if value > today:
                msgs.append("Date of birth cannot be in the future.")
            age = relativedelta(today, value).years
            if age < 18:
                msgs.append(
                    f"Employee must be at least 18 years old. Current age: {age}."
                )
            if msgs:
                raise serializers.ValidationError({"error": " ".join(msgs)})
        return value

    def validate(self, data):
        marital_status = data.get('marital_status', getattr(self.instance, 'marital_status', 'single'))
        spouse_data = data.get('spouse')
        if marital_status == 'married' and not spouse_data:
            raise serializers.ValidationError({"error": "Spouse details are required for married employees."})
        if marital_status != 'married' and spouse_data:
            raise serializers.ValidationError({"error": "Spouse details should only be provided for married employees."})
        return data

    @transaction.atomic
    def create(self, validated_data):
        print(f"Raw request data: {self.context['request'].data}")
        print(f"Validated data: {validated_data}")

        user_data = validated_data.pop("user", None)
        selected_branches = validated_data.pop("selected_branches", [])
        bank_accounts_data = validated_data.pop("bank_accounts", [])
        next_of_kin_data = validated_data.pop("next_of_kin", [])
        educations_data = validated_data.pop("educations", [])
        work_experiences_data = validated_data.pop("work_experiences", [])
        children_data = validated_data.pop("children", [])
        spouse_data = validated_data.pop("spouse", None)

        print(f"Bank accounts data: {bank_accounts_data}")
        print(f"Next of kin data: {next_of_kin_data}")
        print(f"Educations data: {educations_data}")
        print(f"Spouse data: {spouse_data}")

        if user_data:
            user_serializer = CustomUserSerializer(data=user_data)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()
            validated_data["user"] = user

            request = self.context.get("request")
            if not request:
                raise serializers.ValidationError({"error": "Request context is required."})

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

        # Create BankAccount instances
        for bank_data in bank_accounts_data:
            bank_type = bank_data.pop('bank', None)
            if bank_type:
                EmployeeBankAccount.objects.create(employee=employee, bank=bank_type, **bank_data)

        # Create NextOfKin instances
        for kin_data in next_of_kin_data:
            if kin_data.get("name"):
                NextOfKin.objects.create(employee=employee, **kin_data)

        # Create Education instances
        for edu_data in educations_data:
            qualification = edu_data.pop('qualification', None)
            if edu_data.get("institution") and edu_data.get("name") and edu_data.get("year"):
                Education.objects.create(employee=employee, qualification=qualification, **edu_data)

        # Create WorkExperience instances
        for exp_data in work_experiences_data:
            WorkExperience.objects.create(employee=employee, **exp_data)

        # Create Child instances
        for child_data in children_data:
            Child.objects.create(employee=employee, **child_data)

        # Create Spouse instance if provided
        if spouse_data and spouse_data.get("name"):
            Spouse.objects.create(employee=employee, **spouse_data)

        for i, branch_id in enumerate(selected_branches or []):
            try:
                branch = Branch.objects.get(id=branch_id)
                UserBranch.objects.get_or_create(
                    user=employee.user,
                    branch=branch,
                    defaults={"is_default": i == 0}
                )
            except Branch.DoesNotExist:
                raise serializers.ValidationError(
                    {"error": f"Branch with ID {branch_id} does not exist."}
                )

        return employee

    @transaction.atomic
    def update(self, instance, validated_data):
        print(f"Update validated data: {validated_data}")

        user_data = validated_data.pop("user", None)
        selected_branches = validated_data.pop("selected_branches", None)
        bank_accounts_data = validated_data.pop("bank_accounts", [])
        next_of_kin_data = validated_data.pop("next_of_kin", [])
        educations_data = validated_data.pop("educations", [])
        work_experiences_data = validated_data.pop("work_experiences", [])
        children_data = validated_data.pop("children", [])
        spouse_data = validated_data.pop("spouse", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if user_data:
            print("running employee CustomUserSerializer")
            user_serializer = CustomUserSerializer(instance.user, data=user_data, partial=True)
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()
            instance.email = user_serializer.data['email']
        instance.save()

        if bank_accounts_data:
            instance.bank_accounts.all().delete()
            for bank_data in bank_accounts_data:
                bank_type = bank_data.pop('bank', None)
                if bank_type:
                    EmployeeBankAccount.objects.create(employee=instance, bank=bank_type, **bank_data)

        if next_of_kin_data:
            instance.next_of_kin.all().delete()
            for kin_data in next_of_kin_data:
                if kin_data.get("name"):
                    NextOfKin.objects.create(employee=instance, **kin_data)

        if educations_data:
            instance.educations.all().delete()
            for edu_data in educations_data:
                qualification = edu_data.pop('qualification', None)
                if edu_data.get("institution") and edu_data.get("name") and edu_data.get("year"):
                    Education.objects.create(employee=instance, qualification=qualification, **edu_data)

        if work_experiences_data:
            instance.work_experiences.all().delete()
            for exp_data in work_experiences_data:
                WorkExperience.objects.create(employee=instance, **exp_data)

        if children_data:
            instance.children.all().delete()
            for child_data in children_data:
                Child.objects.create(employee=instance, **child_data)

        if spouse_data and spouse_data.get("name"):
            instance.spouse.delete() if instance.spouse else None
            Spouse.objects.create(employee=instance, **spouse_data)

        if selected_branches is not None:
            instance.user.attached_branches.all().delete()
            for i, branch_id in enumerate(selected_branches):
                try:
                    branch = Branch.objects.get(id=branch_id)
                    UserBranch.objects.get_or_create(
                        user=instance.user,
                        branch=branch,
                        defaults={"is_default": i == 0}
                    )
                except Branch.DoesNotExist:
                    raise serializers.ValidationError(
                        {"error": f"Branch with ID {branch_id} does not exist."}
                    )

        return instance

    def get_roles(self, obj):
        if obj.user:
            try:
                from .models import UserRole
                user_roles = UserRole.objects.filter(user=obj.user).select_related("role")
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
        data = super().to_representation(instance)
        if data["department_details"]:
            data["department"] = data["department_details"]
        if data["position_details"]:
            data["position"] = data["position_details"]
        if data["payroll_branch"]:
            data["payroll_branch"] = BranchSerializer(instance.payroll_branch).data
        data["work_type"] = WorkTypeSerializer(instance.work_type).data
        data["employee_type"] = EmployeeTypeSerializer(instance.employee_type).data
        data.pop("department_details", None)
        data.pop("position_details", None)
        return data


class EmployeeDaySerializer(BaseApprovableSerializer):
    day = serializers.PrimaryKeyRelatedField(queryset=SystemDay.objects.all())

    class Meta:
        model = EmployeeDay
        fields = ["id", "day", "start_time", "end_time"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["day"] = SystemDaySerializer(instance.day).data
        return rep


class EmployeeWorkingDaysSerializer(BaseApprovableSerializer):
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

        if employee.payroll_branch and hasattr(employee.payroll_branch, "working_days"):
            allowed_days = employee.payroll_branch.working_days.days.all()

        else:
            institution = employee.department.institution

            if not hasattr(institution, "working_days"):
                raise serializers.ValidationError(
                    {"error": f"Institution does not have working days defined."}
                )

            allowed_days = institution.working_days.days.all()

        for day in selected_days:
            if day not in allowed_days:
                raise serializers.ValidationError(
                    {
                        "error": f"{day.day_name} is not a valid working day for this institution/branch."
                    }
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
        rep["days"] = EmployeeDaySerializer(
            instance.employee_days.all(), many=True
        ).data
        return rep


class EmployeeAttendanceSerializer(BaseApprovableSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())

    class Meta:
        model = EmployeeAttendance
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        # Extract the request context to get the logged-in user
        self.request = kwargs.get("context", {}).get("request")
        super().__init__(*args, **kwargs)

    def to_representation(self, instance):

        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        return rep

    def _should_validate_location(self, employee_data):
        """
        Check if location validation should be performed.
        Only validate location when the logged-in user is checking in/out for themselves.
        """
        if not self.request or not self.request.user:
            return False

        try:
            # Get the logged-in user's employee record
            logged_in_employee = Employee.objects.get(user=self.request.user)
            # Compare with the employee in the attendance record
            return logged_in_employee.id == employee_data.id
        except Employee.DoesNotExist:
            # If logged-in user is not an employee, skip location validation
            return False

    def validate(self, data):
        employee = data.get("employee")
        if not employee:
            raise serializers.ValidationError({"employee": "Employee is required."})

        # Check if we should validate location for this user
        should_validate_location = self._should_validate_location(employee)

        # Temporarily instantiate the model to run your custom validation logic
        instance = EmployeeAttendance(**data)

        # Only validate location if the user is checking in/out for themselves
        if should_validate_location:
            # Check-in location validation
            if data.get("check_in_time") and (
                data.get("check_in_latitude") is not None
                or data.get("check_in_longitude") is not None
            ):
                if (
                    data.get("check_in_latitude") is None
                    or data.get("check_in_longitude") is None
                ):
                    raise serializers.ValidationError(
                        {
                            "error": "Both check-in latitude and longitude must be provided if one is set."
                        }
                    )
                if not instance._is_location_valid(
                    data["check_in_latitude"], data["check_in_longitude"]
                ):
                    raise serializers.ValidationError(
                        {
                            "error": "Check-in location does not match any attached branch location."
                        }
                    )

            # Check-out location validation
            if data.get("check_out_time") and (
                data.get("check_out_latitude") is not None
                or data.get("check_out_longitude") is not None
            ):
                if (
                    data.get("check_out_latitude") is None
                    or data.get("check_out_longitude") is None
                ):
                    raise serializers.ValidationError(
                        {
                            "error": "Both check-out latitude and longitude must be provided if one is set."
                        }
                    )
                if not instance._is_location_valid(
                    data["check_out_latitude"], data["check_out_longitude"]
                ):
                    raise serializers.ValidationError(
                        {
                            "error": "Check-out location does not match any attached branch location."
                        }
                    )

        return data

    def create(self, validated_data):
        """
        Create a new attendance record and calculate status after creation.
        """

        # Create the instance without triggering status calculation in save()
        instance = EmployeeAttendance(**validated_data)

        # Save first to establish the record and relationships
        super(EmployeeAttendance, instance).save()

        # Now calculate and update the attendance status
        self._calculate_and_update_status(instance)

        return instance

    def update(self, instance, validated_data):
        """
        Update an existing attendance record and recalculate status.
        """
        # Update the instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Save the updated data
        super(EmployeeAttendance, instance).save()

        # Recalculate and update the attendance status
        self._calculate_and_update_status(instance)

        return instance

    def _calculate_and_update_status(self, instance):
        """
        Calculate attendance status, update the instance, and create penalties if needed.
        """
        try:
            # Ensure we have the employee relationship loaded
            if not hasattr(instance, "employee") or not instance.employee:
                return

            # Check if employee has payroll_branch
            if (
                not hasattr(instance.employee, "payroll_branch")
                or not instance.employee.payroll_branch
            ):
                return

            # Store the old status to check if it changed
            old_status = instance.attendance_status

            # Use the model's calculation method
            instance.update_attendance_status()

            # Save the calculated status
            instance.save(
                update_fields=[
                    "attendance_status",
                    "overtime_hours",
                    "late_minutes",
                    "early_checkout_minutes",
                ]
            )


            # Create penalty if status changed and warrants a penalty
            if old_status != instance.attendance_status or old_status == "pending":
                self._create_penalty_if_needed(instance)

        except Exception as e:
            # Don't fail the entire operation if status calculation fails
            pass

    def _create_penalty_if_needed(self, instance):
        """
        Update or create penalty for attendance record based on status.
        """
        try:
            from payroll.models import EmployeePenalty

            EmployeePenalty.update_or_remove_penalty_for_attendance(instance)

        except Exception as e:
            pass



def validate_pdf(file):
    """Validate that the file is a valid PDF."""
    try:
        file.seek(0)
        PyPDF2.PdfReader(BytesIO(file.read()))
        file.seek(0)
    except Exception as e:
        raise serializers.ValidationError({"error": f"Invalid PDF file: {str(e)}"})
    return file


class EmployeeContractSerializer(BaseApprovableSerializer):

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
                raise serializers.ValidationError(
                    {"error": f"Failed to read signed_contract: {str(e)}"}
                )
                raise serializers.ValidationError(
                    {"error": f"Failed to read signed_contract: {str(e)}"}
                )

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
                {
                    "error": f"You must provide at least one of: target_employees, target_departments, or target_job_positions."
                }
            )
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

        data["end_date"] = data.get("end_date", today)
        data["start_date"] = data.get("start_date", today - timedelta(days=30))

        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError(
                {"error": f"start_date cannot be after end_date."}
            )

        return data

    def get_filter_context(self):
        return {
            "target_employees": self.validated_data.get("target_employees", []),
            "target_departments": self.validated_data.get("target_departments", []),
            "target_job_positions": self.validated_data.get("target_job_positions", []),
        }


class EmployeeShiftSerializer(BaseApprovableSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False
    )
    shift = serializers.PrimaryKeyRelatedField(queryset=BranchShift.objects.all())

    class Meta:
        model = EmployeeShift
        fields = [
            "id",
            "employee",
            "shift",
            "context",
            "shift_status",
            "date",
            "created_at",
            "created_by",
        ]
        read_only_fields = ["created_at", "created_by", "shift_status"]

    def validate(self, data):
        request_user = self.context["request"].user
        context = data.get("context")
        shift = data.get("shift")
        date_selected = data.get("date")
        employee = data.get("employee")

        if context == "REQUEST":
            if not hasattr(request_user, "employees"):
                raise serializers.ValidationError(
                    {"detail": "Logged-in user is not an employee."}
                )
            data["employee"] = request_user.employees
            employee = data["employee"]
        elif context == "ALLOCATION":
            if employee is None:
                raise serializers.ValidationError(
                    {"detail": "Employee must be provided for ALLOCATION context."}
                )

        if shift.branch != employee.payroll_branch:
            raise serializers.ValidationError(
                {
                    "detail": f"Shift '{shift.name}' does not belong to employee's branch '{employee.payroll_branch.branch_name}'."
                }
            )

        python_weekday = date_selected.weekday()
        level = python_weekday + 1
        if shift.shift_day.day.level != level:
            raise serializers.ValidationError(
                {
                    "detail": f"Shift '{shift.name}' occurs on '{shift.shift_day.day.day_name}' "
                    f"but the selected date is '{date_selected.strftime('%A')}'."
                }
            )

        branch_open = employee.payroll_branch.branch_opening_time
        branch_close = employee.payroll_branch.branch_closing_time
        if shift.start_time < branch_open or shift.end_time > branch_close:
            raise serializers.ValidationError(
                {
                    "detail": f"Shift '{shift.name}' must be within branch working hours "
                    f"({branch_open} - {branch_close})."
                }
            )

      
        return data

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

    def to_representation(self, instance):
        from institution.serializers import BranchShiftSerializer

        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        rep["shift"] = BranchShiftSerializer(instance.shift).data
        rep["created_by"] = CustomUserSerializer(instance.created_by).data
        return rep
