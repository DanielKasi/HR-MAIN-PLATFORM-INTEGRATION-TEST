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

class TerminationStage(BaseApprovableModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="offboarding_stages",
    )
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.order}"
    
    def save(self, *args, **kwargs):
        if self.order == 0:  
            max_position = TerminationStage.objects.filter(
                institution=self.institution,
                deleted_at__isnull=True
            ).aggregate(models.Max('order'))['order__max'] or 0
            self.order = max_position + 1
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
            'name',
            'order',
            'created_at'
        ))

class TerminationType(BaseApprovableModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="offboarding_types",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    supported_stages = models.ManyToManyField(
        TerminationStage,
        related_name="supported_types",
        through='TerminationTypeStage',
        blank=True
    )
    requires_handover_report = models.BooleanField(default=False, help_text="Indicates if a handover report is required")

    def __str__(self):
        return f"{self.name} - {self.description}"

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
            'name',
            'description',
            'requires_handover_report',
            'created_at'
        ))

class TerminationTypeStage(SoftDeletableTimeStampedModel):
    termination_type = models.ForeignKey(
        TerminationType,
        on_delete=models.CASCADE,
        related_name="stages",
    )
    stage = models.ForeignKey(
        TerminationStage,
        on_delete=models.CASCADE,
        related_name="types",
    )
    can_be_skipped = models.BooleanField(default=False)

    order = models.PositiveIntegerField(help_text="Custom order for this stage in the termination type")

    def __str__(self):
        return f"{self.termination_type.name} - {self.stage.name} (Order: {self.order})"
    
class Offboarding(BaseApprovableModel):
    STATUS_CHOICES = (
        ('INITIATED', 'Initiated'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    INITIATOR_CHOICES = (
        ('EMPLOYEE', 'Employee'),
        ('EMPLOYER', 'Employer'),
    )

    employee = models.ForeignKey(
        "employee.Employee",
        on_delete=models.CASCADE,
        related_name="separations",
    )
    termination_type = models.ForeignKey(TerminationType, on_delete=models.CASCADE)
    last_working_day = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INITIATED')
    initiated_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.CASCADE,
        related_name="initiated_offboardings",
    )
    initiator_type = models.CharField(max_length=20, choices=INITIATOR_CHOICES, default='EMPLOYER')
    is_paid_after_termination = models.BooleanField(default=False, help_text="Indicates if employee is paid after termination")
    final_payment_date = models.DateField(null=True, blank=True, help_text="Date of final payment if applicable")

    def __str__(self):
        return f"{self.employee.name} - {self.termination_type.name}"

    def get_institution(self):
        return self.termination_type.institution

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            created_at__range=(start_date, end_date),
            termination_type__institution=institution,
            **filters
        ).select_related('termination_type__institution', 'employee', 'initiated_by')
        return list(queryset.values(
            'employee__name',
            'termination_type__name',
            'last_working_day',
            'reason',
            'status',
            'initiated_by__fullname',
            'initiator_type',
            'is_paid_after_termination',
            'final_payment_date',
            'created_at'
        ))
    
    @transaction.atomic
    def finish_workflow(self, approval):
        if approval.status == "completed":
            if approval.action.name == "create":
                self.status = "IN_PROGRESS"  
                self.save(update_fields=['status'])
            elif approval.action.name == "update":
                self.save()  
            elif approval.action.name == "delete":
                self.status = "CANCELLED"
                self.save(update_fields=['status'])
        elif approval.status == "rejected":
            self.status = "REJECTED"
            self.save(update_fields=['status'])
              
                
    
class OffboardingStageProgress(SoftDeletableTimeStampedModel):
    offboarding = models.ForeignKey(Offboarding, on_delete=models.CASCADE, related_name='stage_progress')
    stage = models.ForeignKey(TerminationStage, on_delete=models.CASCADE)
    custom_order = models.PositiveIntegerField(help_text="Custom order for this stage in the offboarding")
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        related_name="completed_offboarding_stage_progress",
    )
    notes = models.TextField(blank=True)
    skipped = models.BooleanField(default=False, help_text="Indicates if this stage was skipped")

    def __str__(self):
        return f"{self.stage.name} for {self.offboarding.employee} (Order: {self.custom_order})"

class HandoverReport(BaseApprovableModel):
    offboarding = models.OneToOneField(Offboarding, on_delete=models.CASCADE, related_name='handover_report')
    report_text = models.TextField(blank=True, null=True, help_text="Typed handover report content")
    report_file = models.FileField(upload_to='handover_reports/', null=True, blank=True, help_text="Uploaded handover report file")

    def __str__(self):
        return f"Handover Report for {self.offboarding.employee}"
    
    def get_institution(self):
        return self.termination_type.institution