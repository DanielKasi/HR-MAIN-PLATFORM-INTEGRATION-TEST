import logging
from typing import Optional
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.sites.models import Site
from django.urls import reverse
from django.http import HttpRequest
from communication.views import add_notification
from employee.models import Employee, EmployeeBirthdayTask
from settings.models import EmailProviderConfig
from calendar2.models import Event, EventOccurrence
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import date, datetime
import time
from django.core.signing import TimestampSigner
from django.contrib.admin.models import LogEntry
from django.utils.html import strip_tags
from uuid import uuid4
import socket


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_employee_welcome_email(
    self,
    domain,
    email: str,
    fullname: str,
    password: str,
    company_name: Optional[str] = None,
    site_id: Optional[int] = None,
) -> bool:
    """
    Send welcome email with login credentials to new employee.

    Args:
        email (str): Employee's email address
        fullname (str): Employee's full name
        password (str): Temporary password for initial login
        company_name (str, optional): Company name for personalization
        site_id (int, optional): Site ID to build proper URLs

    Returns:
        bool: True if email sent successfully, False otherwise

    Raises:
        Exception: Re-raises email sending exceptions after retries
    """

    try:
        # Validate inputs
        if not all([email, fullname, password]):
            raise ValueError("Email, fullname, and password are required")

        # Get site information for building URLs
        if site_id:
            try:
                site = Site.objects.get(id=site_id)
            except Site.DoesNotExist:
                site = Site.objects.get_current()
        else:
            site = Site.objects.get_current()

        # Build the full login URL

        protocol = "http" if getattr(settings, "USE_HTTPS", False) else "https"
        login_path = getattr(settings, "LOGIN_URL", "/accounts/login/")
        if not login_path.startswith("/"):
            login_path = "/" + login_path
        login_url = f"{protocol}://{domain}{login_path}"

        # Prepare email content
        company = company_name if company_name else "Company Name"

        subject = f"Welcome to {company} - Your Account Details"

        # Template context
        context = {
            "fullname": fullname,
            "email": email,
            "password": password,
            "company_name": company,
            "login_url": login_url,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "support@company.com"),
            "site_domain": domain,
            "site_name": domain,  # Will be adjusted to use name insteady of domain
        }

        # Render HTML template
        try:
            html_message = render_to_string("emails/welcome_email.html", context)
        except Exception as e:
            logging.warning(f"Failed to render HTML template: {e}")
            html_message = None

        # Render plain text fallback
        try:
            plain_message = render_to_string("emails/welcome_employee.txt", context)
        except Exception as e:
            logging.warning(f"Failed to render text template: {e}")
            plain_message = f"""
Dear {fullname},

Welcome to {company}! We're excited to have you join our team.

Your employee account has been created successfully with the following login credentials:

┌─────────────────────────────┐
│ LOGIN CREDENTIALS           │
├─────────────────────────────┤
│ Email:    {email:<15} │
│ Password: {password:<15} │
└─────────────────────────────┘

IMPORTANT SECURITY NOTICE:
🔐 Please log in and change your password immediately for security reasons
🔐 Use a strong password with at least 8 characters, including numbers and symbols
🔐 Do not share your login credentials with anyone

Next Steps:
1. Visit our login page: {login_url}
2. Log in with the credentials above
3. Change your password in your profile settings
4. Complete your profile information

If you encounter any issues or have questions, please don't hesitate to contact our support team at {context['support_email']}.

We look forward to working with you!

Best regards,
The {company} Team

---
This is an automated message. Please do not reply to this email.
            """.strip()

        # Send email with both HTML and plain text versions
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@company.com"),
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )

        logging.info(f"Welcome email sent successfully to {email}")
        return True

    except Exception as exc:
        logging.error(f"Failed to send welcome email to {email}: {exc}")
        # Retry logic for transient failures
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            raise exc


@shared_task
def send_bulk_welcome_emails(
    employee_data: list, site_id: Optional[int] = None
) -> dict:
    """
    Send welcome emails to multiple employees in batch.

    Args:
        employee_data (list): List of dicts with 'email', 'fullname', 'password' keys
        site_id (int, optional): Site ID to build proper URLs

    Returns:
        dict: Summary of results with success/failure counts
    """
    results = {"total": len(employee_data), "successful": 0, "failed": 0, "errors": []}

    for employee in employee_data:
        try:
            send_employee_welcome_email.delay(
                email=employee["email"],
                fullname=employee["fullname"],
                password=employee["password"],
                company_name=employee.get("company_name"),
                site_id=site_id,
            )
            results["successful"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(
                {"email": employee.get("email", "unknown"), "error": str(e)}
            )

    return results


# Helper function to call from views
def send_welcome_email_from_view(
    request: HttpRequest,
    email: str,
    fullname: str,
    password: str,
    company_name: Optional[str] = None,
):
    """
    Helper function to send welcome email from a Django view.
    Automatically extracts site information from the request.

    Args:
        request: Django HttpRequest object
        email: Employee's email address
        fullname: Employee's full name
        password: Temporary password
        company_name: Optional company name

    Returns:
        Celery task result
    """
    site = get_current_site(request)
    return send_employee_welcome_email.delay(
        email=email,
        fullname=fullname,
        password=password,
        company_name=company_name,
        site_id=site.id,
    )




@shared_task
def send_email_task(employee_id, email, password, config_id, is_welcome_email):
    """
    Celery task to send emails asynchronously.
    """
    employee = Employee.objects.get(id=employee_id)
    config = EmailProviderConfig.objects.get(id=config_id)

    if is_welcome_email:
        # Generate a signed token for the welcome email
        signer = TimestampSigner()
        signed_value = signer.sign(f"{employee.id}:{email}")
        system_login_url = f"{settings.BACKEND_URL.rstrip('/')}/api/employee/verify-email/?token={signed_value}"
        subject = "Welcome to Our System"
        template = "emails/welcom_email.html"
        context = {
            "employee": employee,
            "system_login_url": system_login_url,
        }
        if settings.ENVIRONMENT == "production":
            recipient_list = [email]
        else:
            print(">>>>>>>>>>>>>>>>>>>>> development environment, sending to personal email<<<<<<<<<<<<<<<<<<<<<<<")
            recipient_list = [employee.user.email]
    else:
        # Email to employee's personal email with email, password, and webmail login link
        webmail_url = config.webmail_url or config.api_url
        subject = "Your Company Email Account"
        template = "emails/email_account_created.html"
        context = {
            "employee": employee,
            "email": email,
            "password": password,
            "webmail_url": webmail_url,
        }
        recipient_list = [employee.user.email]  # Employee's personal email

    try:
        message = render_to_string(template, context)
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=message,
            fail_silently=False,
        )
    except Exception as e:
        # Log the error
        LogEntry.objects.log_action(
            user_id=employee.user.id,
            content_type_id=None,
            object_id=None,
            object_repr="Email sending failed",
            action_flag=2,  # Change
            change_message=f"Failed to send {'welcome' if is_welcome_email else 'account creation'} email: {str(e)}",
        )
        raise ValidationError(f"Failed to send email: {str(e)}")
    

@shared_task(max_retries=3, default_retry_delay=300)
def send_birthday_email(employee_id):
    """
    Celery task to send a birthday email to an employee and schedule the next year's birthday email.
    """
    try:
        employee = Employee.objects.filter(
            id=employee_id,
            is_active=True,
            deleted_at__isnull=True,
            user__isnull=False,
            user__email__isnull=False
        ).select_related('user', 'department').first()

        if not employee:
            return f"No valid employee found for ID {employee_id}"

        today = timezone.now().date()
        if (employee.date_of_birth.month != today.month or 
            employee.date_of_birth.day != today.day):
            return f"Wrong date for employee ID {employee_id}"

        # Determine salutation based on gender
        name = employee.name or employee.user.fullname
        if employee.gender == 'female':
            salutation = f"Ms {name}"
        elif employee.gender == 'male':
            salutation = f"Mr {name}"
        else:
            salutation = name  # Neutral salutation for 'other' or unspecified gender

        context = {
            'employee_name': name,
            'salutation': salutation,
            'institution_name': employee.get_institution().institution_name,
            'current_year': today.year,
        }

        html_message = render_to_string('emails/birthday_email.html', context)

        send_mail(
            subject=f"Happy Birthday, {salutation}!",
            message="Please view this email in an HTML-compatible email client.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.user.email],
            html_message=html_message,
            fail_silently=False,
        )
       

        notification_message = f"Happy Birthday, {salutation}! We celebrate you today! 🎂"
        add_notification(
            user_id=employee.user.id,
            message=notification_message,
            model_name='Employee',
            object_id=str(employee.id)
        )

        print(f"Birthday email sent to {employee.user.email} (ID: {employee_id})")

        next_birthday = employee.date_of_birth.replace(year=today.year + 1)
        next_birthday_time = datetime.combine(next_birthday, time(hour=8, minute=0))
        if timezone.is_naive(next_birthday_time):
            next_birthday_time = timezone.make_aware(next_birthday_time)

        task_id = str(uuid4())
        result = send_birthday_email.apply_async(
            args=[employee.id],
            eta=next_birthday_time,
            task_id=task_id
        )

        EmployeeBirthdayTask.objects.create(
            employee=employee,
            task_id=task_id,
            scheduled_date=next_birthday
        )

        print(f"Scheduled next birthday email for {employee.user.email} on {next_birthday}")

        return f"Birthday email sent for employee ID {employee_id}"

    except Exception as e:
        print(f"Failed to send birthday email for employee ID {employee_id}: {str(e)}")
        raise

@shared_task
def send_document_request_email_task(employee_email, employee_name, employee_gender, document_type, document_format, due_date, description, is_update=False):
    """Send document request email to employee as a Celery task"""
    if not employee_email:
        return
    
    try:
        # Get appropriate salutation based on employee gender
        gender_salutations = {
            'male': 'Mr.',
            'female': 'Ms.',
            'other': 'Mx.',
        }
        salutation = gender_salutations.get(employee_gender.lower(), 'Dear')
        employee_name = employee_name or 'Employee'
        
        context = {
            'salutation': salutation,
            'employee_name': employee_name,
            'document_type': document_type,
            'document_format': document_format,
            'due_date': due_date,
            'description': description,
            'is_update': is_update,
        }
        
        # Render HTML email
        html_message = render_to_string('emails/document_request.html', context)
        # Create plain text version
        plain_message = strip_tags(html_message)
        
        subject = f"{'Updated: ' if is_update else ''}Document Request - {document_type}"
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee_email],
            html_message=html_message,
            fail_silently=False,
        )
        print(f"Sent email to {employee_email}")
    except Exception as e:
        print(f"Failed to send email to {employee_email}: {str(e)}")