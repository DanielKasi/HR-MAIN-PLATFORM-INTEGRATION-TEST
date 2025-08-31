from django.conf import settings
from django.core.mail import send_mail
from employee.models import Employee
from .models import EmployeeSpotCheck, EmployeeSpotCheckSetting, BranchSpotCheckSetting, InstitutionSpotCheckSetting


def send_spotcheck_email(spotcheck: EmployeeSpotCheck) -> bool:
    try:
        send_mail(
            subject="Spot Check",
            message=f"Please confirm your spotcheck by clicking the link: {settings.FRONTEND_URL}spotcheck/?intent=spotcheck&id={spotcheck.id}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[spotcheck.employee.user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        # delete the spotcheck if email fails
        print(f"Failed to send email to {spotcheck.employee.user.email}: {e}")
        return False


def get_employee_spotchecks_expires_after_minutes(employee: Employee) -> int:
    minutes_from_employee = None
    try:
        minutes_from_employee = employee.employeespotchecksetting.expires_after_minutes
    except EmployeeSpotCheckSetting.DoesNotExist:
        try:
            minutes_from_employee = employee.payroll_branch.branchspotchecksetting.expires_after_minutes
        except BranchSpotCheckSetting.DoesNotExist:
            try:
                minutes_from_employee = employee.department.institution.expires_after_minutes
            except InstitutionSpotCheckSetting:
                minutes_from_employee = settings.SPOTCHECK_DEFAULT_MINUTES_TO_EXPIRE

    
    return minutes_from_employee


def get_employee_spotchecks_lower_threshold(employee: Employee) -> int:
    minutes_lower_threshold = None
    try:
        minutes_lower_threshold = employee.employeespotchecksetting.lower_threshold
    except EmployeeSpotCheckSetting.DoesNotExist:
        try:
            minutes_lower_threshold = employee.payroll_branch.branchspotchecksetting.lower_threshold
        except BranchSpotCheckSetting.DoesNotExist:
            try:
                minutes_lower_threshold = employee.department.institution.lower_threshold
            except InstitutionSpotCheckSetting:
                minutes_lower_threshold = settings.SPOTCHECK_DEFAULT_LOWER_THRESHOLD

    
    return minutes_lower_threshold


def get_employee_spotchecks_upper_threshold(employee: Employee) -> int:
    minutes_upper_threshold = None
    try:
        minutes_upper_threshold = employee.employeespotchecksetting.upper_threshold
    except EmployeeSpotCheckSetting.DoesNotExist:
        try:
            minutes_upper_threshold = employee.payroll_branch.branchspotchecksetting.upper_threshold
        except BranchSpotCheckSetting.DoesNotExist:
            try:
                minutes_upper_threshold = employee.department.institution.upper_threshold
            except InstitutionSpotCheckSetting:
                minutes_upper_threshold = settings.SPOTCHECK_DEFAULT_UPPER_THRESHOLD

    
    return minutes_upper_threshold


def get_employee_spotchecks_late_starts_after_minutes(employee: Employee) -> int:
    late_starts_after_minutes = None
    try:
        late_starts_after_minutes = employee.employeespotchecksetting.late_starts_after_minutes
    except EmployeeSpotCheckSetting.DoesNotExist:
        try:
            late_starts_after_minutes = employee.payroll_branch.branchspotchecksetting.late_starts_after_minutes
        except BranchSpotCheckSetting.DoesNotExist:
            try:
                late_starts_after_minutes = employee.department.institution.late_starts_after_minutes
            except InstitutionSpotCheckSetting:
                late_starts_after_minutes = settings.SPOTCHECK_DEFAULT_LATE_STARTS_AFTER_MINUTES

    
    return late_starts_after_minutes


