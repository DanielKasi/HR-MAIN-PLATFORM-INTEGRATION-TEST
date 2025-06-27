

from recruitment.serializers import JobAdvertApplicationSerializer
from rest_framework import serializers
from .models import OnBoarding

class OnBoardingSerializer(serializers.ModelSerializer):
    application_details = JobAdvertApplicationSerializer(source='application', read_only=True)

    class Meta:
        model = OnBoarding
        fields = [
            "id",
            "application",
            "application_details",
            "remarks",
            "attended",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
