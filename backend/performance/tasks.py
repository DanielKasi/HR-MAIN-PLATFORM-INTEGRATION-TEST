from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

@shared_task
def send_meeting_notification_email(meeting_id, participant_emails, meeting_data):
    """
    Celery task to send meeting notification emails to participants.
    
    Args:
        meeting_id (int): ID of the Meeting instance.
        participant_emails (list): List of participant email addresses.
        meeting_data (dict): Dictionary containing meeting details for email template.
    """
    print(f"Starting Celery task to send emails for meeting ID: {meeting_id}")
    print(f"Participant emails: {participant_emails}")
    
    if not participant_emails:
        print("No valid participant emails provided. Skipping email sending.")
        return {"status": "skipped", "reason": "No valid participant emails"}

    subject = f"New Meeting: {meeting_data['title']}"
    results = []
    
    for email in participant_emails:
        if not email:
            print("Skipping email: Empty or invalid email address")
            results.append({"email": email, "status": "skipped", "reason": "Empty or invalid email"})
            continue
            
        try:
            salutation = meeting_data.get('salutation', '')
            message = render_to_string('emails/meeting_email.html', {
                'salutation': salutation,
                'participant_name': meeting_data.get('participant_name', ''),
                'meeting_title': meeting_data['title'],
                'meeting_date': meeting_data['meeting_date'],
                'meeting_time': meeting_data['meeting_time'],
                'meeting_mode': meeting_data['meeting_mode'],
                'meeting_location': meeting_data.get('meeting_location', ''),
                'meeting_online_link': meeting_data.get('meeting_online_link', ''),
                'meeting_agenda': meeting_data.get('meeting_agenda', ''),
                'organizer_name': meeting_data.get('organizer_name', 'Meeting Organizer'),
            })
            send_mail(
                subject=subject,
                message='',
                html_message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            print(f"Email sent successfully to {email} for meeting {meeting_data['title']}")
            results.append({"email": email, "status": "sent"})
        except Exception as e:
            print(f"Error sending email to {email}: {str(e)}")
            results.append({"email": email, "status": "failed", "reason": str(e)})
    
    return {"status": "completed", "results": results}