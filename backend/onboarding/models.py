from django.utils import timezone
from django.db import models
from employee.models import Employee
from django.template.loader import render_to_string
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.db import models, transaction
from io import BytesIO
from weasyprint import HTML
from django.db.models import UniqueConstraint, Q
from django.core.exceptions import ValidationError
from utilities.utility_base_model import UtilityBaseModel


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




class OffboardingStage(UtilityBaseModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="offboarding_stages",
    )
    stage_name = models.CharField(max_length=100, blank=False, null=False)
    stage_description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.institution.institution_name} - {self.stage_name}"

    class Meta:
        unique_together = (("institution", "stage_name"),)
        constraints = [
            UniqueConstraint(
                fields=["institution", "stage_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_stage_name_per_institution"
            )
        ]


class InstitutionEmployeeSeparationTypes(UtilityBaseModel):

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

    def __str__(self):
        return f"{self.institution.institution_name} - {self.separation_type}"


class InstitutionSeparationPolicy(UtilityBaseModel):
    separation_type = models.ForeignKey(
        InstitutionEmployeeSeparationTypes,
        on_delete=models.CASCADE,
        related_name="separation_policy",
    )

    policy_name = models.CharField(max_length=100, blank=True, null=True)

    policy_document = models.FileField(
        upload_to="separation_policies/", null=True, blank=True
    )
    description = models.TextField(blank=True, null=True)
    min_notice_days = models.IntegerField(default=30)
    max_notice_days = models.IntegerField(default=90)

    require_separation_letter = models.BooleanField(default=False)
    require_all_stages = models.BooleanField(default=False)

    enforce_policy = models.BooleanField(default=True)

    def __str__(self):
        return (
            f"Separation Policy for {self.separation_type.institution.institution_name} - "
            f"{self.separation_type.separation_type}"
        )

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["separation_type"],
                condition=Q(deleted_at__isnull=True, is_active=True),
                name="unique_active_separation_policy"
            )
        ]


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
        "users.Profile",
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

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if not is_new and self.separation_status == "completed":
            # We Deactivate the employee when separation is completed
            self.employee.is_active = False

            self.employee.save()

            # We deactivate the user account associated with the employee
            if self.employee.user:
                self.employee.user.is_active = False
                self.employee.user.save()


class ResignationRequest(UtilityBaseModel):
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


class TerminationInitiation(UtilityBaseModel):
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

        self.separation.separation_status = "completed"
        self.separation.save()

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
