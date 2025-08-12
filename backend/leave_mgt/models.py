from django.db import models
from employee.models import Employee
from django.core.validators import MinValueValidator
from decimal import Decimal
from users.models import CustomUser
from django.utils import timezone
from django.db.models import UniqueConstraint, Q


class BaseModel(models.Model):
    # This field tracks the date and time a record was soft-deleted.
    # A null value means the record is active.
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        """
        Soft-deletes the record by setting the deleted_at timestamp.
        """
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deleted_at", "is_active"])


class LeaveType(BaseModel):
    """Leave types like Annual, Sick, Maternity, etc."""

    LEAVE_CATEGORIES = [
        ("annual", "Annual Leave"),
        ("sick", "Sick Leave"),
        ("maternity", "Maternity Leave"),
        ("paternity", "Paternity Leave"),
        ("compassionate", "Compassionate Leave"),
        ("study", "Study Leave"),
        ("unpaid", "Unpaid Leave"),
    ]

    name = models.CharField(max_length=100)
    institution = models.ForeignKey(
        "institution.Institution", on_delete=models.CASCADE, related_name="leave_types"
    )
    category = models.CharField(max_length=20, choices=LEAVE_CATEGORIES)
    description = models.TextField(blank=True)
    max_days_per_year = models.PositiveIntegerField(default=0)
    carry_forward_allowed = models.BooleanField(default=False)
    max_carry_forward_days = models.PositiveIntegerField(
        default=0, blank=True, null=True
    )
    requires_document = models.BooleanField(default=False)
    gender_specific = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("all", "All")],
        default="all",
    )

    class Meta:
        db_table = "leave_types"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_new_leave_type = self.pk is None
        old_gender_specific = None
        old_is_active = None
        old_max_days = None

        # Get old values for comparison if updating
        if not is_new_leave_type:
            old_leave_type = LeaveType.objects.get(pk=self.pk)
            old_gender_specific = old_leave_type.gender_specific
            old_is_active = old_leave_type.is_active
            old_max_days = old_leave_type.max_days_per_year

        super().save(*args, **kwargs)

        # Sync balances if this is a new leave type or if important fields changed
        should_sync = (is_new_leave_type and self.is_active) or (
            not is_new_leave_type
            and (
                old_gender_specific != self.gender_specific
                or old_is_active != self.is_active
                or old_max_days != self.max_days_per_year
            )
        )

        if should_sync:
            self.sync_employee_balances()

    def sync_employee_balances(self, year=None):
        """
        Synchronize leave balances for all employees affected by this leave type.
        """
        if year is None:
            year = timezone.now().year

        from employee.models import Employee
        from leave_mgt.utils import LeaveCalculator

        # Get all active employees in this institution
        employees = Employee.objects.filter(
            is_active=True,
            department__institution=self.institution,
            department__isnull=False,
        )

        synced_count = 0

        for employee in employees:
            # First, clean up any duplicates for this employee and leave type
            employee._cleanup_duplicate_balances(self.institution, self, year)

            # Check if this leave type applies to this employee
            applies_to_employee = self.gender_specific == "all" or (
                hasattr(employee, "gender") and employee.gender == self.gender_specific
            )

            if applies_to_employee and self.is_active:
                # Create or update balance
                entitlement = LeaveCalculator.calculate_leave_entitlement(
                    employee, self, year
                )

                balance, created = LeaveBalance.objects.get_or_create(
                    institution=self.institution,
                    employee=employee,
                    leave_type=self,
                    year=year,
                    defaults={
                        "allocated_days": entitlement,
                        "used_days": Decimal("0"),
                        "pending_days": Decimal("0"),
                        "carried_forward_days": Decimal("0"),
                    },
                )

                # Update allocated days if balance already existed but entitlement changed
                if not created and balance.allocated_days != entitlement:
                    balance.allocated_days = entitlement
                    balance.save()

                synced_count += 1
            else:
                # Remove balance if it exists but shouldn't
                LeaveBalance.objects.filter(
                    institution=self.institution,
                    employee=employee,
                    leave_type=self,
                    year=year,
                    used_days=0,  # Only remove unused balances
                    pending_days=0,
                ).delete()

        return synced_count


class LeaveBalance(BaseModel):
    """Track leave balances for each employee per leave type per year"""

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_balances"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    allocated_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    used_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pending_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    carried_forward_days = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )

    class Meta:
        db_table = "leave_balances"
        ordering = ["-year", "leave_type__name"]
        constraints = [
            UniqueConstraint(
                fields=["employee", "leave_type", "year"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_leave_type_per_year_per_employee"
            )
        ]

    @property
    def available_days(self):
        return (
            self.allocated_days
            + self.carried_forward_days
            - self.used_days
            - self.pending_days
        )

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.leave_type.name} ({self.year})"


class LeaveApplication(BaseModel):
    """Leave application requests"""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    DURATION_TYPES = [
        ("full_day", "Full Day"),
        ("half_day_morning", "Half Day - Morning"),
        ("half_day_afternoon", "Half Day - Afternoon"),
        ("hourly", "Hourly"),
    ]

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="leave_applications",
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_applications"
    )
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    duration_type = models.CharField(
        max_length=20, choices=DURATION_TYPES, default="full_day"
    )
    total_days = models.DecimalField(max_digits=5, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    approved_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_leaves",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    supporting_document = models.FileField(
        upload_to="leave_documents/", null=True, blank=True
    )

    # TODO change to a file
    handover_notes = models.TextField(blank=True)

    class Meta:
        db_table = "leave_applications"
        ordering = ["-created_at"]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("End date must be after start date")

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.leave_type.name} ({self.start_date} to {self.end_date})"


class LeavePolicy(BaseModel):
    """Company leave policies and rules"""

    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="leave_policies",
    )
    name = models.CharField(max_length=200)
    description = models.TextField()
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    min_notice_days = models.PositiveIntegerField(default=1)
    max_consecutive_days = models.PositiveIntegerField(null=True, blank=True)
    requires_manager_approval = models.BooleanField(default=True)
    requires_hr_approval = models.BooleanField(default=False)
    applicable_after_probation_months = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "leave_policies"

    def __str__(self):
        return f"{self.name} - {self.leave_type.name}"
