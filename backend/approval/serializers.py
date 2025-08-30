from rest_framework import serializers
from .models import (
    Action, ApproverGroup, ApprovalDocument, ApprovalDocumentLevel,
    Approval, ApprovalTask
)

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = '__all__'

class ApproverGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApproverGroup
        fields = '__all__'

class ApprovalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalDocument
        fields = '__all__'

class ApprovalDocumentLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalDocumentLevel
        fields = '__all__'

class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Approval
        fields = '__all__'

class ApprovalTaskSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source='level.name', read_only=True)
    approval_document_description = serializers.CharField(source='approval.document.description', read_only=True)
    content_object = serializers.SerializerMethodField()  # To show linked object info

    class Meta:
        model = ApprovalTask
        fields = [
            'id', 'status', 'comment', 'approved_by', 'updated_at',
            'level', 'level_name', 'approval_document_description',
            'content_object'
        ]
        read_only_fields = ['approved_by', 'updated_at']

    def get_content_object(self, obj):
        if obj.approval.content_object:
            # Return a dict with basic info; customize as needed
            co = obj.approval.content_object
            return {
                'model': co.__class__.__name__,
                'id': co.pk,
                'str': str(co)
            }
        return None