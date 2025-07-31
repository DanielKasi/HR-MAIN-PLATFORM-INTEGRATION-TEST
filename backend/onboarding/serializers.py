from recruitment.serializers import JobAdvertApplicationSerializer
from rest_framework import serializers
from .models import (
    OnBoarding,
    OffboardingStage,
    InstitutionEmployeeSeparationTypes,
    InstitutionSeparationPolicy,
    ResignationRequest,
    RetirementRequest,
    TerminationInitiation,
    EmployeeSeparation,
)
from django.db import transaction
from workflows.models import WorkflowAction, InstitutionApprovalStep, ApprovalTask
from django.contrib.contenttypes.models import ContentType
from django.db.models import Model
from users.serializers import ProfileSerializer


class OnBoardingSerializer(serializers.ModelSerializer):
    application_details = JobAdvertApplicationSerializer(
        source="application", read_only=True
    )

    class Meta:
        model = OnBoarding
        fields = [
            "id",
            "application",
            "application_details",
            "remarks",
            "attended",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class OffboardingStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = OffboardingStage
        fields = [
            "id",
            "institution",
            "stage_name",
            "stage_description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "institution"]

    def validate_stage_name(self, value):
        if not value:
            raise serializers.ValidationError("Stage name cannot be empty.")
        return value

    def create(self, validated_data):
        from institution.models import Institution

        request = self.context.get("request")

        user = request.user.profile

        institution = getattr(user, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError("Institution does not exist.")

        if not institution:
            raise serializers.ValidationError("Institution is required.")

        validated_data["institution"] = institution

        return super().create(validated_data)


class InstitutionEmployeeSeparationTypesSerializer(serializers.ModelSerializer):
    supported_stages = serializers.PrimaryKeyRelatedField(
        many=True,
        required=False,
        queryset=OffboardingStage.objects.all(),
    )

    class Meta:
        model = InstitutionEmployeeSeparationTypes
        fields = [
            "id",
            "institution",
            "separation_type",
            "description",
            "supported_stages",
            "category",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "institution"]

    def validate_separation_type(self, value):
        if not value:
            raise serializers.ValidationError("Separation type cannot be empty.")
        return value

    def create(self, validated_data):
        from institution.models import Institution

        request = self.context.get("request")

        user = request.user.profile

        institution = getattr(user, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            raise serializers.ValidationError("Institution does not exist.")

        if not institution:
            raise serializers.ValidationError("Institution is required.")

        validated_data["institution"] = institution

        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["supported_stages"] = OffboardingStageSerializer(
            instance.supported_stages.all(), many=True, context=self.context
        ).data
        return representation


class InstitutionSeparationPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionSeparationPolicy
        fields = [
            "id",
            "separation_type",
            "policy_document",
            "description",
            "min_notice_days",
            "max_notice_days",
            "require_separation_letter",
            "require_all_stages",
            "is_active",
            "enforce_policy",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


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
        return representation


class ResignationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResignationRequest
        fields = [
            "id",
            "separation",
            "resignation_letter",
            "comments",
            "last_working_day",
            "request_status",
            "created_at",
            "updated_at",
        ]
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
        employee = self.context.get("employee")

        if not employee:
            raise serializers.ValidationError(
                "Employee context is required for resignation requests."
            )

        institution = getattr(employee, "institution", None)

        if not institution:
            raise serializers.ValidationError("Employee's institution is not set.")

        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                institution=institution,
                category="resignation",
                is_active=True,
            )
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            raise serializers.ValidationError(
                "Resignation separation type is not configured for this institution."
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
                "An active resignation request already exists for this employee."
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

        institution = employee.institution

        content_type = ContentType.objects.get_for_model(ResignationRequest)

        try:
            action = WorkflowAction.objects.get(code="resignation_request")
        except WorkflowAction.DoesNotExist:
            action = None

        if action:
            steps = InstitutionApprovalStep.objects.filter(
                institution=institution, action=action
            ).order_by("level")

            if not steps.exists():
                resignation_request.finish_workflow()
            else:
                for i, step in enumerate(steps):
                    ApprovalTask.objects.create(
                        step=step,
                        content_type=content_type,
                        object_id=resignation_request.id,
                        status="pending" if i == 0 else "not_started",
                    )
        else:
            resignation_request.finish_workflow()

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


class RetirementRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetirementRequest
        fields = [
            "id",
            "separation",
            "retirement_letter",
            "comments",
            "last_working_day",
            "request_status",
            "created_at",
            "updated_at",
        ]
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
                "Employee context is required for retirement requests."
            )

        institution = getattr(employee, "institution", None)

        if not institution:
            raise serializers.ValidationError("Employee's institution is not set.")

        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                institution=institution,
                category="retirement",
                is_active=True,
            )
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            raise serializers.ValidationError(
                "Retirement separation type is not configured for this institution."
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
                "An active retirement request already exists for this employee."
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

        institution = employee.institution

        content_type = ContentType.objects.get_for_model(RetirementRequest)

        try:
            action = WorkflowAction.objects.get(code="retirement_request")
        except WorkflowAction.DoesNotExist:
            action = None

        if action:
            steps = InstitutionApprovalStep.objects.filter(
                institution=institution, action=action
            ).order_by("level")

            if not steps.exists():
                retirement_request.finish_workflow()
            else:
                for i, step in enumerate(steps):
                    ApprovalTask.objects.create(
                        step=step,
                        content_type=content_type,
                        object_id=retirement_request.id,
                        status="pending" if i == 0 else "not_started",
                    )
        else:
            retirement_request.finish_workflow()

        return retirement_request


class TerminationInitiationSerializer(serializers.ModelSerializer):
    employee_id = serializers.IntegerField(write_only=True)

    separation = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TerminationInitiation
        fields = [
            "id",
            "separation",
            "employee_id",
            "termination_letter",
            "comments",
            "last_working_day",
            "initiation_status",
            "created_at",
            "updated_at",
        ]
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

        print(user)

        try:
            employee = Employee.objects.get(id=value)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("Employee does not exist.")

        if getattr(user, "institution", None) != employee.department.institution:
            raise serializers.ValidationError(
                "You are not authorized to terminate this employee."
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
                "Termination separation type not configured for this institution."
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

        institution = employee.department.institution

        content_type = ContentType.objects.get_for_model(TerminationInitiation)
        try:
            action = WorkflowAction.objects.get(code="termination_initiation")
        except WorkflowAction.DoesNotExist:
            action = None

        if action:
            steps = InstitutionApprovalStep.objects.filter(
                institution=institution, action=action
            ).order_by("level")

            if not steps.exists():
                termination_initiation.finish_workflow()
            else:
                for i, step in enumerate(steps):
                    ApprovalTask.objects.create(
                        step=step,
                        content_type=content_type,
                        object_id=termination_initiation.id,
                        status="pending" if i == 0 else "not_started",
                    )
        else:
            termination_initiation.finish_workflow()

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
