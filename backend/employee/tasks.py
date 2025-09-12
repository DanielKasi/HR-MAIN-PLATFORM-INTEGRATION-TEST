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

    print(f"\n\n\n\n{domain}\n\n\n\n")
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
