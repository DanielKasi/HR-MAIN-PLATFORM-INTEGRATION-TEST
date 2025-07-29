from rest_framework import serializers
from .models import SystemConfiguration

class SystemConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = ['id', 'name', 'code', 'content']
        read_only_fields = ['code']  

    def validate(self, data):
        """
        Validate the input data, ensuring institution is provided and name is not empty.
        """
        if not data.get('name'):
            raise serializers.ValidationError({"name": "This field cannot be empty."})
        return data