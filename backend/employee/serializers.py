from .models import Employee
from rest_framework import serializers
from users.serializers import CustomUserSerializer


class EmployeeSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer()
    department_details = serializers.SerializerMethodField()
    position_details = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "email",
            "phone_number",
            "position",
            "position_details",
            "department",
            "department_details",
            "roles",
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
        user_data = validated_data.pop("user", None)

        if user_data:
            user_serializer = CustomUserSerializer(data=user_data)
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()
            validated_data["user"] = user

        return Employee.objects.create(**validated_data)

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)

        if user_data:
            user_serializer = CustomUserSerializer(
                instance.user,
                data=user_data,
                partial=True
            )
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()

        # Update employee fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance

    def get_roles(self, obj):
        """Get roles for the employee's user"""
        if obj.user:
            try:
                from .models import UserRole  # Import UserRole model here to avoid circular import issues
                user_roles = UserRole.objects.filter(user=obj.user).select_related('role')
                return [
                    {
                        "id": user_role.role.id,
                        "name": user_role.role.name
                    }
                    for user_role in user_roles
                ]
            except:
                return []
        return []

    def get_department_details(self, obj):
        if obj.department:
            return {
                "id": obj.department.id,
                "name": obj.department.name,
                "institution_id": obj.department.institution.id
            }
        return None

    def get_position_details(self, obj):
        if obj.position:
            return {
                "id": obj.position.id,
                "name": obj.position.name,
                "department_id": obj.position.department.id if obj.position.department else None
            }
        return None

    def to_representation(self, instance):
        """Override to include department and position names in the main fields"""
        data = super().to_representation(instance)

        # Replace department ID with department object containing name
        if data['department_details']:
            data['department'] = data['department_details']

        # Replace position ID with position object containing name
        if data['position_details']:
            data['position'] = data['position_details']

        # Remove the separate detail fields from final output
        data.pop('department_details', None)
        data.pop('position_details', None)

        return data
