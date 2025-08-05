from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from datetime import datetime
from employee.models import Employee
from django.utils import timezone


class AllowanceType(models.Model):
    """
    Define types of allowances (Housing, Transport, Medical, etc.)

    """

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="allowance_types",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_taxable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class DeductionType(models.Model):
    """
    Define types of deductions (Tax, NSSF, Health Insurance, etc.)
    """

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="deduction_types",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_mandatory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class EmployeeAllowance(models.Model):
    """
    Employee-specific allowances (can vary by employee)
    """

    CALCULATION_CHOICES = [
        ("fixed", "Fixed Amount"),
        ("percentage", "Percentage of Salary"),
    ]

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="allowances"
    )
    allowance_type = models.ForeignKey(AllowanceType, on_delete=models.CASCADE)
    calculation_method = models.CharField(
        max_length=20, choices=CALCULATION_CHOICES, default="fixed"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField(default=timezone.now)
    effective_to = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee} - {self.allowance_type.name}"

    def get_calculated_amount(self):
        """Calculate allowance amount based on method"""
        if self.calculation_method == "percentage":
            if not self.employee.salary or self.employee.salary <= 0:
                return 0.00
            if self.percentage <= 0:
                return 0.00
            calculated = (self.employee.salary * self.percentage) / 100
            return calculated

        return self.amount

    def save(self, *args, **kwargs):
        """Override save to set amount for percentage-based allowances"""
        if self.calculation_method == "percentage":
            calculated_amount = self.get_calculated_amount()
            self.amount = calculated_amount
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ["employee", "allowance_type"]


class EmployeeDeduction(models.Model):
    """
    Employee-specific deductions
    """

    CALCULATION_CHOICES = [
        ("fixed", "Fixed Amount"),
        ("percentage", "Percentage of Salary"),
    ]

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="deductions"
    )
    deduction_type = models.ForeignKey(DeductionType, on_delete=models.CASCADE)
    calculation_method = models.CharField(
        max_length=20, choices=CALCULATION_CHOICES, default="fixed"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField(default=timezone.now)
    effective_to = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee} - {self.deduction_type.name}"

    def get_calculated_amount(self):
        """Calculate deduction amount based on method"""
        if self.calculation_method == "percentage":
            if not self.employee.salary or self.employee.salary <= 0:
                return 0.00
            if self.percentage <= 0:
                return 0.00
            calculated = (self.employee.salary * self.percentage) / 100
            return calculated
        return self.amount

    def save(self, *args, **kwargs):
        """Override save to set amount for percentage-based deductions"""
        if self.calculation_method == "percentage":
            calculated_amount = self.get_calculated_amount()
            self.amount = calculated_amount
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ["employee", "deduction_type"]


class PayrollPeriod(models.Model):
    """
    Define payroll periods (Monthly, Bi-weekly, etc.)
    """

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="payroll_periods",
    )
    name = models.CharField(max_length=100)  # e.g., "January 2024", "Week 1 - Jan 2024"
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    is_processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-start_date"]


class Payslip(models.Model):
    """
    Individual employee payslip for a specific period
    """

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="payslips"
    )
    payroll_period = models.ForeignKey(
        PayrollPeriod, on_delete=models.CASCADE, related_name="payslips"
    )
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_allowances = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    total_deductions = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    days_worked = models.PositiveIntegerField(default=30)  # or working days in period
    # overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    # overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)
    paid_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee} - {self.payroll_period.name}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding

        super().save(*args, **kwargs)

        if is_new:
            PayslipItem.generate_payslip_items(self)

    def calculate_totals(self):
        """Calculate all payslip totals"""
        self.basic_salary = self.employee.salary or 0

        # Calculate total allowances
        total_allowances = 0
        for allowance in self.employee.allowances.filter(is_active=True):
            if allowance.effective_from <= self.payroll_period.end_date and (
                not allowance.effective_to
                or allowance.effective_to >= self.payroll_period.start_date
            ):
                total_allowances += allowance.get_calculated_amount()
        self.total_allowances = total_allowances

        # Calculate total deductions
        total_deductions = 0
        for deduction in self.employee.deductions.filter(is_active=True):
            if deduction.effective_from <= self.payroll_period.end_date and (
                not deduction.effective_to
                or deduction.effective_to >= self.payroll_period.start_date
            ):
                total_deductions += deduction.get_calculated_amount()
        self.total_deductions = total_deductions

        # Calculate overtime
        # self.overtime_amount = self.overtime_hours * self.overtime_rate

        # Calculate gross and net salary
        self.gross_salary = self.basic_salary + self.total_allowances
        self.net_salary = self.gross_salary - self.total_deductions

        self.save()

    class Meta:
        unique_together = ["employee", "payroll_period"]
        ordering = ["-payroll_period__start_date"]


class PayslipItem(models.Model):
    """
    Individual line items in a payslip (for detailed breakdown)
    """

    ITEM_TYPES = [
        ("allowance", "Allowance"),
        ("deduction", "Deduction"),
        ("overtime", "Overtime"),
    ]

    payslip = models.ForeignKey(Payslip, on_delete=models.CASCADE, related_name="items")
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES)
    name = models.CharField(max_length=100)  # e.g., "Housing Allowance", "Income Tax"
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.payslip} - {self.name}: {self.amount}"

    class Meta:
        ordering = ["item_type", "name"]

    @staticmethod
    def generate_payslip_items(payslip):
        payslip.items.all().delete()
        items_to_create = []

        for allowance in payslip.employee.allowances.filter(is_active=True):
            if allowance.effective_from <= payslip.payroll_period.end_date and (
                not allowance.effective_to
                or allowance.effective_to >= payslip.payroll_period.start_date
            ):
                amount = allowance.get_calculated_amount()
                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type="allowance",
                        name=allowance.allowance_type.name,
                        amount=amount,
                        description=f"{allowance.calculation_method}: {allowance.amount if allowance.calculation_method == 'fixed' else f'{allowance.percentage}%'}",
                    )
                )

        for deduction in payslip.employee.deductions.filter(is_active=True):
            if deduction.effective_from <= payslip.payroll_period.end_date and (
                not deduction.effective_to
                or deduction.effective_to >= payslip.payroll_period.start_date
            ):
                amount = deduction.get_calculated_amount()
                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type="deduction",
                        name=deduction.deduction_type.name,
                        amount=amount,
                        description=f"{deduction.calculation_method}: {deduction.amount if deduction.calculation_method == 'fixed' else f'{deduction.percentage}%'}",
                    )
                )

        # if payslip.overtime_amount > 0:
        #     items_to_create.append(PayslipItem(
        #         payslip=payslip,
        #         item_type='overtime',
        #         name='Overtime Pay',
        #         amount=payslip.overtime_amount,
        #         description=f"{payslip.overtime_hours} hours @ {payslip.overtime_rate} per hour"
        #     ))

        PayslipItem.objects.bulk_create(items_to_create)
