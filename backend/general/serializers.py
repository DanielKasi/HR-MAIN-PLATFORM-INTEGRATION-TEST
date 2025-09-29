from rest_framework import serializers
from approval.models import Approval, ApprovalDocumentLevel
from django.contrib.contenttypes.models import ContentType
from approval.serializers import ApprovalSerializer
from django.db import transaction

class MessageResponseSerializer(serializers.Serializer):
    message = serializers.CharField()

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