import random
from datetime import timedelta, datetime
from django.utils import timezone
from spotcheck.models import EmployeeSpotCheck, SpotCheckStatus
from spotcheck.tasks import initiate_next_spotcheck_for_an_employee
from .models import Employee, EmployeeShift, EmployeeDay, EmployeeWorkingDays
from settings.models import SystemDay
from spotcheck.utilities import (
    get_employee_minimum_spotchecks_to_send_in_a_day,
    get_employee_maximum_spotchecks_to_send_in_a_day,
)


def get_employee_working_days_obj(employee: Employee):
    if hasattr(employee, "custom_working_days"):
        return employee.custom_working_days
    if employee.payroll_branch and hasattr(employee.payroll_branch, "working_days"):
        return employee.payroll_branch.working_days
    if employee.department.institution and hasattr(
        employee.department.institution, "working_days"
    ):
        return employee.department.institution.working_days
    raise LookupError(f"No working days found for employee {employee.id}")


def get_employee_working_days(employee: Employee):
    return get_employee_working_days_obj(employee).days.all()


def get_employee_day(employee: Employee, day: SystemDay) -> EmployeeDay:
    working_days = get_employee_working_days_obj(employee)
    try:
        return working_days.employee_days.get(day=day)
    except EmployeeDay.DoesNotExist:
        raise LookupError(
            f"No working schedule found for employee {employee.id} on {day}"
        )


def get_employee_day_working_start_time(employee: Employee, day: SystemDay) -> datetime:
    return get_employee_day(employee, day).start_time


def get_employee_day_working_end_time(employee: Employee, day: SystemDay) -> datetime:
    return get_employee_day(employee, day).end_time


# Function to create spotchecks for an employee
def create_spotchecks_for_today(employee: Employee):
    max_spotchecks = get_employee_maximum_spotchecks_to_send_in_a_day(employee)
    min_spotchecks = get_employee_minimum_spotchecks_to_send_in_a_day(employee)

    today = timezone.localdate()
    weekday_str = today.strftime("%a").upper()
    system_day = SystemDay.objects.get(day_code=weekday_str)

    work_start = get_employee_day_working_start_time(employee, system_day)
    work_end = get_employee_day_working_end_time(employee, system_day)

    # Ensure timezone-aware datetimes
    now = timezone.now()
    work_start = (
        timezone.make_aware(work_start) if timezone.is_naive(work_start) else work_start
    )
    work_end = (
        timezone.make_aware(work_end) if timezone.is_naive(work_end) else work_end
    )

    num_spotchecks = random.randint(min_spotchecks, max_spotchecks)

    # Generate random times within work window
    delta_seconds = int((work_end - work_start).total_seconds())
    scheduled_times = sorted(
        [
            work_start + timedelta(seconds=random.randint(0, delta_seconds))
            for _ in range(num_spotchecks)
        ]
    )

    status_pending, _ = SpotCheckStatus.objects.get_or_create(status_name="PENDING")
    status_missed, _ = SpotCheckStatus.objects.get_or_create(status_name="NOT_YET_IN")

    future_spotchecks = []

    for scheduled_time in scheduled_times:
        if scheduled_time <= now:
            # Missed (already past when created)
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

    # Schedule the first future spotcheck (if any exist)
    if future_spotchecks:
        initiate_next_spotcheck_for_an_employee.apply_async(
            args=[employee.id], eta=future_spotchecks[0]
        )
