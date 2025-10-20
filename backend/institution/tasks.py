from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

def get_salutation(employee):
    """Get appropriate salutation based on employee gender"""
    gender_salutations = {
        'male': 'Mr.',
        'female': 'Ms.',
    }
    gender = getattr(employee, 'gender', '').lower()
    return gender_salutations.get(gender, 'Dear')

@shared_task
def send_ownership_transfer_email(new_owner_id, institution_name, transfer_reason):
    """
    Celery task to send ownership transfer confirmation email to the new owner.
    
    Args:
        new_owner_id: ID of the new owner (CustomUser instance)
        institution_name: Name of the institution
        transfer_reason: Reason for the ownership transfer
    """
    from users.models import CustomUser  # Import inside to avoid circular imports
    
    try:
        new_owner = CustomUser.objects.get(id=new_owner_id)
        salutation = get_salutation(new_owner)
        full_salutation = f"{salutation} {new_owner.first_name}"
        
        subject = "Institution Ownership Transfer Confirmation"
        context = {
            'salutation': full_salutation,
            'institution_name': institution_name,
            'transfer_reason': transfer_reason or "No specific reason provided.",
        }
        message = render_to_string('emails/ownership_transfer_email.html', context)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[new_owner.email],
            html_message=message,
            fail_silently=False,
        )
    except CustomUser.DoesNotExist:
        # Log error or handle appropriately
        pass