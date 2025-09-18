from django.db import models
from datetime import datetime
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import os
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericRelation
from approval.models import Approval, BaseApprovableModel
from django.db import transaction


class RequiredDocument(SoftDeletableTimeStampedModel):
    """
    A generic model to define a document requirement for any other model.
    """

    document_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_optional = models.BooleanField(default=False)

    # These fields set up the generic foreign key
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    def __str__(self):
        return (
            f"{self.document_name} ({'Optional' if self.is_optional else 'Required'})"
        )


class JobPosition(BaseApprovableModel):
    JOB_POSITION_STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]
    name = models.CharField(max_length=255)
    description = models.TextField()
    # TODO: Make department non-nullable in future
    department = models.ForeignKey(
        "institution.Department",
        on_delete=models.CASCADE,
        related_name="job_positions",
        null=True,
    )
    offer_letter_template = models.FileField(
        upload_to="job_positions/offer_letters/", blank=True, null=True
    )

    # Salary range fields
    salary_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Minimum salary for this position",
    )
    salary_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Maximum salary for this position",
    )

    reports_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="subordinates",
        blank=True,
        null=True,
    )
    contract_template = models.ForeignKey(
        "documents.DocumentTemplate",
        on_delete=models.SET_NULL,
        related_name="job_positions",
        blank=True,
        null=True,
    )
    job_position_status = models.CharField(
        max_length=20,
        choices=JOB_POSITION_STATUS_CHOICES,
        default="active",
    )
    required_documents = GenericRelation(RequiredDocument, on_delete=models.CASCADE)

    def clean(self):
        """Validate that salary_max is greater than or equal to salary_min"""
        super().clean()
        if self.salary_min and self.salary_max:
            if self.salary_max < self.salary_min:
                raise ValidationError(
                    {
                        "salary_max": "Maximum salary must be greater than or equal to minimum salary."
                    }
                )

    def save(self, *args, **kwargs):
        """Override save to call clean validation"""
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}"

    @property
    def salary_range_display(self):
        """Display salary range as a formatted string"""
        if self.salary_min and self.salary_max:
            if self.salary_min == self.salary_max:
                return f"${self.salary_min:,.2f}"
            return f"${self.salary_min:,.2f} - ${self.salary_max:,.2f}"
        elif self.salary_min:
            return f"From ${self.salary_min:,.2f}"
        elif self.salary_max:
            return f"Up to ${self.salary_max:,.2f}"
        return "Salary not specified"

    @property
    def salary_midpoint(self):
        """Calculate the midpoint of the salary range"""
        if self.salary_min and self.salary_max:
            return (self.salary_min + self.salary_max) / 2
        return None

    def is_salary_in_range(self, salary_amount):
        """Check if a given salary amount falls within the position's range"""
        if not salary_amount:
            return False

        min_ok = True if not self.salary_min else salary_amount >= self.salary_min
        max_ok = True if not self.salary_max else salary_amount <= self.salary_max

        return min_ok and max_ok

    def activate_job_position(self):
        if self.job_position_status != "inactive":
            raise ValidationError(
                {"error": "Only inactive job positions can be activated."}
            )
        self.job_position_status = "active"
        self.save()

    def get_institution(self):
        return self.department.institution       

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == 'completed':
                if approval.action.name == 'create':
                    self.approval_status = 'active'
                    self.job_position_status = 'active'
                elif approval.action.name == 'update':
                    self.approval_status = 'active'
                    self.job_position_status = 'active'
                elif approval.action.name == 'delete':
                    self.delete()
                    return
            elif approval.status == 'rejected':
                if approval.action.name == 'create':
                    self.delete()
                    return
                elif approval.action.name == 'update':
                    self.approval_status = 'active'
                    self.job_position_status = 'active'
                elif approval.action.name == 'delete':
                    self.approval_status = 'active'
                    self.job_position_status = 'active'
            self.save()


class JobPositionAdvert(BaseApprovableModel):
    status_choices = [
        ("pending_approval", "Pending Approval"),
        ("expired", "Expired"),
        ("active", "Active"),
        ("archived", "Archived"),
        ("closed", "Closed"),
        ("inactive", "Inactive"),
    ]
    job_position = models.ForeignKey(
        JobPosition, on_delete=models.CASCADE, related_name="adverts"
    )
    job_position_advert_status = models.CharField(
        max_length=20, choices=status_choices, default="pending_approval"
    )
    advert_type = models.CharField(
        max_length=20,
        choices=[
            ("internal", "Internal"),
            ("external", "External"),
            ("both", "Internal and External"),
        ],
        default="external",
    )
    work_type = models.ForeignKey(
        "employee.WorkType", null=True, blank=True, on_delete=models.SET_NULL
    )
    employee_type = models.ForeignKey(
        "employee.employeeType", null=True, blank=True, on_delete=models.SET_NULL
    )
    published_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField()
    number_of_employees_expected = models.PositiveIntegerField(blank=True, null=True)
    extra_information = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.job_position.name} - {self.job_position_advert_status} ({self.published_date})"

    def clean(self):
        """Validate that no other active advert exists for the same job position."""
        if self.job_position_advert_status == "active":
            existing_active = JobPositionAdvert.objects.filter(
                job_position=self.job_position,
                job_position_advert_status="active",
            )
            if self.pk:
                existing_active = existing_active.exclude(pk=self.pk)
            if existing_active.exists():
                conflicting_advert = existing_active.first()
                raise ValidationError(
                    {
                        "error": f"There is already an active advert for '{self.job_position.name}' (ID: {conflicting_advert.pk})."
                    }
                )

    def save(self, *args, **kwargs):
        """Ensure validation is performed before saving."""
        self.full_clean()  # Calls clean() and other validation
        super().save(*args, **kwargs)

    def approve(self):
        """Approve the advert, ensuring it’s in the correct state."""
        if self.job_position_advert_status != "pending_approval":
            raise ValidationError(
                {
                    "error": "Only job position adverts with 'pending_approval' status can be approved."
                }
            )
        self.job_position_advert_status = "active"  # Fixed typo
        self.full_clean()  # Validate before saving
        self.save()

    def get_institution(self):
        return self.job_position.department.institution       


    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["job_position"],
                condition=models.Q(job_position_advert_status="active"),
                name="unique_active_advert_per_job_position",
            )
        ]
        
    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == 'completed':
                if approval.action.name == 'create':
                    self.approval_status = 'active'
                    self.job_position_advert_status = 'active'
                elif approval.action.name == 'update':
                    self.approval_status = 'active'
                    self.job_position_advert_status = 'active'
                elif approval.action.name == 'delete':
                    self.delete()
                    return
            elif approval.status == 'rejected':
                if approval.action.name == 'create':
                    self.delete()
                    return
                elif approval.action.name == 'update':
                    self.approval_status = 'active'
                    self.job_position_advert_status = 'pending_approval'
                elif approval.action.name == 'delete':
                    self.approval_status = 'active'
                    self.job_position_advert_status = 'pending_approval'
            self.save()    


class JobAdvertApplication(SoftDeletableTimeStampedModel):
    status_choices = [
        ("new", "New"),
        ("reviewed", "Reviewed"),
        ("shortlisted", "Shortlisted"),
        ("rejected", "Rejected"),
        ("passed", "Passed"),
    ]
    gender_choices = [
        ("male", "Male"),
        ("female", "Female"),
    ]
    source_choices = [
        ("website", "Website"),
        ("referral", "Referral"),
        ("job_board", "Job Board"),
        ("social_media", "Social Media"),
        ("head_hunt", "Head Hunt"),
        ("other", "Other"),
    ]
    job_position_advert = models.ForeignKey(
        JobPositionAdvert, on_delete=models.CASCADE, related_name="applications"
    )
    applicant_name = models.CharField(max_length=255)
    applicant_email = models.EmailField()
    applicant_phone = models.CharField(max_length=20, blank=True, null=True)
    resume = models.FileField(upload_to="applications/resumes/")
    cover_letter = models.FileField(
        upload_to="applications/cover_letters/", blank=True, null=True
    )
    application_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=status_choices, default="new")
    gender = models.CharField(max_length=10, choices=gender_choices)
    state = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=255)
    country = models.CharField(max_length=100)
    source = models.CharField(max_length=20, choices=source_choices, default="website")
    recommended_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.SET_NULL,
        related_name="recommended_headhunt",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    reviewed_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.SET_NULL,
        related_name="job_advert_applications_reviewed",
        null=True,
        blank=True,
    )
    shortlisted_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.SET_NULL,
        related_name="job_advert_applications_shortlisted",
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.applicant_name} - {self.job_position_advert.job_position.name} ({self.status})"

    def save(self, *args, **kwargs):
        is_new_application = self.pk is None

        if self.pk:
            old_instance = JobAdvertApplication.objects.get(pk=self.pk)
            old_status = old_instance.status

            if old_status != "shortlisted" and self.status == "shortlisted":
                super().save(*args, **kwargs)
                self.send_shortlist_email()
                return

        super().save(*args, **kwargs)

        # Send confirmation email for new applications
        if is_new_application:
            self.send_application_received_email()

    def send_application_received_email(self):
        """Send confirmation email when application is received"""
        try:
            subject = (
                f"Application Received - {self.job_position_advert.job_position.name}"
            )

            # Template context
            context = {
                "salutation": "Madam" if self.gender == "female" else "Mr.",
                "applicant_name": self.applicant_name,
                "job_title": self.job_position_advert.job_position.name,
                "company_name": self.job_position_advert.job_position.department.institution.institution_name,
                "application_date": self.application_date.strftime("%Y-%m-%d"),
                "application": self,
            }

            html_message = render_to_string("emails/application_received.html", context)
            plain_message = render_to_string("emails/application_received.txt", context)

            send_mail(
                subject=subject,
                message=plain_message,  # Plain text version
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.applicant_email],
                html_message=html_message,  # HTML version
                fail_silently=False,
            )

        except Exception as e:
            pass

    def send_shortlist_email(self):
        """Send email notification when applicant is shortlisted"""
        try:
            subject = f"Congratulations! You've been shortlisted for {self.job_position_advert.job_position.name}"

            # Template context
            context = {
                "salutation": "Madam" if self.gender == "female" else "Mr.",
                "applicant_name": self.applicant_name,
                "job_title": self.job_position_advert.job_position.name,
                "company_name": self.job_position_advert.job_position.department.institution.institution_name,
                "application": self,
            }

            html_message = render_to_string(
                "emails/shortlist_notification.html", context
            )
            plain_message = render_to_string(
                "emails/shortlist_notification.txt", context
            )

            send_mail(
                subject=subject,
                message=plain_message,  # Plain text version
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.applicant_email],
                html_message=html_message,  # HTML version
                fail_silently=False,
            )

        except Exception as e:
            pass

class InterviewStage(BaseApprovableModel):
    job_position_advert = models.ForeignKey(
        JobPositionAdvert, on_delete=models.CASCADE, related_name="interview_stages"
    )
    name = models.CharField(max_length=255)
    level = models.PositiveIntegerField(default=1)
    interviewers = models.ManyToManyField(
        "employee.Employee",
        related_name="interview_stages",
    )
    feedback_fields = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):

        if self._state.adding:
            max_level = (
                InterviewStage.objects.filter(
                    job_position_advert=self.job_position_advert
                ).aggregate(models.Max("level"))["level__max"]
                or 0
            )
            self.level = max_level + 1

        super().save(*args, **kwargs)

    def get_institution(self):
        return self.job_position_advert.job_position.department.institution


class JobInterview(BaseApprovableModel):
    status_choices = [
        ("scheduled", "Scheduled"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    interview_type_choices = [
        ("online", "Online"),
        ("in_person", "In Person"),
    ]

    job_position_application = models.ForeignKey(
        JobAdvertApplication,
        on_delete=models.CASCADE,
        related_name="interviews",
    )
    interview_stage = models.ForeignKey(
        InterviewStage,
        on_delete=models.CASCADE,
        related_name="interviews",
    )
    interview_type = models.CharField(max_length=20, choices=interview_type_choices)
    interview_date = models.DateTimeField(default=timezone.now)
    interview_time = models.TimeField()
    location = models.CharField(max_length=255)
    feedback = models.TextField(blank=True, null=True)
    rating = models.PositiveIntegerField(blank=True, null=True)
    additional_notes = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=status_choices, default="scheduled"
    )



    def __str__(self):
        return f"{self.job_position_application.applicant_name} - {self.interview_stage.name} ({self.status})"

    def save(self, *args, **kwargs):
        # Check if this is a new record or status change to scheduled
        is_new = self.pk is None
        send_email = False
        create_event = False

        if is_new and self.status == "scheduled":
            # New interview being created with scheduled status
            send_email = True
            create_event = True
        elif not is_new:
            # Existing interview - check if status changed to scheduled
            old_instance = JobInterview.objects.get(pk=self.pk)
            if old_instance.status != "scheduled" and self.status == "scheduled":
                send_email = True
                create_event = True

        # Call the parent save method first
        super().save(*args, **kwargs)

        # Send email after saving
        if send_email:
            self.send_interview_scheduled_email()

        if create_event:
            self._create_interview_event()

    def send_interview_scheduled_email(self):
        """Send email notification when interview is scheduled"""
        try:
            # Format date and time for display
            interview_datetime = datetime.combine(
                self.interview_date.date(), self.interview_time
            )
            formatted_date = interview_datetime.strftime("%A, %B %d, %Y")
            formatted_time = interview_datetime.strftime("%I:%M %p")

            subject = f"Interview Scheduled - {self.job_position_application.job_position_advert.job_position.name}"

            # Template context
            context = {
                "salutation": (
                    "Madam"
                    if self.job_position_application.gender == "female"
                    else "Mr."
                ),
                "applicant_name": self.job_position_application.applicant_name,
                "job_title": self.job_position_application.job_position_advert.job_position.name,
                "interview_stage": self.interview_stage.name,
                "interview_type": self.get_interview_type_display(),
                "interview_date": formatted_date,
                "interview_time": formatted_time,
                "location": self.location,
                "company_name": getattr(settings, "COMPANY_NAME", "Our Company"),
                "interview": self,  # Pass the entire interview object for more flexibility
                "application": self.job_position_application,
            }

            # Render HTML and plain text email templates
            html_message = render_to_string("emails/interview_scheduled.html", context)
            plain_message = render_to_string("emails/interview_scheduled.txt", context)

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.job_position_application.applicant_email],
                html_message=html_message,
                fail_silently=False,
            )

        except Exception as e:
            pass

    def send_interview_cancelled_email(self):
        """Send email notification when interview is cancelled"""
        try:
            subject = f"Interview Cancelled - {self.job_position_application.job_position_advert.job_position.name}"

            # Template context
            context = {
                "salutation": (
                    "Madam"
                    if self.job_position_application.gender == "female"
                    else "Mr."
                ),
                "applicant_name": self.job_position_application.applicant_name,
                "job_title": self.job_position_application.job_position_advert.job_position.name,
                "interview_stage": self.interview_stage.name,
                "company_name": getattr(settings, "COMPANY_NAME", "Our Company"),
                "interview": self,
                "application": self.job_position_application,
            }

            # Render HTML and plain text email templates
            html_message = render_to_string("emails/interview_cancelled.html", context)
            plain_message = render_to_string("emails/interview_cancelled.txt", context)

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.job_position_application.applicant_email],
                html_message=html_message,
                fail_silently=False,
            )

        except Exception as e:
            pass

    def reschedule_interview(self, new_date, new_time, new_location=None):
        """Helper method to reschedule interview and send notification"""
        old_date = self.interview_date
        old_time = self.interview_time
        old_location = self.location

        self.interview_date = new_date
        self.interview_time = new_time
        if new_location:
            self.location = new_location

        self.save()

        # Send reschedule notification
        self.send_interview_rescheduled_email(old_date, old_time, old_location)

    def send_interview_rescheduled_email(self, old_date, old_time, old_location):
        """Send email notification when interview is rescheduled"""
        try:
            # Format dates and times for display
            old_datetime = datetime.combine(old_date.date(), old_time)
            new_datetime = datetime.combine(
                self.interview_date.date(), self.interview_time
            )

            subject = f"Interview Rescheduled - {self.job_position_application.job_position_advert.job_position.name}"

            context = {
                "salutation": (
                    "Madam"
                    if self.job_position_application.gender == "female"
                    else "Mr."
                ),
                "applicant_name": self.job_position_application.applicant_name,
                "job_title": self.job_position_application.job_position_advert.job_position.name,
                "interview_stage": self.interview_stage.name,
                "interview_type": self.get_interview_type_display(),
                "old_date": old_datetime.strftime("%A, %B %d, %Y"),
                "old_time": old_datetime.strftime("%I:%M %p"),
                "old_location": old_location,
                "new_date": new_datetime.strftime("%A, %B %d, %Y"),
                "new_time": new_datetime.strftime("%I:%M %p"),
                "new_location": self.location,
                "company_name": getattr(settings, "COMPANY_NAME", "Our Company"),
                "interview": self,
                "application": self.job_position_application,
            }

            html_message = render_to_string(
                "emails/interview_rescheduled.html", context
            )
            plain_message = render_to_string(
                "emails/interview_rescheduled.txt", context
            )

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.job_position_application.applicant_email],
                html_message=html_message,
                fail_silently=False,
            )


        except Exception as e:
            pass

    def _create_interview_event(self):
        from calendar2.models import Event
        from datetime import datetime
        from users.models import Profile
        

        application = self.job_position_application
        applicant_name = application.applicant_name
        job_advert = application.job_position_advert
        institution = job_advert.job_position.department.institution

        event_date = self.interview_date.date()
        event_title = f"Interview: {job_advert.job_position.name} - {applicant_name}"
        event_description = (
            f"Stage: {self.interview_stage.name}\n"
            f"Type: {self.interview_type}\n"
            f"Location: {self.location}"
        )

        event_mode = "online" if self.interview_type == "online" else "physical"

        event = Event.objects.create(
            institution=institution,
            title=event_title,
            description=event_description,
            date=event_date,
            event_mode=event_mode,
            target_audience="specific_employees"
        )

        interviewers = self.interview_stage.interviewers.select_related("user").all()

        profile_ids = []
        for employee in interviewers:
            if employee.user and hasattr(employee.user, "profile"):
                profile_ids.append(employee.user.profile.id)

        event.specific_employees.set(Profile.objects.filter(id__in=profile_ids))

        event.save()

    def get_institution(self):
        return self.job_position_application.job_position_advert.job_position.department.institution       
