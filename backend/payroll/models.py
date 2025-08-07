from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from datetime import datetime
from employee.models import Employee
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from institution.models import Institution


class BaseModel(models.Model):
    FREQUENCY_CHOICES = [
        ("DAILY", "Daily"),
        ("WEEKLY", "Weekly"),
        ("MONTHLY", "Monthly"),
        ("QUARTERLY", "Quarterly"),
        ("YEARLY", "Yearly"),
    ]

    is_recurring = models.BooleanField(default=False)

    frequency = models.CharField(
        max_length=10,
        choices=FREQUENCY_CHOICES,
        help_text="Frequency of the allowance/deduction",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=100)

    description = models.TextField(
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def clean(self):
        if self.is_recurring and not self.frequency:
            raise ValueError("Frequency must be set if the Item is recurring.")

        if not self.is_recurring and self.frequency:
            raise ValueError(
                "Frequency should not be set if the Item is not recurring."
            )

        super().clean()


class AllowanceType(BaseModel):
    """
    Define types of allowances (Housing, Transport, Medical, etc.)

    """

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="allowance_types",
    )
    is_taxable = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class DeductionType(BaseModel):
    """
    Define types of deductions (Tax, NSSF, Health Insurance, etc.)
    """

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="deduction_types",
    )
    is_mandatory = models.BooleanField(default=False)

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
        null=True,
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

    def get_recurrence_count(self, payroll_period):
        """
        Calculate the number of times this item (allowance or deduction) will recur
        in the given payroll period.
        """
        if not self.allowance_type.is_recurring:
            return 1  # Means it is a one-time allowance or deduction

        recurrence_count = 0
        start_date = payroll_period.start_date
        end_date = payroll_period.end_date

        if hasattr(self.employee, "custom_working_days"):
            working_days = self.employee.custom_working_days.days.all()
        else:
            institution = self.employee.department.institution
            working_days = institution.working_days.days.all()

        # Daily recurrence
        if self.allowance_type.frequency == "DAILY":
            current_date = start_date
            while current_date <= end_date:

                DAY_NAME_TO_WEEKDAY_INDEX = {
                    "Monday": 0,
                    "Tuesday": 1,
                    "Wednesday": 2,
                    "Thursday": 3,
                    "Friday": 4,
                    "Saturday": 5,
                    "Sunday": 6,
                }

                if current_date.weekday() in [
                    DAY_NAME_TO_WEEKDAY_INDEX[day.day_name] for day in working_days
                ]:

                    recurrence_count += 1
                current_date += timedelta(days=1)

        # Weekly recurrence
        elif self.allowance_type.frequency == "WEEKLY":
            current_date = start_date
            delta = timedelta(weeks=1)
            while current_date <= end_date:
                recurrence_count += 1
                current_date += delta

        # Monthly recurrence
        elif self.allowance_type.frequency == "MONTHLY":
            current_date = start_date
            while current_date <= end_date:
                recurrence_count += 1
                current_date += relativedelta(months=1)

        # Quarterly recurrence
        elif self.allowance_type.frequency == "QUARTERLY":
            current_date = start_date
            while current_date <= end_date:
                recurrence_count += 1
                current_date += relativedelta(months=3)

        # Yearly recurrence
        elif self.allowance_type.frequency == "YEARLY":
            current_date = start_date
            while current_date <= end_date:
                recurrence_count += 1
                current_date += relativedelta(years=1)

        return recurrence_count


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
        null=True,
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

    def get_recurrence_count(self, payroll_period):
        """
        Calculate the number of times this item (allowance or deduction) will recur
        in the given payroll period.
        """
        if not self.deduction_type.is_recurring:
            return 1  # Means it is a one-time allowance or deduction

        recurrence_count = 0
        start_date = payroll_period.start_date
        end_date = payroll_period.end_date

        if hasattr(self.employee, "custom_working_days"):
            working_days = self.employee.custom_working_days.days.all()
        else:
            institution = self.employee.department.institution
            working_days = institution.working_days.days.all()

        # Daily recurrence
        if self.deduction_type.frequency == "DAILY":
            current_date = start_date
            while current_date <= end_date:
                DAY_NAME_TO_WEEKDAY_INDEX = {
                    "Monday": 0,
                    "Tuesday": 1,
                    "Wednesday": 2,
                    "Thursday": 3,
                    "Friday": 4,
                    "Saturday": 5,
                    "Sunday": 6,
                }

                if current_date.weekday() in [
                    DAY_NAME_TO_WEEKDAY_INDEX[day.day_name] for day in working_days
                ]:

                    recurrence_count += 1
                current_date += timedelta(days=1)

        # Weekly recurrence
        elif self.deduction_type.frequency == "WEEKLY":
            current_date = start_date
            delta = timedelta(weeks=1)
            while current_date <= end_date:
                recurrence_count += 1
                current_date += delta

        # Monthly recurrence
        elif self.deduction_type.frequency == "MONTHLY":
            current_date = start_date
            while current_date <= end_date:
                recurrence_count += 1
                current_date += relativedelta(months=1)

        # Quarterly recurrence
        elif self.deduction_type.frequency == "QUARTERLY":
            current_date = start_date
            while current_date <= end_date:
                recurrence_count += 1
                current_date += relativedelta(months=3)

        # Yearly recurrence
        elif self.deduction_type.frequency == "YEARLY":
            current_date = start_date
            while current_date <= end_date:
                recurrence_count += 1
                current_date += relativedelta(years=1)

        return recurrence_count


class PayrollPeriod(models.Model):
    """
    Define payroll periods (Monthly, Bi-weekly, etc.)
    """

    institution = models.ForeignKey(
        Institution,
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


# class TaxType(models.Model):
#     """Defines a general type of tax, linked directly to an institution
#     e.g, PAYE - Uganda or NSSF
#     """

#     institution = models.ForeignKey(
#         'institution.Institution',
#         on_delete=models.CASCADE,
#         related_name='tax_types',
#         help_text='The institution this tax type belongs to.'
#     )
#     name = models.CharField(max_length=100)
#     description = models.TextField(blank=True, null=True)
#     is_active = models.BooleanField(default=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     update_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return f"{self.name} ({self.institution.institution_name})"

#     class Meta:
#         unique_together = ['institution', 'name']
#         ordering = ['name']

# class TaxRuleCalculationChoices(models.TextChoices):
#     ('fixed_percentage', 'Fixed_Percentage'),
#     ('tiered_brackets', 'Tiered_Brackets')


# class TaxRule(models.Model):
#     """Defines a tax rule linked to a specific TypeTax
#     """


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

        # if is_new:
        #     PayslipItem.generate_payslip_items(self)
        # self.calculate_totals()

    def calculate_totals(self):
        """Calculate all payslip totals"""

        total_objs = self.items.filter(item_type__in=["allowance", "deduction"])

        if total_objs.exists():
            total_allowances = (
                total_objs.filter(item_type="allowance").aggregate(
                    total=models.Sum("amount")
                )["total"]
                or 0.00
            )
            total_deductions = (
                total_objs.filter(item_type="deduction").aggregate(
                    total=models.Sum("amount")
                )["total"]
                or 0.00
            )
            self.total_allowances = total_allowances
            self.total_deductions = total_deductions

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
                recurrence_count = allowance.get_recurrence_count(
                    payslip.payroll_period
                )

                new_amount = allowance.get_calculated_amount() * recurrence_count

                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type="allowance",
                        name=allowance.allowance_type.name,
                        amount=new_amount,
                        description=f"{allowance.calculation_method}: {allowance.amount if allowance.calculation_method == f'fixed' else f'{allowance.percentage}%'} x{recurrence_count} times",
                    )
                )

        for deduction in payslip.employee.deductions.filter(is_active=True):
            if deduction.effective_from <= payslip.payroll_period.end_date and (
                not deduction.effective_to
                or deduction.effective_to >= payslip.payroll_period.start_date
            ):
                recurrence_count = deduction.get_recurrence_count(
                    payslip.payroll_period
                )

                new_amount = deduction.get_calculated_amount() * recurrence_count

                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type="deduction",
                        name=deduction.deduction_type.name,
                        amount=new_amount,
                        description=f"{deduction.calculation_method}: {deduction.amount if deduction.calculation_method == 'fixed' else f'{deduction.percentage}%'} x{recurrence_count} times",
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

        # for item in items_to_create:
        #     print(f"\n\n\n\Item: {item}")
        #     print(f"\n\n\n\nAmount: {item.amount}")

        PayslipItem.objects.bulk_create(items_to_create)
