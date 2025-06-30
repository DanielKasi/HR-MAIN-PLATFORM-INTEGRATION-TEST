from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import AllowanceType, DeductionType, PayrollPeriod, Payslip, PayslipItem
from employee.models import Employee
from institution.models import Institution

class PayrollProcessor:
    """
    Utility class to handle payroll processing operations
    """
    
    @staticmethod
    def create_monthly_period(year, month):
        """
        Create a monthly payroll period
        """
        from calendar import monthrange
        
        start_date = datetime(year, month, 1).date()
        last_day = monthrange(year, month)[1]
        end_date = datetime(year, month, last_day).date()
        
        # Set pay_date to last working day or a few days after month end
        pay_date = end_date + timedelta(days=3)
        
        period_name = f"{start_date.strftime('%B %Y')}"
        
        period, created = PayrollPeriod.objects.get_or_create(
            name=period_name,
            start_date=start_date,
            defaults={
                'end_date': end_date,
                'pay_date': pay_date,
            }
        )
        return period, created
    
    @staticmethod
    def generate_payslips_for_period(payroll_period, employee_ids=None):
        """
        Generate payslips for all active employees in a period
        """
        employees = Employee.objects.filter(is_active=True)
        if employee_ids:
            employees = employees.filter(id__in=employee_ids)
        
        created_payslips = []
        
        for employee in employees:
            payslip, created = Payslip.objects.get_or_create(
                employee=employee,
                payroll_period=payroll_period,
                defaults={
                    'basic_salary': employee.salary or 0,
                }
            )
            
            if created or not payslip.is_paid:
                # Calculate totals
                payslip.calculate_totals()
                # Generate detailed items
                PayrollProcessor.generate_payslip_items(payslip)
                created_payslips.append(payslip)
        
        return created_payslips
    
    @staticmethod
    def generate_payslip_items(payslip):
        """
        Generate detailed payslip items for allowances and deductions
        """
        # Clear existing items
        payslip.items.all().delete()
        
        items_to_create = []
        
        # Add allowances
        for allowance in payslip.employee.allowances.filter(is_active=True):
            if (allowance.effective_from <= payslip.payroll_period.end_date and 
                (not allowance.effective_to or allowance.effective_to >= payslip.payroll_period.start_date)):
                
                amount = allowance.get_calculated_amount()
                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type='allowance',
                        name=allowance.allowance_type.name,
                        amount=amount,
                        description=f"{allowance.calculation_method}: {allowance.amount if allowance.calculation_method == 'fixed' else f'{allowance.percentage}%'}"
                    )
                )
        
        # Add deductions
        for deduction in payslip.employee.deductions.filter(is_active=True):
            if (deduction.effective_from <= payslip.payroll_period.end_date and 
                (not deduction.effective_to or deduction.effective_to >= payslip.payroll_period.start_date)):
                
                amount = deduction.get_calculated_amount()
                items_to_create.append(
                    PayslipItem(
                        payslip=payslip,
                        item_type='deduction',
                        name=deduction.deduction_type.name,
                        amount=amount,
                        description=f"{deduction.calculation_method}: {deduction.amount if deduction.calculation_method == 'fixed' else f'{deduction.percentage}%'}"
                    )
                )
        
        # Add overtime if applicable
        if payslip.overtime_amount > 0:
            items_to_create.append(
                PayslipItem(
                    payslip=payslip,
                    item_type='overtime',
                    name='Overtime Pay',
                    amount=payslip.overtime_amount,
                    description=f"{payslip.overtime_hours} hours @ {payslip.overtime_rate} per hour"
                )
            )
        
        # Bulk create items
        PayslipItem.objects.bulk_create(items_to_create)
    
    @staticmethod
    def setup_default_payroll_types_for_institution(institution):
        """
        Create default allowance and deduction types for a specific institution
        """
        
        # Default allowances
        default_allowances = [
            {'name': 'Housing Allowance', 'description': 'Monthly housing allowance', 'is_taxable': True},
            {'name': 'Transport Allowance', 'description': 'Monthly transport allowance', 'is_taxable': True},
            {'name': 'Medical Allowance', 'description': 'Monthly medical allowance', 'is_taxable': False},
            {'name': 'Lunch Allowance', 'description': 'Daily lunch allowance', 'is_taxable': True},
            {'name': 'Bonus', 'description': 'Performance or annual bonus', 'is_taxable': True},
            {'name': 'Overtime Allowance', 'description': 'Overtime payment allowance', 'is_taxable': True},
            {'name': 'Communication Allowance', 'description': 'Monthly communication allowance', 'is_taxable': True},
        ]
        
        # Default deductions
        default_deductions = [
            {'name': 'Income Tax', 'description': 'Monthly income tax (PAYE)', 'is_mandatory': True},
            {'name': 'NSSF', 'description': 'National Social Security Fund contribution', 'is_mandatory': True},
            {'name': 'Health Insurance', 'description': 'Monthly health insurance premium', 'is_mandatory': False},
            {'name': 'Loan Repayment', 'description': 'Monthly loan repayment', 'is_mandatory': False},
            {'name': 'Union Dues', 'description': 'Monthly union membership fees', 'is_mandatory': False},
            {'name': 'Professional Tax', 'description': 'Professional body membership fees', 'is_mandatory': False},
            {'name': 'Advance Salary', 'description': 'Salary advance repayment', 'is_mandatory': False},
        ]
        
        created_allowances = []
        created_deductions = []
        
        # Create allowance types
        for allowance_data in default_allowances:
            allowance_type, created = AllowanceType.objects.get_or_create(
                institution=institution,
                name=allowance_data['name'],
                defaults={
                    'description': allowance_data['description'],
                    'is_taxable': allowance_data['is_taxable'],
                    'is_active': True,
                }
            )
            if created:
                created_allowances.append(allowance_type)
        
        # Create deduction types
        for deduction_data in default_deductions:
            deduction_type, created = DeductionType.objects.get_or_create(
                institution=institution,
                name=deduction_data['name'],
                defaults={
                    'description': deduction_data['description'],
                    'is_mandatory': deduction_data['is_mandatory'],
                    'is_active': True,
                }
            )
            if created:
                created_deductions.append(deduction_type)
        
        return {
            'allowances_created': len(created_allowances),
            'deductions_created': len(created_deductions),
            'allowance_types': created_allowances,
            'deduction_types': created_deductions,
        }

    @staticmethod  # Fixed: Added @staticmethod decorator
    def create_institution_with_defaults(**kwargs):
        """
        Helper function to create institution with default payroll types
        """
        institution = Institution.objects.create(**kwargs)
        setup_result = PayrollProcessor.setup_default_payroll_types_for_institution(institution)
        
        return institution, setup_result
    
    @staticmethod
    def get_employee_payroll_summary(employee, year=None):
        """
        Get annual payroll summary for an employee
        """
        if not year:
            year = timezone.now().year
        
        payslips = Payslip.objects.filter(
            employee=employee,
            payroll_period__start_date__year=year
        ).order_by('payroll_period__start_date')
        
        summary = {
            'employee': employee,
            'year': year,
            'total_gross': sum(p.gross_salary for p in payslips),
            'total_net': sum(p.net_salary for p in payslips),
            'total_allowances': sum(p.total_allowances for p in payslips),
            'total_deductions': sum(p.total_deductions for p in payslips),
            'payslips_count': payslips.count(),
            'payslips': payslips
        }
        
        return summary


# Utility functions that can be used in management commands or views
def create_current_month_period():
    """Create payroll period for current month"""
    now = timezone.now()
    return PayrollProcessor.create_monthly_period(now.year, now.month)


def process_monthly_payroll(year=None, month=None, employee_ids=None):
    """
    Complete monthly payroll processing
    """
    if not year or not month:
        now = timezone.now()
        year = year or now.year
        month = month or now.month
    
    # Create period
    period, created = PayrollProcessor.create_monthly_period(year, month)
    
    # Generate payslips
    payslips = PayrollProcessor.generate_payslips_for_period(period, employee_ids)
    
    return {
        'period': period,
        'period_created': created,
        'payslips_generated': len(payslips),
        'payslips': payslips
    }