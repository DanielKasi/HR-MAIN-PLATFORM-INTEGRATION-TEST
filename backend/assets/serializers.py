from rest_framework import serializers
from .models import (
    AssetCategory,
    Asset,
    AssetRequest,
    AssetAllocation,
    AssetReturn,
    AssetHistory,
)
from django.db import transaction
from employee.models import Employee
from django.contrib.contenttypes.models import ContentType
from employee.serializers import EmployeeSerializer
from users.serializers import ProfileSerializer
from approval.serializers import BaseApprovableSerializer


class AssetCategorySerializer(BaseApprovableSerializer):
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
            raise serializers.ValidationError({"error": f"User institution is required."})

        return super().create(validated_data)



class AssetHistorySerializer(serializers.ModelSerializer):
    performed_by = serializers.SerializerMethodField()
    asset = serializers.SerializerMethodField()
    affected_user = serializers.SerializerMethodField()

    class Meta:
        model = AssetHistory
        fields = "__all__"

    def get_performed_by(self, obj):
        if obj.performed_by:
            return {
                'id': obj.performed_by.id,
                'fullname': obj.performed_by.user.fullname,
                'email': obj.performed_by.user.email,
            }
        return None

    def get_asset(self, obj):
        if obj.asset:
            return {
                'id': obj.asset.id,
                'asset_name': obj.asset.asset_name,
                'serial_number': obj.asset.serial_number,
            }
        return None

    def get_affected_user(self, obj):
        if obj.affected_user:
            return {
                'id': obj.affected_user.id,
                'fullname': obj.affected_user.user.fullname,
                'email': obj.affected_user.user.email,
            }
        return None


class AssetSerializer(BaseApprovableSerializer):
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
            raise serializers.ValidationError({"error": f"User institution is required."})

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

        
        if instance.asset_histories:
            rep["asset_histories"] = AssetHistorySerializer(instance.asset_histories, many=True).data
        else:
            rep["asset_histories"] = []
            
        return rep


class AssetRequestSerializer(BaseApprovableSerializer):
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
            "is_active",
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
            raise serializers.ValidationError({"error": f"User institution is required."})

        institution = user.institution

        # Get the asset_id and remove it from validated_data
        asset_id = validated_data.pop("asset_id")
        
        # Get the asset object
        try:
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            raise serializers.ValidationError({"error": f"Asset not found."})

        validated_data["requester"] = user
        validated_data["asset"] = asset

        if institution != asset.institution:
            raise serializers.ValidationError(
                {"error": f"Asset does not belong to the user's institution."}
            )

        asset_request = AssetRequest.objects.create(**validated_data)

        return asset_request

    
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.requester:
            rep["requester"] = ProfileSerializer(instance.requester).data
        else:
            rep["requester"] = None

        return rep


class AssetAllocationSerializer(BaseApprovableSerializer):
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
            raise serializers.ValidationError({"error": f"User institution is required."})

        institution = user.institution


        # Get the asset object
        try:
            asset = validated_data.get("asset")
            asset_id = asset.id
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            raise serializers.ValidationError({"error": f"Asset not found."})

        # Get the allocated_to employee object
        try:
            allocated_to = validated_data.get("allocated_to")
            allocated_to_id = allocated_to.id
            allocated_to = Employee.objects.get(id=allocated_to_id)
        except Employee.DoesNotExist:
            raise serializers.ValidationError({"error": f"Employee not found."})

        # Get the employee's profile (required for AssetAllocation.allocated_to field)
        if not allocated_to.user or not allocated_to.user.profile:
            raise serializers.ValidationError({"error": f"Employee does not have an associated user profile."})

        employee_profile = allocated_to.user.profile

        # Get the responding_to_request object if provided
        responding_to_request = None
        if responding_to_request:
            try:
                responding_to_request = AssetRequest.objects.get(id=responding_to_request)
            except AssetRequest.DoesNotExist:
                raise serializers.ValidationError({"error": f"Asset request not found."})

        # Validate institution ownership
        if institution != asset.institution:
            raise serializers.ValidationError(
                {"error": f"Asset does not belong to the user's institution."}
            )

        # Get employee's institution through department or user profile
        employee_institution = None
        if allocated_to.department and allocated_to.department.institution:
            employee_institution = allocated_to.department.institution
        elif employee_profile.institution:
            employee_institution = employee_profile.institution
        
        if not employee_institution:
            raise serializers.ValidationError(
                {"error": f"Employee does not have an associated institution."}
            )

        if institution != employee_institution:
            raise serializers.ValidationError(
                {"error": f"Employee does not belong to the user's institution."}
            )

        if responding_to_request and institution != responding_to_request.asset.institution:
            raise serializers.ValidationError(
                {"error": f"Asset request does not belong to the user's institution."}
            )

        # Set the allocation data
        validated_data["asset"] = asset
        validated_data["allocated_to"] = employee_profile  # Use Profile, not Employee
        validated_data["allocated_by"] = user
        if responding_to_request:
            validated_data["responding_to_request"] = responding_to_request

        asset_allocation = AssetAllocation.objects.create(**validated_data)

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


class AssetReturnSerializer(BaseApprovableSerializer):
   
    class Meta:
        model = AssetReturn
        fields = "__all__"


    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.asset:
            rep["asset"] = AssetSerializer(instance.asset).data
        else:
            rep["asset"] = None

        if instance.allocation:
            rep["allocation"] = AssetAllocationSerializer(instance.allocation).data
        else:
            rep["allocation"] = None

        

        

        return rep
