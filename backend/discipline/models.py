from django.db import models
from django.core.validators import MinLengthValidator
from employee.models import Employee
from users.models import CustomUser
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from approval.models import BaseApprovableModel

class DisciplineType(models.Model):
    """Types of disciplinary actions"""

    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="low")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_severity_display()})"

    class Meta:
        ordering = ["severity", "name"]


class DisciplinaryAction(BaseApprovableModel):
    """Main disciplinary action record"""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("dismissed", "Dismissed"),
    ]

    # Basic Info
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="disciplinary_actions"
    )
    discipline_type = models.ForeignKey(DisciplineType, on_delete=models.CASCADE)

    # Details
    incident_date = models.DateField()
    reported_date = models.DateField(auto_now_add=True)
    description = models.TextField(validators=[MinLengthValidator(10)])
    evidence = models.TextField(
        blank=True, help_text="Any supporting evidence or documentation"
    )

    # Processing
    reported_by = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="reported_disciplines"
    )
    assigned_to = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_disciplines",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Resolution
    action_taken = models.TextField(blank=True)
    resolution_date = models.DateField(null=True, blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True, help_text="Any additional notes or comments")

    def __str__(self):
        employee_name = (
            self.employee.user.fullname
            if (self.employee.user and hasattr(self.employee.user, "fullname"))
            else str(self.employee)
        )
        return f"{employee_name} - {self.discipline_type.name} ({self.incident_date})"
    
    @classmethod
    def get_report_data(cls, start_date, end_date):
        queryset = cls.objects.filter(
            incident_date__range=(start_date, end_date)
        ).select_related('employee', 'discipline_type', 'reported_by', 'assigned_to')
        return list(queryset.values(
            'employee__name',
            'discipline_type__name',
            'incident_date',
            'reported_date',
            'status',
            'reported_by__name',
            'assigned_to__name',
            'resolution_date',
            'follow_up_required',
            'follow_up_date'
        ))

    def get_institution(self):
        return self.employee.department.institution       

    class Meta:
        ordering = ["-incident_date", "-created_at"]
