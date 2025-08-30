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
    class Meta:
        model = ApprovalTask
        fields = '__all__'