from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from datetime import datetime, date
from django.utils import timezone

class PayrollPeriod(models.Model):
    """
    Defines payroll periods (monthly, bi-weekly, etc.)
    """
    name = models.CharField(max_length=50)  
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()  
    period_type = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('bi_weekly', 'Bi-Weekly'),
            ('weekly', 'Weekly'),
            ('quarterly', 'Quarterly'),
        ],
        default='monthly'
    )
    is_closed = models.BooleanField(default=False)  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']
        unique_together = ['start_date', 'end_date', 'period_type']

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"

    @property
    def is_current_period(self):
        today = date.today()
        return self.start_date <= today <= self.end_date
    
class SalaryComponent(models.Model):
    """
    Different components of salary (basic, allowances, deductions, etc.)
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)  
    component_type = models.CharField(
        max_length=20,
        choices=[
            ('earning', 'Earning'),
            ('deduction', 'Deduction'),
            ('employer_contribution', 'Employer Contribution'),
        ]
    )
    calculation_type = models.CharField(
        max_length=20,
        choices=[
            ('fixed', 'Fixed Amount'),
            ('percentage', 'Percentage of Basic'),
            ('percentage_gross', 'Percentage of Gross'),
        ],
        default='fixed'
    )
    is_taxable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class EmployeeSalaryStructure(models.Model):
    """
    Individual employee's salary structure with different components
    """
    employee = models.ForeignKey(
        'employees.Employee', 
        on_delete=models.CASCADE, 
        related_name='salary_structures'
    )
    component = models.ForeignKey(SalaryComponent, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    effective_from = models.DateField(default=date.today)
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['employee', 'component', 'effective_from']

    def __str__(self):
        return f"{self.employee} - {self.component.name}"

    def calculate_amount(self, basic_salary=None, gross_salary=None):
        """Calculate the actual amount for this component"""
        if self.component.calculation_type == 'fixed':
            return self.amount
        elif self.component.calculation_type == 'percentage' and basic_salary:
            return (self.percentage / 100) * basic_salary
        elif self.component.calculation_type == 'percentage_gross' and gross_salary:
            return (self.percentage / 100) * gross_salary
        return Decimal('0.00')


class Payroll(models.Model):
    """
    Main payroll record for each employee for a specific period
    """
    employee = models.ForeignKey(
        'employees.Employee', 
        on_delete=models.CASCADE, 
        related_name='payrolls'
    )
    payroll_period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE)
    
    # Basic salary info
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Work details
    days_worked = models.IntegerField(default=0)
    days_in_month = models.IntegerField(default=30)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Leave details
    paid_leave_days = models.IntegerField(default=0)
    unpaid_leave_days = models.IntegerField(default=0)
    leave_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('calculated', 'Calculated'),
            ('approved', 'Approved'),
            ('paid', 'Paid'),
            ('cancelled', 'Cancelled'),
        ],
        default='draft'
    )
    
    # Timestamps
    calculated_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'users.CustomUser', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_payrolls'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'payroll_period']
        ordering = ['-payroll_period__start_date', 'employee__user__first_name']

    def __str__(self):
        return f"{self.employee} - {self.payroll_period.name}"

    def calculate_payroll(self):
        """Calculate the payroll for this employee"""
        # Start with basic salary
        self.basic_salary = self.employee.salary or Decimal('0.00')
        
        # Calculate pro-rated salary based on days worked
        if self.days_in_month > 0:
            daily_salary = self.basic_salary / self.days_in_month
            earned_basic = daily_salary * self.days_worked
        else:
            earned_basic = self.basic_salary
        
        # Calculate leave deduction
        if self.unpaid_leave_days > 0:
            daily_salary = self.basic_salary / self.days_in_month
            self.leave_deduction = daily_salary * self.unpaid_leave_days
        
        # Calculate overtime
        if self.overtime_hours > 0 and self.overtime_rate > 0:
            self.overtime_amount = self.overtime_hours * self.overtime_rate
        
        # Get active salary components for this employee
        earnings = Decimal('0.00')
        deductions = Decimal('0.00')
        
        active_structures = self.employee.salary_structures.filter(
            is_active=True,
            effective_from__lte=self.payroll_period.end_date
        ).filter(
            models.Q(effective_to__isnull=True) | 
            models.Q(effective_to__gte=self.payroll_period.start_date)
        )
        
        for structure in active_structures:
            amount = structure.calculate_amount(
                basic_salary=earned_basic,
                gross_salary=self.gross_salary
            )
            
            if structure.component.component_type == 'earning':
                earnings += amount
            elif structure.component.component_type == 'deduction':
                deductions += amount
        
        # Calculate totals
        self.gross_salary = earned_basic + earnings + self.overtime_amount
        self.total_deductions = deductions + self.leave_deduction
        self.net_salary = self.gross_salary - self.total_deductions
        
        self.status = 'calculated'
        self.calculated_at = timezone.now()
        self.save()
        
        # Create detailed payroll items
        self._create_payroll_items(earned_basic, active_structures)
    
    def _create_payroll_items(self, earned_basic, active_structures):
        """Create detailed payroll items"""
        # Clear existing items
        self.payroll_items.all().delete()
        
        # Add basic salary
        PayrollItem.objects.create(
            payroll=self,
            component_name='Basic Salary',
            component_type='earning',
            amount=earned_basic,
            is_taxable=True
        )
        
        # Add other components
        for structure in active_structures:
            amount = structure.calculate_amount(
                basic_salary=earned_basic,
                gross_salary=self.gross_salary
            )
            
            PayrollItem.objects.create(
                payroll=self,
                component_name=structure.component.name,
                component_type=structure.component.component_type,
                amount=amount,
                is_taxable=structure.component.is_taxable,
                salary_component=structure.component
            )
        
        # Add overtime if any
        if self.overtime_amount > 0:
            PayrollItem.objects.create(
                payroll=self,
                component_name='Overtime',
                component_type='earning',
                amount=self.overtime_amount,
                is_taxable=True
            )
        
        # Add leave deduction if any
        if self.leave_deduction > 0:
            PayrollItem.objects.create(
                payroll=self,
                component_name='Unpaid Leave Deduction',
                component_type='deduction',
                amount=self.leave_deduction,
                is_taxable=False
            )


class PayrollItem(models.Model):
    """
    Individual items in a payroll (each earning/deduction component)
    """
    payroll = models.ForeignKey(Payroll, on_delete=models.CASCADE, related_name='payroll_items')
    salary_component = models.ForeignKey(
        SalaryComponent, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    component_name = models.CharField(max_length=100)
    component_type = models.CharField(
        max_length=20,
        choices=[
            ('earning', 'Earning'),
            ('deduction', 'Deduction'),
            ('employer_contribution', 'Employer Contribution'),
        ]
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_taxable = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payroll} - {self.component_name}: {self.amount}"


class PayrollAdjustment(models.Model):
    """
    Manual adjustments to payroll (bonuses, penalties, etc.)
    """
    payroll = models.ForeignKey(Payroll, on_delete=models.CASCADE, related_name='adjustments')
    adjustment_type = models.CharField(
        max_length=20,
        choices=[
            ('bonus', 'Bonus'),
            ('penalty', 'Penalty'),
            ('reimbursement', 'Reimbursement'),
            ('advance', 'Advance Deduction'),
            ('other', 'Other'),
        ]
    )
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_taxable = models.BooleanField(default=True)
    added_by = models.ForeignKey(
        'users.CustomUser', 
        on_delete=models.SET_NULL, 
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payroll} - {self.adjustment_type}: {self.amount}"


class PayrollBatch(models.Model):
    """
    Batch processing of multiple payrolls
    """
    name = models.CharField(max_length=100)
    payroll_period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE)
    branch = models.ForeignKey(
        'institution.Branch', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    department = models.ForeignKey(
        'institution.Department', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    total_employees = models.IntegerField(default=0)
    processed_employees = models.IntegerField(default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    created_by = models.ForeignKey(
        'users.CustomUser', 
        on_delete=models.SET_NULL, 
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.payroll_period.name}"    