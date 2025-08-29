from rest_framework import serializers
from employee.serializers import EmployeeActivationSerializer, EmployeeSerializer
from users.models import CustomUser
from users.serializers import CustomUserSerializer
from .models import (
    Department,
    Institution,
    Branch,
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
    BranchLocationComaparisonConfig
)
import os
from django.db import transaction
from recruitment.models import JobPosition
import logging
from django.utils import timezone
from settings.serializers import SystemDaySerializer
from settings.models import SystemDay


logger = logging.getLogger(__name__)


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
            raise serializers.ValidationError("Mismatched file and title counts.")
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
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                {"error": "User must be authenticated to create an Institution."}
            )

        institution_owner = validated_data.pop("institution_owner_id")
        departments_data = self.context.get("departments", [])

        # Log departments data for debugging
        logger.info(f"Creating institution with departments_data: {departments_data}")

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


class InstitutionBankTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionBankType

        fields = [
            "id",
            "institution",
            "bank_fullname",
            "bank_code",
            "br_code",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
            "is_active",
        ]

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


class InstitutionBankAccountSerializer(serializers.ModelSerializer):
    institution_bank = serializers.PrimaryKeyRelatedField(
        queryset=InstitutionBankType.objects.all()
    )
    paid_branches = serializers.SerializerMethodField()

    class Meta:
        model = InstitutionBankAccount
        fields = [
            "id",
            "institution_bank",
            "account_name",
            "account_number",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "paid_branches",
            "is_active",
        ]
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


class InstitutionWorkingDaysSerializer(serializers.ModelSerializer):
    days = serializers.PrimaryKeyRelatedField(
        queryset=SystemDay.objects.all(),
        many=True,
    )

    class Meta:
        model = InstitutionWorkingDays
        fields = [
            "id",
            "institution",
            "days",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

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
            raise serializers.ValidationError({"error": "User has not profile"})

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError({"error": "Institution not found."})

        try:
            existing_working_days = InstitutionWorkingDays.objects.get(
                institution=institution
            )
            raise serializers.ValidationError(
                {"error": "Working days already exist for this institution."}
            )
        except InstitutionWorkingDays.DoesNotExist:
            pass

        created_by = request.user if request and request.user.is_authenticated else None

        validated_data["institution"] = institution
        validated_data["created_by"] = created_by

        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = (
            request.user.profile if request and request.user.is_authenticated else None
        )

        if not user:
            raise serializers.ValidationError(
                {"error": "User must be authenticated to update working days."}
            )

        instance.days.set(validated_data.get("days", instance.days.all()))
        instance.updated_by = (
            request.user if request and request.user.is_authenticated else None
        )
        instance.save()

        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["days"] = SystemDaySerializer(instance.days, many=True).data
        return rep


class BranchDaySerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="day.day_name", read_only=True)
    day_id = serializers.PrimaryKeyRelatedField(
        queryset=SystemDay.objects.all(), source="day", write_only=True, required=False
    )

    class Meta:
        model = BranchDay
        fields = ["id", "day_id", "day_name", "day_type"]


class BranchWorkingDaysSerializer(serializers.ModelSerializer):
    branch_days = BranchDaySerializer(many=True)

    class Meta:
        model = BranchWorkingDays
        fields = ["id", "branch", "branch_days"]
        read_only_fields = ["id", "branch"]

    def update(self, instance, validated_data):
        branch_days_data = validated_data.pop("branch_days", [])

        for bd_data in branch_days_data:
            day = bd_data.get("day")
            day_type = bd_data.get("day_type")

            if not day:
                continue

            branch_day, created = BranchDay.objects.get_or_create(
                branch_working_days=instance, day=day
            )
            if day_type:
                branch_day.day_type = day_type
                branch_day.save()

        return instance


class InstitutionTaxSerializer(serializers.ModelSerializer):

    class Meta:
        model = InstitutionTax
        fields = [
            "id",
            "institution",
            "tax_name",
            "tax_status",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
            "is_active",
        ]
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


class InstitutionTaxRuleSerializer(serializers.ModelSerializer):

    class Meta:
        model = InstitutionTaxRule
        fields = [
            "id",
            "institution_tax",
            "tax_rule_name",
            "tax_rule_description",
            "tax_rule_percentage",
            "tax_rule_fixed_amount",
            "salary_from",
            "salary_to",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
            "is_active",
        ]

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

        if not tax_rule_percentage and not tax_rule_fixed_amount:
            raise serializers.ValidationError(
                {
                    "error": "Either tax_rule_percentage or tax_rule_fixed_amount must be provided."
                }
            )

        if tax_rule_percentage and tax_rule_fixed_amount:
            raise serializers.ValidationError(
                {
                    "error": "Only one of tax_rule_percentage or tax_rule_fixed_amount can be provided."
                }
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
        instance.salary_from = validated_data.get("salary_from", instance.salary_from)
        instance.salary_to = validated_data.get("salary_to", instance.salary_to)

        instance.save()
        return instance


class BranchSerializer(serializers.ModelSerializer):
    institution_name = serializers.SerializerMethodField()
    institution_logo = serializers.ImageField(
        source="Institution.Institution_logo", read_only=True
    )

    class Meta:
        model = Branch
        fields = [
            "id",
            "institution",
            "paying_bank_account",
            "institution_name",
            "institution_logo",
            "branch_name",
            "branch_phone_number",
            "branch_location",
            "branch_latitude",
            "branch_longitude",
            "branch_email",
            "branch_opening_time",
            "branch_closing_time",
            "is_active",
        ]

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


class DepartmentSerializer(serializers.ModelSerializer):
    institution_details = InstitutionSerializer(source="institution", read_only=True)
    # head_of_department_details = EmployeeSerializer(
    #     source="head_of_department", read_only=True
    # )

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "description",
            "institution",
            # "head_of_department",
            # "head_of_department_details",
            "institution_details",
        ]


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


class BranchPenaltyConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BranchPenaltyConfig
        fields = "__all__"


class BranchShiftSerializer(serializers.ModelSerializer):
    shift_day = serializers.PrimaryKeyRelatedField(
        queryset=BranchDay.objects.all()
    )
    class Meta:
        model = BranchShift
        fields = "__all__"

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret["shift_day"] = BranchDaySerializer(instance.shift_day).data
        return ret

class BranchLocationComparisonConfigSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = BranchLocationComaparisonConfig
        fields = "__all__"        