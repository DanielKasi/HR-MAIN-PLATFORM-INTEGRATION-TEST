import random
from datetime import timedelta, datetime, time
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from employee.utilities import (
    get_employee_day_working_end_time,
    get_employee_day_working_start_time,
)

from employee.models import Employee
from settings.models import SystemDay
from spotcheck.tasks import initiate_next_spotcheck_for_an_employee
from .models import (
    EmployeeSpotCheck,
    EmployeeSpotCheckSetting,
    BranchSpotCheckSetting,
    InstitutionSpotCheckSetting,
    SpotCheckStatus,
)


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
    try:
        return employee.employeespotchecksetting.expires_after_minutes
    except EmployeeSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.payroll_branch.branchspotchecksetting.expires_after_minutes
    except BranchSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.department.institution.expires_after_minutes
    except InstitutionSpotCheckSetting.DoesNotExist:
        pass

    if hasattr(settings, "SPOTCHECK_DEFAULT_MINUTES_TO_EXPIRE"):
        return settings.SPOTCHECK_DEFAULT_MINUTES_TO_EXPIRE

    raise ValueError("No expiration threshold found for employee")


def get_employee_minimum_spotchecks_to_send_in_a_day(employee: Employee) -> int:
    try:
        return employee.employeespotchecksetting.lower_threshold
    except EmployeeSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.payroll_branch.branchspotchecksetting.lower_threshold
    except BranchSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.department.institution.lower_threshold
    except InstitutionSpotCheckSetting.DoesNotExist:
        pass

    if hasattr(settings, "SPOTCHECK_DEFAULT_LOWER_THRESHOLD"):
        return settings.SPOTCHECK_DEFAULT_LOWER_THRESHOLD

    raise ValueError("No minimum spotcheck threshold found for employee")


def get_employee_maximum_spotchecks_to_send_in_a_day(employee: Employee) -> int:
    try:
        return employee.employeespotchecksetting.upper_threshold
    except EmployeeSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.payroll_branch.branchspotchecksetting.upper_threshold
    except BranchSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.department.institution.institutionspotchecksetting.upper_threshold
    except InstitutionSpotCheckSetting.DoesNotExist:
        pass

    if hasattr(settings, "SPOTCHECK_DEFAULT_UPPER_THRESHOLD"):
        return settings.SPOTCHECK_DEFAULT_UPPER_THRESHOLD

    raise ValueError("No maximum spotcheck threshold found for employee")


def get_employee_spotchecks_late_starts_after_minutes(employee: Employee) -> int:
    try:
        return employee.employeespotchecksetting.late_starts_after_minutes
    except EmployeeSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.payroll_branch.branchspotchecksetting.late_starts_after_minutes
    except BranchSpotCheckSetting.DoesNotExist:
        pass

    try:
        return employee.department.institution.late_starts_after_minutes
    except InstitutionSpotCheckSetting.DoesNotExist:
        pass

    if hasattr(settings, "SPOTCHECK_DEFAULT_LATE_STARTS_AFTER_MINUTES"):
        return settings.SPOTCHECK_DEFAULT_LATE_STARTS_AFTER_MINUTES

    raise ValueError("No late start threshold found for employee")


def create_spotchecks_for_today(employee: Employee):
    max_spotchecks = get_employee_maximum_spotchecks_to_send_in_a_day(employee)
    min_spotchecks = get_employee_minimum_spotchecks_to_send_in_a_day(employee)

    today = timezone.localdate()
    weekday_str = today.strftime("%a").upper()
    system_day = SystemDay.objects.get(day_code=weekday_str)

    work_start_time: time = get_employee_day_working_start_time(employee, system_day)
    work_end_time: time = get_employee_day_working_end_time(employee, system_day)

    work_start = datetime.combine(today, work_start_time)
    work_end = datetime.combine(today, work_end_time)

    if timezone.is_naive(work_start):
        work_start = timezone.make_aware(work_start)
    if timezone.is_naive(work_end):
        work_end = timezone.make_aware(work_end)

    now = timezone.now()
    num_spotchecks = random.randint(min_spotchecks, max_spotchecks)

    delta_seconds = int((work_end - work_start).total_seconds())
    scheduled_times = sorted(
        [
            work_start + timedelta(seconds=random.randint(0, delta_seconds))
            for _ in range(num_spotchecks)
        ]
    )

    status_pending, _ = SpotCheckStatus.objects.get_or_create(status_name="PENDING")
    status_missed, _ = SpotCheckStatus.objects.get_or_create(status_name="HAD_NOT_YET_CHECKED_IN")

    future_spotchecks = []

    for scheduled_time in scheduled_times:
        if scheduled_time <= now:
            status = status_missed
        else:
            status = status_pending
            future_spotchecks.append(scheduled_time)

        EmployeeSpotCheck.objects.create(
            employee=employee,
            spotcheck_time=scheduled_time,
            status=status,
            initiated_by="system",
        )

    if future_spotchecks:
        initiate_next_spotcheck_for_an_employee.apply_async(
            args=[employee], eta=future_spotchecks[0]
        )
