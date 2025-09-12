# app/tasks.py
from celery import shared_task
from django.utils import timezone
from employee.models import Employee
from payroll.models import EmployeePenalty
from .models import EmployeeSpotCheck, SpotCheckStatus
from django.db import IntegrityError


@shared_task
def initiate_next_spotcheck_for_an_employee(employee_id):

    from spotcheck.utilities import (
        get_employee_spotchecks_expires_after_minutes,
        send_spotcheck_email,
    )


    employee = Employee.objects.get(id=employee_id)
    now = timezone.now()
    status_pending, _ = SpotCheckStatus.objects.get_or_create(status_name="PENDING")

    # make sure not to send un sent spotchecks of previous days
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
        return f"no pending spotchecks for employee: {employee_id}"

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
            args=[employee.id], eta=next_spotcheck.spotcheck_time
        )

    return spotcheck.id


@shared_task
def check_spotcheck_response(spotcheck_id):
    
    spotcheck = EmployeeSpotCheck.objects.get(id=spotcheck_id)

    if not spotcheck.responded_at:
        missed_status, _ = SpotCheckStatus.objects.get_or_create(status_name="MISSED")
        spotcheck.status = missed_status
        spotcheck.save()
        EmployeePenalty.create_from_spotcheck(spotcheck, 'no_response_spotcheck')
        return "missed"
    return "responded"
