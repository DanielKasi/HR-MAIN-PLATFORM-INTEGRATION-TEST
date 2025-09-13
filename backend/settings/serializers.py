from rest_framework import serializers
from .models import SystemConfiguration, SystemDay, MeetingIntegration


class SystemConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = ["id", "name", "code", "content", "is_active"]
        read_only_fields = ["code"]

    def validate(self, data):
        """
        Validate the input data, ensuring institution is provided and name is not empty.
        """
        if not data.get("name"):
            raise serializers.ValidationError({"error": "This field cannot be empty."})
        return data


class SystemDaySerializer(serializers.ModelSerializer):

    class Meta:
        model = SystemDay
        fields = "__all__"

        read_only_fields = ["id", "day_code", "day_name", "level"]

class MeetingIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingIntegration
        fields = '__all__'
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "institution",
        ]

    def create(self, validated_data):
        request = self.context.get("request")

        user = getattr(request.user, 'profile', None) if request and hasattr(request, "user") else None

        if user:
            institution = getattr(user, "institution", None)
            
            if not institution:
                raise serializers.ValidationError({"error": "Institution not found for this user."})

            validated_data["institution"] = institution
        else:
            raise serializers.ValidationError({"error": "User institution is required."})

        instance = super().create(validated_data)
        return instance
        
