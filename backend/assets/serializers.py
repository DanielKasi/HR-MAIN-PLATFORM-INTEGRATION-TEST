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
from django.contrib.contenttypes.models import ContentType
from employee.serializers import EmployeeSerializer
from django.db import transaction
from users.serializers import ProfileSerializer


class AssetCategorySerializer(serializers.ModelSerializer):
    total_assets = serializers.IntegerField(read_only=True)
    total_available_assets = serializers.IntegerField(read_only=True)
    total_allocated_assets = serializers.IntegerField(read_only=True)

    class Meta:
        model = AssetCategory
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "institution",
        ]



    def create(self, validated_data):
        request = self.context.get("request")

        user = request.user.profile if request and hasattr(request, "user") else None

        if user:
            institution = user.institution
            validated_data["institution"] = institution
        else:
            raise serializers.ValidationError("User institution is required.")

        return super().create(validated_data)



class AssetHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetHistory
        fields = "__all__"


class AssetSerializer(serializers.ModelSerializer):
    asset_histories = AssetHistorySerializer(many=True, read_only=True)
    current_holder = serializers.PrimaryKeyRelatedField(read_only=True)
    

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
            "asset_histories",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "batch_number",
            "institution",
        ]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")

        user = request.user.profile if request and hasattr(request, "user") else None

        if user:
            institution = user.institution
            validated_data["institution"] = institution
        else:
            raise serializers.ValidationError("User institution is required.")

        asset = super().create(validated_data)

        return asset

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.current_holder:
            from users.serializers import ProfileSerializer
            rep["current_holder"] = ProfileSerializer(instance.current_holder).data
        else:
            rep["current_holder"] = None
        
        # Include category object instead of just ID
        if instance.category:
            rep["category"] = AssetCategorySerializer(instance.category).data
        else:
            rep["category"] = None
            
        return rep


class AssetRequestSerializer(serializers.ModelSerializer):
    asset = AssetSerializer(read_only=True)
    asset_id = serializers.IntegerField(write_only=True, required=True)

    class Meta:
        model = AssetRequest
        fields = [
            "id",
            "asset",
            "asset_id",
            "requester",
            "request_reference_code",
            "asset_request_status",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "request_reference_code",
            "asset_request_status",
            "requester",
        ]

    @transaction.atomic
    def create(self, validated_data):

        request = self.context.get("request")
        user = request.user.profile if request and hasattr(request, "user") else None

        if not user:
            raise serializers.ValidationError("User institution is required.")

        institution = user.institution

        # Get the asset_id and remove it from validated_data
        asset_id = validated_data.pop("asset_id")
        
        # Get the asset object
        try:
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            raise serializers.ValidationError("Asset not found.")

        validated_data["requester"] = user
        validated_data["asset"] = asset

        if institution != asset.institution:
            raise serializers.ValidationError(
                "Asset does not belong to the user's institution."
            )

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

    
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.requester:
            rep["requester"] = ProfileSerializer(instance.requester).data
        else:
            rep["requester"] = None

        return rep


class AssetAllocationSerializer(serializers.ModelSerializer):
    # asset = serializers.IntegerField(write_only=True, required=True)
    # allocated_to = serializers.IntegerField(write_only=True, required=True)
    # responding_to_request = serializers.IntegerField(write_only=True, required=False, allow_null=True)

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
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "alloc_code",
            "allocated_by",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user.profile if request and hasattr(request, "user") else None

        if not user:
            raise serializers.ValidationError("User institution is required.")

        institution = user.institution


        # Get the asset object
        try:
            asset = validated_data.get("asset")
            asset_id = asset.id
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            raise serializers.ValidationError("Asset not found.")

        # Get the allocated_to employee object
        try:
            allocated_to = validated_data.get("allocated_to")
            allocated_to_id = allocated_to.id
            allocated_to = Employee.objects.get(id=allocated_to_id)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("Employee not found.")

        # Get the employee's profile (required for AssetAllocation.allocated_to field)
        if not allocated_to.user or not allocated_to.user.profile:
            raise serializers.ValidationError("Employee does not have an associated user profile.")

        employee_profile = allocated_to.user.profile

        # Get the responding_to_request object if provided
        responding_to_request = None
        if responding_to_request:
            try:
                responding_to_request = AssetRequest.objects.get(id=responding_to_request)
            except AssetRequest.DoesNotExist:
                raise serializers.ValidationError("Asset request not found.")

        # Validate institution ownership
        if institution != asset.institution:
            raise serializers.ValidationError(
                "Asset does not belong to the user's institution."
            )

        # Get employee's institution through department or user profile
        employee_institution = None
        if allocated_to.department and allocated_to.department.institution:
            employee_institution = allocated_to.department.institution
        elif employee_profile.institution:
            employee_institution = employee_profile.institution
        
        if not employee_institution:
            raise serializers.ValidationError(
                "Employee does not have an associated institution."
            )

        if institution != employee_institution:
            raise serializers.ValidationError(
                "Employee does not belong to the user's institution."
            )

        if responding_to_request and institution != responding_to_request.asset.institution:
            raise serializers.ValidationError(
                "Asset request does not belong to the user's institution."
            )

        # Set the allocation data
        validated_data["asset"] = asset
        validated_data["allocated_to"] = employee_profile  # Use Profile, not Employee
        validated_data["allocated_by"] = user
        if responding_to_request:
            validated_data["responding_to_request"] = responding_to_request

        asset_allocation = AssetAllocation.objects.create(**validated_data)

        institution = asset_allocation.asset.institution

        content_type = ContentType.objects.get_for_model(AssetAllocation)

        try:
            action = WorkflowAction.objects.get(code="asset_allocation")
        except WorkflowAction.DoesNotExist:
            action = None

        if action:
            steps = InstitutionApprovalStep.objects.filter(
                institution=institution, action=action
            ).order_by("level")

            if not steps.exists():
                asset_allocation.finish_workflow()
            else:
                for i, step in enumerate(steps):
                    ApprovalTask.objects.create(
                        step=step,
                        content_type=content_type,
                        object_id=asset_allocation.id,
                        status="pending" if i == 0 else "not_started",
                    )
        else:
            asset_allocation.finish_workflow()

        return asset_allocation

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.allocated_to:
            rep["allocated_to"] = ProfileSerializer(instance.allocated_to).data
        else:
            rep["allocated_to"] = None

        if instance.allocated_by:
            rep["allocated_by"] = ProfileSerializer(instance.allocated_by).data
        else:
            rep["allocated_by"] = None

        if instance.asset:
            rep["asset"] = AssetSerializer(instance.asset).data
        else:
            rep["asset"] = None

        if instance.responding_to_request:
            rep["responding_to_request"] = AssetRequestSerializer(instance.responding_to_request).data
        else:
            rep["responding_to_request"] = None

        return rep


class AssetReturnSerializer(serializers.ModelSerializer):
    asset = AssetSerializer(read_only=True)

    class Meta:
        model = AssetReturn
        fields = "__all__"
