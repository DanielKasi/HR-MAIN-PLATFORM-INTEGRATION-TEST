from django.db import models, transaction
from approval.models import Approval, BaseApprovableModel
from performance.teams_api import create_teams_meeting, update_teams_meeting
from performance.zoom_api import create_zoom_meeting
from employee.models import Employee
from institution.models import Institution
from django.utils import timezone
from django.db.models import JSONField
from rest_framework.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from encrypted_model_fields.fields import EncryptedCharField, EncryptedTextField
from dateutil.rrule import rrulestr
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
from google.auth.transport.requests import Request
from datetime import datetime


class Period(BaseApprovableModel):   
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE) 
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)

    def __str__(self):
        return self.name
    
    def get_institution(self):
        return self.institution 
    
class Objectives(BaseApprovableModel):
    DURATION_CHOICES = [
        ("days", "Days"),
        ("months", "Months"),
        ("years", "Years")
    ]
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    description = models.TextField()
    managers = models.ForeignKey(Employee, on_delete=models.CASCADE, null=True, blank=True, related_name="objectivemanagers")
    duration_unit = models.CharField(
        max_length=255,
        choices=DURATION_CHOICES,
        default="days"
    )
    duration = models.IntegerField()
    key_result = models.ForeignKey('KeyResult', on_delete=models.CASCADE, null=True, blank=True)
    date = models.DateField(default=timezone.now)
    assignees = models.ManyToManyField(Employee, through='EmployeeObjectives', related_name="assigned_objectives")
    completion_date = models.DateField(null=True, blank=True)


    def __str__(self):
        return self.name
    
    def get_institution(self):
        return self.institution
    
    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.is_active = True
                    self.deleted_at = None

                    if isinstance(self, Objectives):
                        # Get existing EmployeeObjectives records
                        existing_employee_ids = set(
                            EmployeeObjectives.objects.filter(objective=self).values_list('employee_id', flat=True)
                        )
                        # Create EmployeeObjectives only for new assignees
                        for assignee in self.assignees.all():
                            if assignee.id not in existing_employee_ids:
                                EmployeeObjectives.objects.create(
                                    employee=assignee,
                                    objective=self,
                                    status="not_started",
                                    assignment_date=timezone.now()
                                )

                elif approval.action.name == "update":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None

                    if isinstance(self, Objectives):
                        existing_employee_objectives = EmployeeObjectives.objects.filter(objective=self)
                        existing_employee_ids = set(existing_employee_objectives.values_list('employee_id', flat=True))
                        new_assignee_ids = set(self.assignees.values_list('id', flat=True))

                        # Delete EmployeeObjectives for removed assignees
                        for employee_objective in existing_employee_objectives:
                            if employee_objective.employee_id not in new_assignee_ids:
                                employee_objective.delete()

                        # Create EmployeeObjectives for new assignees
                        for assignee in self.assignees.all():
                            if assignee.id not in existing_employee_ids:
                                EmployeeObjectives.objects.create(
                                    employee=assignee,
                                    objective=self,
                                    status="not_started",
                                    assignment_date=timezone.now()
                                )

                elif approval.action.name == "delete":
                    self.approval_status = "under_deletion"
                    self.is_active = False
                    self.deleted_at = timezone.now()
                    self.delete()
                    return

            elif approval.status == "rejected":
                if approval.action.name == "create":
                    self.approval_status = "active"
                    self.is_active = False
                    self.deleted_at = None
                elif approval.action.name == "update":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None
                elif approval.action.name == "delete":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None

            self.save(
                update_fields=[
                    "approval_status",
                    "is_active",
                    "deleted_at",
                ]
            )

class EmployeeObjectives(BaseApprovableModel):
    STATUS_CHOICES = [
        ("not_started", "Not Started"),
        ("on_track", "On Track"),
        ("closed", "Closed"),
        ("at_risk", "At Risk"),
        ("behind", "Bahind")
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    objective = models.ForeignKey(Objectives, on_delete=models.CASCADE)    
    status = models.CharField(
        max_length=255,
        choices=STATUS_CHOICES,
        default="not_started"
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    assignment_date = models.DateField(default=timezone.now)
    completion_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.objective.name}"
    
    def get_institution(self):
        return self.employee.payroll_branch.institution
    
class KeyResult(BaseApprovableModel):
    PROGRESS_TYPE_CHOICES = [
        ("percentage", "Percentage"),
        ("number", "Number")
    ]
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)  
    description = models.TextField()  
    target_value = models.FloatField(null=True, blank=True)
    duration  = models.DurationField()
    progress_type = models.CharField(
        max_length=255,
        choices=PROGRESS_TYPE_CHOICES,
        default="percentage",
        null=True,
        blank=True
    )

    def __str__(self):
        return self.title
    
    def get_institution(self):
        return self.institution

class Feedback360(BaseApprovableModel):
    reviewer = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='received_feedback', null=True, blank=True)
    given_by = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='given_feedback', null=True, blank=True)
    period = models.ForeignKey(Period, on_delete=models.CASCADE, null=True, blank=True)
    feedback_text = models.TextField(blank=True, null=True)
    rating = models.IntegerField()
    submission_date = models.DateTimeField(default=timezone.now)


    def __str__(self):
        return f"Feedback from {self.reviewer.user.fullname} to {self.given_by.user.fullname}"
    
    def get_institution(self):
        return self.period.institution



class EmployeeBonusPoint(BaseApprovableModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    bonus_point_setting = models.ForeignKey(
        'BonusPointSettings',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='employee_bonus_points',
        help_text="The bonus point setting that triggered this award, if applicable."
    )
    reason = models.TextField()
    date = models.DateTimeField(default=timezone.now)
    period = models.ForeignKey(Period, on_delete=models.CASCADE, null=True, blank=True)
    redeemed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.points} points for {self.employee.user.fullname} - {self.reason}"

    def get_institution(self):
        return self.period.institution
        

class QuestionTemplate(BaseApprovableModel):
    CATEGORY_CHOICES = [
        ("interview", "Interview"),
        ("performance_review", "Performance Review"),
        ("360_feedback", "360 Feedback"),
        ("general", "General"),
    ]
    QUESTION_TYPE_CHOICES = [
        ("text", "Text"),
        ("rating", "Rating"),
        ("multiple_choice", "Multiple Choice"),
        ("yes_no", "Yes/No"),
    ]
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="general")
    questions = JSONField(default=list, help_text="List of questions in JSON format, e.g., [{'question': 'Text', 'question_type': 'text', 'options': ['opt1', 'opt2'] if applicable}]")

    def __str__(self):
        return self.name
    
    def clean(self):
        # Validate JSON structure
        if not isinstance(self.questions, list):
            raise ValidationError({"error":"Questions must be a list"})
        for q in self.questions:
            if not isinstance(q, dict) or 'question' not in q or 'question_type' not in q:
                raise ValidationError({"error":"Each question must have 'question' and 'question_type' fields"})
            if q['question_type'] not in dict(self.QUESTION_TYPE_CHOICES).keys():
                raise ValidationError({"error": f"Invalid question_type: {q['question_type']}"})
            if q['question_type'] == 'multiple_choice' and ('options' not in q or not isinstance(q['options'], list)):
                raise ValidationError({"error": "Multiple choice questions must include a list of options"})

    def get_institution(self):
        return self.institution
    

    
class BonusPointSettings(BaseApprovableModel):
    CONDITION_OPERATOR_CHOICES = [
        ('=', 'Equal'),
        ('<', 'Less than'),
        ('>', 'Greater than'),
        ('<=', 'Less than or equal'),
        ('>=', 'Greater than or equal'),
    ]
    ALLOWED_FIELDS = {
        'Objectives': ['completion_date', 'end_date'],
        # 'KeyResult': ['completion_date', 'end_date'],
        'Task': ['completion_date', 'end_date'],
        'Project': ['completion_date', 'end_date'],
    }
    
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, limit_choices_to={'model__in': [
        'objectives', 'task', 'project'
    ]})
    content_object = GenericForeignKey('content_type', 'object_id')
    applicable_for = models.CharField(max_length=255, choices=[('managers', 'Managers'), ('assignees', 'Assignees')])
    bonus_for = models.CharField(max_length=255, choices=[('completing', 'Completing'), ('closing', 'Closing')])
    points = models.PositiveIntegerField()
    condition_field = models.CharField(max_length=255, choices=[('completion_date', 'Completion Date')])
    condition_operator = models.CharField(max_length=10, choices=CONDITION_OPERATOR_CHOICES)
    condition_value = models.CharField(max_length=255, choices=[('end_date', 'End Date')])

    def __str__(self):
        return f"{self.content_object} - {self.bonus_for} - {self.points} ({self.condition_field} {self.condition_operator} {self.condition_value})"

    def get_institution(self):
        return self.institution

    def clean(self):
        allowed_models = ['objectives', 'keyresult', 'task', 'project']
        if self.content_type.model not in allowed_models:
            raise ValidationError({"error": f"Invalid content_type. Must be one of: {', '.join(allowed_models)}"})
        
        model_name = self.content_type.model
        model_class = self.content_type.model_class()
        allowed_fields = self.ALLOWED_FIELDS.get(model_name.capitalize(), [])
        if self.condition_field not in allowed_fields:
            raise ValidationError({"error": f"Invalid condition_field for {model_name}. Must be one of: {', '.join(allowed_fields)}"})

        # Validate condition_value based on field type
        field = model_class._meta.get_field(self.condition_field)
        if isinstance(field, (models.DateField, models.DateTimeField)):
            try:
                datetime.strptime(self.condition_value, '%Y-%m-%d')
            except ValueError:
                raise ValidationError({"error": f"Invalid condition_value for {self.condition_field}. Must be a valid date (YYYY-MM-DD)."})



class Meeting(BaseApprovableModel):
    EVENT_MODE_CHOICES = [
        ('physical', 'Physical'),
        ('online', 'Online'),
        ('hybrid', 'Hybrid'),
    ]
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    mode = models.CharField(max_length=20, choices=EVENT_MODE_CHOICES, default='physical')
    location = models.CharField(max_length=255, blank=True, null=True)
    online_link = models.URLField(blank=True, null=True)
    participants = models.ManyToManyField(Employee, related_name='meetings')
    organizer = models.ForeignKey(Employee, on_delete=models.CASCADE, null=True, blank=True, related_name='organized_meetings')
    agenda = models.TextField(blank=True, null=True)
    minutes = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=255, blank=True, null=True)
    calendar_event_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.title} on {self.start_time.date()}"

    def _get_institution_meeting_link(self):
        integration = self.institution.meeting_integrations.first()
        if not integration:
            return None
        if integration.platform == 'zoom':
            return self._create_zoom_meeting(integration)
        elif integration.platform == 'google_meet':
            return self._create_google_meet(integration)
        elif integration.platform == 'microsoft_teams':
            return self._create_teams_meeting(integration)
        return None

    def _create_zoom_meeting(self, integration):
        duration = int((self.end_time - self.start_time).total_seconds() / 60)
        zoom_data = create_zoom_meeting(
            api_key=integration.api_key,
            api_secret=integration.api_secret,
            topic=self.title,
            start_time=self.start_time.isoformat(),
            duration=duration,
            recurrence=self._get_zoom_recurrence() if self.is_recurring else None,
        )
        self.calendar_event_id = zoom_data['id']
        return zoom_data['join_url']

    def _create_google_meet(self, integration):
        credentials = Credentials(
            token=integration.oauth_token,
            refresh_token=integration.oauth_refresh_token,
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
            token_uri='https://oauth2.googleapis.com/token',
        )
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            integration.oauth_token = credentials.token
            integration.oauth_refresh_token = credentials.refresh_token
            integration.save()
        service = build('calendar', 'v3', credentials=credentials)
        event = {
            'summary': self.title,
            'description': self.description,
            'start': {'dateTime': self.start_time.isoformat(), 'timeZone': 'UTC'},
            'end': {'dateTime': self.end_time.isoformat(), 'timeZone': 'UTC'},
            'conferenceData': {
                'createRequest': {'requestId': f'meet-{self.id}', 'conferenceSolutionKey': {'type': 'hangoutsMeet'}}
            },
            'attendees': [{'email': p.user.email} for p in self.participants.all()],
        }
        if self.is_recurring and self.recurrence_rule:
            event['recurrence'] = [self.recurrence_rule]
        event = service.events().insert(calendarId='primary', body=event, conferenceDataVersion=1).execute()
        self.calendar_event_id = event['id']
        return event.get('hangoutLink')

    def _create_teams_meeting(self, integration):
        teams_data = create_teams_meeting(
            client_id=integration.api_key,
            client_secret=integration.api_secret,
            tenant_id=integration.tenant_id,
            subject=self.title,
            start_time=self.start_time.isoformat(),
            end_time=self.end_time.isoformat(),
            recurrence=self._get_teams_recurrence() if self.is_recurring else None,
            attendees=[p.user.email for p in self.participants.all()],
        )
        self.calendar_event_id = teams_data['id']
        return teams_data['onlineMeeting']['joinUrl']

    def _get_zoom_recurrence(self):
        if not self.recurrence_rule:
            return None
        rrule = rrulestr(self.recurrence_rule)
        recurrence_type = {
            0: 1,  # Daily
            1: 2,  # Weekly
            2: 3,  # Monthly
        }.get(rrule._freq, 1)
        return {
            'type': recurrence_type,
            'repeat_interval': rrule._interval,
            'weekly_days': ','.join(str(d + 1) for d in rrule._byweekday) if rrule._byweekday else None,
            'end_date_time': (rrulestr(self.recurrence_rule)._until or self.end_time).isoformat(),
        }

    def _get_teams_recurrence(self):
        if not self.recurrence_rule:
            return None
        rrule = rrulestr(self.recurrence_rule)
        recurrence_type = {
            0: 'daily',
            1: 'weekly',
            2: 'monthly'
        }.get(rrule._freq, 'daily')
        pattern = {
            'type': recurrence_type,
            'interval': rrule._interval,
        }
        if rrule._byweekday:
            pattern['daysOfWeek'] = [rrule._byweekday[i].weekday for i in range(len(rrule._byweekday))]
        range_end = rrule._until or self.end_time
        return {
            'pattern': pattern,
            'range': {
                'type': 'endDate',
                'endDate': range_end.strftime('%Y-%m-%d')
            }
        }

    def _sync_to_calendar(self):
        if self.mode not in ['online', 'hybrid']:
            return
        integration = self.institution.meeting_integrations.first()
        if not integration:
            return
        if self.calendar_event_id:
            if integration.platform == 'google_meet':
                self._update_google_calendar_event(integration)
            elif integration.platform == 'zoom':
                self._update_zoom_meeting(integration)
            elif integration.platform == 'microsoft_teams':
                self._update_teams_meeting(integration)
        else:
            self.online_link = self._get_institution_meeting_link()
            if self.online_link:
                self.save()

    def _update_google_calendar_event(self, integration):
        credentials = Credentials(
            token=integration.oauth_token,
            refresh_token=integration.oauth_refresh_token,
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
            token_uri='https://oauth2.googleapis.com/token',
        )
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            integration.oauth_token = credentials.token
            integration.oauth_refresh_token = credentials.refresh_token
            integration.save()
        service = build('calendar', 'v3', credentials=credentials)
        event = {
            'summary': self.title,
            'description': self.description,
            'start': {'dateTime': self.start_time.isoformat(), 'timeZone': 'UTC'},
            'end': {'dateTime': self.end_time.isoformat(), 'timeZone': 'UTC'},
            'conferenceData': {
                'createRequest': {'requestId': f'meet-{self.id}', 'conferenceSolutionKey': {'type': 'hangoutsMeet'}}
            },
            'attendees': [{'email': p.user.email} for p in self.participants.all()],
        }
        if self.is_recurring and self.recurrence_rule:
            event['recurrence'] = [self.recurrence_rule]
        try:
            updated_event = service.events().update(
                calendarId='primary',
                eventId=self.calendar_event_id,
                body=event,
                conferenceDataVersion=1
            ).execute()
            self.online_link = updated_event.get('hangoutLink')
        except Exception as e:
            print(f"Error updating Google Calendar event: {e}")

    def _update_zoom_meeting(self, integration):
        from .zoom_api import update_zoom_meeting
        duration = int((self.end_time - self.start_time).total_seconds() / 60)
        try:
            zoom_data = update_zoom_meeting(
                api_key=integration.api_key,
                api_secret=integration.api_secret,
                meeting_id=self.calendar_event_id,
                topic=self.title,
                start_time=self.start_time.isoformat(),
                duration=duration,
                recurrence=self._get_zoom_recurrence() if self.is_recurring else None,
            )
            self.online_link = zoom_data['join_url']
        except Exception as e:
            print(f"Error updating Zoom meeting: {e}")

    def _update_teams_meeting(self, integration):
        try:
            teams_data = update_teams_meeting(
                client_id=integration.api_key,
                client_secret=integration.api_secret,
                tenant_id=integration.tenant_id,
                meeting_id=self.calendar_event_id,
                subject=self.title,
                start_time=self.start_time.isoformat(),
                end_time=self.end_time.isoformat(),
                recurrence=self._get_teams_recurrence() if self.is_recurring else None,
                attendees=[p.user.email for p in self.participants.all()],
            )
            self.online_link = teams_data['onlineMeeting']['joinUrl']
        except Exception as e:
            print(f"Error updating Teams meeting: {e}")

    def save(self, *args, **kwargs):
        if self.mode in ['online', 'hybrid'] and not self.online_link:
            self.online_link = self._get_institution_meeting_link()
        super().save(*args, **kwargs)
        self._sync_to_calendar()

    def get_institution(self):
        return self.institution     