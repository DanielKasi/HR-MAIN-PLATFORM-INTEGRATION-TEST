from rest_framework import serializers
from users.serializers import ProfileSerializer
from workflows.models import (
    ApprovalTask,
    InstitutionApprovalStep,
    InstitutionApprovalStepApprovorRole,
    WorkflowAction,
    WorkflowCategory,
    InstitutionApprovalStepApprovorUser,
)
from users.models import Profile, Role
from django.contrib.contenttypes.models import ContentType

class WorkflowCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowCategory
        fields = ["code", "label"]


class WorkflowActionSerializer(serializers.ModelSerializer):
    category = WorkflowCategorySerializer()

    class Meta:
        model = WorkflowAction
        fields = ["id", "code", "label", "category"]


class WorkFlowRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["name"]

class InstitutionApproverUserSerializer(serializers.ModelSerializer):
    # This serializes the through‐model instance, exposing its own PK + nested profile
    approver_user = ProfileSerializer()

    class Meta:
        model = InstitutionApprovalStepApprovorUser
        fields = ["id", "approver_user"]


class InstitutionApprovalStepSerializer(serializers.ModelSerializer):
   # returns a list of Role.name
    roles_details = serializers.SerializerMethodField()
    # returns a list of Role.id
    roles = serializers.SerializerMethodField()

    approvers_details  = serializers.SerializerMethodField()
    # raw list of approver‐user through‐model IDs
    approvers = serializers.SerializerMethodField()

    action_details = WorkflowActionSerializer(source="action", read_only=True)

    class Meta:
        model = InstitutionApprovalStep
        fields = [
            "id",
            "step_name",
            "roles_details",
            "approvers",
            "approvers_details",
            "roles",
            "Institution",
            "action",
            "action_details",
            "level",
        ]

    def get_roles(self, obj):
        # list of raw role-IDs
        return list(
            InstitutionApprovalStepApprovorRole.objects
                .filter(step=obj)
                .values_list("approver_role_id", flat=True)
        )

    def get_roles_details(self, obj):
        # fetch the actual Role objects and serialize them
        qs = Role.objects.filter(
            id__in=self.get_roles(obj)
        )
        return WorkFlowRoleSerializer(qs, many=True).data

    def get_approvers(self, obj):
        # return the PKs of the through‐model instances
        return list(
            InstitutionApprovalStepApprovorUser.objects
                .filter(step=obj)
                .values_list("id", flat=True)
        )

    def get_approvers_details(self, obj):
        # grab the through‐model queryset
        qs = InstitutionApprovalStepApprovorUser.objects.filter(step=obj)
        # serialize each with its own ID + nested Profile
        return InstitutionApproverUserSerializer(qs, many=True).data

    def create(self, validated_data:dict):
        request = self.context.get("request")
        approver_roles = request.data.get("roles", [])
        validated_data.pop("approvers", None)
        approver_users = request.data.get("approvers", [])
        created_approval_step = InstitutionApprovalStep.objects.create(**validated_data)

        for profile_id in approver_users:
            user_profile = Profile.objects.get(id=profile_id)
            if user_profile and user_profile.institution.id == created_approval_step.Institution.id:
                InstitutionApprovalStepApprovorUser.objects.create(step=created_approval_step, approver_user=user_profile)

        for r in approver_roles:
            user_role = Role.objects.get(id=r)
            if user_role :
                InstitutionApprovalStepApprovorRole.objects.create(step=created_approval_step, approver_role=user_role)
        return created_approval_step


class TaskStatusSerializer(serializers.ModelSerializer):
    step = InstitutionApprovalStepSerializer()
    approved_by = ProfileSerializer()

    class Meta:
        model = ApprovalTask
        fields = ["id","step", "status", "comment", "approved_by"]


class ApprovalTaskStatusUpdateSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices= [
        ("not_started", "Not Started"),
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("rejected", "Rejected"),
    ])

    class Meta:
        model = ApprovalTask
        fields = ["id", "step", "status", "updated_at", "content_object", "object_id"]


class ApprovalTaskSerializer(serializers.ModelSerializer):
    step = InstitutionApprovalStepSerializer()
    content_object = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalTask
        fields = ["id", "step", "status", "updated_at", "content_object", "object_id", "comment", "approved_by"]

    def get_content_object(self, obj):
        return str(obj.content_object)
