# app/tasks.py
from celery import shared_task
from django.utils import timezone
from employee.models import Employee, EmployeeLogs
from payroll.models import EmployeePenalty
from .models import EmployeeSpotCheck, SpotCheckStatus
from django.db import IntegrityError
from datetime import datetime, timedelta


@shared_task
def initiate_next_spotcheck_for_an_employee(employee_id):

    from spotcheck.utilities import (
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
        EmployeePenalty.create_from_spotcheck(spotcheck, "no_response_spotcheck")
        return "missed"
    return "responded"


@shared_task
def initiate_spotcheck_responses_from_attendance_records(
    attendance_records: list[EmployeeLogs],
):
    from spotcheck.utilities import get_employee_spotchecks_expires_after_minutes

    valid_status, _ = SpotCheckStatus.objects.get_or_create(
        status_name="CHECKED_IN"
    )  # TODO: Have a resusable function for this

    for log in attendance_records:
        employee = log.employee
        log_datetime = timezone.make_aware(datetime.combine(log.date, log.time))

        spot_checks = EmployeeSpotCheck.objects.filter(
            employee=employee,
            responded_at__isnull=True,
        )

        for spot_check in spot_checks:
            expires_after_minutes = get_employee_spotchecks_expires_after_minutes(
                employee
            )
            spot_check_start = spot_check.spotcheck_time
            spot_check_end = spot_check.spotcheck_time + timedelta(
                minutes=expires_after_minutes
            )

            if (
                spot_check_start <= log_datetime <= spot_check_end
                and not spot_check.responded_at
            ):
                # Update spot check as responded / checked in
                spot_check.responded_at = log_datetime
                spot_check.status = valid_status
                spot_check.notes = (
                    f"Automatically marked checked in from log {log.record_reference}"
                )
                spot_check.save()

                # Cancel any penalties associated with this spotcheck
                penalties = EmployeePenalty.objects.filter(
                    employee=employee, spot_check=spot_check, status="applied"
                )
                for penalty in penalties:
                    penalty.status = "system_cancelled"
                    penalty.notes = (
                        (penalty.notes or "")
                        + f" | Cancelled because employee was on time according to log {log.record_reference}"
                    )
                    penalty.save()
