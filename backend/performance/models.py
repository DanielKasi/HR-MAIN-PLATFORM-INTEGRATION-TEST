from django.db import models
from approval.models import BaseApprovableModel
from employee.models import Employee
from institution.models import Institution
from django.utils import timezone
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from django.db.models import JSONField
from rest_framework.exceptions import ValidationError

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
    Institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    description = models.TextField()
    managers = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name="objectivemanagers")
    duration_unit = models.CharField(
        max_length=255,
        choices=DURATION_CHOICES,
        default="days"
    )
    duration = models.DurationField()
    key_result = models.ForeignKey('KeyResult', on_delete=models.SET_NULL, null=True, blank=True)
    assignees = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True)
    self_employee_progress_update = models.BooleanField(default=False)

    def __str__(self):
        return self.name
    
    def get_institution(self):
        return self.institution
    
class EmmployeeObjectives(BaseApprovableModel):
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
    start_date = models.DateField()
    end_date = models.DateField()
    key_result = models.ForeignKey('KeyResult', on_delete=models.SET_NULL, null=True, blank=True)

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
    target_value = models.FloatField()
    duration  = models.DurationField()
    progress_type = models.CharField(
        max_length=255,
        choices=PROGRESS_TYPE_CHOICES,
        default="percentage"
    )

    def __str__(self):
        return self.title
    
    def get_institution(self):
        return self.institution

class Feedback360(BaseApprovableModel):
    RATING_CHOICES = [
        (1, "Poor"),
        (2, "Fair"),
        (3, "Good"),
        (4, "Very Good"),
        (5, "Excellent"),
    ]
    reviewee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='received_feedback')
    reviewer = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='given_feedback')
    period = models.ForeignKey(Period, on_delete=models.SET_NULL, null=True, blank=True)
    feedback_text = models.TextField(blank=True, null=True)
    rating = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    is_anonymous = models.BooleanField(default=False)
    submission_date = models.DateTimeField(default=timezone.now)
    strengths = models.TextField(blank=True, null=True)
    areas_for_improvement = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Feedback from {self.reviewer.user.fullname} to {self.reviewee.user.fullname}"
    
    def get_institution(self):
        return self.period.institution



class EmployeeBonusPoint(BaseApprovableModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    points = models.IntegerField()
    reason = models.TextField()
    date = models.DateTimeField(default=timezone.now)
    period = models.ForeignKey(Period, on_delete=models.SET_NULL, null=True, blank=True)
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

class Meeting(BaseApprovableModel):
    EVENT_MODE_CHOICES = [
        ("physical", "Physical"),
        ("online", "Online"),
        ("hybrid", "Hybrid"),
    ]
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE) 
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    mode = models.CharField(max_length=20, choices=EVENT_MODE_CHOICES, default="physical") 
    location = models.CharField(max_length=255, blank=True, null=True) 
    online_link = models.URLField(blank=True, null=True)  
    participants = models.ManyToManyField(Employee, related_name='meetings')         
    organizer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='organized_meetings')
    agenda = models.TextField(blank=True, null=True) 
    minutes = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=255, blank=True, null=True) 
    calendar_event_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.title} on {self.start_time.date()}"

    def get_institution(self):
        return self.institution 
    
    def save(self, *args, **kwargs):
        if self.mode in ['online', 'hybrid'] and not self.online_link:
            # Fetch institution's integration details
            self.online_link = self._get_institution_meeting_link()
        super().save(*args, **kwargs)
        self._sync_to_calendar()

    def _get_institution_meeting_link(self):
        integration = getattr(self.institution, 'meeting_integration', None)    