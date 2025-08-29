# tasks.py - Celery tasks for employee password emails

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_employee_password_email(self, user_id, password, employee_name, employee_email):
    """
    Send password email to employee asynchronously
    """
    try:
        # Validate user exists
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User with ID {user_id} does not exist")
            return {"success": False, "error": "User not found"}
        
        # Get institution name if available
        institution_name = "the System"
        try:
            if hasattr(user, 'employees') and user.employees.exists():
                employee = user.employees.first()
                if (hasattr(employee, 'department') and 
                    employee.department and 
                    hasattr(employee.department, 'institution')):
                    institution_name = employee.department.institution.name
        except Exception as e:
            logger.warning(f"Could not get institution name for user {user_id}: {e}")
        
        subject = f"Your Account Password - Welcome to {institution_name}"
        
        message = f"""
Hello {employee_name},

Welcome to {institution_name}! Your employee account has been created successfully.

Here are your login credentials:
Email: {employee_email}
Password: {password}

IMPORTANT SECURITY NOTICE:
- Please change your password after your first login
- Keep your login credentials secure and confidential  
- Do not share your password with anyone

You can log in to the system using these credentials. If you have any questions or need assistance, please contact your system administrator.

Best regards,
The {institution_name} Team
        """
        
        # Send email
        result = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee_email],
            fail_silently=False,
        )
        
        if result > 0:
            logger.info(f"Password email sent successfully to {employee_email}")
            return {"success": True, "message": "Email sent successfully"}
        else:
            logger.error(f"Failed to send password email to {employee_email}")
            return {"success": False, "error": "Email sending failed"}
            
    except Exception as e:
        logger.error(f"Error sending password email to {employee_email}: {str(e)}")
        
        # Retry logic
        try:
            raise self.retry(countdown=60 * (self.request.retries + 1))
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for password email to {employee_email}")
            return {"success": False, "error": f"Max retries exceeded: {str(e)}"}

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def send_bulk_employee_passwords(self, employee_password_data):
    """
    Send password emails to multiple employees in bulk
    
    Args:
        employee_password_data: List of dicts with keys: user_id, password, employee_name, employee_email
    """
    results = []
    
    for data in employee_password_data:
        try:
            result = send_employee_password_email.delay(
                user_id=data['user_id'],
                password=data['password'], 
                employee_name=data['employee_name'],
                employee_email=data['employee_email']
            )
            results.append({
                "email": data['employee_email'],
                "task_id": result.id,
                "status": "queued"
            })
        except Exception as e:
            logger.error(f"Error queueing email for {data['employee_email']}: {str(e)}")
            results.append({
                "email": data['employee_email'],
                "status": "failed",
                "error": str(e)
            })
    
    logger.info(f"Bulk password emails processed: {len(results)} employees")
    return {
        "success": True, 
        "processed_count": len(results),
        "results": results
    }