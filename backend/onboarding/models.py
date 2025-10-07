from django.utils import timezone
from django.db import models
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from employee.models import Employee
from django.template.loader import render_to_string
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.db import models, transaction
from io import BytesIO
from weasyprint import HTML
from django.db.models import UniqueConstraint, Q, Count
from django.core.exceptions import ValidationError
from approval.models import Approval, BaseApprovableModel


class OnBoarding(BaseApprovableModel):
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

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            application__application_date__range=(start_date, end_date),
            application__job_position_advert__job_position__department__institution=institution,
            **filters
        ).select_related('application')
        return list(queryset.values(
            'status',
            'attended',
            'remarks',
            'application__applicant_name',
            'application__applicant_email',
            'application__status as application_status',
            'application__application_date',
        ).annotate(docs_count=Count('application__documents')))  

    def get_institution(self):
        return self.application.job_position_advert.job_position.department.institution


class OffboardingStage(BaseApprovableModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="offboarding_stages",
    )
    stage_name = models.CharField(max_length=100, blank=False, null=False)
    stage_description = models.TextField(blank=True, null=True)
    position = models.PositiveIntegerField(
        default=0,
        help_text="The order of this stage in the offboarding process (lower numbers come first)."
    )

    def __str__(self):
        return f"{self.institution.institution_name} - {self.stage_name} (Position: {self.position})"

    class Meta:
        unique_together = (("institution", "stage_name"),)
        constraints = [
            UniqueConstraint(
                fields=["institution", "stage_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_stage_name_per_institution",
            ),
            UniqueConstraint(
                fields=["institution", "position"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_position_per_institution",
            ),
        ]
        indexes = [
            models.Index(fields=["institution", "position"]),
        ]

    def save(self, *args, **kwargs):
        if self.position == 0:  # Automatically set position if not provided
            max_position = OffboardingStage.objects.filter(
                institution=self.institution,
                deleted_at__isnull=True
            ).aggregate(models.Max('position'))['position__max'] or 0
            self.position = max_position + 1
        super().save(*args, **kwargs)

    def get_institution(self):
        return self.institution

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            created_at__range=(start_date, end_date),
            institution=institution,
            **filters
        ).select_related('institution')
        return list(queryset.values(
            'stage_name',
            'position',
            'created_at'
        ))


class InstitutionEmployeeSeparationTypes(BaseApprovableModel):

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

    def get_institution(self):
        return self.institution
    
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            created_at__range=(start_date, end_date),
            institution=institution,
            **filters
        ).select_related('institution').prefetch_related('supported_stages')
        return list(queryset.values(
            'separation_type',
            'category',
            'created_at'
        ))


class InstitutionSeparationPolicy(BaseApprovableModel):
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

    def get_institution(self):
        return self.separation_type.institution
    
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            created_at__range=(start_date, end_date),
            separation_type__institution=institution,
            **filters
        ).select_related('separation_type', 'separation_type__institution')
        return list(queryset.values(
            'policy_name',
            'separation_type__separation_type',
            'min_notice_days',
            'max_notice_days',
            'require_separation_letter',
            'require_all_stages',
            'enforce_policy',
            'created_at'
        ))


    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["separation_type"],
                condition=Q(deleted_at__isnull=True, is_active=True),
                name="unique_active_separation_policy",
            )
        ]


class EmployeeSeparation(SoftDeletableTimeStampedModel):
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

        if is_new:
            # Create progress records for all supported stages
            supported_stages = self.employee_separation_type.supported_stages.filter(
                deleted_at__isnull=True
            )
            for stage in supported_stages:
                SeparationStageProgress.objects.get_or_create(
                    separation=self,
                    stage=stage,
                    defaults={"status": "not_started"}
                )

        if not is_new and self.separation_status == "completed":
            self.employee.is_active = False
            self.employee.save()
            if self.employee.user:
                self.employee.user.is_active = False
                self.employee.user.save()

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            effective_date__range=(start_date, end_date),
            employe_separation_type__institution=institution,
            **filters
        ).select_related('employee_separation_type', 'employee', 'initiated_by')
        return list(queryset.values(
            'employee__user__fullname',
            'employee_separation_type__separation_type',
            'initiated_by__user__fullname',
            'effective_date',
            'separation_status'
        ))    


class ResignationRequest(BaseApprovableModel):
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
            raise ValidationError({"error": "Only submitted requests can be approved."})

        self.request_status = "approved"
        self.save()

    def get_institution(self):
        return self.separation.employee.department.institution
    
    

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.request_status = "approved"
                elif approval.action.name == "update":
                    self.request_status = "approved"
                elif approval.action.name == "delete":
                    self.delete()
                    return  # Exit after deletion
            elif approval.status == "rejected":
                if approval.action.name == "create":
                    self.delete()
                    return  # Exit after deletion
                elif approval.action.name == "update":
                    self.request_status = "active"
                elif approval.action.name == "delete":
                    self.request_status = "active"
            self.save()
            # Optionally update the associated EmployeeSeparation status
            if approval.status == "completed" and approval.action.name in [
                "create",
                "update",
            ]:
                self.separation.separation_status = "completed"
                self.separation.save()

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            created_at__range=(start_date, end_date),
            separation__employe_separation_type__institution=institution,
            **filters
        ).select_related('separation', 'separation__employee', 'separation__employee_separation_type')
        return list(queryset.values(
            'separation__employee__user__fullname',
            'separation__employee_separation_type__separation_type',
            'request_status',
            'last_working_day',
            'created_at'
        ))            


class TerminationInitiation(BaseApprovableModel):
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
                {
                    "error": "TerminationInitiation must be linked to a termination type separation."
                }
            )

    def approve(self):
        if self.initiation_status != "submitted":
            raise ValidationError({"error": "Only submitted requests can be approved."})

        self.initiation_status = "approved"

        self.save()

    def get_institution(self):
        return self.separation.employee.department.institution

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.initiation_status = "approved"
                elif approval.action.name == "update":
                    self.initiation_status = "approved"
                elif approval.action.name == "delete":
                    self.delete()
                    return
            elif approval.status == "rejected":
                if approval.action.name == "create":
                    self.delete()
                    return
                elif approval.action.name == "update":
                    self.initiation_status = "active"
                elif approval.action.name == "delete":
                    self.initiation_status = "active"
            self.save()
            # Update EmployeeSeparation status if approved
            if approval.status == "completed" and approval.action.name in [
                "create",
                "update",
            ]:
                self.separation.separation_status = "completed"
                self.separation.save()

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            created_at__range=(start_date, end_date),
            separation__employe_separation_type__institution=institution,
            **filters
        ).select_related('separation', 'separation__employee', 'separation__employee_separation_type')
        return list(queryset.values(
            'separation__employee__user__fullname',
            'separation__employee_separation_type__separation_type',
            'initiation_status',
            'last_working_day',
            'created_at'
        ))            




class RetirementRequest(BaseApprovableModel):
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
                {
                    "error": "RetirementRequest must be linked to a retirement type separation."
                }
            )

    def approve(self):
        if self.request_status != "submitted":
            raise ValidationError({"error": "Only submitted requests can be approved."})

        self.request_status = "approved"
        self.save()

    def get_institution(self):
        return self.separation.employee.department.institution

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.request_status = "approved"
                elif approval.action.name == "update":
                    self.request_status = "approved"
                elif approval.action.name == "delete":
                    self.delete()
                    return
            elif approval.status == "rejected":
                if approval.action.name == "create":
                    self.delete()
                    return
                elif approval.action.name == "update":
                    self.request_status = "active"
                elif approval.action.name == "delete":
                    self.request_status = "active"
            self.save()
            # Update EmployeeSeparation status if approved
            if approval.status == "completed" and approval.action.name in [
                "create",
                "update",
            ]:
                self.separation.separation_status = "completed"
                self.separation.save()


class SeparationStageProgress(SoftDeletableTimeStampedModel):
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
    position = models.PositiveIntegerField(
        default=0,
        help_text="Custom position of this stage for the specific separation (overrides OffboardingStage.position)."
    )

    def __str__(self):
        return f"{self.separation.employee.user.fullname} - {self.stage.stage_name} ({self.status})"
    
    def clean(self):
        if self.stage not in self.separation.employee_separation_type.supported_stages.all():
            raise ValidationError({"error": f"Stage {self.stage.stage_name} is not supported for this separation type."})

    def save(self, *args, **kwargs):
        if self.position == 0:
            self.position = self.stage.position
        super().save(*args, **kwargs)
