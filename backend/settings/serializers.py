from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import EmailProviderConfig, SystemConfiguration, SystemDay, MeetingIntegration


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
    

class EmailProviderConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailProviderConfig
        fields = '__all__'
        extra_kwargs = {
            'api_password': {'write_only': True},
            'api_token': {'write_only': True},
            'api_username': {'write_only': True},
            'api_client_id': {'write_only': True},
            'api_client_secret': {'write_only': True},
        }
        read_only_fields = ['institution']

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user:
            raise ValidationError("No authenticated user found in request context")

        try:
            institution = request.user.profile.institution
            if not institution:
                raise ValidationError("Institution not found for this user's profile")
        except AttributeError:
            raise ValidationError("User profile or institution is not configured")

        validated_data['institution'] = institution
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)
