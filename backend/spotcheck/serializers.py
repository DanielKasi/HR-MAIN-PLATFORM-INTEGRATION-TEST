from django.db.models import query
import employee
from spotcheck import models as SpotCheckModels
from rest_framework import serializers
from institution.serializers import InstitutionSerializer, BranchSerializer
from institution.models import Institution, Branch
from employee.models import Employee
from employee.serializers import EmployeeSerializer
from approval.serializers import BaseApprovableSerializer


class InstitutionSpotCheckSettingSerializer(BaseApprovableSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = SpotCheckModels.InstitutionSpotCheckSetting
        fields = "__all__"

    def to_representation(self, instance):
        """Override to include institution name in the representation"""
        data = super().to_representation(instance)
        data["institution"] = InstitutionSerializer(instance.institution).data
        return data

class BranchSpotCheckSettingSerializer(BaseApprovableSerializer):
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all())

    class Meta:
        model = SpotCheckModels.BranchSpotCheckSetting
        fields = "__all__"

    def to_representation(self, instance):
        """Override to include branch name in the representation"""
        data = super().to_representation(instance)
        data["branch"] = BranchSerializer(instance.branch).data
        return data

class EmployeeSpotCheckSettingSerializer(BaseApprovableSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())

    class Meta:
        model = SpotCheckModels.EmployeeSpotCheck
        fields = "__all__"

    def to_representation(self, instance):
        """Override to include employee name in the representation"""
        data = super().to_representation(instance)
        data["employee"] = EmployeeSerializer(instance.employee).data
        return data

class SpotCheckStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpotCheckModels.SpotCheckStatus
        fields = "__all__"

class EmployeeSpotCheckSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    status = serializers.PrimaryKeyRelatedField(queryset=SpotCheckModels.SpotCheckStatus.objects.all())

    class Meta:
        model = SpotCheckModels.EmployeeSpotCheck
        fields = "__all__"

    def to_representation(self, instance):
        """Override to include employee name in the representation"""
        data = super().to_representation(instance)
        data["status"] = SpotCheckStatusSerializer(instance.status).data
        return data

