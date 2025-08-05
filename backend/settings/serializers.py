from rest_framework import serializers
from .models import SystemConfiguration, SystemDay


class SystemConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = ["id", "name", "code", "content"]
        read_only_fields = ["code"]

    def validate(self, data):
        """
        Validate the input data, ensuring institution is provided and name is not empty.
        """
        if not data.get("name"):
            raise serializers.ValidationError({"name": "This field cannot be empty."})
        return data


class SystemDaySerializer(serializers.ModelSerializer):

    class Meta:
        model = SystemDay
        fields = "__all__"

        read_only_fields = ["id", "day_code", "day_name", "level"]
