import logging
from typing import Optional
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string




@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_employee_welcome_email(
    self, 
    email: str, 
    fullname: str, 
    password: str,
    company_name: Optional[str] = None
) -> bool:
    """
    Send welcome email with login credentials to new employee.
    
    Args:
        email (str): Employee's email address
        fullname (str): Employee's full name
        password (str): Temporary password for initial login
        company_name (str, optional): Company name for personalization
    
    Returns:
        bool: True if email sent successfully, False otherwise
    
    Raises:
        Exception: Re-raises email sending exceptions after retries
    """
    
    try:
        
        # Validate inputs
        if not all([email, fullname, password]):
            raise ValueError("Email, fullname, and password are required")
        
        # Prepare email content
        company = company_name or getattr(settings, 'COMPANY_NAME', 'Our Company')
        
        subject = f"Welcome to {company} - Your Account Details"
        
        # Use template if available, fallback to string formatting
        try:
            message = render_to_string('emails/welcome_employee.txt', {
                'fullname': fullname,
                'email': email,
                'password': password,
                'company_name': company,
                'login_url': getattr(settings, 'LOGIN_URL', '/login/'),
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@company.com')
            })
        except Exception:
            message = f"""
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
1. Visit our login page: {getattr(settings, 'LOGIN_URL', '/login/')}
2. Log in with the credentials above
3. Change your password in your profile settings
4. Complete your profile information

If you encounter any issues or have questions, please don't hesitate to contact our support team at {getattr(settings, 'SUPPORT_EMAIL', 'support@company.com')}.

We look forward to working with you!

Best regards,
The {company} Team

---
This is an automated message. Please do not reply to this email.
            """.strip()
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@company.com'),
            recipient_list=[email],
            fail_silently=False,
        )
        
        return True
        
    except Exception as exc:
        
        # Retry logic for transient failures
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:

            raise exc


@shared_task
def send_bulk_welcome_emails(employee_data: list) -> dict:
    """
    Send welcome emails to multiple employees in batch.
    
    Args:
        employee_data (list): List of dicts with 'email', 'fullname', 'password' keys
    
    Returns:
        dict: Summary of results with success/failure counts
    """
    results = {
        'total': len(employee_data),
        'successful': 0,
        'failed': 0,
        'errors': []
    }
    
    
    for employee in employee_data:
        try:
            send_employee_welcome_email.delay(
                email=employee['email'],
                fullname=employee['fullname'],
                password=employee['password'],
                company_name=employee.get('company_name')
            )
            results['successful'] += 1
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({
                'email': employee.get('email', 'unknown'),
                'error': str(e)
            })

    return results