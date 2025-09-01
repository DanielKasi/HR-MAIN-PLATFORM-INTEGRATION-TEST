from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from employee.models import Employee, EmployeeAttendance
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from institution.models import Institution, PENALTY_TYPES, BranchPenaltyConfig, InstitutionPenaltyConfig
from django.db.models import UniqueConstraint, Q
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from approval.models import BaseApprovableModel


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


class AllowanceType(BaseModel, BaseApprovableModel):
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

    def get_institution(self):
        return self.institution


class DeductionType(BaseModel, BaseApprovableModel):
    """
    Define types of deductions (Tax, NSSF, Health Insurance, etc.)
    """
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="deduction_types",
    )
    is_mandatory = models.BooleanField(default=False)

    def get_institution(self):
        return self.institution

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class EmployeeAllowance(BaseApprovableModel):
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
    effective_from = models.DateField(default=timezone.now)
    effective_to = models.DateField(blank=True, null=True)

    def get_institution(self):
        return self.employee.get_institution()

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
        constraints = [
            UniqueConstraint(
                fields=("employee", "allowance_type"),
                condition=Q(deleted_at__isnull=True),
                name="unique_active_allowance_type_per_employee",
            )
        ]

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


class EmployeeDeduction(BaseApprovableModel):
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
    effective_from = models.DateField(default=timezone.now)
    effective_to = models.DateField(blank=True, null=True)

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

    def get_institution(self):
        return self.employee.get_institution()

    def save(self, *args, **kwargs):
        """Override save to set amount for percentage-based deductions"""
        if self.calculation_method == "percentage":
            calculated_amount = self.get_calculated_amount()
            self.amount = calculated_amount
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=("employee", "deduction_type"),
                condition=Q(deleted_at__isnull=True),
                name="unique_active_deduction_type_per_employee",
            )
        ]

    def get_recurrence_count(self, payroll_period):
        from employee.utilities import get_employee_working_days
        """
        Calculate the number of times this item (allowance or deduction) will recur
        in the given payroll period.
        """
        if not self.deduction_type.is_recurring:
            return 1  # Means it is a one-time allowance or deduction

        recurrence_count = 0
        start_date = payroll_period.start_date
        end_date = payroll_period.end_date

        working_days = get_employee_working_days(self.employee)
        
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


class EmployeeTax(BaseApprovableModel):
    """
    Employee-specific tax details
    """

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="taxes"
    )
    institution_tax = models.ForeignKey(
        "institution.InstitutionTax", on_delete=models.CASCADE
    )

    effective_from = models.DateField(default=timezone.now)
    effective_to = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"{self.employee} - {self.institution_tax.tax_name}"

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["employee", "institution_tax"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_institution_tax_per_employee",
            )
        ]

    def get_institution(self):
        return self.employee.get_institution()

    def rule_fit_employee_salary(self):

        employee_salary = self.employee.salary

        if not employee_salary or employee_salary <= 0:
            return None

        rules = self.institution_tax.rules.filter(
            salary_from__lte=employee_salary, salary_to__gte=employee_salary
        ).order_by("salary_from")

        print(
            f"\n\nrules checked: {rules.count()} for employee salary: {employee_salary}"
        )

        return rules.first()

    def get_tax_amount(self):
        """
        Calculate the tax amount based on the employee's salary and the tax rules.
        """
        rule = self.rule_fit_employee_salary()
        if not rule:
            return Decimal(0.00)

        if rule.tax_rule_fixed_amount is not None:
            return rule.tax_rule_fixed_amount
        if rule.tax_rule_percentage is not None:
            print(f"\n\n")
            print(
                f"Calculating tax for employee {self.employee} with salary {self.employee.salary}"
            )
            print(
                f"Using rule: {rule.tax_rule_name} with percentage {rule.tax_rule_percentage}"
            )
            print(
                f"Tax amount: {(self.employee.salary * rule.tax_rule_percentage) / 100}"
            )
            return (self.employee.salary * rule.tax_rule_percentage) / 100

        print(
            f"Warning: No valid tax rule found for employee {self.employee} with salary {self.employee.salary}"
        )

        return Decimal(0.00)

class EmployeePenalty(BaseApprovableModel):
    PENALTY_STATUS_CHOICES = [
        ("waived", "Waived"),
        ("applied", "Applied"),
    ]    
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="penalties"
    )  
    attendance = models.ForeignKey(
        EmployeeAttendance, on_delete=models.SET_NULL, null=True, blank=True, related_name="penalties"
    )
    spot_check = models.ForeignKey(
        'spotcheck.EmployeeSpotCheck', on_delete=models.SET_NULL, null=True, blank=True, related_name="penalties"
    )  
    date = models.DateField()  
    penalty_type = models.CharField(
        max_length=50, choices=PENALTY_TYPES
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)]
    )
    notes = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=50, choices=PENALTY_STATUS_CHOICES, default="applied"
    )

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.get_penalty_type_display()} on {self.date}"

    def get_institution(self):
        return self.employee.get_institution()

    def save(self, *args, **kwargs):
        if not self.date:
            if self.attendance:
                self.date = self.attendance.date
            elif self.spot_check:
                self.date = self.spot_check.spotcheck_time.date()
        super().save(*args, **kwargs)

    @classmethod
    def create_from_attendance(cls, attendance):  
        """Create penalty based on attendance status"""
        employee = attendance.employee
        penalty_type = None  

        if attendance.attendance_status == 'late':
            penalty_type = 'late_coming'
        elif attendance.attendance_status == 'early_checkout':
            penalty_type = 'early_leaving'
        elif attendance.attendance_status == 'absent':
            penalty_type = 'absent'   

        if not penalty_type:
            return None

        # Check if penalty already exists
        existing = cls.objects.filter(
            employee=employee,
            attendance=attendance,
            penalty_type=penalty_type
        ).first()
        
        if existing:
            return existing

        config = cls._get_penalty_config(employee, penalty_type)
        if not config:
            return None 

        employee_salary = getattr(employee, 'salary', 0.00)
        amount = config.get_calculated_amount(employee_salary)  

        penalty = cls.objects.create(
            employee=employee,
            attendance=attendance,
            date=attendance.date,
            penalty_type=penalty_type,
            amount=amount,
            notes=f"Penalty for {penalty_type} on {attendance.date}"
        )
        

        return penalty

    @classmethod
    def update_or_remove_penalty_for_attendance(cls, attendance):
        """
        Update or remove existing penalty when attendance status changes
        """
        
        # Get all existing penalties for this attendance
        existing_penalties = cls.objects.filter(attendance=attendance)
        
        # Determine what penalty should exist based on current status
        required_penalty_type = None
        if attendance.attendance_status == 'late':
            required_penalty_type = 'late_coming'
        elif attendance.attendance_status == 'early_checkout':
            required_penalty_type = 'early_leaving'
        elif attendance.attendance_status == 'absent':
            required_penalty_type = 'absent'
        
        if required_penalty_type:
            # Should have a penalty - create or update
            penalty = cls.create_from_attendance(attendance)
            
            # Remove any other penalty types for this attendance
            existing_penalties.exclude(penalty_type=required_penalty_type).delete()
            
        else:
            existing_penalties.delete()

    @classmethod
    def create_from_spotcheck(cls, spotcheck, penalty_type):    
        if penalty_type not in ['no_response_spotcheck', 'late_spotcheck_response']:
            return None

        employee = spotcheck.employee
        config = cls._get_penalty_config(employee, penalty_type)
        if not config:
            return None

        employee_salary = getattr(employee, 'salary', 0.00)
        amount = config.get_calculated_amount(employee_salary)

        return cls.objects.create(
            employee=employee,
            spot_check=spotcheck,
            penalty_type=penalty_type,
            amount=amount,
            notes=f"Penalty for spotcheck: {penalty_type}"
        )

    @classmethod
    def _get_penalty_config(cls, employee, penalty_type):
        """Get penalty config: branch > institution"""
        
        branch = employee.payroll_branch
        config = None
        
        if branch:

            config = BranchPenaltyConfig.objects.filter(
                branch=branch, penalty_type=penalty_type
            ).first()


        if not config:
            # Fall back to institution config
            institution = branch.institution if branch else employee.institution
            if institution:
                config = InstitutionPenaltyConfig.objects.filter(
                    institution=institution, penalty_type=penalty_type
                ).first()
        
        return config      


class PayrollPeriod(BaseApprovableModel):
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

    def get_institution(self):
        return self.institution

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-start_date"]


class Payslip(BaseApprovableModel):
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
    total_penalties = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    taxable_allowances = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    non_taxable_allowances = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    taxable_gross_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    days_worked = models.PositiveIntegerField(default=30)  # or working days in period
    # overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    # overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)
    paid_date = models.DateField(blank=True, null=True)

    def get_institution(self):
        return self.employee.get_institution()

    def __str__(self):
        return f"{self.employee} - {self.payroll_period.name}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding

        super().save(*args, **kwargs)

    def calculate_totals(self):
        taxable_allowances = 0
        non_taxable_allowances = 0
        total_penalties = 0


        allowances = (
            self.employee.allowances.filter(is_active=True)
            .filter(
                effective_from__lte=self.payroll_period.end_date,
            )
            .filter(
                models.Q(effective_to__gte=self.payroll_period.start_date)
                | models.Q(effective_to__isnull=True)
            )
        )

        for allowance in allowances:
            recurrence = allowance.get_recurrence_count(self.payroll_period)
            amount = allowance.get_calculated_amount() * recurrence

            if allowance.allowance_type.is_taxable:
                taxable_allowances += amount
            else:
                non_taxable_allowances += amount

        penalties = self.employee.penalties.filter(
            status='applied',  # Only applied penalties
            date__gte=self.payroll_period.start_date,
            date__lte=self.payroll_period.end_date
        )

        for penalty in penalties:
            total_penalties += penalty.amount        

        # Now get total deductions excluding tax (for clarity)
        deductions = 0
        for deduction in (
            self.employee.deductions.filter(is_active=True)
            .filter(
                effective_from__lte=self.payroll_period.end_date,
            )
            .filter(
                models.Q(effective_to__gte=self.payroll_period.start_date)
                | models.Q(effective_to__isnull=True)
            )
        ):
            recurrence = deduction.get_recurrence_count(self.payroll_period)
            deductions += deduction.get_calculated_amount() * recurrence


        # Calculate tax from EmployeeTax model (already no recurrence)
        tax_total = 0
        for tax in self.employee.taxes.all():
            if tax.effective_from <= self.payroll_period.end_date and (
                not tax.effective_to
                or tax.effective_to >= self.payroll_period.start_date
            ):
                tax_total += tax.get_tax_amount()

        self.total_allowances = taxable_allowances + non_taxable_allowances
        self.total_deductions = deductions + tax_total
        self.total_penalties = total_penalties
        self.basic_salary = self.basic_salary or self.employee.salary or 0

        gross = self.basic_salary + taxable_allowances + non_taxable_allowances
        taxable_gross = self.basic_salary + taxable_allowances
        net = taxable_gross - tax_total + non_taxable_allowances - deductions - total_penalties
        

        self.gross_salary = gross
        self.net_salary = net
        self.taxable_gross = taxable_gross

        self.save()


    def get_penalty_breakdown(self):
        """Get detailed breakdown of penalties for this payroll period"""
        penalties = self.employee.penalties.filter(
            status='applied',
            date__gte=self.payroll_period.start_date,
            date__lte=self.payroll_period.end_date
        ).select_related('attendance', 'spot_check')
        
        breakdown = {}
        for penalty in penalties:
            penalty_type = penalty.get_penalty_type_display()
            if penalty_type not in breakdown:
                breakdown[penalty_type] = {
                    'count': 0,
                    'total_amount': 0,
                    'details': []
                }
            
            breakdown[penalty_type]['count'] += 1
            breakdown[penalty_type]['total_amount'] += penalty.amount
            breakdown[penalty_type]['details'].append({
                'date': penalty.date,
                'amount': penalty.amount,
                'notes': penalty.notes,
                'source': 'attendance' if penalty.attendance else 'spotcheck'
            })
        
        return breakdown

    def get_applied_penalties(self):
        """Get all applied penalties for this payroll period"""
        return self.employee.penalties.filter(
            status='applied',
            date__gte=self.payroll_period.start_date,
            date__lte=self.payroll_period.end_date
        ).order_by('date')    

    class Meta:
        ordering = ["-payroll_period__start_date"]
        constraints = [
            UniqueConstraint(
                fields=["employee", "payroll_period"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_payroll_period_per_employee",
            )
        ]


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

        for penalty in payslip.employee.penalties.filter(is_active=True):
            if penalty.status == 'applied' and penalty.date >= payslip.payroll_period.start_date and penalty.date <= payslip.payroll_period.end_date:
                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type="penalty",
                        name=f"Penalty - {penalty.get_penalty_type_display()}",
                        amount=penalty.amount,
                        description=penalty.notes or f"Penalty applied on {penalty.date}",
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

        # --- Statutory Tax (from EmployeeTax) ---
        for tax in payslip.employee.taxes.all():
            if tax.effective_from <= payslip.payroll_period.end_date and (
                not tax.effective_to
                or tax.effective_to >= payslip.payroll_period.start_date
            ):
                tax_amount = tax.get_tax_amount()

                if tax_amount > 0:
                    rule = tax.rule_fit_employee_salary()

                    description = f"Tax: {tax.institution_tax.tax_name}"
                    if rule:
                        description += f" | Rule: {rule.tax_rule_name}"
                        if rule.tax_rule_description:
                            description += f" - {rule.tax_rule_description}"

                    items_to_create.append(
                        PayslipItem(
                            payslip=payslip,
                            item_type="deduction",
                            name=tax.institution_tax.tax_name,
                            amount=tax_amount,
                            description=description,
                        )
                    )

        # _, attendance_items = payslip.get_attendance_deductions()
        # for item in attendance_items:
        #     items_to_create.append(
        #         PayslipItem(
        #             payslip=payslip,
        #             item_type="deduction",
        #             name=item["name"],
        #             amount=item["amount"],
        #             description=f"{item['reason']} on {item['date']}",
        #         )
        #     )

        PayslipItem.objects.bulk_create(items_to_create)
