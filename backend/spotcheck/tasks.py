# app/tasks.py
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from employee.models import Employee
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

    for emp in employees:
        try:
            send_mail(
                subject="Spot Check",
                message=f"Please confirm your spotcheck at {now}.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[emp.user.email],
                fail_silently=False,
            )

            # Store spotcheck record
            EmployeeSpotCheck.objects.create(
                employee=emp,
                spotcheck_time=now,
                status=SpotCheckStatus.objects.get(name="Pending"),
                initiated_by="system",
            )
        except Exception as e:
            # log error (e.g. Sentry / logger)
            print(f"Failed to send to {emp}: {e}")
