from datetime import date
from recruitment.serializers import JobAdvertApplicationSerializer
from rest_framework import serializers
from .models import (
    OnBoarding,
    OffboardingStage,
    InstitutionEmployeeSeparationTypes,
    InstitutionSeparationPolicy,
    ResignationRequest,
    RetirementRequest,
    SeparationStageProgress,
    TerminationInitiation,
    EmployeeSeparation,
)
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.db.models import Model
from users.serializers import ProfileSerializer
from employee.serializers import EmployeeSerializer
from general.serializers import BaseApprovableSerializer


class OnBoardingSerializer(BaseApprovableSerializer):
    application_details = JobAdvertApplicationSerializer(
        source="application", read_only=True
    )

    class Meta:
        model = OnBoarding
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class OffboardingStageSerializer(BaseApprovableSerializer):
    class Meta:
        model = OffboardingStage
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "institution"]

    def validate_stage_name(self, value):
        if not value:
            raise serializers.ValidationError({"error": "Stage name cannot be empty."})
        return value

    def create(self, validated_data):
        from institution.models import Institution

        request = self.context.get("request")

        user = request.user.profile

        institution = getattr(user, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError({"error": "Institution does not exist."})

        if not institution:
            raise serializers.ValidationError({"error": "Institution is required."})

        validated_data["institution"] = institution

        return super().create(validated_data)


class InstitutionEmployeeSeparationTypesSerializer(BaseApprovableSerializer):
    supported_stages = serializers.PrimaryKeyRelatedField(
        many=True,
        required=False,
        queryset=OffboardingStage.objects.all(),
    )

    class Meta:
        model = InstitutionEmployeeSeparationTypes
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "institution"]

    def validate_separation_type(self, value):
        if not value:
            raise serializers.ValidationError(
                {"error": "Separation type cannot be empty."}
            )
        return value

    def create(self, validated_data):
        from institution.models import Institution

        request = self.context.get("request")

        user = request.user.profile

        institution = getattr(user, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError({"error": "Institution does not exist."})

        if not institution:
            raise serializers.ValidationError({"error": "Institution is required."})

        validated_data["institution"] = institution

        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["supported_stages"] = OffboardingStageSerializer(
            instance.supported_stages.all(), many=True, context=self.context
        ).data
        return representation


class InstitutionSeparationPolicySerializer(BaseApprovableSerializer):
    separation_type = serializers.PrimaryKeyRelatedField(
        queryset=InstitutionEmployeeSeparationTypes.objects.all()
    )

    class Meta:
        model = InstitutionSeparationPolicy
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["separation_type"] = (
            InstitutionEmployeeSeparationTypesSerializer(
                instance.separation_type, context=self.context
            ).data
        )
        return representation


class EmployeeSeparationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeSeparation
        fields = "__all__"

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["initiated_by"] = (
            ProfileSerializer(instance.initiated_by, context=self.context).data
            if instance.initiated_by
            else None
        )
        representation["employee"] = (
            EmployeeSerializer(instance.employee, context=self.context).data
            if instance.employee
            else None
        )
        return representation


class ResignationRequestSerializer(BaseApprovableSerializer):
    class Meta:
        model = ResignationRequest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()

        instance = getattr(self, "instance", None)

        if instance and instance.request_status in [
            "approved",
            "rejected",
            "under_review",
        ]:
            for field in [
                "resignation_letter",
                "comments",
                "last_working_day",
            ]:
                fields[field].read_only = True

        return fields

    def validate(self, data):
        data = super().validate(data)
        employee = self.context.get("employee")

        separation_type = data["separation_type"]
        policy = InstitutionSeparationPolicy.objects.filter(
            separation_type=separation_type, is_active=True
        ).first()
        if policy and policy.enforce_policy:
            last_working_day = data.get("last_working_day")
            if last_working_day:
                notice_days = (last_working_day - date.today()).days
                if (
                    notice_days < policy.min_notice_days
                    or notice_days > policy.max_notice_days
                ):
                    raise serializers.ValidationError(
                        {
                            "error": f"Notice period must be between {policy.min_notice_days} and {policy.max_notice_days} days."
                        }
                    )
            if policy.require_separation_letter and not data.get("resignation_letter"):
                raise serializers.ValidationError(
                    {"error": "Resignation letter is required."}
                )
        return data

        if not employee:
            raise serializers.ValidationError(
                {"error": "Employee context is required for resignation requests."}
            )

        institution = getattr(employee, "institution", None)

        if not institution:
            raise serializers.ValidationError(
                {"error": "Employee's institution is not set."}
            )

        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                institution=institution,
                category="resignation",
                is_active=True,
            )
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "error": "Resignation separation type is not configured for this institution."
                }
            )

        active_sep = EmployeeSeparation.objects.filter(
            employee=employee,
            employee_separation_type=separation_type,
            separation_status="planned",
        ).first()

        if (
            active_sep
            and ResignationRequest.objects.filter(separation=active_sep).exists()
        ):
            raise serializers.ValidationError(
                {
                    "error": "An active resignation request already exists for this employee."
                }
            )

        data["employee"] = employee
        data["separation_type"] = separation_type

        return data

    def create(self, validated_data):
        employee = validated_data["employee"]
        separation_type = validated_data["separation_type"]
        last_working_day = validated_data["last_working_day"]

        separation = EmployeeSeparation.objects.create(
            employee_separation_type=separation_type,
            employee=employee,
            initiated_by=employee,
            effective_date=last_working_day,
            separation_status="planned",
        )

        resignation_request = ResignationRequest.objects.create(
            separation=separation,
            resignation_letter=validated_data.get("resignation_letter"),
            comments=validated_data.get("comments", ""),
            last_working_day=last_working_day,
            request_status="submitted",
        )

        return resignation_request

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if "last_working_day" in validated_data:
            separation = instance.separation
            if separation.effective_date != validated_data["last_working_day"]:
                separation.effective_date = validated_data["last_working_day"]
                separation.save()

        return instance


class RetirementRequestSerializer(BaseApprovableSerializer):
    class Meta:
        model = RetirementRequest
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()

        instance = getattr(self, "instance", None)

        if instance and instance.request_status in [
            "approved",
            "rejected",
            "under_review",
        ]:
            for field in [
                "retirement_letter",
                "comments",
                "last_working_day",
            ]:
                fields[field].read_only = True

        return fields

    def validate(self, data):
        employee = self.context.get("employee")

        if not employee:
            raise serializers.ValidationError(
                {"error": "Employee context is required for retirement requests."}
            )

        institution = getattr(employee, "institution", None)

        if not institution:
            raise serializers.ValidationError(
                {"error": "Employee's institution is not set."}
            )

        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                institution=institution,
                category="retirement",
                is_active=True,
            )
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "error": "Retirement separation type is not configured for this institution."
                }
            )

        active_sep = EmployeeSeparation.objects.filter(
            employee=employee,
            employee_separation_type=separation_type,
            separation_status="planned",
        ).first()

        if (
            active_sep
            and RetirementRequest.objects.filter(separation=active_sep).exists()
        ):
            raise serializers.ValidationError(
                {
                    "error": "An active retirement request already exists for this employee."
                }
            )

        data["employee"] = employee
        data["separation_type"] = separation_type

        return data

    def create(self, validated_data):
        employee = validated_data["employee"]
        separation_type = validated_data["separation_type"]
        last_working_day = validated_data["last_working_day"]

        separation = EmployeeSeparation.objects.create(
            employee_separation_type=separation_type,
            employee=employee,
            initiated_by=employee,
            effective_date=last_working_day,
            separation_status="planned",
        )

        retirement_request = RetirementRequest.objects.create(
            separation=separation,
            retirement_letter=validated_data.get("retirement_letter"),
            comments=validated_data.get("comments", ""),
            last_working_day=last_working_day,
            request_status="submitted",
        )

        return retirement_request


class TerminationInitiationSerializer(BaseApprovableSerializer):
    employee_id = serializers.IntegerField(write_only=True)

    separation = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TerminationInitiation
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "separation"]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["separation"] = EmployeeSeparationSerializer(
            instance.separation, context=self.context
        ).data
        return representation

    def get_fields(self):
        fields = super().get_fields()
        instance = getattr(self, "instance", None)

        if isinstance(instance, Model) and instance.initiation_status in [
            "approved",
            "rejected",
            "under_review",
        ]:
            for field in [
                "termination_letter",
                "comments",
                "last_working_day",
            ]:
                fields[field].read_only = True

        return fields

    def validate_employee_id(self, value):
        from employee.models import Employee

        user = self.context["request"].user

        user = user.profile

        try:
            employee = Employee.objects.get(id=value)
        except Employee.DoesNotExist:
            raise serializers.ValidationError({"error": "Employee does not exist."})

        if getattr(user, "institution", None) != employee.department.institution:
            raise serializers.ValidationError(
                {"error": "You are not authorized to terminate this employee."}
            )

        self._validated_employee = employee

        return value

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("employee_id", None)

        employee = self._validated_employee
        user = self.context["request"].user

        try:
            termination_type = InstitutionEmployeeSeparationTypes.objects.get(
                institution=employee.department.institution,
                category="termination",
                is_active=True,
            )
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "error": "Termination separation type not configured for this institution."
                }
            )

        last_working_day = validated_data.get("last_working_day", None)

        separation, created = EmployeeSeparation.objects.get_or_create(
            employee=employee,
            employee_separation_type=termination_type,
            separation_status="planned",
            defaults={
                "initiated_by": getattr(user, "employee", None),
                "effective_date": last_working_day,
            },
        )

        validated_data["separation"] = separation

        if not separation.initiated_by:
            separation.initiated_by = user.profile
            separation.save()

        termination_initiation = TerminationInitiation.objects.create(**validated_data)

        return termination_initiation

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if "last_working_day" in validated_data:
            separation = instance.separation
            if separation.effective_date != validated_data["last_working_day"]:
                separation.effective_date = validated_data["last_working_day"]
                separation.save()

        return instance


class SeparationStageProgressSerializer(serializers.ModelSerializer):
    """Serializes the progress of a single off-boarding stage."""
    stage_name = serializers.CharField(source="stage.stage_name", read_only=True)

    class Meta:
        model = SeparationStageProgress
        fields = [
            "id",
            "stage_name",
            "status",
            "notes",
            "position",
            "created_at",
            "updated_at",
        ]

class EmployeeSeparationWithStagesSerializer(serializers.ModelSerializer):
    employee = serializers.SerializerMethodField()
    employee_separation_type = InstitutionEmployeeSeparationTypesSerializer(read_only=True)
    initiated_by = ProfileSerializer(read_only=True)
    stages = SeparationStageProgressSerializer(many=True, read_only=True)

    class Meta:
        model = EmployeeSeparation
        fields = [
            "id",
            "employee",
            "employee_separation_type",
            "initiated_by",
            "effective_date",
            "additional_notes",
            "separation_status",
            "created_at",
            "updated_at",
            "stages",
        ]

    def get_employee(self, obj):
        """Return only the employee's name and position."""
        employee = obj.employee
        if not employee:
            return None

        return {
            "name": employee.name,
            "position": employee.position.name,
        }


class SeparationStageProgressReorderSerializer(serializers.Serializer):
    source_stage_id = serializers.IntegerField()
    target_stage_id = serializers.IntegerField()

    def validate(self, data):
        source_stage_id = data.get("source_stage_id")
        target_stage_id = data.get("target_stage_id")
        separation_id = self.context.get("separation_id")

        if source_stage_id == target_stage_id:
            raise serializers.ValidationError({"error": "Source and target stage IDs cannot be the same."})

        try:
            source_stage = SeparationStageProgress.objects.get(
                id=source_stage_id, separation_id=separation_id, deleted_at__isnull=True
            )
        except SeparationStageProgress.DoesNotExist:
            raise serializers.ValidationError({"error": f"Source stage ID {source_stage_id} not found."})

        try:
            target_stage = SeparationStageProgress.objects.get(
                id=target_stage_id, separation_id=separation_id, deleted_at__isnull=True
            )
        except SeparationStageProgress.DoesNotExist:
            raise serializers.ValidationError({"error": f"Target stage ID {target_stage_id} not found."})

        if source_stage.separation != target_stage.separation:
            raise serializers.ValidationError({"error": "Source and target stages must belong to the same separation."})

        return data        
