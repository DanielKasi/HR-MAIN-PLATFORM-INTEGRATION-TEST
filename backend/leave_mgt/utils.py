from datetime import datetime, timedelta, date
from django.utils import timezone
from django.db.models import Sum, Q
from employee.models import Employee
from .models import LeaveBalance, LeaveType, LeaveApplication, LeavePolicy
from decimal import Decimal
import calendar


class LeaveCalculator:
    """Utility class for leave calculations"""
    
    @staticmethod
    def calculate_leave_days(start_date, end_date, duration_type='full_day'):
        """Calculate total leave days based on duration type"""
        if start_date > end_date:
            return Decimal('0')
        
        total_days = (end_date - start_date).days + 1
        
        if duration_type == 'full_day':
            return Decimal(str(total_days))
        elif duration_type in ['half_day_morning', 'half_day_afternoon']:
            return Decimal('0.5') if total_days == 1 else Decimal(str(total_days))
        else:  # hourly - would need additional logic
            return Decimal(str(total_days))
    
    @staticmethod
    def get_working_days(start_date, end_date, exclude_weekends=True, exclude_holidays=None):
        """Calculate working days between two dates"""
        if start_date > end_date:
            return 0
        
        if not exclude_weekends and not exclude_holidays:
            return (end_date - start_date).days + 1
        
        working_days = 0
        current_date = start_date
        holidays = exclude_holidays or []
        
        while current_date <= end_date:
            is_working_day = True
            
            # Check if it's a weekend
            if exclude_weekends and current_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                is_working_day = False
            
            # Check if it's a holiday
            if current_date in holidays:
                is_working_day = False
            
            if is_working_day:
                working_days += 1
                
            current_date += timedelta(days=1)
        
        return working_days
    
    @staticmethod
    def check_leave_eligibility(employee, leave_type, start_date, total_days):
        """Check if employee is eligible for leave"""
        current_year = start_date.year
        
        try:
            balance = LeaveBalance.objects.get(
                employee=employee,
                leave_type=leave_type,
                year=current_year
            )
            
            if balance.available_days >= total_days:
                return True, "Eligible for leave"
            else:
                return False, f"Insufficient balance. Available: {balance.available_days}, Requested: {total_days}"
        
        except LeaveBalance.DoesNotExist:
            return False, "No leave balance found for this year"
    
    @staticmethod
    def check_overlapping_leaves(employee, start_date, end_date, exclude_application_id=None):
        """Check if there are overlapping leave applications"""
        overlapping_query = Q(
            employee=employee,
            status__in=['pending', 'approved']
        ) & (
            Q(start_date__lte=end_date, end_date__gte=start_date)
        )
        
        if exclude_application_id:
            overlapping_query &= ~Q(id=exclude_application_id)
        
        overlapping_leaves = LeaveApplication.objects.filter(overlapping_query)
        
        if overlapping_leaves.exists():
            return True, "Overlapping leave applications found", overlapping_leaves
        
        return False, "No overlapping leaves", []
    
    @staticmethod
    def calculate_leave_entitlement(employee, leave_type, year=None):
        """Calculate leave entitlement based on employment duration"""
        if year is None:
            year = timezone.now().year
        
        # Basic entitlement from leave type
        base_entitlement = leave_type.max_days_per_year
        
        # If employee has hire_date, calculate pro-rated entitlement for first year
        if hasattr(employee, 'hire_date') and employee.hire_date:
            hire_year = employee.hire_date.year
            
            if year == hire_year:
                # Pro-rate based on months worked
                start_of_year = date(year, 1, 1)
                end_of_year = date(year, 12, 31)
                
                # Use hire date or start of year, whichever is later
                effective_start = max(employee.hire_date, start_of_year)
                
                months_worked = (end_of_year - effective_start).days / 30.44
                pro_rated_entitlement = (base_entitlement * months_worked) / 12
                
                return Decimal(str(round(pro_rated_entitlement, 2)))
        
        return Decimal(str(base_entitlement))


class LeaveBalanceManager:
    """Manage leave balances for employees"""
    
    @staticmethod
    def initialize_yearly_balances(institution_id, year=None):
        """Initialize leave balances for all employees in an institution for a given year"""
        if year is None:
            year = timezone.now().year

        from institution.models import Institution
        
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            raise ValueError(f"Institution with id {institution_id} does not exist")

        employees = Employee.objects.filter(is_active=True, institution=institution)
        leave_types = LeaveType.objects.filter(is_active=True, institution=institution)

        created_count = 0
        updated_count = 0
        
        for employee in employees:
            for leave_type in leave_types:
                # Skip gender-specific leaves if not applicable
                if leave_type.gender_specific != 'all':
                    if hasattr(employee, 'gender') and employee.gender != leave_type.gender_specific:
                        continue

                # Calculate entitlement
                entitlement = LeaveCalculator.calculate_leave_entitlement(employee, leave_type, year)

                balance, created = LeaveBalance.objects.get_or_create(
                    institution=institution,
                    employee=employee,
                    leave_type=leave_type,
                    year=year,
                    defaults={
                        'allocated_days': entitlement,
                        'used_days': Decimal('0'),
                        'pending_days': Decimal('0'),
                        'carried_forward_days': Decimal('0'),
                    }
                )

                if created:
                    created_count += 1
                elif balance.allocated_days != entitlement:
                    balance.allocated_days = entitlement
                    balance.save()
                    updated_count += 1

        return {
            'created_count': created_count,
            'updated_count': updated_count,
            'total_processed': created_count + updated_count
        }

    @staticmethod
    def update_balance_on_approval(leave_application):
        """Update leave balance when application is approved"""
        try:
            balance = LeaveBalance.objects.get(
                institution=leave_application.employee.institution,
                employee=leave_application.employee,
                leave_type=leave_application.leave_type,
                year=leave_application.start_date.year
            )
            
            # Move from pending to used
            balance.pending_days -= leave_application.total_days
            balance.used_days += leave_application.total_days
            balance.save()
            
            return True
            
        except LeaveBalance.DoesNotExist:
            return False
    
    @staticmethod
    def update_balance_on_rejection(leave_application):
        """Update leave balance when application is rejected"""
        try:
            balance = LeaveBalance.objects.get(
                institution=leave_application.employee.institution,
                employee=leave_application.employee,
                leave_type=leave_application.leave_type,
                year=leave_application.start_date.year
            )
            
            # Remove from pending
            balance.pending_days -= leave_application.total_days
            balance.save()
            
            return True
            
        except LeaveBalance.DoesNotExist:
            return False
    
    @staticmethod
    def update_balance_on_cancellation(leave_application):
        """Update leave balance when approved application is cancelled"""
        try:
            balance = LeaveBalance.objects.get(
                institution=leave_application.employee.institution,
                employee=leave_application.employee,
                leave_type=leave_application.leave_type,
                year=leave_application.start_date.year
            )
            
            if leave_application.status == 'approved':
                # Move from used back to available
                balance.used_days -= leave_application.total_days
            elif leave_application.status == 'pending':
                # Remove from pending
                balance.pending_days -= leave_application.total_days
            
            balance.save()
            return True
            
        except LeaveBalance.DoesNotExist:
            return False

    @staticmethod
    def carry_forward_leaves(institution_id, from_year, to_year):
        """Carry forward unused leaves for a specific institution"""
        from institution.models import Institution
        
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            raise ValueError(f"Institution with id {institution_id} does not exist")

        balances = LeaveBalance.objects.filter(
            institution=institution,
            year=from_year
        ).select_related('leave_type', 'employee')

        carried_forward_count = 0

        for balance in balances:
            if balance.leave_type.carry_forward_allowed:
                unused_days = balance.allocated_days + balance.carried_forward_days - balance.used_days
                carry_forward_days = min(
                    unused_days,
                    Decimal(str(balance.leave_type.max_carry_forward_days))
                )

                if carry_forward_days > 0:
                    new_entitlement = LeaveCalculator.calculate_leave_entitlement(
                        balance.employee, balance.leave_type, to_year
                    )

                    next_year_balance, created = LeaveBalance.objects.get_or_create(
                        institution=institution,
                        employee=balance.employee,
                        leave_type=balance.leave_type,
                        year=to_year,
                        defaults={
                            'allocated_days': new_entitlement,
                            'carried_forward_days': carry_forward_days,
                            'used_days': Decimal('0'),
                            'pending_days': Decimal('0'),
                        }
                    )

                    if not created:
                        next_year_balance.carried_forward_days = carry_forward_days
                        next_year_balance.save()

                    carried_forward_count += 1

        return carried_forward_count

    @staticmethod
    def get_employee_balance_summary(employee, year=None):
        """Get comprehensive balance summary for an employee"""
        if year is None:
            year = timezone.now().year
        
        balances = LeaveBalance.objects.filter(
            employee=employee,
            year=year
        ).select_related('leave_type')
        
        summary = {}
        total_allocated = Decimal('0')
        total_used = Decimal('0')
        total_pending = Decimal('0')
        total_available = Decimal('0')
        
        for balance in balances:
            leave_type_name = balance.leave_type.name
            summary[leave_type_name] = {
                'allocated': balance.allocated_days,
                'used': balance.used_days,
                'pending': balance.pending_days,
                'carried_forward': balance.carried_forward_days,
                'available': balance.available_days,
            }
            
            total_allocated += balance.allocated_days
            total_used += balance.used_days
            total_pending += balance.pending_days
            total_available += balance.available_days
        
        summary['totals'] = {
            'allocated': total_allocated,
            'used': total_used,
            'pending': total_pending,
            'available': total_available,
        }
        
        return summary

    @staticmethod
    def update_balance_on_application(leave_application):
        """Update leave balance when application is submitted (pending status)"""
        try:
            balance = LeaveBalance.objects.get(
                institution=leave_application.employee.institution,
                employee=leave_application.employee,
                leave_type=leave_application.leave_type,
                year=leave_application.start_date.year
            )
            
            # Check if sufficient balance is available
            if balance.available_days >= leave_application.total_days:
                balance.pending_days += leave_application.total_days
                balance.save()
                return True
            else:
                return False
            
        except LeaveBalance.DoesNotExist:
            return False

    @staticmethod
    def get_institution_balance_summary(institution_id, year=None):
        """Get balance summary for all employees in an institution"""
        if year is None:
            year = timezone.now().year
        
        from institution.models import Institution
        
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            raise ValueError(f"Institution with id {institution_id} does not exist")

        balances = LeaveBalance.objects.filter(
            institution=institution,
            year=year
        ).select_related('leave_type', 'employee')
        
        summary = {}
        
        for balance in balances:
            leave_type_name = balance.leave_type.name
            if leave_type_name not in summary:
                summary[leave_type_name] = {
                    'total_allocated': Decimal('0'),
                    'total_used': Decimal('0'),
                    'total_pending': Decimal('0'),
                    'total_available': Decimal('0'),
                    'employee_count': 0
                }
            
            summary[leave_type_name]['total_allocated'] += balance.allocated_days
            summary[leave_type_name]['total_used'] += balance.used_days
            summary[leave_type_name]['total_pending'] += balance.pending_days
            summary[leave_type_name]['total_available'] += balance.available_days
            summary[leave_type_name]['employee_count'] += 1
        
        return summary


class LeaveReportGenerator:
    """Generate various leave reports"""
    
    @staticmethod
    def department_leave_report(department=None, year=None):
        """Generate leave report for a department"""
        if year is None:
            year = timezone.now().year
        
        employees_query = Employee.objects.filter(is_active=True)
        if department:
            employees_query = employees_query.filter(department=department)
        
        report_data = []
        for employee in employees_query:
            summary = LeaveBalanceManager.get_employee_balance_summary(employee, year)
            report_data.append({
                'employee': employee,
                'summary': summary
            })
        
        return report_data
    
    @staticmethod
    def leave_type_utilization_report(institution_id, year=None):
        """Generate utilization report by leave type for an institution"""
        if year is None:
            year = timezone.now().year
        
        from institution.models import Institution
        
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            raise ValueError(f"Institution with id {institution_id} does not exist")
        
        leave_types = LeaveType.objects.filter(is_active=True, institution=institution)
        report_data = []
        
        for leave_type in leave_types:
            balances = LeaveBalance.objects.filter(
                institution=institution,
                leave_type=leave_type,
                year=year
            )
            
            total_allocated = balances.aggregate(Sum('allocated_days'))['allocated_days__sum'] or 0
            total_used = balances.aggregate(Sum('used_days'))['used_days__sum'] or 0
            total_pending = balances.aggregate(Sum('pending_days'))['pending_days__sum'] or 0
            
            utilization_rate = (total_used / total_allocated * 100) if total_allocated > 0 else 0
            
            report_data.append({
                'leave_type': leave_type.name,
                'total_allocated': total_allocated,
                'total_used': total_used,
                'total_pending': total_pending,
                'utilization_rate': round(utilization_rate, 2)
            })
        
        return report_data
    
    @staticmethod
    def upcoming_leaves_report(institution_id=None, days_ahead=30):
        """Generate report of upcoming approved leaves"""
        start_date = timezone.now().date()
        end_date = start_date + timedelta(days=days_ahead)
        
        upcoming_leaves = LeaveApplication.objects.filter(
            status='approved',
            start_date__gte=start_date,
            start_date__lte=end_date
        ).select_related('employee', 'leave_type').order_by('start_date')
        
        if institution_id:
            upcoming_leaves = upcoming_leaves.filter(employee__institution_id=institution_id)
        
        return upcoming_leaves

    @staticmethod
    def employee_leave_history_report(employee, year=None):
        """Generate leave history report for a specific employee"""
        if year is None:
            year = timezone.now().year
        
        applications = LeaveApplication.objects.filter(
            employee=employee,
            start_date__year=year
        ).select_related('leave_type').order_by('-start_date')
        
        balance_summary = LeaveBalanceManager.get_employee_balance_summary(employee, year)
        
        return {
            'employee': employee,
            'year': year,
            'applications': applications,
            'balance_summary': balance_summary
        }
class LeaveNotificationManager:
    """Manage leave-related notifications"""
    
    @staticmethod
    def get_pending_approvals(manager_user=None):
        """Get pending leave applications for approval"""
        query = LeaveApplication.objects.filter(status='pending')
        
        if manager_user:
            # Filter by applications that this manager should approve
            # This would depend on your organizational structure
            pass
        
        return query.select_related('employee', 'leave_type').order_by('created_at')
    
    @staticmethod
    def get_balance_warnings(threshold_percentage=20):
        """Get employees with low leave balances"""
        current_year = timezone.now().year
        warnings = []
        
        balances = LeaveBalance.objects.filter(
            year=current_year,
            leave_type__category='annual'  # Focus on annual leave
        ).select_related('employee', 'leave_type')
        
        for balance in balances:
            if balance.allocated_days > 0:
                usage_percentage = (balance.used_days / balance.allocated_days) * 100
                if usage_percentage >= (100 - threshold_percentage):
                    warnings.append({
                        'employee': balance.employee,
                        'leave_type': balance.leave_type,
                        'remaining_days': balance.available_days,
                        'usage_percentage': round(usage_percentage, 2)
                    })
        
        return warnings