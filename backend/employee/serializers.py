from general.serializers import BaseApprovableSerializer
from employee.utilities import generate_email
from .models import (
    Child,
    DocumentRequest,
    DocumentRequestEmployee,
    Education,
    Employee,
    EmployeeAttendance,
    EmployeeBankAccount,
    EmployeeCompanyEmail,
    EmployeeMonthlyHourAccount,
    EmployeeType,
    EmployeeLogs,
    NextOfKin,
    QualificationAward,
    RequestedDocument,
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
from django.db import IntegrityError, transaction
from institution.models import Branch, Institution, InstitutionBankType, UserBranch
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
from settings.models import EmailProviderConfig, SystemDay
from .models import EmployeeWorkingDays
from institution.models import Department, BranchShift
from recruitment.models import JobPosition
from datetime import date, timedelta, datetime
from users.models import CustomUser, Profile, UserRole
from institution.serializers import BranchSerializer, BranchShiftSerializer
from django.db.models import Q

class EmployeeMonthlyHourAccountSerializer(serializers.ModelSerializer):
    employee = serializers.SerializerMethodField()
    month = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployeeMonthlyHourAccount
        fields = '__all__'
        read_only_fields = ['id']
    
    def get_employee(self, obj):
        if obj.employee:
            return {
                'id': obj.employee.id,
                'name': obj.employee.name,
                'employee_id': obj.employee.employee_id,
                'email': obj.employee.email,
                'gender': obj.employee.gender,
            }
        return None
    
    def get_month(self, obj):
        import calendar
        return calendar.month_name[obj.month]
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
        required=False
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
                raise serializers.ValidationError({"error": "Spouse's date of birth cannot be in the future."})
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

class EmployeeCompanyEmailSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all(), required=False, allow_null=True)

    class Meta:
        model = EmployeeCompanyEmail
        fields = ['email', 'provider', 'status', 'employee']
        extra_kwargs = {
            'email': {'required': True},
            'provider': {'required': False, 'allow_null': True, 'allow_blank': True},
            'status': {'required': False, 'default': 'pending'},
            'employee': {'required': False, 'allow_null': True}
        }

    def create(self, validated_data):
        # Remove the employee check since it will be set by the parent serializer
        email = validated_data.get('email')
        provider = validated_data.get('provider')
        institution = None

        # If employee is provided, use it to fetch institution
        employee = validated_data.get('employee')
        if employee:
            institution = employee.get_institution()
            try:
                config = institution.email_config
            except EmailProviderConfig.DoesNotExist:
                config = None

            if not email:
                try:
                    email = generate_email(employee)
                    validated_data['email'] = email
                except Exception as e:
                    raise serializers.ValidationError({"error": f"Failed to generate company email: {str(e)}"})

            if provider is None and config:
                validated_data['provider'] = config.provider

        try:
            company_email = super().create(validated_data)
            return company_email
        except Exception as e:
            raise serializers.ValidationError({"error": f"Error creating company email: {str(e)}"})      
class EmployeeSerializer(BaseApprovableSerializer):
    date_of_birth = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d"])
    user = CustomUserSerializer()
    department_details = serializers.SerializerMethodField()
    position_details = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    selected_branches = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    employee_working_days = serializers.SerializerMethodField()
    work_type = serializers.PrimaryKeyRelatedField(queryset=WorkType.objects.all())
    employee_type = serializers.PrimaryKeyRelatedField(queryset=EmployeeType.objects.all())
    bank_accounts = BankAccountSerializer(many=True, required=False)
    next_of_kin = NextOfKinSerializer(many=True, required=False)
    educations = EducationSerializer(many=True, required=False)
    work_experiences = WorkExperienceSerializer(many=True, required=False)
    children = ChildSerializer(many=True, required=False)
    spouse = SpouseSerializer(required=False, allow_null=True)
    company_email = EmployeeCompanyEmailSerializer(required=False, allow_null=True)

    def get_company_email(self, obj):
        email = obj.company_emails.first()  # Only one company email due to unique_together
        if email:
            return EmployeeCompanyEmailSerializer(email).data
        return None

    class Meta:
        model = Employee
        fields = '__all__'

    def get_department_details(self, obj):
        return {"id": obj.department.id, "name": obj.department.name, "institution_id": obj.department.institution.id} if obj.department else None

    def get_position_details(self, obj):
        return {"id": obj.position.id, "name": obj.position.name, "department_id": obj.position.department.id if obj.position.department else None} if obj.position else None

    def get_roles(self, obj):
        if obj.user:
            try:
                user_roles = UserRole.objects.filter(user=obj.user).select_related("role")
                return [{"id": user_role.role.id, "name": user_role.role.name} for user_role in user_roles]
            except:
                return []
        return []

    def get_employee_working_days(self, obj):
        try:
            working_days = EmployeeWorkingDays.objects.filter(employee=obj).first()
            return EmployeeWorkingDaysSerializer(working_days).data if working_days else None
        except EmployeeWorkingDays.DoesNotExist:
            return None

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop("user", None)
        name = validated_data.pop("name", None)
        selected_branches = validated_data.pop("selected_branches", [])
        bank_accounts_data = validated_data.pop("bank_accounts", [])
        next_of_kin_data = validated_data.pop("next_of_kin", [])
        educations_data = validated_data.pop("educations", [])
        work_experiences_data = validated_data.pop("work_experiences", [])
        children_data = validated_data.pop("children", [])
        spouse_data = validated_data.pop("spouse", None)
        company_email_data = validated_data.pop("company_email", None)

        user = None
        if user_data:
            email = user_data.get("email")
            user_id = user_data.get("id")
            print(f"User data: id={user_id}, email={email}")

            if email:
                existing_user = CustomUser.objects.filter(email=email).first()
                if existing_user:
                    if user_id and user_id != existing_user.id:
                        raise serializers.ValidationError(
                            {"error": f"Provided user id {user_id} does not match existing user with email {email}."}
                        )
                    user = existing_user
                    print(f"Using existing user: {user.id}, {user.email}")
                else:
                    user_data["fullname"] = name or user_data.get("fullname")
                    user_serializer = CustomUserSerializer(data=user_data)
                    user_serializer.is_valid(raise_exception=True)
                    user = user_serializer.save()
                    print(f"Created new user: {user.id}, {user.email}")
            else:
                raise serializers.ValidationError({"error": "Email is required."})

            validated_data["user"] = user
            validated_data["email"] = user.email
            validated_data["name"] = name or user_data.get("fullname")

            request = self.context.get("request")
            if not request:
                raise serializers.ValidationError({"error": "Request context is required."})

            institution = getattr(request.user.profile, "institution", None)
            institution_id = getattr(institution, "id", None) if institution else None

            if institution_id:
                try:
                    institution = Institution.objects.get(id=institution_id)
                    role = get_or_create_default_role_with_permissions(institution)
                    UserRole.objects.get_or_create(user=user, role=role)
                    Profile.objects.get_or_create(
                        user=user,
                        defaults={"institution": institution, "bio": ""}
                    )
                    if not institution.default_employee_role:
                        institution.default_employee_role = role
                        institution.save()
                except Institution.DoesNotExist:
                    raise serializers.ValidationError(
                        {"error": f"Institution does not exist for the provided user."}
                    )

        employee = Employee.objects.create(**validated_data)

        for bank_data in bank_accounts_data:
            bank_type = bank_data.pop('bank', None)
            if bank_type:
                EmployeeBankAccount.objects.create(employee=employee, bank=bank_type, **bank_data)

        for kin_data in next_of_kin_data:
            if kin_data.get("name"):
                NextOfKin.objects.create(employee=employee, **kin_data)

        for edu_data in educations_data:
            qualification = edu_data.pop('qualification', None)
            if edu_data.get("institution") and edu_data.get("name") and edu_data.get("year"):
                Education.objects.create(employee=employee, qualification=qualification, **edu_data)

        for exp_data in work_experiences_data:
            WorkExperience.objects.create(employee=employee, **exp_data)

        for child_data in children_data:
            if child_data.get("name"):
                Child.objects.create(employee=employee, **child_data)

        if spouse_data and spouse_data.get("name"):
            Spouse.objects.create(employee=employee, **spouse_data)

        if company_email_data and company_email_data.get("email"):
            company_email_data["employee"] = employee
            company_email_serializer = EmployeeCompanyEmailSerializer(data=company_email_data)
            company_email_serializer.is_valid(raise_exception=True)
            company_email_serializer.save()

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
        user_data = validated_data.pop("user", None)
        name = validated_data.pop("name", None)
        selected_branches = validated_data.pop("selected_branches", None)
        bank_accounts_data = validated_data.pop("bank_accounts", [])
        next_of_kin_data = validated_data.pop("next_of_kin", [])
        educations_data = validated_data.pop("educations", [])
        work_experiences_data = validated_data.pop("work_experiences", [])
        children_data = validated_data.pop("children", [])
        spouse_data = validated_data.pop("spouse", None)
        company_email_data = validated_data.pop("company_email", None)

        if name is not None:
            validated_data["name"] = name
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if user_data:
            user_data.pop("fullname", None)
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
            instance.next_of_kins.all().delete()
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
                if child_data.get("name"):
                    Child.objects.create(employee=instance, **child_data)

        if spouse_data is not None and spouse_data:
            spouse_serializer = SpouseSerializer(data=spouse_data, context=self.context)
            try:
                spouse_serializer.is_valid(raise_exception=True)
                existing_spouse = Spouse.objects.filter(employee=instance).first()
                if existing_spouse:
                    for attr, value in spouse_serializer.validated_data.items():
                        setattr(existing_spouse, attr, value)
                    existing_spouse.save()
                else:
                    Spouse.objects.create(employee=instance, **spouse_serializer.validated_data)
            except serializers.ValidationError as ve:
                raise serializers.ValidationError({"error": ve.detail})
            except IntegrityError as ie:
                raise serializers.ValidationError({"error": "A spouse already exists for this employee."})
            except Exception as e:
                raise serializers.ValidationError({"error": f"Error updating/creating spouse: {str(e)}"})
        elif spouse_data == {}:
            existing_spouse = Spouse.objects.filter(employee=instance).first()
            if existing_spouse:
                existing_spouse.delete()

        if company_email_data is not None:
            existing_company_email = instance.company_emails.first()  # Only one company email
            if company_email_data and company_email_data.get("email"):
                company_email_serializer = EmployeeCompanyEmailSerializer(data=company_email_data)
                company_email_serializer.is_valid(raise_exception=True)
                if existing_company_email:
                    for attr, value in company_email_serializer.validated_data.items():
                        setattr(existing_company_email, attr, value)
                    existing_company_email.save()
                else:
                    company_email_serializer.validated_data["employee"] = instance
                    company_email_serializer.save()
            elif existing_company_email:
                existing_company_email.delete()

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
        data["next_of_kin"] = NextOfKinSerializer(instance.next_of_kins.all(), many=True).data
        data.pop("department_details", None)
        data.pop("position_details", None)
        return data

  


class EmployeeDaySerializer(BaseApprovableSerializer):
    day = serializers.PrimaryKeyRelatedField(queryset=SystemDay.objects.all())

    class Meta:
        model = EmployeeDay
        fields = '__all__'

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
            raise serializers.ValidationError({"error": "Employee is required."})

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
        fields = '__all__'
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
        fields = '__all__'
        read_only_fields = ["created_at", "created_by"]

    def validate(self, data):
        request_user = self.context["request"].user
        context = data.get("context")
        shift = data.get("shift")
        is_recurring = data.get("is_recurring", False)
        date = data.get("date")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        employee = data.get("employee")

        # Set employee for REQUEST context
        if context == "REQUEST":
            if not hasattr(request_user, "employees"):
                raise serializers.ValidationError(
                    {"error": "Logged-in user is not an employee."}
                )
            data["employee"] = request_user.employees
            employee = data["employee"]
        elif context == "ALLOCATION" or context == "OVERRIDE":
            if employee is None:
                raise serializers.ValidationError(
                    {"error": "Employee must be provided for ALLOCATION or OVERRIDE context."}
                )

        # Validate shift belongs to employee's branch
        if shift.branch != employee.payroll_branch:
            raise serializers.ValidationError(
                {
                    "error": f"Shift '{shift.name}' does not belong to employee's branch '{employee.payroll_branch.branch_name}'."
                }
            )

        # Validate shift type and dates
        if is_recurring:
            if not start_date:
                raise serializers.ValidationError(
                    {"error": "Start date is required for recurring shifts."}
                )
            if end_date and start_date > end_date:
                raise serializers.ValidationError(
                    {"error": "Start date must be before end date."}
                )
            if date:
                raise serializers.ValidationError(
                    {"error": "Date field should be null for recurring shifts."}
                )
            # Validate weekday matches shift_day
            weekday = start_date.weekday() + 1  # SystemDay level 1=Monday
            if shift.shift_day.day.level != weekday:
                raise serializers.ValidationError(
                    {
                        "error": f"Shift '{shift.name}' occurs on '{shift.shift_day.day.day_name}' "
                        f"but start date is a '{start_date.strftime('%A')}'."
                    }
                )
        else:
            if not date:
                raise serializers.ValidationError(
                    {"error": "Date is required for one-time shifts."}
                )
            if start_date or end_date:
                raise serializers.ValidationError(
                    {"error": "Start and end dates should be null for one-time shifts."}
                )
            # Validate shift_day matches date's weekday
            weekday = date.weekday() + 1
            if shift.shift_day.day.level != weekday:
                raise serializers.ValidationError(
                    {
                        "error": f"Shift '{shift.name}' occurs on '{shift.shift_day.day.day_name}' "
                        f"but the selected date is '{date.strftime('%A')}'."
                    }
                )

        # Validate against BranchDay times
        branch_day = employee.payroll_branch.working_days.branch_days.filter(
            day=shift.shift_day.day
        ).first()
        if branch_day and branch_day.opening_time and branch_day.closing_time:
            if shift.start_time < branch_day.opening_time or shift.end_time > branch_day.closing_time:
                raise serializers.ValidationError(
                    {
                        "error": f"Shift '{shift.name}' must be within branch working hours "
                        f"({branch_day.opening_time} - {branch_day.closing_time})."
                    }
                )

        # Validate against EmployeeDay times
        employee_day = employee.working_days.employee_days.filter(
            day=shift.shift_day.day
        ).first()
        if employee_day and employee_day.start_time and employee_day.end_time:
            if shift.start_time < employee_day.start_time or shift.end_time > employee_day.end_time:
                raise serializers.ValidationError(
                    {
                        "error": f"Shift '{shift.name}' must be within employee's working hours "
                        f"({employee_day.start_time} - {employee_day.end_time}) on {shift.shift_day.day.day_name}."
                    }
                )

        # Check for time conflicts with existing shifts
        check_date = date if not is_recurring else start_date
        weekday = check_date.weekday() + 1
        existing_shifts = EmployeeShift.objects.filter(
            employee=employee,
            shift__shift_day__day__level=weekday,
        ).exclude(id=self.instance.id if self.instance else None)
        if not is_recurring:
            existing_shifts = existing_shifts.filter(date=check_date)
        else:
            existing_shifts = existing_shifts.filter(
                Q(is_recurring=False, date=check_date) |
                Q(is_recurring=True, start_date__lte=check_date) &
                (Q(end_date__isnull=True) | Q(end_date__gte=check_date))
            )

        for existing_shift in existing_shifts:
            if (shift.start_time < existing_shift.shift.end_time and
                shift.end_time > existing_shift.shift.start_time):
                raise serializers.ValidationError(
                    {
                        "error": f"Shift '{shift.name}' conflicts with existing shift '{existing_shift.shift.name}' "
                        f"({existing_shift.shift.start_time} - {existing_shift.shift.end_time}) on {check_date}."
                    }
                )

        return data

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data["created_by"] = instance.created_by  # Preserve original created_by
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        rep["shift"] = BranchShiftSerializer(instance.shift).data
        rep["created_by"] = CustomUserSerializer(instance.created_by).data
        return rep
    
class DocumentRequestEmployeeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    document_type = serializers.CharField(source="document_request.document_type", read_only=True)
    document_format = serializers.CharField(source="document_request.document_format", read_only=True)
    due_date = serializers.DateField(source="document_request.due_date", read_only=True)

    class Meta:
        model = DocumentRequestEmployee
        fields = '__all__'

class RequestedDocumentSerializer(BaseApprovableSerializer):
    employee_name = serializers.CharField(source="document_request_employee.employee.name", read_only=True)
    document_type = serializers.CharField(source="document_request_employee.document_request.document_type", read_only=True)

    class Meta:
        model = RequestedDocument
        fields = '__all__'    

class DocumentRequestSerializer(BaseApprovableSerializer):
    requested_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    employees = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all(), many=True)
    employee_requests = DocumentRequestEmployeeSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentRequest
        fields = '__all__'


    def validate_employees(self, value):
        if not value:
            raise serializers.ValidationError({"error": "At least one employee must be selected."})
        return value

    def create(self, validated_data):
        employees = validated_data.pop("employees")
        document_request = DocumentRequest.objects.create(**validated_data)
        for employee in employees:
            DocumentRequestEmployee.objects.create(
                document_request=document_request,
                employee=employee,
                status="pending"
            )
        return document_request

    def update(self, instance, validated_data):
        employees = validated_data.pop("employees", None)
        instance = super().update(instance, validated_data)
        if employees is not None:
            instance.employee_requests.all().delete()
            for employee in employees:
                DocumentRequestEmployee.objects.create(
                    document_request=instance,
                    employee=employee,
                    status="pending"
                )
        return instance   


class EmployeeLogsSerializer(serializers.ModelSerializer):
    employee = serializers.SerializerMethodField()
    device = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeLogs
        fields = '__all__'
        read_only_fields = ['id', 'employee', 'device', 'created_at', 'updated_at']

    def get_employee(self, obj):
        return {
            'id': obj.employee.id,
            'name': obj.employee.name if obj.employee.name else obj.employee.user.fullname,
            'employee_id': obj.employee.employee_id,
            'position': obj.employee.position.name if obj.employee.position else None
        }

    def get_device(self, obj):
        if obj.device is None:
            return None
        return {
            'name': obj.device.name,
            'serial_number': obj.device.serial_number,
        }


      

