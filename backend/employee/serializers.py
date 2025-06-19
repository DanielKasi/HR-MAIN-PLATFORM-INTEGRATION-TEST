from .models import Employee
from rest_framework import serializers
from users.serializers import CustomUserSerializer


class EmployeeSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer()
    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "position",
            "department",
            "date_of_birth",
            "date_of_joining",
            "address",
            "is_active",
            "created_at",
            "updated_at",
            "experience",
            "qualifications",
            "skills",
            "emergency_contact_name",
            "emergency_contact_phone",
            "emergency_contact_relationship",
            "marital_status",
            "children_count",
            "employee_profile_picture"
        ]

    def create(self, validated_data):
        user = validated_data.pop("user", None)
        if user:
            user_serializer = CustomUserSerializer(data=user)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()
            validated_data["user"] = user
        return Employee.objects.create(**validated_data)
