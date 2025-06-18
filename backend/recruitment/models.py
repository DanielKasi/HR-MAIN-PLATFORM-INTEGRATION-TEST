from django.db import models
from datetime import datetime


class JobPosition(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    department = models.ForeignKey(
        "institution.Department",
        on_delete=models.PROTECT,
        related_name="job_positions",
    )
    contract_template = models.FileField(upload_to="job_positions/contracts/")
    offer_letter_template = models.FileField(upload_to="job_positions/offer_letters/")
    salary = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    reports_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="subordinates",
        blank=True,
        null=True,
    )


class JobPositionAdvert(models.Model):
    status_choices = [
        ("expired", "Expired"),
        ("active", "Active"),
        ("archived", "Archived"),
        ("closed", "Closed"),
    ]
    job_position = models.ForeignKey(
        JobPosition, on_delete=models.PROTECT, related_name="adverts"
    )
    status = models.CharField(max_length=20, choices=status_choices, default="active")
    published_date = models.DateTimeField(default=datetime.now)
    expiry_date = models.DateTimeField()
    number_of_employees_expected = models.PositiveIntegerField(blank=True, null=True)
    extra_information = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.job_position.name} - {self.status} ({self.published_date})"


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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.PROTECT,
        related_name="job_advert_applications_created",
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.applicant_name} - {self.job_position_advert.job_position.name} ({self.status})"


class InterviewStage(models.Model):
    job_position_advert = models.ForeignKey(
        JobPositionAdvert, on_delete=models.PROTECT, related_name="interview_stages"
    )
    name = models.CharField(max_length=255)
    level = models.PositiveIntegerField(default=1)
    interviewer = models.ForeignKey(
        "employee.Employee",
        on_delete=models.PROTECT,
        related_name="interview_stages",
    )


class JobInterview(models.Model):
    status_choices = [
        ("scheduled", "Scheduled"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
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
    interview_date = models.DateTimeField(default=datetime.now)
    feedback = models.TextField(blank=True, null=True)
    rating = models.PositiveIntegerField(blank=True, null=True)
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
