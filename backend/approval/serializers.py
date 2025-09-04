from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from approval.models import (
    Action, ApproverGroup, ApprovalDocument, ApprovalDocumentLevel,
    Approval, ApprovalTask, ApproverGroupUser, ApproverGroupRole,
    ApprovalDocumentLevelApprovers, ApprovalDocumentLevelOverriders
)
import re
from users.models import Profile, Role


class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = ['id', 'name', 'code', 'description', 'public_uuid']

class ApproverGroupUserSerializer(serializers.ModelSerializer):
    user_fullname = serializers.CharField(source='user.user.fullname', read_only=True)

    class Meta:
        model = ApproverGroupUser
        fields = ['id', 'user', 'user_fullname', 'public_uuid']

class ApproverGroupRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = ApproverGroupRole
        fields = ['id', 'role', 'role_name', 'public_uuid']

class ApproverGroupSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.institution_name', read_only=True)
    users = serializers.PrimaryKeyRelatedField(
        queryset=Profile.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        write_only=True
    )
    roles = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        write_only=True
    )
    users_display = serializers.SerializerMethodField(read_only=True)
    roles_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ApproverGroup
        fields = ['id', 'institution', 'institution_name', 'name', 'description', 'public_uuid', 'users', 'roles', 'users_display', 'roles_display']
        read_only_fields = ['public_uuid', 'institution_name', 'users_display', 'roles_display']

    def get_users_display(self, obj):
        from users.serializers import ProfileSerializer
        return ProfileSerializer(obj.users.all(), many=True, context=self.context).data

    def get_roles_display(self, obj):
        from users.serializers import RoleSerializer
        return RoleSerializer(obj.roles.all(), many=True, context=self.context).data

    def validate(self, data):
        if self.context.get('request') and self.context['request'].method in ['POST', 'PATCH']:
            institution = data.get('institution')
            users = data.get('users', [])
            roles = data.get('roles', [])

            if users:
                invalid_users = Profile.objects.filter(id__in=[u.id for u in users]).exclude(institution=institution)
                if invalid_users.exists():
                    raise serializers.ValidationError("All users must belong to the same institution as the group.")

            if roles:
                invalid_roles = Role.objects.filter(id__in=[r.id for r in roles]).exclude(institution=institution)
                if invalid_roles.exists():
                    raise serializers.ValidationError("All roles must be associated with the same institution as the group.")

        return data

    def create(self, validated_data):
        users = validated_data.pop('users', [])
        roles = validated_data.pop('roles', [])
        group = ApproverGroup.objects.create(**validated_data)
        for user in users:
            ApproverGroupUser.objects.create(approver_group=group, user=user)
        for role in roles:
            ApproverGroupRole.objects.create(approver_group=group, role=role)
        return group

class ApprovalDocumentLevelApproverSerializer(serializers.ModelSerializer):
    approver_group = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ApprovalDocumentLevelApprovers
        fields = ['id', 'approver_group']

    def get_approver_group(self, obj):
        from .serializers import ApproverGroupSerializer
        return ApproverGroupSerializer(obj.approver_group, context=self.context).data

class ApprovalDocumentLevelOverriderSerializer(serializers.ModelSerializer):
    approver_group = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ApprovalDocumentLevelOverriders
        fields = ['id', 'approver_group']

    def get_approver_group(self, obj):
        from .serializers import ApproverGroupSerializer
        return ApproverGroupSerializer(obj.approver_group, context=self.context).data

class ApprovalDocumentLevelSerializer(serializers.ModelSerializer):
    approvers = serializers.PrimaryKeyRelatedField(
        queryset=ApproverGroup.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        write_only=True
    )
    overriders = serializers.PrimaryKeyRelatedField(
        queryset=ApproverGroup.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        write_only=True
    )
    approvers_detail = ApprovalDocumentLevelApproverSerializer(
        source='approvaldocumentlevelapprovers_set', many=True, read_only=True
    )
    overriders_detail = ApprovalDocumentLevelOverriderSerializer(
        source='approvaldocumentleveloverriders_set', many=True, read_only=True
    )

    class Meta:
        model = ApprovalDocumentLevel
        fields = [
            'id',
            'approval_document',
            'level',
            'name',
            'description',
            'public_uuid',
            'approvers',
            'overriders',
            'approvers_detail',
            'overriders_detail',
        ]
        read_only_fields = ['public_uuid', 'level', 'approvers_detail', 'overriders_detail']

    def validate(self, data):
        if self.context.get('request') and self.context['request'].method in ['POST', 'PATCH']:
            approval_document = data.get('approval_document')
            institution = approval_document.institution
            approvers = data.get('approvers', [])
            overriders = data.get('overriders', [])

            if approvers:
                invalid_approvers = ApproverGroup.objects.filter(id__in=[a.id for a in approvers]).exclude(institution=institution)
                if invalid_approvers.exists():
                    raise serializers.ValidationError("All approvers must belong to the same institution as the approval document.")

            if overriders:
                invalid_overriders = ApproverGroup.objects.filter(id__in=[o.id for o in overriders]).exclude(institution=institution)
                if invalid_overriders.exists():
                    raise serializers.ValidationError("All overriders must belong to the same institution as the approval document.")

        return data

    def create(self, validated_data):
        approvers = validated_data.pop('approvers', [])
        overriders = validated_data.pop('overriders', [])
        level = ApprovalDocumentLevel.objects.create(**validated_data)
        for approver in approvers:
            ApprovalDocumentLevelApprovers.objects.create(approval_document_level=level, approver_group=approver)
        for overrider in overriders:
            ApprovalDocumentLevelOverriders.objects.create(approval_document_level=level, approver_group=overrider)
        return level

class ApprovalDocumentSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.institution_name', read_only=True)
    levels = ApprovalDocumentLevelSerializer(many=True, read_only=True)
    content_type_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalDocument
        fields = ['id', 'institution', 'institution_name', 'public_uuid', 'description', 'content_type', 'content_type_name', 'actions', 'levels']

    def get_content_type_name(self, obj):
        model_class = obj.content_type.model_class()
        if not model_class:
            return obj.content_type.name
        name = model_class.__name__
        name = re.sub(r'(?<!^)(?=[A-Z])', ' ', name)
        return name.strip()

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['actions'] = [
            {'id': action.id, 'name': action.name}
            for action in instance.actions.all()
        ]
        return representation

class ApprovalTaskSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source='level.name', read_only=True)
    approval_document_description = serializers.CharField(source='approval.document.description', read_only=True)
    approved_by_fullname = serializers.CharField(source='approved_by.fullname', read_only=True, allow_null=True)
    level = ApprovalDocumentLevelSerializer(read_only=True)

    class Meta:
        model = ApprovalTask
        fields = [
            'id', 'status', 'comment', 'approved_by', 'approved_by_fullname',
            'updated_at', 'level', 'level_name', 'approval_document_description'
        ]
        read_only_fields = ['approved_by', 'updated_at']

class ApprovalSerializer(serializers.ModelSerializer):
    tasks = ApprovalTaskSerializer(many=True, read_only=True)
    document = ApprovalDocumentSerializer(read_only=True)
    action = ActionSerializer(read_only=True)

    class Meta:
        model = Approval
        fields = ['id', 'public_id', 'status', 'document', 'action', 'content_type', 'object_id', 'tasks']

class BaseApprovableSerializer(serializers.ModelSerializer):
    approvals = serializers.SerializerMethodField()

    def get_approvals(self, obj):
        content_type = ContentType.objects.get_for_model(obj.__class__)
        approvals = Approval.objects.filter(
            content_type=content_type,
            object_id=obj.pk
        ).select_related('document', 'action', 'content_type').prefetch_related('tasks__level', 'document__levels')
        return ApprovalSerializer(approvals, many=True).data

    class Meta:
        abstract = True
        fields = ['id', 'approval_status', 'approvals']