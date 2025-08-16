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
    EmployeeTax,
)
from employee.models import Employee, EmployeeAttendance
from institution.models import Institution, Department
from recruitment.models import JobPosition
from institution.serializers import InstitutionSerializer, InstitutionTaxSerializer
from django.db import transaction
from employee.serializers import EmployeeAttendanceSerializer


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

    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

    percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

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

    def get_calculated_amount_from_data(self, data):
        raise NotImplementedError(
            "This method should be implemented in the child serializer."
        )

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        rep["calculated_amount"] = self.get_calculated_amount(instance)
        return rep

    def validate(self, data):
        if data.get("calculation_method") == "percentage":
            if not data.get("percentage") or data.get("percentage") <= 0:
                raise serializers.ValidationError(
                    {"percentage": "Percentage must be greater than 0."}
                )

        if data.get("calculation_method") == "fixed":
            if not data.get("amount") or data.get("amount") <= 0:
                raise serializers.ValidationError(
                    {"amount": "Amount must be greater than 0."}
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
        request = self.context.get("request")
        user = request.user.profile if request else None

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
        calculated_amount = self.get_calculated_amount_from_data(validated_data)

        # allowance_type = validated_data.get("allowance_type", None)

        type_key = (
            "allowance_type" if "allowance_type" in validated_data else "deduction_type"
        )
        type_value = validated_data.get(type_key, None)

        with transaction.atomic():
            employee_instances = []
            for employee in employees:
                employee_instance = self.create_instance(
                    employee, type_value, calculated_amount, validated_data
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

    def get_calculated_amount_from_data(self, data):
        method = data.get("calculation_method")

        if method == "percentage":
            return None

        elif method == "fixed":
            return data.get("amount")

        return 0

    def create_instance(
        self, employee, allowance_type, calculated_amount, validated_data
    ):
        method = validated_data.get("calculation_method")

        if method == "percentage":
            salary = employee.salary or 0
            percentage = validated_data.get("percentage", 0)
            calculated_amount = (
                (salary * percentage) / 100 if percentage > 0 and salary > 0 else 0
            )

        return EmployeeAllowance(
            employee=employee,
            allowance_type=allowance_type,
            calculation_method=method,
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

    def get_calculated_amount_from_data(self, data):
        method = data.get("calculation_method")

        if method == "percentage":
            return None

        elif method == "fixed":
            return data.get("amount")

        return 0

    def create_instance(
        self, employee, deduction_type, calculated_amount, validated_data
    ):
        method = validated_data.get("calculation_method")

        if method == "percentage":
            salary = employee.salary or 0
            percentage = validated_data.get("percentage", 0)
            calculated_amount = (
                (salary * percentage) / 100 if percentage > 0 and salary > 0 else 0
            )

        return EmployeeDeduction(
            employee=employee,
            deduction_type=deduction_type,
            calculation_method=method,
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


class EmployeeTaxSerializer(serializers.ModelSerializer):

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
        model = EmployeeTax
        fields = "__all__"

        read_only_fields = ["id", "created_at", "employee"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["employee"] = EmployeeSerializer(instance.employee).data
        rep["institution_tax"] = InstitutionTaxSerializer(instance.institution_tax).data
        return rep        

    def validate(self, data):
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
        request = self.context.get("request")
        user = request.user.profile if request else None

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

        employee_tax_instances = []
        for employee in employees:
            employee_tax_instance = EmployeeTax(
                employee=employee,
                institution_tax=validated_data.get("institution_tax"),
                effective_from=validated_data.get("effective_from"),
                effective_to=validated_data.get("effective_to"),
            )
            employee_tax_instances.append(employee_tax_instance)

        EmployeeTax.objects.bulk_create(employee_tax_instances)

        return employee_tax_instances[0] if employee_tax_instances else None


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


class AttendanceReportSerializer(serializers.Serializer):
    payroll_period_id = serializers.IntegerField()

    def validate_payroll_period_id(self, value):
        try:
            return PayrollPeriod.objects.get(id=value)
        except PayrollPeriod.DoesNotExist:
            raise serializers.ValidationError("Invalid payroll period ID")

    def to_representation(self, payroll_period):
        # Get all attendance records in this payroll period
        attendances = EmployeeAttendance.objects.filter(
            date__range=[payroll_period.start_date, payroll_period.end_date],
            employee__is_active=True,
        ).select_related("employee", "employee__user", "employee__department", "employee__position")

        # Group by employee
        employee_data = {}
        for attendance in attendances:
            emp = attendance.employee
            if emp.id not in employee_data:
                employee_data[emp.id] = {
                    "employee": EmployeeSerializer(emp).data,
                    "attendance_records": [],
                    "summary": {
                        "total_days": 0,
                        "approved_days": 0,
                        "pending_days": 0,
                        "rejected_days": 0,
                        "total_overtime_hours": 0,
                    },
                }

            record = EmployeeAttendanceSerializer(attendance).data
            employee_data[emp.id]["attendance_records"].append(record)

            # Update summary
            employee_data[emp.id]["summary"]["total_days"] += 1
            employee_data[emp.id]["summary"][f"{attendance.status}_days"] = (
                employee_data[emp.id]["summary"].get(f"{attendance.status}_days", 0) + 1
            )
            employee_data[emp.id]["summary"]["total_overtime_hours"] += float(
                attendance.overtime_hours or 0
            )

        return {
            "payroll_period": PayrollPeriodSerializer(payroll_period).data,
            "employees": list(employee_data.values()),
        }
