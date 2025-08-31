
from approval.serializers import BaseApprovableSerializer
from employee.serializers import EmployeeSerializer
# from users.serializers import CustomUserSerializer
from rest_framework import serializers
from .models import DisciplineType, DisciplinaryAction
from employee.models import Employee
from users.models import CustomUser

class DisciplineTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisciplineType
        fields = '__all__'

class DisciplinaryActionSerializer(BaseApprovableSerializer):
    discipline_type = serializers.PrimaryKeyRelatedField(
        queryset=DisciplineType.objects.all(),
    )
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
    )
    reported_by = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
    )
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        allow_null=True,
        required=False
    )

    class Meta:
        model = DisciplinaryAction
        fields = '__all__'

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['discipline_type'] = DisciplineTypeSerializer(instance.discipline_type).data
        rep['employee'] = EmployeeSerializer(instance.employee).data
        rep['reported_by'] = EmployeeSerializer(instance.reported_by).data
        rep['assigned_to'] = EmployeeSerializer(instance.assigned_to).data if instance.assigned_to else None
        return rep