from django.db import models
from datetime import datetime, timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from ckeditor.fields import RichTextField
import os
from rest_framework.exceptions import ValidationError



class JobPosition(models.Model):
    JOB_POSITION_STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]
    name = models.CharField(max_length=255)
    description = models.TextField()
    department = models.ForeignKey(
        "institution.Department",
        on_delete=models.PROTECT,
        related_name="job_positions",
    )
    offer_letter_template = models.FileField(
        upload_to="job_positions/offer_letters/", blank=True, null=True
    )
    salary = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    reports_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="subordinates",
        blank=True,
        null=True,
    )

    job_position_status = models.CharField(
        max_length=20,
        choices=JOB_POSITION_STATUS_CHOICES,
        default="inactive",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name}"

    def activate_job_position(self):
        if self.job_position_status != "inactive":
            raise ValidationError("Only inactive job positions can be activated.")

        self.job_position_status == "active"
        self.save()

    def finish_workflow(self):
        from workflows.models import ApprovalTask
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(self.__class__)

        tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=self.pk
        )

        if tasks.exists() and tasks.filter(status="rejected").exists():
            self.job_position_status = "inactive"
            self.save()
            return
        if (
            tasks.exists()
            and not tasks.filter(
                status__in=["not_started", "pending", "rejected"]
            ).exists()
        ):
            self.activate_job_position()
            return
        elif not tasks.exists():
            self.activate_job_position()
            return
        else:
            raise Exception(
                "Cannot finish workflow: Some tasks are not completed or rejected."
            )

    def get_contract_template(self):
        """
        Return the contract template for this job position.
        - First, check for a specific template assigned to this job position.
        - If none, use the institution's default template.
        - If no default, use the system default template from the templates folder.
        """
        template = self.contract_templates.first()
        if template:
            return template
        # Fallback to institution's default template
        default_template = ContractTemplate.objects.filter(
            institution=self.department.institution, is_default=True
        ).first()
        if default_template:
            return default_template
        # Fallback to system default template
        return self._get_fallback_template()

    def _get_fallback_template(self):
        """Return the default template from the templates folder."""
        from django.conf import settings
        default_template_path = os.path.join(settings.TEMPLATES[0]['DIRS'][0], 'contracts', 'default_contract.html')
        try:
            with open(default_template_path, 'r') as file:
                content = file.read()
            return ContractTemplate(
                name="System Default",
                content=content,
                template_type='richtext',
                institution=self.department.institution
            )
        except FileNotFoundError:
            # Fallback content if file is missing
            return ContractTemplate(
                name="System Default",
                content="""
                <h1>Employment Contract</h1>
                <p>This agreement is made between {{employee_name}} and {{institution_name}}.</p>
                <p>Position: {{position_title}}</p>
                <p>Start Date: {{start_date}}</p>
                <p>Salary: {{salary}}</p>
                <p>Department: {{department_name}}</p>
                <p>Signed: ____________________</p>
                """,
                template_type='richtext',
                institution=self.department.institution
            )

class ContractTemplate(models.Model):
    TEMPLATE_TYPES = (
        ('pdf', 'PDF'),
        ('docx', 'DOCX'),
        ('richtext', 'Text'),
    )

    name = models.CharField(max_length=255, help_text="Name of the contract template")
    template_type = models.CharField(max_length=10, choices=TEMPLATE_TYPES, default='richtext')
    file = models.FileField(
        upload_to="contract_templates/files/",
        blank=True,
        null=True,
        help_text="Upload PDF or DOCX file if applicable"
    )
    content = RichTextField(
        blank=True,
        null=True,
        help_text="Rich text content for the contract template (used if template_type is richtext)"
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Mark as default template for the institution"
    )
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="contract_templates",
        help_text="Institution this template belongs to"
    )
    job_positions = models.ManyToManyField(
        "JobPosition",
        related_name="contract_templates",
        blank=True,
        help_text="Job positions using this template (leave blank for institution-wide default)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['institution', 'is_default'],
                condition=models.Q(is_default=True),
                name='unique_default_template_per_institution'
            )
        ]

    def __str__(self):
        return f"{self.name} ({'Default' if self.is_default else 'Custom'})"

    def save(self, *args, **kwargs):
        # Ensure only one default template per institution
        if self.is_default:
            ContractTemplate.objects.filter(
                institution=self.institution, is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)



class JobPositionAdvert(models.Model):
    status_choices = [
        ("pending_approval", "Pending Approval"),
        ("expired", "Expired"),
        ("active", "Active"),
        ("archived", "Archived"),
        ("closed", "Closed"),
        ("inactive", "Inactive"),
    ]
    job_position = models.ForeignKey(
        JobPosition, on_delete=models.PROTECT, related_name="adverts"
    )
    status = models.CharField(
        max_length=20, choices=status_choices, default="pending_approval"
    )
    published_date = models.DateTimeField(default=datetime.now)
    expiry_date = models.DateTimeField()
    number_of_employees_expected = models.PositiveIntegerField(blank=True, null=True)
    extra_information = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.job_position.name} - {self.status} ({self.published_date})"

    def _clean(self):
        if self.status == "active":
            existing_active = JobPositionAdvert.objects.filter(
                job_position=self.job_position,
                status="active",
            )

            if self.pk:
                existing_active = existing_active.exclude(pk=self.pk)

            if existing_active.exists():
                raise ValidationError(
                    f"There is already an active advert for '{self.job_position.name}'."
                )

    def save(self, *args, **kwargs):
        self._clean()
        super().save(*args, **kwargs)

    def approve(self):
        if self.status != "pending_approval":
            raise ValidationError(
                "Only pending approval job positions adeverts can be approved."
            )

        self.status == "active"
        self.save()

    def finish_workflow(self):
        from workflows.models import ApprovalTask
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(self.__class__)

        tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=self.pk
        )

        if tasks.exists() and tasks.filter(status="rejected").exists():
            self.status = "inactive"
            self.save()
            return
        if (
            tasks.exists()
            and not tasks.filter(
                status__in=["not_started", "pending", "rejected"]
            ).exists()
        ):
            self.approve()
            return
        elif not tasks.exists():
            self.approve()
            return
        else:
            raise Exception(
                "Cannot finish workflow: Some tasks are not completed or rejected."
            )


class JobAdvertApplication(models.Model):
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
        JobPositionAdvert, on_delete=models.PROTECT, related_name="applications"
    )
    applicant_name = models.CharField(max_length=255)
    applicant_email = models.EmailField()
    applicant_phone = models.CharField(max_length=20, blank=True, null=True)
    resume = models.FileField(upload_to="applications/resumes/")
    cover_letter = models.FileField(
        upload_to="applications/cover_letters/", blank=True, null=True
    )
    application_date = models.DateTimeField(default=datetime.now)
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
    created_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.PROTECT,
        related_name="job_advert_applications_created",
        null=True,
        blank=True,
    )
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
                "applicant_name": self.applicant_name,
                "job_title": self.job_position_advert.job_position.name,
                "company_name": self.job_position_advert.job_position.department.institution.institution_name,
                "application_date": self.application_date,
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
            print(f"Error sending email: {e}")

    def send_shortlist_email(self):
        """Send email notification when applicant is shortlisted"""
        try:
            subject = f"Congratulations! You've been shortlisted for {self.job_position_advert.job_position.name}"

            # Template context
            context = {
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
            print(f"Error sending shortlist email to {self.applicant_email}: {str(e)}")


class InterviewStage(models.Model):
    job_position_advert = models.ForeignKey(
        JobPositionAdvert, on_delete=models.PROTECT, related_name="interview_stages"
    )
    name = models.CharField(max_length=255)
    level = models.PositiveIntegerField(default=1)
    interviewers = models.ManyToManyField(
        "employee.Employee",
        related_name="interview_stages",
    )

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


class JobInterview(models.Model):
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
        on_delete=models.PROTECT,
        related_name="interviews",
    )
    interview_stage = models.ForeignKey(
        InterviewStage,
        on_delete=models.PROTECT,
        related_name="interviews",
    )
    interview_type = models.CharField(max_length=20, choices=interview_type_choices)
    interview_date = models.DateTimeField(default=datetime.now)
    interview_time = models.TimeField()
    location = models.CharField(max_length=255)
    feedback = models.TextField(blank=True, null=True)
    rating = models.PositiveIntegerField(blank=True, null=True)
    additional_notes = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=status_choices, default="scheduled"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.PROTECT,
        related_name="job_interviews_created",
        null=True,
        blank=True,
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
            print(
                f"Error sending interview email to {self.job_position_application.applicant_email}: {str(e)}"
            )

    def send_interview_cancelled_email(self):
        """Send email notification when interview is cancelled"""
        try:
            subject = f"Interview Cancelled - {self.job_position_application.job_position_advert.job_position.name}"

            # Template context
            context = {
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
            print(
                f"Error sending interview cancellation email to {self.job_position_application.applicant_email}: {str(e)}"
            )

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

            print(
                f"Interview rescheduled email sent to {self.job_position_application.applicant_email}"
            )

        except Exception as e:
            print(
                f"Error sending interview reschedule email to {self.job_position_application.applicant_email}: {str(e)}"
            )

    def _create_interview_event(self):
        from calendar2.models import Event
        from datetime import datetime

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
            target_audience="specific_employees",
            created_by=(
                self.created_by.profile
                if self.created_by and hasattr(self.created_by, "profile")
                else None
            ),
        )

        interviewers = self.interview_stage.interviewers.select_related("user").all()

        profile_ids = []
        for employee in interviewers:
            if employee.user and hasattr(employee.user, "profile"):
                profile_ids.append(employee.user.profile.id)

        event.specific_employees.set(Profile.objects.filter(id__in=profile_ids))

        event.save()
