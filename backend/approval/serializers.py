from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from approval.models import (
    Action, ApproverGroup, ApprovalDocument, ApprovalDocumentLevel,
    Approval, ApprovalTask, ApproverGroupUser, ApproverGroupRole,
    ApprovalDocumentLevelApprovers, ApprovalDocumentLevelOverriders
)
import re
from users.models import Profile, Role
from django.db import transaction

class ApprovalProfileSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "user", "institution", "bio"]

    def get_user(self, obj):
        from users.serializers import CustomUserSerializer
        return CustomUserSerializer(obj.user, context=self.context).data




class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = '__all__'

class ApproverGroupUserSerializer(serializers.ModelSerializer):
    user_fullname = serializers.CharField(source='user.user.fullname', read_only=True)

    class Meta:
        model = ApproverGroupUser
        fields = '__all__'

class ApproverGroupRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = ApproverGroupRole
        fields = '__all__'

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
        fields = '__all__'
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
    approver_group = ApproverGroupSerializer(read_only=True)
    approver_user = ApprovalProfileSerializer(read_only=True)

    class Meta:
        model = ApprovalDocumentLevelApprovers
        fields = ['id', 'approval_document_level', 'approver_group', 'approver_user']

class ApprovalDocumentLevelOverriderSerializer(serializers.ModelSerializer):
    approver_group = ApproverGroupSerializer(read_only=True)
    overrider_user = ApprovalProfileSerializer(read_only=True)

    class Meta:
        model = ApprovalDocumentLevelOverriders
        fields = ['id', 'approval_document_level', 'approver_group', 'overrider_user']


class ApprovalDocumentLevelSerializer(serializers.ModelSerializer):
    approvers = serializers.PrimaryKeyRelatedField(
        queryset=ApproverGroup.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
        write_only=True
    )
    approver_users = serializers.PrimaryKeyRelatedField(
        queryset=Profile.objects.all(),
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
    overrider_users = serializers.PrimaryKeyRelatedField(
        queryset=Profile.objects.all(),
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
            'id', 'name', 'description', 'approval_document', 'level', 'is_active',
            'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by',
            'public_uuid', 'approvers', 'approver_users', 'overriders', 'overrider_users',
            'approvers_detail', 'overriders_detail'
        ]
        read_only_fields = ['public_uuid', 'level', 'approvers_detail', 'overriders_detail']

    def validate(self, data):
        if self.context.get('request') and self.context['request'].method in ['POST', 'PATCH']:
            approval_document = data.get('approval_document')
            institution = approval_document.institution
            approvers = data.get('approvers', [])
            approver_users = data.get('approver_users', [])
            overriders = data.get('overriders', [])
            overrider_users = data.get('overrider_users', [])

            if approvers:
                invalid_approvers = ApproverGroup.objects.filter(id__in=[a.id for a in approvers]).exclude(institution=institution)
                if invalid_approvers.exists():
                    raise serializers.ValidationError("All approvers must belong to the same institution as the approval document.")

            if approver_users:
                invalid_approver_users = Profile.objects.filter(id__in=[u.id for u in approver_users]).exclude(institution=institution)
                if invalid_approver_users.exists():
                    raise serializers.ValidationError("All approver users must belong to the same institution as the approval document.")

            if overriders:
                invalid_overriders = ApproverGroup.objects.filter(id__in=[o.id for o in overriders]).exclude(institution=institution)
                if invalid_overriders.exists():
                    raise serializers.ValidationError("All overriders must belong to the same institution as the approval document.")

            if overrider_users:
                invalid_overrider_users = Profile.objects.filter(id__in=[u.id for u in overrider_users]).exclude(institution=institution)
                if invalid_overrider_users.exists():
                    raise serializers.ValidationError("All overrider users must belong to the same institution as the approval document.")

        return data

    def create(self, validated_data):
        import logging
        logger = logging.getLogger(__name__)
        print(f"Creating ApprovalDocumentLevel with data: {validated_data}")
        approvers = validated_data.pop('approvers', [])
        approver_users = validated_data.pop('approver_users', [])
        overriders = validated_data.pop('overriders', [])
        overrider_users = validated_data.pop('overrider_users', [])
        with transaction.atomic():
            level = ApprovalDocumentLevel.objects.create(**validated_data)
            print(f"Created level: {level.id}")
            for approver in approvers:
                record = ApprovalDocumentLevelApprovers.objects.create(
                    approval_document_level=level,
                    approver_group=approver,
                    approver_user=None
                )
                record.clean()
                print(f"Created approver record: {record.id}, group: {record.approver_group_id}")
            for user in approver_users:
                record = ApprovalDocumentLevelApprovers.objects.create(
                    approval_document_level=level,
                    approver_group=None,
                    approver_user=user
                )
                record.clean()
                print(f"Created approver user record: {record.id}, user: {record.approver_user_id}")
            for overrider in overriders:
                record = ApprovalDocumentLevelOverriders.objects.create(
                    approval_document_level=level,
                    approver_group=overrider,
                    overrider_user=None
                )
                record.clean()
                print(f"Created overrider record: {record.id}, group: {record.approver_group_id}")
            for user in overrider_users:
                record = ApprovalDocumentLevelOverriders.objects.create(
                    approval_document_level=level,
                    approver_group=None,
                    overrider_user=user
                )
                record.clean()
                print(f"Created overrider user record: {record.id}, user: {record.overrider_user_id}")
            return level

class ApprovalDocumentSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.institution_name', read_only=True)
    levels = ApprovalDocumentLevelSerializer(many=True, read_only=True)
    content_type_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalDocument
        fields = '__all__'

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
        fields = '__all__'
        read_only_fields = ['approved_by', 'updated_at']

class ApprovalSerializer(serializers.ModelSerializer):
    tasks = ApprovalTaskSerializer(many=True, read_only=True)
    document = ApprovalDocumentSerializer(read_only=True)
    action = ActionSerializer(read_only=True)

    class Meta:
        model = Approval
        fields = '__all__'
