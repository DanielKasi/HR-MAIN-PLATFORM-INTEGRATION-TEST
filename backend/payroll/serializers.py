from employee.serializers import EmployeeSerializer
from rest_framework import serializers
from .models import (
    AllowanceType,
    DeductionType,
    EmployeeAllowance,
    EmployeeDeduction,
    PayrollPeriod,
    Payslip,
    PayslipItem,
)
from employee.models import Employee
from institution.models import Institution
from institution.serializers import InstitutionSerializer


class AllowanceTypeSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = AllowanceType
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["institution"] = InstitutionSerializer(instance.institution).data
        return rep


class DeductionTypeSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = DeductionType
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["institution"] = InstitutionSerializer(instance.institution).data
        return rep


class EmployeeAllowanceSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    allowance_type = serializers.PrimaryKeyRelatedField(
        queryset=AllowanceType.objects.all()
    )
    calculated_amount = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeAllowance
        fields = "__all__"

    def get_calculated_amount(self, obj):
        return obj.get_calculated_amount()

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        rep["allowance_type"] = AllowanceTypeSerializer(instance.allowance_type).data
        rep["calculated_amount"] = self.get_calculated_amount(instance)
        return rep

    def validate(self, data):
        if (
            data.get("calculation_method") == "percentage"
            and data.get("percentage") <= 0
        ):
            raise serializers.ValidationError(
                "Percentage must be greater than 0 for percentage-based calculation."
            )
        if data.get("calculation_method") == "fixed" and data.get("amount") <= 0:
            raise serializers.ValidationError(
                "Amount must be greater than 0 for fixed calculation."
            )
        return data


class EmployeeDeductionSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    deduction_type = serializers.PrimaryKeyRelatedField(
        queryset=DeductionType.objects.all()
    )
    calculated_amount = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeDeduction
        fields = "__all__"

    def get_calculated_amount(self, obj):
        return obj.get_calculated_amount()

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        rep["deduction_type"] = DeductionTypeSerializer(instance.deduction_type).data
        rep["calculated_amount"] = self.get_calculated_amount(instance)
        return rep

    def validate(self, data):
        """Validate percentage and amount based on calculation method"""
        calculation_method = data.get("calculation_method")
        percentage = data.get("percentage")
        amount = data.get("amount")
        employee = data.get("employee")

        if calculation_method == "percentage":
            if not employee.salary or employee.salary <= 0:
                raise serializers.ValidationError(
                    "Employee salary must be greater than 0 for percentage-based deduction."
                )
            if percentage <= 0:
                raise serializers.ValidationError(
                    "Percentage must be greater than 0 for percentage-based deduction."
                )
        elif calculation_method == "fixed":
            if amount <= 0:
                raise serializers.ValidationError(
                    "Amount must be greater than 0 for fixed deduction."
                )

        return data


class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = "__all__"


class PayslipSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all())
    payroll_period = serializers.PrimaryKeyRelatedField(
        queryset=PayrollPeriod.objects.all()
    )

    class Meta:
        model = Payslip
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        rep["payroll_period"] = PayrollPeriodSerializer(instance.payroll_period).data
        return rep


class PayslipItemSerializer(serializers.ModelSerializer):
    payslip = serializers.PrimaryKeyRelatedField(queryset=Payslip.objects.all())

    class Meta:
        model = PayslipItem
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["payslip"] = PayslipSerializer(instance.payslip).data
        return rep


class PayslipGenerationInputSerializer(serializers.Serializer):
    payroll_period = serializers.PrimaryKeyRelatedField(
        queryset=PayrollPeriod.objects.all()
    )
