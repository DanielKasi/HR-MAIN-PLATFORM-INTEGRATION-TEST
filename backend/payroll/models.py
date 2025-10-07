from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from employee.models import Employee, EmployeeAttendance
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from institution.models import Institution, PENALTY_TYPES, BranchPenaltyConfig, InstitutionPenaltyConfig, InstitutionTaxRule
from django.db.models import UniqueConstraint, Q
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from approval.models import BaseApprovableModel
from django.core.exceptions import ValidationError
import re

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
    
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            effective_from__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related('employee', 'allowance_type')
        return list(queryset.values(
            'employee__name',
            'allowance_type__name',
            'calculation_method',
            'amount',
            'percentage',
            'effective_from',
            'effective_to'
        ))


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
    
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            effective_from__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related('employee', 'deduction_type')
        return list(queryset.values(
            'employee__name',
            'deduction_type__name',
            'calculation_method',
            'amount',
            'percentage',
            'effective_from',
            'effective_to'
        ))


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
            return (self.employee.salary * rule.tax_rule_percentage) / 100


        return Decimal(0.00)
    
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            effective_from__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related('employee', 'institution_tax')
        return list(queryset.values(
            'employee__name',
            'institution_tax__tax_name',
            'effective_from',
            'effective_to'
        ))

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
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            date__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related('employee', 'attendance', 'spot_check')
        return list(queryset.values(
            'employee__name',
            'penalty_type',
            'amount',
            'status',
            'date',
            'notes'
        ))    

    @classmethod
    def update_or_remove_penalty_for_attendance(cls, attendance):
        
        existing_penalties = cls.objects.filter(attendance=attendance)

        # Determine which penalties should exist based on actual metrics (not just final status)
        required_penalties = []
        
        # Check for late arrival
        if attendance.late_minutes > 0:
            required_penalties.append('late_coming')
        
        # Check for early departure  
        if attendance.early_checkout_minutes > 0:
            required_penalties.append('early_leaving')
        
        # Check for absence
        if attendance.attendance_status == 'absent':
            required_penalties.append('absent')

        if required_penalties:
            # Create required penalties
            created_penalties = []
            for penalty_type in required_penalties:
                penalty = cls.create_from_attendance_with_type(attendance, penalty_type)
                if penalty:
                    created_penalties.append(penalty.penalty_type)

            # Remove penalties that are no longer needed
            penalties_to_remove = existing_penalties.exclude(penalty_type__in=required_penalties)
            removed_count = penalties_to_remove.count()
            if removed_count > 0:
                penalties_to_remove.delete()
            
        else:
            # No penalty required for this status (on_time, overtime, pending)
            deleted_count = existing_penalties.count()
            existing_penalties.delete()

    @classmethod 
    def create_from_attendance_with_type(cls, attendance, penalty_type):
        """Create penalty for specific type based on attendance"""
        employee = attendance.employee
        

        # Check if penalty already exists
        existing = cls.objects.filter(
            employee=employee,
            attendance=attendance,
            penalty_type=penalty_type
        ).first()
        
        if existing:
            return existing

        # Get penalty configuration
        config = cls._get_penalty_config(employee, penalty_type)
        if not config:
            return None 

        # Calculate penalty amount
        employee_salary = getattr(employee, 'salary', 0.00)
        amount = config.get_calculated_amount(employee_salary)  

        # Generate descriptive notes based on penalty type
        notes = cls._generate_attendance_penalty_notes(attendance, penalty_type)

        # Create the penalty
        penalty = cls.objects.create(
            employee=employee,
            attendance=attendance,
            date=attendance.date,
            penalty_type=penalty_type,
            amount=amount,
            notes=notes
        )
        
        return penalty

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


        # Generate descriptive notes for spotcheck penalty
        notes = cls._generate_spotcheck_penalty_notes(spotcheck, penalty_type)

        penalty = cls.objects.create(
            employee=employee,
            spot_check=spotcheck,
            penalty_type=penalty_type,
            amount=amount,
            notes=notes
        )

        return penalty

    @classmethod
    def _generate_attendance_penalty_notes(cls, attendance, penalty_type):
        """Generate descriptive notes for attendance-based penalties"""
        notes_map = {
            'late_coming': f"Late arrival penalty - Employee arrived {attendance.late_minutes} minutes late on {attendance.date.strftime('%B %d, %Y')}. Scheduled time: {attendance.employee.payroll_branch.opening_time}, Actual check-in: {attendance.check_in_time}",
            'early_leaving': f"Early departure penalty - Employee left {attendance.early_checkout_minutes} minutes early on {attendance.date.strftime('%B %d, %Y')}. Scheduled end: {attendance.employee.payroll_branch.closing_time}, Actual check-out: {attendance.check_out_time}",
            'absent': f"Absence penalty - Employee was marked absent on {attendance.date.strftime('%B %d, %Y')}. No check-in or check-out recorded for scheduled shift."
        }
        
        return notes_map.get(penalty_type, f"Penalty for {penalty_type} on {attendance.date.strftime('%B %d, %Y')}")

    @classmethod
    def _generate_spotcheck_penalty_notes(cls, spotcheck, penalty_type):
        """Generate descriptive notes for spotcheck-based penalties"""
        from spotcheck.models import EmployeeSpotCheckSetting, BranchSpotCheckSetting, InstitutionSpotCheckSetting
        spotcheck_time = spotcheck.spotcheck_time
        spotcheck_date = spotcheck_time.strftime('%B %d, %Y')
        spotcheck_time_formatted = spotcheck_time.strftime('%I:%M %p')
        
        # Get spotcheck settings to determine deadlines
        employee = spotcheck.employee
        setting = None
        
        # Try employee-specific setting first
        try:
            setting = EmployeeSpotCheckSetting.objects.filter(employee=employee).first()
        except:
            pass
            
        # Then branch setting
        if not setting:
            try:
                branch = employee.payroll_branch
                setting = BranchSpotCheckSetting.objects.filter(branch=branch).first()
            except:
                pass
                
        # Finally institution setting
        if not setting:
            try:
                institution = getattr(employee.payroll_branch, 'institution', None) or getattr(employee.department, 'institution', None)
                if institution:
                    setting = InstitutionSpotCheckSetting.objects.filter(institution=institution).first()
            except:
                pass
        
        # Default expiry minutes if no setting found
        expires_after_minutes = getattr(setting, 'expires_after_minutes', 30) if setting else 30
        late_starts_after_minutes = getattr(setting, 'late_starts_after_minutes', 15) if setting else 15
        
        # Calculate deadline times
        late_deadline = spotcheck_time + timedelta(minutes=late_starts_after_minutes)
        expiry_deadline = spotcheck_time + timedelta(minutes=expires_after_minutes)
        
        # Format location info
        location_info = ""
        if spotcheck.address:
            location_info = f"Location: {spotcheck.address}"
        elif spotcheck.latitude and spotcheck.longitude:
            location_info = f"Coordinates: {spotcheck.latitude:.6f}, {spotcheck.longitude:.6f}"
        else:
            location_info = "Location: Not specified"
        
        if penalty_type == 'no_response_spotcheck':
            expiry_formatted = expiry_deadline.strftime('%I:%M %p')
            notes = (f"No response to spotcheck penalty - Spotcheck sent on {spotcheck_date} at {spotcheck_time_formatted}. "
                    f"Employee failed to respond by the deadline of {expiry_formatted} "
                    f"({expires_after_minutes} minutes window). {location_info}. "
                    f"Initiated by: {spotcheck.get_initiated_by_display()}")
                    
        elif penalty_type == 'late_spotcheck_response':
            if spotcheck.responded_at:
                response_formatted = spotcheck.responded_at.strftime('%I:%M %p')
                delay_minutes = int((spotcheck.responded_at - spotcheck_time).total_seconds() / 60)
                late_deadline_formatted = late_deadline.strftime('%I:%M %p')
                
                notes = (f"Late spotcheck response penalty - Spotcheck sent on {spotcheck_date} at {spotcheck_time_formatted}. "
                        f"Employee responded {delay_minutes} minutes late at {response_formatted} "
                        f"(should have responded by {late_deadline_formatted}). {location_info}. "
                        f"Initiated by: {spotcheck.get_initiated_by_display()}")
            else:
                notes = (f"Late spotcheck response penalty - Spotcheck sent on {spotcheck_date} at {spotcheck_time_formatted}. "
                        f"Employee response was recorded as late. {location_info}. "
                        f"Initiated by: {spotcheck.get_initiated_by_display()}")
        else:
            notes = (f"Spotcheck penalty ({penalty_type}) - Spotcheck sent on {spotcheck_date} at {spotcheck_time_formatted}. "
                    f"{location_info}. Initiated by: {spotcheck.get_initiated_by_display()}")
        
        # Add notes from spotcheck if available
        if spotcheck.notes:
            notes += f" Additional notes: {spotcheck.notes}"
        
        return notes

    @classmethod
    def _get_penalty_config(cls, employee, penalty_type):
        branch = employee.payroll_branch
        config = None
        
        if branch:
            config = BranchPenaltyConfig.objects.filter(
                branch=branch, penalty_type=penalty_type
            ).first()

        if not config:
            institution = branch.institution if branch else employee.department.institution
            if institution:
                config = InstitutionPenaltyConfig.objects.filter(
                    institution=institution, penalty_type=penalty_type
                ).first()
  
class PenaltyWaiveRequest(BaseApprovableModel):
    penalty = models.ForeignKey(EmployeePenalty, on_delete=models.CASCADE, related_name='waiverequests')
    reason = models.TextField()
    request_date = models.DateField(auto_now_add=True)
    notes = models.TextField()

    class Meta:
        ordering = ['-request_date']

    def __str__(self):
        return f"Waive Request for Penalty {self.penalty.id} by {self.applicant}"

    def get_institution(self):
        return self.penalty.get_institution()

    def save(self, *args, **kwargs):
        if self.penalty.status == "waived":
            raise ValidationError({"error": "Cannot request waive for an already waived penalty"})
        super().save(*args, **kwargs)

    def finish_workflow(self, approval):
        super().finish_workflow(approval)

        if approval.status == 'completed':
            self.penalty.status = 'waived'
            waive_note = f"Waived on {timezone.now().date()} based on request: {self.reason}"
            if self.penalty.notes:
                self.penalty.notes += f"\n{waive_note}"

            else:
                self.penalty.notes = waive_note 
            self.penalty.save(update_fields=['status', 'notes']) 

        elif approval.status == 'rejected':
            pass          


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
        
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            start_date__range=(start_date, end_date),
            institution=institution,
            **filters
        ).select_related('institution')
        return list(queryset.values(
            'name',
            'start_date',
            'end_date',
            'pay_date',
            'is_processed'
        ))    


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
        taxable_allowances = Decimal('0')
        non_taxable_allowances = Decimal('0')
        total_penalties = Decimal('0')
        deductions = Decimal('0')
        tax_items = []  # Store individual tax deductions for items

        # Step 1: Calculate Allowances
        allowances = (
            self.employee.allowances.filter(is_active=True)
            .filter(effective_from__lte=self.payroll_period.end_date)
            .filter(
                Q(effective_to__gte=self.payroll_period.start_date) |
                Q(effective_to__isnull=True)
            )
        )
        for allowance in allowances:
            recurrence = allowance.get_recurrence_count(self.payroll_period)
            amount = allowance.get_calculated_amount() * recurrence
            if allowance.allowance_type.is_taxable:
                taxable_allowances += amount
            else:
                non_taxable_allowances += amount

        # Step 2: Calculate Penalties
        penalties = self.employee.penalties.filter(
            status='applied',
            is_active=True,
            date__gte=self.payroll_period.start_date,
            date__lte=self.payroll_period.end_date
        )
        for penalty in penalties:
            total_penalties += penalty.amount

        # Step 3: Calculate Non-Tax Deductions
        for deduction in (
            self.employee.deductions.filter(is_active=True)
            .filter(effective_from__lte=self.payroll_period.end_date)
            .filter(
                Q(effective_to__gte=self.payroll_period.start_date) |
                Q(effective_to__isnull=True)
            )
        ):
            recurrence = deduction.get_recurrence_count(self.payroll_period)
            deductions += deduction.get_calculated_amount() * recurrence

        # Step 4: Calculate Taxes from all EmployeeTax instances
        tax_total = Decimal('0')
        basic_salary = self.basic_salary or self.employee.salary or Decimal('0')
        taxable_gross = basic_salary + taxable_allowances
        gross_salary = basic_salary + taxable_allowances + non_taxable_allowances
        institution = self.get_institution()


        # Fetch all applicable EmployeeTax instances
        employee_taxes = EmployeeTax.objects.filter(
            employee=self.employee,
            institution_tax__institution=institution,
            institution_tax__tax_status=True,
            is_active=True,
            effective_from__lte=self.payroll_period.end_date,
            deleted_at__isnull=True
        ).filter(
            Q(effective_to__gte=self.payroll_period.start_date) | Q(effective_to__isnull=True)
        ).select_related('institution_tax')


        for employee_tax in employee_taxes:
            rule = employee_tax.rule_fit_employee_salary()
            if rule:
                from_val = Decimal(rule.salary_from) if rule.salary_from is not None else Decimal('0')
                to_val = Decimal(rule.salary_to) if rule.salary_to is not None else None

                # Map the chosen taxable income source to its value
                income_value = {
                    'taxable_gross_salary': taxable_gross,
                    'gross_salary': gross_salary,
                    'basic_salary': basic_salary,
                }.get(rule.taxable_income_source, taxable_gross)  # Default to taxable_gross


                # Verify income falls within the rule's range
                if to_val is not None:
                    if not (from_val <= income_value <= to_val):
                        continue
                else:
                    if income_value < from_val:
                        continue

                # Calculate tax for the rule
                rule_tax = Decimal('0')
                if rule.tax_rule_formula:
                    formula = rule.tax_rule_formula.strip()
                    formula = formula.replace(
                        rule.taxable_income_source or 'taxable_gross_salary', str(income_value)
                    )
                    formula = formula.replace('×', '*').replace('%', '/100').replace('UGX', '').replace(',', '')
                    print(f"Normalized formula: {formula}")

                    # Parse formula: (income - X) * Y/100 or income * Y/100
                    match = re.match(
                        r'^\s*(?:\(\s*(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*\)\s*\*\s*)?(\d+\.?\d*)\s*/\s*100\s*$',
                        formula
                    )
                    if match:
                        try:
                            income = Decimal(match.group(1) or income_value)  # Use income_value if no parentheses
                            deduction = Decimal(match.group(2) or '0')  # Default to 0 if no deduction
                            rate = Decimal(match.group(3)) / Decimal('100')
                            if income >= deduction:
                                rule_tax = (income - deduction) * rate
                            else:
                                rule_tax = Decimal('0')
                        except (ValueError, TypeError) as e:
                            rule_tax = Decimal('0')
                    else:
                        rule_tax = Decimal('0')
                elif rule.tax_rule_percentage:
                    rate = rule.tax_rule_percentage / Decimal('100')
                    rule_tax = income_value * rate
                elif rule.tax_rule_fixed_amount:
                    rate = rule.tax_rule_fixed_amount
                    rule_tax = income_value - rate

                if rule_tax > 0:
                    tax_total += rule_tax
                    tax_items.append({
                        'item_type': 'deduction',
                        'name': employee_tax.institution_tax.tax_name,
                        'amount': str(rule_tax.quantize(Decimal('0.01'))),
                        'description': f"Tax: {employee_tax.institution_tax.tax_name} | Rule: {rule.tax_rule_name}",
                        'payslip': self
                    })

        if not employee_taxes.exists():
            print(f"No active EmployeeTax found for employee {self.employee.id} in payroll period {self.payroll_period.id}. Skipping tax calculation.")

        # Step 5: Update PayslipItem objects
        self.items.filter(item_type='deduction').delete()
        for item in tax_items:
            self.items.create(
                item_type=item['item_type'],
                name=item['name'],
                amount=item['amount'],
                description=item['description']
            )
        print(f"Created {len(tax_items)} deduction items: {[{'name': item['name'], 'amount': item['amount']} for item in tax_items]}")

        # Step 6: Calculate Final Totals
        self.total_allowances = taxable_allowances + non_taxable_allowances
        self.total_deductions = deductions + tax_total
        self.total_penalties = total_penalties
        self.gross_salary = gross_salary
        self.taxable_gross_salary = taxable_gross
        self.net_salary = gross_salary - tax_total - deductions - total_penalties


        self.save()
        
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            payroll_period__start_date__range=(start_date, end_date),
            payroll_period__institution=institution,
            **filters
        ).select_related('employee', 'payroll_period')
        return list(queryset.values(
            'employee__name',
            'payroll_period__name',
            'basic_salary',
            'total_allowances',
            'total_deductions',
            'total_penalties',
            'taxable_allowances',
            'non_taxable_allowances',
            'gross_salary',
            'taxable_gross_salary',
            'net_salary',
            'days_worked',
            'is_paid',
            'paid_date'
        ))    


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
