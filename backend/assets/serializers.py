from rest_framework import serializers
from .models import (
    AssetCategory,
    Asset,
    AssetRequest,
    AssetAllocation,
    AssetReturn,
    AssetHistory,
)
from workflows.models import ApprovalTask, InstitutionApprovalStep, WorkflowAction
from django.db import transaction
from employee.models import Employee


class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = "__all__"


class AssetHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetHistory
        fields = "__all__"


class AssetSerializer(serializers.ModelSerializer):
    asset_histories = AssetHistorySerializer(many=True, read_only=True)
    current_holder = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())

    class Meta:
        model = Asset
        fields = [
            "id",
            "institution",
            "asset_name",
            "batch_number",
            "serial_number",
            "category",
            "description",
            "status",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "current_holder",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
        ]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["current_holder"] = EmployeeSerializer(instance.current_holder).data
        return rep


class AssetRequestSerializer(serializers.ModelSerializer):

    class Meta:
        model = AssetRequest
        fields = [
            "id",
            "asset",
            "requester",
            "request_reference_code",
            "asset_request_status",
            "notes",
            "created_at",
            "updated_at",
        ]

    @transaction.atomic
    def create(self, validated_data):

        asset_request = AssetRequest.objects.create(**validated_data)

        institution = asset_request.asset.institution

        content_type = ContentType.objects.get_for_model(AssetRequest)

        try:
            action = WorkflowAction.objects.get(code="asset_request")
        except WorkflowAction.DoesNotExist:
            action = None

        if action:
            steps = InstitutionApprovalStep.objects.filter(
                institution=institution, action=action
            ).order_by("level")

            if not steps.exists():
                asset_request.finish_workflow()
            else:
                for i, step in enumerate(steps):
                    ApprovalTask.objects.create(
                        step=step,
                        content_type=content_type,
                        object_id=asset_request.id,
                        status="pending" if i == 0 else "not_started",
                    )
        else:
            asset_request.finish_workflow()

        return asset_request


class AssetAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetAllocation
        fields = [
            "id",
            "asset",
            "allocated_to",
            "responding_to_request",
            "allocated_by",
            "allocation_status",
            "alloc_code",
            "is_active",
            "created_at",
            "updated_at",
        ]


class AssetReturnSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetReturn
        fields = "__all__"
