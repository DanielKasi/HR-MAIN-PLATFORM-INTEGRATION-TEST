# app/tasks.py
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from employee.models import Employee
from .models import EmployeeSpotCheck, SpotCheckStatus
from django.db import IntegrityError


@shared_task
def initiate_next_spotcheck_for_an_employee(employee: Employee):
    from spotcheck.utilities import (
        get_employee_spotchecks_expires_after_minutes,
        send_spotcheck_email,
    )

    now = timezone.now()

    print(f"initiate_next_spotcheck_for_an_employee hit at {now}")

    # Pick the next pending spotcheck for today
    status_pending, _ = SpotCheckStatus.objects.get_or_create(status_name="PENDING")
    spotcheck = (
        EmployeeSpotCheck.objects.filter(
            employee=employee,
            responded_at__isnull=True,
            spotcheck_time__gte=now,
            status=status_pending,
        )
        .order_by("spotcheck_time")
        .first()
    )

    if not spotcheck:
        return "no pending spotchecks"

    sent_status, _ = SpotCheckStatus.objects.get_or_create(status_name="SENT")
    spotcheck.status = sent_status
    spotcheck.spotcheck_time = now
    spotcheck.save()

    if not send_spotcheck_email(spotcheck):
        email_send_failed_status, _ = SpotCheckStatus.objects.get_or_create(
            status_name="EMAIL_SENDING_FAILED"
        )
        spotcheck.status = email_send_failed_status
        spotcheck.save()
        raise IntegrityError("Failed to send spotcheck email.")

    # Schedule a follow-up check for response
    employee_spotcheck_expires_after = get_employee_spotchecks_expires_after_minutes(
        employee
    )
    employee_spotcheck_expires_after_in_secs = employee_spotcheck_expires_after * 60

    check_spotcheck_response.apply_async(
        args=[spotcheck], countdown=employee_spotcheck_expires_after_in_secs
    )

    # Schedule the next spotcheck (if any left in DB)
    next_spotcheck = (
        EmployeeSpotCheck.objects.filter(
            employee_id=employee.id,
            responded_at__isnull=True,
            spotcheck_time__gt=now,
        )
        .order_by("spotcheck_time")
        .first()
    )
    if next_spotcheck:
        initiate_next_spotcheck_for_an_employee.apply_async(
            args=[employee], eta=next_spotcheck.spotcheck_time
        )

    return spotcheck.id


@shared_task
def check_spotcheck_response(spotcheck: EmployeeSpotCheck):
    if not spotcheck.responded_at:
        missed_status, _ = SpotCheckStatus.objects.get_or_create(status_name="MISSED")
        spotcheck.status = missed_status
        spotcheck.save()
        return "missed"
    return "responded"
