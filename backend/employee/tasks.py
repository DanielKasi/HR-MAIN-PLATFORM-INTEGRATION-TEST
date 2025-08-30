from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def send_employee_welcome_email(email, fullname, password):

    print(f"Sending welcome email to {email}")
    """Send welcome email with login credentials."""
    subject = "Your Account Details - Welcome!"
    message = f"""
    Hello {fullname},

    Your employee account has been created successfully.

    Login Details:
    Email: {email}
    Password: {password}

    Please log in using these credentials and change your password immediately for security reasons.

    If you have any questions, contact your system administrator.

    Best regards,
    The System Team
    """
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
