from rest_framework import serializers
from general.serializers import BaseApprovableSerializer
from users.models import CustomUser, Profile, Role, RolePermission, UserPermission, UserRole
from users.serializers import CustomUserSerializer
from .models import (
    Department,
    Institution,
    Branch,
    InstitutionDay,
    OwnershipTransfer,
    TaxRuleCategory,
    UserBranch,
    InstitutionKYCDocument,
    InstitutionBankType,
    InstitutionWorkingDays,
    InstitutionBankAccount,
    InstitutionTax,
    InstitutionTaxRule,
    InstitutionPenaltyConfig,
    BranchPenaltyConfig,
    BranchWorkingDays,
    BranchDay,
    BranchShift,
    BranchLocationComparisonConfig,
)
import os
from django.db import transaction
from recruitment.models import JobPosition
import logging
from django.utils import timezone
from settings.models import SystemDay
from rest_framework.exceptions import ValidationError


logger = logging.getLogger(__name__)


class AIQuerySerializer(serializers.Serializer):
    question = serializers.CharField(required=True, allow_blank=False, write_only=True)
    answer = serializers.CharField(read_only=True)
    chat_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if not self.instance and not attrs.get("question"):
            raise serializers.ValidationError({"error": "Question is required."})
        return attrs


class InstitutionKYCDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionKYCDocument
        fields = [
            "id",
            "institution",
            "document_title",
            "document_file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "institution",
            "created_at",
            "updated_at",
        ]


class InstitutionKYCDocumentBulkCreateSerializer(serializers.Serializer):
    document_file = serializers.ListField(
        child=serializers.FileField(), write_only=True, required=True
    )
    document_title = serializers.ListField(
        child=serializers.CharField(max_length=255), write_only=True, required=True
    )

    def validate(self, data):
        if len(data["document_file"]) != len(data["document_title"]):
            raise serializers.ValidationError({"error": "Mismatched file and title counts."})
        return data

    def create(self, validated_data):
        request = self.context["request"]
        institution = request.user.profile.institution

        document_file = validated_data.pop("document_file", [])
        document_title = validated_data.pop("document_title", [])

        documents = [
            InstitutionKYCDocument(
                institution=institution,
                document_title=title,
                document_file=file,
            )
            for title, file in zip(document_title, document_file)
        ]

        return InstitutionKYCDocument.objects.bulk_create(documents)


class InstitutionSerializer(serializers.ModelSerializer):
    institution_owner_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all()
    )
    institution_logo = serializers.ImageField(required=False, allow_null=True)
    approval_status_display = serializers.CharField(
        source="get_approval_status_display", read_only=True
    )
    transfer_history = serializers.SerializerMethodField()
    branches = serializers.SerializerMethodField()

    class Meta:
        model = Institution
        fields = [
            "id",
            "institution_email",
            "institution_name",
            "first_phone_number",
            "second_phone_number",
            "institution_logo",
            "institution_owner_id",
            "theme_color",
            "location",
            "latitude",
            "longitude",
            "country_code",
            "approval_status",
            "approval_status_display",
            "approval_date",
            "branches",
            "is_active",
            "user_inactivity_time",
            "is_attendance_penalties_enabled",
            "transfer_history"
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                {"error": "User must be authenticated to create an Institution."}
            )

        institution_owner = validated_data.pop("institution_owner_id")
        departments_data = self.context.get("departments", [])

        with transaction.atomic():
            # Create the Institution
            institution = Institution.objects.create(
                institution_owner=institution_owner,
                created_by=request.user,
                **validated_data,
            )

            # Create Departments and JobPositions
            for dept_data in departments_data:
                department = Department.objects.create(
                    name=dept_data["name"],
                    description=dept_data.get("description", ""),
                    institution=institution,
                    created_by=request.user,
                    created_at=timezone.now(),
                    updated_at=timezone.now(),
                )
                for job_data in dept_data.get("job_positions", []):
                    JobPosition.objects.create(
                        name=job_data["name"],
                        description=job_data.get("description", ""),
                        department=department,
                        job_position_status="active",
                        created_at=timezone.now(),
                        salary_min=job_data.get("salary_min", 50000),
                        salary_max=job_data.get("salary_max", 100000),
                    )

        logger.info(
            f"Institution {institution.institution_name} created successfully with {len(departments_data)} departments"
        )
        return institution

    def get_branches(self, institution):
        user = self.context.get("user")
        if user and institution.institution_owner == user:
            branches = institution.branches.all()
        else:
            user_branches = UserBranch.objects.filter(user=user).values_list(
                "branch_id", flat=True
            )
            branches = institution.branches.filter(id__in=user_branches)
        return BranchSerializer(branches, many=True).data
    
    def get_transfer_history(self, obj):
        institution = obj
        ownership_transfers = OwnershipTransfer.objects.filter(institution=institution).order_by(
            "-transfer_date"
        )
        return OwnershipTransferSerializer(ownership_transfers, many=True).data


class InstitutionBankTypeSerializer(BaseApprovableSerializer):
    class Meta:
        model = InstitutionBankType

        fields = '__all__'

        read_only_fields = [
            "id",
            "institution",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")

        user = (
            request.user.profile if request and request.user.is_authenticated else None
        )

        if not user:
            raise serializers.ValidationError(
                {"error": "User must be authenticated to create a bank type."}
            )

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError({"error": "Institution not found."})

        validated_data["institution"] = institution
        return super().create(validated_data)


class InstitutionBankAccountSerializer(BaseApprovableSerializer):
    institution_bank = serializers.PrimaryKeyRelatedField(
        queryset=InstitutionBankType.objects.all()
    )
    paid_branches = serializers.SerializerMethodField()

    class Meta:
        model = InstitutionBankAccount
        fields = '__all__'
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "paid_branches",
        ]

    paid_branches = serializers.SerializerMethodField()

    def get_paid_branches(self, obj):
        from .serializers import BranchSerializer

        return BranchSerializer(obj.paid_branches.all(), many=True).data

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["institution_bank"] = InstitutionBankTypeSerializer(
            instance.institution_bank
        ).data
        return rep


class InstitutionDaySerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="day.day_name", read_only=True)
    day_id = serializers.PrimaryKeyRelatedField(
        queryset=SystemDay.objects.all(), source="day", write_only=True, required=True
    )

    class Meta:
        model = InstitutionDay
        fields = ["id", "day_id", "day_name", "opening_time", "closing_time"]

    def validate(self, data):
        opening_time = data.get("opening_time")
        closing_time = data.get("closing_time")
        if opening_time and closing_time and opening_time >= closing_time:
            raise serializers.ValidationError({"error": "Opening time must be before closing time."})
        return data

class InstitutionWorkingDaysSerializer(BaseApprovableSerializer):
    institution_days = InstitutionDaySerializer(many=True)

    class Meta:
        model = InstitutionWorkingDays
        fields = '__all__'
        read_only_fields = [
            "id",
            "institution",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user.profile if request.user else None

        if not user:
            raise serializers.ValidationError({"error": "User has no profile"})

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError({"error": "Institution not found."})

        try:
            existing_working_days = InstitutionWorkingDays.objects.get(
                institution=institution
            )
            raise serializers.ValidationError(
                {"detail": "Working days already exist for this institution."}
            )
        except InstitutionWorkingDays.DoesNotExist:
            pass

        institution_days_data = validated_data.pop("institution_days", [])
        validated_data["institution"] = institution
        validated_data["created_by"] = request.user if request and request.user.is_authenticated else None

        institution_working_days = super().create(validated_data)

        for day_data in institution_days_data:
            InstitutionDay.objects.create(
                institution_working_days=institution_working_days,
                day=day_data["day"],
                opening_time=day_data.get("opening_time", "09:00:00"),
                closing_time=day_data.get("closing_time", "17:00:00"),
            )

        return institution_working_days

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user.profile if request and request.user.is_authenticated else None

        if not user:
            raise serializers.ValidationError(
                {"error": "User must be authenticated to update working days."}
            )

        institution_days_data = validated_data.pop("institution_days", [])

        instance.institution_days.all().delete()

        for day_data in institution_days_data:
            InstitutionDay.objects.create(
                institution_working_days=instance,
                day=day_data["day"],
                opening_time=day_data.get("opening_time", "09:00:00"),
                closing_time=day_data.get("closing_time", "17:00:00"),
            )

        instance.updated_by = request.user if request and request.user.is_authenticated else None
        instance.save()

        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["institution_days"] = InstitutionDaySerializer(instance.institution_days, many=True).data
        return rep

class BranchDaySerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="day.day_name", read_only=True)
    day_id = serializers.PrimaryKeyRelatedField(
        queryset=SystemDay.objects.all(), source="day", write_only=True, required=False
    )

    class Meta:
        model = BranchDay
        fields = ["id", "day_id", "day_name", "day_type", "opening_time", "closing_time"]

    def validate(self, data):
        opening_time = data.get("opening_time")
        closing_time = data.get("closing_time")
        if opening_time and closing_time and opening_time >= closing_time:
            raise serializers.ValidationError({"error": "Opening time must be before closing time."})
        return data

class BranchWorkingDaysSerializer(BaseApprovableSerializer):
    branch_days = BranchDaySerializer(many=True)

    class Meta:
        model = BranchWorkingDays
        fields = '__all__'
        read_only_fields = ["id", "branch"]

    def update(self, instance, validated_data):
        branch_days_data = validated_data.pop("branch_days", [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        instance.branch_days.all().delete()

        for bd_data in branch_days_data:
            day = bd_data.get("day")
            day_type = bd_data.get("day_type", "PHYSICAL")
            opening_time = bd_data.get("opening_time", "09:00:00")
            closing_time = bd_data.get("closing_time", "17:00:00")

            if not day:
                continue

            BranchDay.objects.create(
                branch_working_days=instance,
                day=day,
                day_type=day_type,
                opening_time=opening_time,
                closing_time=closing_time,
            )

        instance.refresh_from_db()
        return instance


class InstitutionTaxSerializer(BaseApprovableSerializer):

    class Meta:
        model = InstitutionTax
        fields = '__all__'
        read_only_fields = [
            "id",
            "institution",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")

        user = request.user.profile if request.user else None

        if not user:
            raise serializers.ValidationError({"error": "User has no profile."})

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError({"error": "Institution not found."})

        validated_data["institution"] = institution
        validated_data["created_by"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user.profile if request.user else None

        if not user:
            raise serializers.ValidationError({"error": "User has no profile."})

        instance.updated_by = request.user

        instance.tax_name = validated_data.get("tax_name", instance.tax_name)
        instance.tax_status = validated_data.get("tax_status", instance.tax_status)

        instance.save()
        return instance


class InstitutionTaxRuleSerializer(BaseApprovableSerializer):

    class Meta:
        model = InstitutionTaxRule
        fields = '__all__'

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def validate(self, attrs):
        tax_rule_percentage = attrs.get("tax_rule_percentage")
        tax_rule_fixed_amount = attrs.get("tax_rule_fixed_amount")

        instance = getattr(self, "instance", None)
        if instance:
            tax_rule_percentage = (
                tax_rule_percentage
                if tax_rule_percentage is not None
                else getattr(instance, "tax_rule_percentage", None)
            )
            tax_rule_fixed_amount = (
                tax_rule_fixed_amount
                if tax_rule_fixed_amount is not None
                else getattr(instance, "tax_rule_fixed_amount", None)
            )


        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user.profile if request.user else None

        if not user:
            raise serializers.ValidationError({"error": "User has no profile."})

        institution_tax = validated_data.get("institution_tax")
        if not institution_tax:
            raise serializers.ValidationError({"error": "Institution tax is required."})

        validated_data["created_by"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user.profile if request.user else None

        if not user:
            raise serializers.ValidationError({"error": "User has no profile."})

        instance.updated_by = request.user

        instance.tax_rule_name = validated_data.get(
            "tax_rule_name", instance.tax_rule_name
        )
        instance.tax_rule_description = validated_data.get(
            "tax_rule_description", instance.tax_rule_description
        )
        instance.tax_rule_percentage = validated_data.get(
            "tax_rule_percentage", instance.tax_rule_percentage
        )
        instance.tax_rule_fixed_amount = validated_data.get(
            "tax_rule_fixed_amount", instance.tax_rule_fixed_amount
        )
        instance.tax_rule_category = validated_data.get(
            "tax_rule_category", instance.tax_rule_category
        )
        instance.salary_from = validated_data.get("salary_from", instance.salary_from)
        instance.salary_to = validated_data.get("salary_to", instance.salary_to)

        instance.save()
        return instance


class BranchSerializer(BaseApprovableSerializer):
    institution_name = serializers.SerializerMethodField()
    institution_logo = serializers.ImageField(
        source="Institution.Institution_logo", read_only=True
    )

    class Meta:
        model = Branch
        fields = '__all__'

    def get_institution_logo(self, obj):
        if (
            hasattr(obj, "institution")
            and obj.institution
            and obj.institution.institution_logo
        ):
            return obj.institution.institution_logo.url
        return None

    def get_institution_name(self, obj):
        if hasattr(obj, "institution") and obj.institution:
            return obj.institution.institution_name
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                {"error": "User must be authenticated to create a branch."}
            )
        validated_data["created_by"] = request.user
        return super().create(validated_data)


class InstitutionWithBranchesSerializer(InstitutionSerializer):
    branches = serializers.SerializerMethodField()

    class Meta(InstitutionSerializer.Meta):
        model = Institution
        fields = InstitutionSerializer.Meta.fields + ["branches"]

    def get_branches(self, institution):
        user = self.context.get("user")

        if user and institution.institution_owner == user:
            branches = institution.branches.all()
        else:
            user_branches = UserBranch.objects.filter(user=user).values_list(
                "branch_id", flat=True
            )
            branches = institution.branches.filter(id__in=user_branches)

        return BranchSerializer(branches, many=True).data


class UserBranchSerializer(serializers.ModelSerializer):
    user_details = CustomUserSerializer(source="user", read_only=True)
    branch_details = BranchSerializer(source="branch", read_only=True)

    class Meta:
        model = UserBranch
        fields = [
            "id",
            "user",
            "branch",
            "is_default",
            "user_details",
            "branch_details",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                {"error": "User must be authenticated to create a user branch."}
            )
        return UserBranch.objects.create(created_by=request.user, **validated_data)


class DepartmentSerializer(BaseApprovableSerializer):
    institution_details = InstitutionSerializer(source="institution", read_only=True)
    # head_of_department_details = EmployeeSerializer(
    #     source="head_of_department", read_only=True
    # )

    class Meta:
        model = Department
        fields = '__all__'


class OwnerSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(max_length=20, required=False)
    gender = serializers.ChoiceField(
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        required=False,
        allow_blank=True,
    )


class BranchActivationSerializer(serializers.Serializer):
    branch_name = serializers.CharField(max_length=100)
    branch_location = serializers.CharField(max_length=200)
    branch_phone_number = serializers.CharField(max_length=20, required=False)
    branch_email = serializers.EmailField(required=False)


class DepartmentActivationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(max_length=500, required=False)


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


class InstitutionActivationSerializer(serializers.Serializer):
    institution_name = serializers.CharField(max_length=255, required=True)
    institution_email = serializers.EmailField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=500, required=False, allow_blank=True)
    branches = BranchActivationSerializer(many=True, required=True)
    employees = EmployeeActivationSerializer(many=True, required=False)
    owner = OwnerSerializer(required=True)
    departments = DepartmentActivationSerializer(many=True, required=False)


class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()
    message = serializers.CharField(required=False)
    details = serializers.JSONField(required=False)


class SuccessResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.DictField()


class InstitutionPenaltyConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionPenaltyConfig
        fields = "__all__"
        extra_kwargs = {
            "penalty_type": {
                "error_messages": {
                    "unique": "This penalty type already exists for this institution."
                }
            }
        }
        validators = []  # ✅ disable DRF's auto UniqueTogetherValidator

    def validate(self, attrs):
        institution = attrs.get("institution") or self.instance.institution
        penalty_type = attrs.get("penalty_type") or self.instance.penalty_type

        if (
            InstitutionPenaltyConfig.objects.exclude(
                pk=getattr(self.instance, "pk", None)
            )
            .filter(institution=institution, penalty_type=penalty_type)
            .exists()
        ):
            raise serializers.ValidationError(
                {"error": "This penalty type already exists for this institution."}
            )
        return attrs


class BranchPenaltyConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BranchPenaltyConfig
        fields = "__all__"
        validators = []  # ✅ disable DRF's auto UniqueTogetherValidator

    def validate(self, attrs):
        branch = attrs.get("branch") or self.instance.branch
        penalty_type = attrs.get("penalty_type") or self.instance.penalty_type

        if (
            BranchPenaltyConfig.objects.exclude(pk=getattr(self.instance, "pk", None))
            .filter(branch=branch, penalty_type=penalty_type)
            .exists()
        ):
            raise serializers.ValidationError(
                {"error": "This penalty type already exists for this branch."}
            )
        return attrs

class OrganizationChartSerializer(BaseApprovableSerializer):
    subordinates = serializers.SerializerMethodField()

    class Meta:
        model = JobPosition
        fields = '__all__'

    def get_subordinates(self, obj):    
        subordinates = JobPosition.objects.filter(reports_to=obj, job_position_status='active', department__institution=obj.department.institution)
        return OrganizationChartSerializer(subordinates, many=True, context=self.context).data

class BranchLocationComparisonConfigSerializer(BaseApprovableSerializer):
    branch_name = serializers.CharField(source="branch.branch_name", read_only=True)

    class Meta:
        model = BranchLocationComparisonConfig
        fields = "__all__"

class TaxRuleCategorySerializer(serializers.ModelSerializer):

    class Meta:
         model = TaxRuleCategory
         fields = '__all__'

class BranchShiftSerializer(BaseApprovableSerializer):
    shift_day = serializers.PrimaryKeyRelatedField(queryset=BranchDay.objects.all())

    class Meta:
        model = BranchShift
        fields = "__all__"

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["shift_day"] = BranchDaySerializer(instance.shift_day).data
        return ret

    def validate(self, attrs):
        branch = attrs.get("branch") or getattr(self.instance, "branch", None)
        start_time = attrs.get("start_time") or getattr(
            self.instance, "start_time", None
        )
        end_time = attrs.get("end_time") or getattr(self.instance, "end_time", None)

        if not (start_time and end_time and branch):
            return attrs

        if start_time >= end_time:
            raise serializers.ValidationError(
                {"error": "Shift end time must be after start time."}
            )

        if start_time < branch.branch_opening_time:
            raise serializers.ValidationError(
                {
                    "error": f"Start time cannot be before branch opening time ({branch.branch_opening_time})."
                }
            )
        if end_time > branch.branch_closing_time:
            raise serializers.ValidationError(
                {
                    "error": f"End time cannot be after branch closing time ({branch.branch_closing_time})."
                }
            )

        return attrs


class AIAssistantSerializer(serializers.Serializer):
    question = serializers.CharField(required=True, allow_blank=False, write_only=True)
    answer = serializers.CharField(read_only=True)
    session_id = serializers.CharField(max_length=100, required=False)
    chat_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if not self.instance and not attrs.get("question"):
            raise serializers.ValidationError({"error": "Question is required."})
        return attrs


class AIChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    message = serializers.CharField()
    timestamp = serializers.DateTimeField()


class AIChatSerializer(serializers.Serializer):
    chat_id = serializers.UUIDField()
    title = serializers.CharField()
    messages = AIChatMessageSerializer(many=True)


class UserChatsSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    chats = AIChatSerializer(many=True)


class OwnershipTransferSerializer(BaseApprovableSerializer):
    previous_owner = CustomUserSerializer(read_only=True)
    new_owner = CustomUserSerializer(read_only=True)

    previous_owner_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source="previous_owner",
        write_only=True,
    )
    new_owner_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source="new_owner",
        write_only=True,
    )

    class Meta:
        model = OwnershipTransfer
        fields = '__all__'
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        if attrs.get("account_fate") == "new_role" and not attrs.get("new_role"):
            raise ValidationError({
                "error": "New role must be specified when account fate is 'new_role'."
            })

        # Ensuring current owner cannot be the same as new owner
        if attrs.get("previous_owner") == attrs.get("new_owner"):
            raise ValidationError({
                "error": "Previous owner and new owner cannot be the same."
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise ValidationError({
                "error": "User must be authenticated to create an ownership transfer."
            })

        if validated_data["institution"].institution_owner != request.user:
            raise ValidationError({
                "error": "You are not authorized to create an ownership transfer for this institution."
            })

        account_fate = validated_data.pop("account_fate", None)

        if account_fate == "new_role":
            new_role = validated_data.pop("new_role", None)
            institution_roles = Role.objects.filter(institution=validated_data["institution"])

            if new_role not in institution_roles:
                raise serializers.ValidationError(
                    {
                        "error": f"Role '{new_role}' does not exist in the institution roles."
                    }
                )

            UserRole.objects.filter(user=validated_data["previous_owner"]).delete()
            UserRole.objects.create(
                user=validated_data["previous_owner"],
                role=new_role,
            )

            role_permissions = RolePermission.objects.filter(role=new_role)

            UserPermission.objects.filter(
                user=validated_data["previous_owner"],
            ).delete()

            for permission in role_permissions:
                UserPermission.objects.create(
                    user=validated_data["previous_owner"],
                    permission=permission.permission,
                )

        elif account_fate == "deactivate":
            user = validated_data["previous_owner"]
            user.is_active = False
            user.save()

            Profile.objects.filter(user=user, institution=validated_data["institution"]).delete()
            UserPermission.objects.filter(user=user).delete()
            UserRole.objects.filter(user=user).delete()
            UserBranch.objects.filter(user=user).delete()

        institution = validated_data["institution"]
        if institution.institution_owner != validated_data["new_owner"]:
            institution.institution_owner = validated_data["new_owner"]
            institution.save()

        # our institution owner doesn't need a role, so we need to remove any existing roles from the new owner
        UserRole.objects.filter(user=validated_data["new_owner"]).delete()
        UserBranch.objects.filter(user=validated_data["new_owner"]).delete()
        UserPermission.objects.filter(user=validated_data["new_owner"]).delete()

        ownership_transfer = OwnershipTransfer.objects.create(**validated_data)
        return ownership_transfer