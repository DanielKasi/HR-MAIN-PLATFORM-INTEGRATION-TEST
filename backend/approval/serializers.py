from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from approval.models import (
    Action, ApproverGroup, ApprovalDocument, ApprovalDocumentLevel,
    Approval, ApprovalTask, ApproverGroupUser, ApproverGroupRole,
    ApprovalDocumentLevelApprovers, ApprovalDocumentLevelOverriders
)
import re

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
    users = ApproverGroupUserSerializer(source='approvergroupuser_set', many=True, read_only=True)
    roles = ApproverGroupRoleSerializer(source='approvergrouprole_set', many=True, read_only=True)

    class Meta:
        model = ApproverGroup
        fields = ['id', 'institution', 'institution_name', 'name', 'description', 'public_uuid', 'users', 'roles']

class ApprovalDocumentLevelApproverSerializer(serializers.ModelSerializer):
    approver_group = ApproverGroupSerializer(read_only=True)

    class Meta:
        model = ApprovalDocumentLevelApprovers
        fields = ['id', 'approver_group']

class ApprovalDocumentLevelOverriderSerializer(serializers.ModelSerializer):
    approver_group = ApproverGroupSerializer(read_only=True)

    class Meta:
        model = ApprovalDocumentLevelOverriders
        fields = ['id', 'approver_group']

class ApprovalDocumentLevelSerializer(serializers.ModelSerializer):
    approvers = ApprovalDocumentLevelApproverSerializer(source='approvaldocumentlevelapprovers_set', many=True, read_only=True)
    overriders = ApprovalDocumentLevelOverriderSerializer(source='approvaldocumentleveloverriders_set', many=True, read_only=True)

    class Meta:
        model = ApprovalDocumentLevel
        fields = ['id', 'level', 'name', 'description', 'public_uuid', 'approvers', 'overriders']

class ApprovalDocumentSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.institution_name', read_only=True)
    levels = ApprovalDocumentLevelSerializer(many=True, read_only=True)
    content_type_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalDocument
        fields = ['id', 'institution', 'institution_name', 'public_uuid', 'description', 'content_type', 'content_type_name', 'actions', 'levels']

    def get_content_type_name(self, obj):
        # Humanize the content type model name
        name = obj.content_type.model
        name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
        return name.title()

    def to_representation(self, instance):
        # Customize the representation to include actions as a list of objects
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