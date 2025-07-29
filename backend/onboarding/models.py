from django.utils import timezone
from django.db import models
from employee.models import Employee
from django.template.loader import render_to_string
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.db import models, transaction
from io import BytesIO
from weasyprint import HTML

class OnBoarding(models.Model):
    STATUS_CHOICES = [
        ("initial", "Initial"),
        ("training", "Training"),
        ("contract_review", "Contract Review"),
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
        """Override save method to handle status changes."""
        is_new = self.pk is None
        old_status = None

        if not is_new:
            old_instance = OnBoarding.objects.get(pk=self.pk)
            old_status = old_instance.status

        super().save(*args, **kwargs)

        # Send contract email if status changed to issued_contract
        if self.status == "issued_contract" and old_status != "issued_contract":
            self.send_contract_email()

        # Create employee if status changed to accepted_offer
        if self.status == "accepted_offer" and old_status != "accepted_offer":
            self.create_employee_record()

    def send_contract_email(self):
        """Send the contract template as a PDF attachment to the applicant's email."""
        if not self.application or not self.application.applicant_email:
            return

        try:
            # Get the job position and its contract template
            job_position = self.application.job_position_advert.job_position
            template = job_position.get_contract_template()

            # Prepare context for rendering the template
            context = {
                "employee_name": self.application.applicant_name,
                "position_title": job_position.name,
                "department_name": job_position.department.name,
                "institution_name": job_position.department.institution.institution_name,
                "institution_address": job_position.department.institution.location or "N/A",
                "employee_address": self.application.address or "N/A",
                "employee_country": self.application.country or "Unknown",
                "start_date": timezone.now().date().strftime("%Y-%m-%d"),
                "salary": str(job_position.salary) if job_position.salary else "N/A",
                "currency": "UGX",
                "contract_id": f"CON-{self.id}",
                # "work_type": self.application.work_type or "Full-time",
                "probation_period": "3 months",
                "probation_notice_period": "2 weeks",
                "notice_period": "30 days",
                "additional_benefits": "Other benefits as outlined in the Employee Handbook.",
                "employer_representative_name": "Authorized Signatory",
                "employer_representative_title": "Manager",
                "signing_date": timezone.now().date().strftime("%Y-%m-%d"),
            }

            # Render the contract template
            rendered_contract = template.content

            # Convert HTML to PDF
            pdf_file = BytesIO()
            HTML(string=rendered_contract).write_pdf(pdf_file)
            pdf_file.seek(0)

            # Prepare email
            email_subject = f"Employment Contract for {job_position.name}"
            email_context = {
                "employee_name": self.application.applicant_name,
                "position_title": job_position.name,
                "institution_name": job_position.department.institution.institution_name,
            }
            html_message = render_to_string("emails/contract_email.html", email_context)
            plain_message = render_to_string("emails/contract_email.txt", email_context)

            # Send email with PDF attachment using EmailMultiAlternatives
            email = EmailMultiAlternatives(
                subject=email_subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[self.application.applicant_email],
            )
            email.attach_alternative(html_message, "text/html")
            email.attach(
                f"contract_{context['contract_id']}.pdf",
                pdf_file.read(),
                "application/pdf"
            )
            email.send(fail_silently=False) 

        except Exception as e:
            print(f"Error sending contract email: {str(e)}")

    def create_employee_record(self):
        """Create an employee record from the accepted application."""
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


class OffboardingStage(models.Model):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="offboarding_stages",
    )
    stage_name = models.CharField(max_length=100, blank=False, null=False)
    stage_description = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.institution.institution_name} - {self.stage_name}"

    class Meta:
        unique_together = (("institution", "stage_name"),)


class InstitutionEmployeeSeparationTypes(models.Model):

    SEPARATION_CATEGORY_CHOICES = [
        ("resignation", "Resignation"),
        ("termination", "Termination"),
        ("retirement", "Retirement"),
        ("contract_end", "Contract End"),
        ("other", "Other"),
    ]

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="separation_types",
    )
    separation_type = models.CharField(max_length=50, blank=False, null=False)
    description = models.TextField(blank=True, null=True)

    supported_stages = models.ManyToManyField(
        OffboardingStage,
        related_name="supported_separation_types",
        blank=True,
    )

    category = models.CharField(
        max_length=30, choices=SEPARATION_CATEGORY_CHOICES, default="other"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.institution.institution_name} - {self.separation_type}"


class InstitutionSeparationPolicy(models.Model):
    separation_type = models.ForeignKey(
        InstitutionEmployeeSeparationTypes,
        on_delete=models.CASCADE,
        related_name="separation_policy",
    )

    policy_document = models.FileField(
        upload_to="separation_policies/", null=True, blank=True
    )
    description = models.TextField(blank=True, null=True)
    min_notice_days = models.IntegerField(default=30)
    max_notice_days = models.IntegerField(default=90)

    require_separation_letter = models.BooleanField(default=False)
    require_all_stages = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    enforce_policy = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f"Separation Policy for {self.separation_type.institution.institution_name} - "
            f"{self.separation_type.separation_type}"
        )


class EmployeeSeparation(models.Model):
    employee_separation_type = models.ForeignKey(
        InstitutionEmployeeSeparationTypes,
        on_delete=models.CASCADE,
        related_name="employee_separations",
    )

    employee = models.ForeignKey(
        "employee.Employee",
        on_delete=models.CASCADE,
        related_name="separations",
    )

    initiated_by = models.ForeignKey(
        "employee.Employee",
        on_delete=models.CASCADE,
        related_name="separation_initiated_by",
        null=True,
    )

    effective_date = models.DateField()

    additional_notes = models.TextField(blank=True, null=True)
    separation_status = models.CharField(
        max_length=20,
        choices=[
            ("planned", "Planned"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
        ],
        default="planned",
    )

    def __str__(self):
        return (
            self.employee.user.fullname
            + " - "
            + self.employee_separation_type.separation_type
        )


class ResignationRequest(models.Model):
    REQUEST_STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("under_review", "Under Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    separation = models.OneToOneField(
        EmployeeSeparation,
        on_delete=models.CASCADE,
        related_name="resignation_requests",
        limit_choices_to={"employee_separation_type__category": "resignation"},
    )

    resignation_letter = models.FileField(
        upload_to="resignation_letters/",
        null=True,
        blank=True,
    )
    comments = models.TextField(blank=True, null=True)

    last_working_day = models.DateField(null=True, blank=True)

    request_status = models.CharField(
        max_length=20,
        choices=REQUEST_STATUS_CHOICES,
        default="submitted",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Resignation Request - {self.separation.employee.user.fullname} ({self.request_status})"

    @transaction.atomic
    def approve(self):
        if self.request_status != "submitted":
            raise ValidationError("Only submitted requests can be approved.")

        self.request_status = "approved"
        self.save()

    def finish_workflow(self):
        from workflows.models import ApprovalTask
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(self.__class__)

        tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=self.pk
        )

        if tasks.exists() and tasks.filter(status="rejected").exists():
            self.request_status = "rejected"
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


class TerminationInitiation(models.Model):
    separation = models.OneToOneField(
        EmployeeSeparation,
        on_delete=models.CASCADE,
        related_name="termination_initiation",
        limit_choices_to={"employee_separation_type__category": "termination"},
    )

    termination_letter = models.FileField(
        upload_to="termination_letters/",
        null=True,
        blank=True,
    )
    comments = models.TextField(blank=True, null=True)

    last_working_day = models.DateField(null=True, blank=True)

    initiation_status = models.CharField(
        max_length=20,
        choices=[
            ("submitted", "Submitted"),
            ("under_review", "Under Review"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="submitted",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Termination Initiation - {self.separation.employee.user.fullname} ({self.initiation_status})"

    def clean(self):
        if self.separation.employee_separation_type.category != "termination":
            raise ValidationError(
                "TerminationInitiation must be linked to a termination type separation."
            )

    def approve(self):
        if self.initiation_status != "submitted":
            raise ValidationError("Only submitted requests can be approved.")

        self.initiation_status = "approved"
        self.save()

    def finish_workflow(self):
        from workflows.models import ApprovalTask
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(self.__class__)

        tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=self.pk
        )

        if tasks.exists() and tasks.filter(status="rejected").exists():
            self.initiation_status = "rejected"
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


class RetirementRequest(models.Model):
    separation = models.OneToOneField(
        EmployeeSeparation,
        on_delete=models.CASCADE,
        related_name="retirement_request",
        limit_choices_to={"employee_separation_type__category": "retirement"},
    )
    retirement_letter = models.FileField(
        upload_to="retirement_letters/", null=True, blank=True
    )
    comments = models.TextField(blank=True, null=True)
    last_working_day = models.DateField(null=True, blank=True)

    request_status = models.CharField(
        max_length=20,
        choices=[
            ("submitted", "Submitted"),
            ("under_review", "Under Review"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="submitted",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Retirement Request - {self.separation.employee.user.fullname} ({self.request_status})"

    def clean(self):
        if self.separation.employee_separation_type.category != "retirement":
            raise ValidationError(
                "RetirementRequest must be linked to a retirement type separation."
            )

    def approve(self):
        if self.request_status != "submitted":
            raise ValidationError("Only submitted requests can be approved.")

        self.request_status = "approved"
        self.save()

    def finish_workflow(self):
        from workflows.models import ApprovalTask
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(self.__class__)

        tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=self.pk
        )

        if tasks.exists() and tasks.filter(status="rejected").exists():
            self.request_status = "rejected"
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


class SeparationStageProgress(models.Model):
    separation = models.ForeignKey(
        EmployeeSeparation,
        on_delete=models.CASCADE,
        related_name="stages",
    )
    stage = models.ForeignKey(
        OffboardingStage,
        on_delete=models.CASCADE,
        related_name="separation_progress",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("not_started", "Not Started"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
            ("skipped", "Skipped"),
        ],
        default="not_started",
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.separation.employee.user.fullname} - {self.stage.stage_name} ({self.status})"
