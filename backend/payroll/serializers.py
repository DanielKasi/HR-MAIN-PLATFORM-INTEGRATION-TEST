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
from institution.models import Institution, Department
from recruitment.models import JobPosition
from institution.serializers import InstitutionSerializer
from django.db import transaction


class BaseModelSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = None
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["institution"] = InstitutionSerializer(instance.institution).data
        return rep


class AllowanceTypeSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = AllowanceType
        fields = BaseModelSerializer.Meta.fields


class DeductionTypeSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = DeductionType
        fields = BaseModelSerializer.Meta.fields


class EmployeeRelatedSerializer(serializers.ModelSerializer):
    calculated_amount = serializers.SerializerMethodField()

    target_employees = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    target_departments = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Department.objects.all()),
        write_only=True,
        required=False,
    )
    target_job_positions = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=JobPosition.objects.all()),
        write_only=True,
        required=False,
    )

    class Meta:
        fields = "__all__"
        read_only_fields = ["employee"]

    def get_calculated_amount(self, obj):
        raise NotImplementedError(
            "This method should be implemented in the child serializer."
        )

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
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

        departments = data.get("target_departments", [])
        positions = data.get("target_job_positions", [])
        target_employees = data.get("target_employees", [])

        if not any([departments, positions, target_employees]):
            raise serializers.ValidationError(
                "At least one of target_departments, target_job_positions, or target_employees must be provided."
            )

        employees = self.filter_employees(departments, positions, target_employees)
        if not employees.exists():
            raise serializers.ValidationError(
                "No employees found matching the provided criteria."
            )

        data["employees"] = employees
        return data

    def filter_employees(self, departments, positions, target_employees):
        user = (
            self.context.get("request").user.profile
            if self.context.get("request")
            else None
        )
        employees = Employee.objects.filter(department__institution=user.institution)

        if departments:
            employees = employees.filter(department__in=departments)
        if positions:
            employees = employees.filter(position__in=positions)
        if target_employees:
            employees = employees.filter(id__in=target_employees)

        return employees

    @transaction.atomic
    def create(self, validated_data):
        employees = validated_data["employees"]
        calculated_amount = self.get_calculated_amount(validated_data)
        allowance_type = validated_data.get("allowance_type", None)

        with transaction.atomic():
            employee_instances = []
            for employee in employees:
                employee_instance = self.create_instance(
                    employee, allowance_type, calculated_amount, validated_data
                )
                employee_instances.append(employee_instance)

            self.bulk_create(employee_instances)

        return employee_instances[0] if employee_instances else None

    def create_instance(
        self, employee, allowance_type, calculated_amount, validated_data
    ):
        raise NotImplementedError(
            "This method should be implemented in the child serializer."
        )

    def bulk_create(self, employee_instances):
        raise NotImplementedError(
            "This method should be implemented in the child serializer."
        )


class EmployeeAllowanceSerializer(EmployeeRelatedSerializer):
    allowance_type = serializers.PrimaryKeyRelatedField(
        queryset=AllowanceType.objects.all()
    )

    class Meta(EmployeeRelatedSerializer.Meta):
        model = EmployeeAllowance
        fields = "__all__"

    def get_calculated_amount(self, obj):
        return obj.get_calculated_amount()

    def create_instance(
        self, employee, allowance_type, calculated_amount, validated_data
    ):
        return EmployeeAllowance(
            employee=employee,
            allowance_type=allowance_type,
            calculation_method=validated_data.get("calculation_method"),
            amount=calculated_amount,
            percentage=validated_data.get("percentage"),
            effective_from=validated_data.get("effective_from"),
            effective_to=validated_data.get("effective_to"),
        )

    def bulk_create(self, employee_instances):
        EmployeeAllowance.objects.bulk_create(employee_instances)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["allowance_type"] = AllowanceTypeSerializer(instance.allowance_type).data
        return rep


class EmployeeDeductionSerializer(EmployeeRelatedSerializer):
    deduction_type = serializers.PrimaryKeyRelatedField(
        queryset=DeductionType.objects.all()
    )

    class Meta(EmployeeRelatedSerializer.Meta):
        model = EmployeeDeduction
        fields = "__all__"

    def get_calculated_amount(self, obj):
        return obj.get_calculated_amount()

    def create_instance(
        self, employee, allowance_type, calculated_amount, validated_data
    ):
        return EmployeeDeduction(
            employee=employee,
            deduction_type=validated_data.get("deduction_type"),
            calculation_method=validated_data.get("calculation_method"),
            amount=calculated_amount,
            percentage=validated_data.get("percentage"),
            effective_from=validated_data.get("effective_from"),
            effective_to=validated_data.get("effective_to"),
        )

    def bulk_create(self, employee_instances):
        EmployeeDeduction.objects.bulk_create(employee_instances)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["deduction_type"] = DeductionTypeSerializer(instance.deduction_type).data
        return rep


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
