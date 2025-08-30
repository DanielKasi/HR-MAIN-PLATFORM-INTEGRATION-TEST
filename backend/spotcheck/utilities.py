from django.conf import settings
from django.core.mail import send_mail
from employee.models import Employee
from .models import EmployeeSpotCheck


def send_spotcheck_email(spotcheck: EmployeeSpotCheck):
    try:
        send_mail(
            subject="Spot Check",
            message=f"Please confirm your spotcheck by clicking the link: {settings.FRONTEND_URL}spotcheck/?intent=spotcheck&id={spotcheck.id}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[spotcheck.employee.user.email],
            fail_silently=False,
        )
    except Exception as e:
        # delete the spotcheck if email fails
        print(f"Failed to send email to {spotcheck.employee.user.email}: {e}")
        spotcheck.delete()
