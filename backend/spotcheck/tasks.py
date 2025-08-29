# app/tasks.py
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from employee.models import Employee
from spotcheck.utilities import send_spotcheck_email
from .models import EmployeeSpotCheck, SpotCheckStatus

@shared_task
def trigger_spotchecks():
    print("Triggering spotchecks...")
    """
    Send spotcheck emails in batches and create EmployeeSpotCheck records.
    """
    now = timezone.now()

    # Pick a batch of employees who don't have a spotcheck today
    employees = Employee.objects.exclude(
        spot_checks__spotcheck_time__date=now.date()
    )[:settings.SPOTCHECK_BATCH_SIZE]

    status, _ = SpotCheckStatus.objects.get_or_create(status_name="SENT")

    for emp in employees:
        spotcheck = EmployeeSpotCheck.objects.create(
            employee=emp,
            spotcheck_time=now,
            status=status,
            initiated_by="system",
        )

        send_spotcheck_email(emp, now, spotcheck)




