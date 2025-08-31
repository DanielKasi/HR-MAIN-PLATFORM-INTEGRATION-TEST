import random
from datetime import timedelta, datetime
from django.utils import timezone
from spotcheck.models import EmployeeSpotCheck, SpotCheckStatus
from spotcheck.tasks import initiate_next_spotcheck_for_an_employee
from .models import Employee, EmployeeShift, EmployeeDay, EmployeeWorkingDays
from settings.models import SystemDay
from spotcheck.utilities import get_employee_spotchecks_lower_threshold, get_employee_spotchecks_upper_threshold


def get_employee_day_working_start_time(employee: Employee, day: SystemDay) -> datetime:
    try:
        employee_working_days_instance = employee.custom_working_days
    except EmployeeWorkingDays.DoesNotExist:
        pass

def create_spotchecks_for_day(employee: Employee):
    minutes_upper_threshold: int = get_employee_spotchecks_upper_threshold(employee)
    minutes_lower_threshold: int = get_employee_spotchecks_lower_threshold(employee)
    now = timezone.now()
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0)

    intervals = [(end_of_day - now).total_seconds() / count for _ in range(count)]
    scheduled_times = []
    for i in range(count):
        offset = sum(intervals[: i + 1]) + random.randint(-600, 600)  # jitter
        scheduled_times.append(now + timedelta(seconds=offset))

    # Create DB rows
    status, _ = SpotCheckStatus.objects.get_or_create(status_name="PENDING")
    for scheduled_time in scheduled_times:
        EmployeeSpotCheck.objects.create(
            employee=employee,
            spotcheck_time=scheduled_time,
            status=status,
            initiated_by="system",
        )

    initiate_next_spotcheck_for_an_employee.apply_async(args=[employee.id], eta=scheduled_times[0])
