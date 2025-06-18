from rest_framework import serializers

from workflows.models import ApprovalTask

class ApprovalTaskStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices= [
        ("not_started", "Not Started"),
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("rejected", "Rejected"),
        ("terminated", "Terminated"),
    ])
