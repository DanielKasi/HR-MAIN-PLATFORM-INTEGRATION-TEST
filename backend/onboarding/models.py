from django.utils import timezone
from django.db import models
from employee.models import Employee
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings


class OnBoarding(models.Model):
    STATUS_CHOICES = [
        ("initial", "Initial"),
        ("training", "Training"),
        ("issued_contract", "Issued Contract"),
        ("declined_offer", "Declined Offer"),
        ("accepted_offer", "Accepted Offer"),
    ]

    application = models.OneToOneField(
        "recruitment.JobAdvertApplication",
        on_delete=models.PROTECT,
        related_name="onboarding",
        null=True,
        blank=True,
    )
    attended = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="initial")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OnBoarding for {self.application.applicant_name}"

    def save(self, *args, **kwargs):
        """Override save method to create employee when status is accepted_offer"""
        is_new = self.pk is None
        old_status = None

        if not is_new:
            # Get the old status before saving
            old_instance = OnBoarding.objects.get(pk=self.pk)
            old_status = old_instance.status

        super().save(*args, **kwargs)

        # Create employee if status changed to accepted_offer
        if self.status == "accepted_offer" and old_status != "accepted_offer":
            self.create_employee_record()

    def create_employee_record(self):
        """Create an employee record from the accepted application"""
        from users.models import CustomUser  # Import here to avoid circular imports

        if not self.application:
            return

        # Check if employee already exists for this application
        if hasattr(self.application, "created_employee"):
            return  # Employee already created

        try:
            # Create CustomUser first
            user = CustomUser.objects.create_user(
                email=self.application.applicant_email,
                fullname=self.application.applicant_name,
                is_active=True,
            )

            # Create Employee record

            employee = Employee.objects.create(
                user=user,
                email=self.application.applicant_email,
                phone_number=self.application.applicant_phone,
                position=self.application.job_position_advert.job_position,
                address=self.application.address,
                date_of_joining=timezone.now().date(),
                is_active=True,
                department=self.application.job_position_advert.job_position.department,
                salary=self.application.job_position_advert.job_position.salary,
            )

            context = {
                "employee_name": self.application.applicant_name,
                "position": self.application.job_position_advert.job_position.name,
                "department": self.application.job_position_advert.job_position.department.name,
                "date_of_joining": timezone.now().date(),
                "email": self.application.applicant_email,
                "phone_number": self.application.applicant_phone,
            }

            html_message = render_to_string("emails/onboarding_email.html", context)
            plain_message = render_to_string("emails/onboarding_email.txt", context)

            send_mail(
                subject="Welcome to the Team!",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.application.applicant_email],
                html_message=html_message,
                fail_silently=False,
            )

        except Exception as e:
            print(f"Error creating employee record: {str(e)}")
        return f"OnBoarding for {self.application.applicant_name}"


class EmployeeSeparation(models.Model):
    EMPLOYEE_SEPARATION_CHOICES = [
        ("resignation", "Resignation"),
        ("termination", "Termination"),
        ("retirement", "Retirement"),
        ("layoff", "Layoff"),
        ("contract_end", "Contract End"),
        ("other", "Other"),
    ]

    EMPLOYEE_SEPARATION_STATUS_CHOICES = [
        ("planned", "Planned"),
        ("completed", "Completed"),
    ]

    employee = models.ForeignKey(
        "employee.Employee",
        on_delete=models.CASCADE,
        related_name="separations",
    )
    separation_type = models.CharField(
        max_length=20, choices=EMPLOYEE_SEPARATION_CHOICES
    )
    initiated_by = models.ForeignKey(
        "employee.Employee",
        on_delete=models.CASCADE,
        related_name="separation_initiated_by",
        null=True,
    )
    effective_date = models.DateField()

    reason = models.TextField()

    separation_status = models.CharField(
        max_length=20, choices=EMPLOYEE_SEPARATION_STATUS_CHOICES, default="planned"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.separation_type}"


class ResignationDetail(models.Model):
    REQUEST_STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("under_review", "Under Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    resignation = models.OneToOneField(
        EmployeeSeparation,
        on_delete=models.CASCADE,
        related_name="resignation_detail",
    )
    resignation_letter = models.FileField(
        upload_to="resignation_letters/", null=True, blank=True
    )
    comments = models.TextField(blank=True, null=True)
    last_working_day = models.DateField(null=True, blank=True)
    request_status = models.CharField(
        max_length=20, choices=REQUEST_STATUS_CHOICES, default="submitted"
    )

    def __str__(self):
        return f"Resignation Detail for {self.resignation.employee.user.fullname}"


class DismissalDetail(models.Model):
    dismissal = models.OneToOneField(
        EmployeeSeparation,
        on_delete=models.CASCADE,
        related_name="dismissal_detail",
    )
    dismissal_letter = models.FileField(
        upload_to="dismissal_letters/", null=True, blank=True
    )
    comments = models.TextField(blank=True, null=True)
    last_working_day = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Dismissal Detail for {self.dismissal.employee.user.fullname}"


class ResignationPolicy(models.Model):
    institution = models.OneToOneField(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="resignation_policy",
    )
    policy_document = models.FileField(upload_to="resignation_policies/")
    min_notice_days = models.IntegerField(default=30)
    enforce_policy = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f"Resignation Policy for {self.institution.name}"
            if self.institution
            else "Default Resignation Policy"
        )


class OffboardingStage(models.Model):
    STAGE_TYPE_CHOICES = [
        ("notice_period", "Notice Period"),
        ("work_handover", "Work Handover"),
        ("farewell", "Farewell"),
        ("data_archival", "Data Archival"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
    ]

    employee_separation = models.ForeignKey(
        EmployeeSeparation, on_delete=models.CASCADE, related_name="offboarding_stages"
    )
    stage_type = models.CharField(max_length=50, choices=STAGE_TYPE_CHOICES)
    stage_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.get_stage_type_display()} - {self.employee_separation.employee.user.get_full_name()}"


class NoticePeriodDetail(models.Model):
    stage = models.OneToOneField(OffboardingStage, on_delete=models.CASCADE)
    expected_end_date = models.DateField()


class WorkHandoverDetail(models.Model):
    stage = models.OneToOneField(OffboardingStage, on_delete=models.CASCADE)
    handover_doc = models.FileField(upload_to="handovers/", null=True)


class FarewellDetail(models.Model):
    stage = models.OneToOneField(OffboardingStage, on_delete=models.CASCADE)
    farewell_date = models.DateField(blank=True, null=True)


class DataArchivalDetail(models.Model):
    stage = models.OneToOneField(OffboardingStage, on_delete=models.CASCADE)
    archived_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)


class OffboardingTask(models.Model):
    stage = models.ForeignKey(OffboardingStage, on_delete=models.CASCADE)
    description = models.CharField(max_length=255)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    due_date = models.DateField()
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.description} for {self.stage.separation.employee.user.fullname}"
