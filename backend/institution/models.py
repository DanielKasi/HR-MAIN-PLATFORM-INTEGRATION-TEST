from django.db import models
from datetime import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from django.core.exceptions import ValidationError
import logging
from utilities.default_document_types import DEFAULT_DOCUMENT_TYPES
from django.db import transaction
from django.utils import timezone
import json
from django.db.models import UniqueConstraint, Q
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from django.core.validators import MinValueValidator, MaxValueValidator
from approval.models import BaseApprovableModel


logger = logging.getLogger(__name__)


class Institution(SoftDeletableTimeStampedModel):
    APPROVAL_STATUS_CHOICES = [
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("under_review", "Under Review"),
    ]
    institution_owner = models.ForeignKey(
        "users.CustomUser", related_name="institutions_owned", on_delete=models.CASCADE
    )
    institution_email = models.EmailField(max_length=255, blank=True, null=True)
    institution_name = models.CharField(max_length=255)
    first_phone_number = models.CharField(max_length=20, blank=True, null=True)
    second_phone_number = models.CharField(max_length=20, blank=True, null=True)
    institution_logo = models.ImageField(
        upload_to="institutions/images/", blank=True, null=True
    )
    system = models.ForeignKey(
        "users.System", on_delete=models.CASCADE, blank=True, null=True
    )
    theme_color = models.CharField(max_length=400, blank=True, null=True)
    default_employee_role = models.ForeignKey(
        "users.Role",
        related_name="default_role",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    is_attendance_penalties_enabled = models.BooleanField(default=False)
    setup = models.BooleanField(default=False)
    location = models.CharField(max_length=500, blank=True, null=True)
    country_code = models.CharField(max_length=10, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    # zoom_account_id = models.CharField(max_length=100, blank=True, null=True)
    # zoom_client_id = models.CharField(max_length=100, blank=True, null=True)
    # zoom_client_secret = models.CharField(max_length=100, blank=True, null=True)
    user_inactivity_time = models.PositiveIntegerField(
        default=15, help_text="User inactivity time in minutes before automatic logout"
    )
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default="approved",
    )
    approval_date = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        "users.CustomUser",
        related_name="approved_institutions",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    rejection_reason = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("institution_owner", "institution_name")
        constraints = [
            UniqueConstraint(
                fields=["institution_owner", "institution_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_institution_name_per_institution_owner",
            )
        ]

    def __str__(self):
        return self.institution_name

    @property
    def is_approved(self):
        return self.approval_status == "approved"

    def _get_country_code_from_location(self):
        """Determine country code from location or coordinates using geopy."""
        geolocator = Nominatim(user_agent="hr_baifam_app")
        try:
            if self.location:
                location_data = geolocator.geocode(
                    self.location, exactly_one=True, timeout=10
                )
                if location_data and location_data.raw.get("address", {}).get(
                    "country_code"
                ):
                    return location_data.raw["address"]["country_code"].upper()

            if self.latitude is not None and self.longitude is not None:
                location_data = geolocator.reverse(
                    (self.latitude, self.longitude), timeout=10
                )
                if location_data and location_data.raw.get("address", {}).get(
                    "country_code"
                ):
                    return location_data.raw["address"]["country_code"].upper()

            logger.warning(
                f"Could not determine country code for institution: {self.institution_name}"
            )
            return None
        except (GeocoderTimedOut, GeocoderUnavailable) as e:
            logger.error(
                f"Geocoding failed for institution {self.institution_name}: {str(e)}"
            )
            return None

    def _create_default_document_types(self):
        """Create default document types for the institution."""
        from documents.models import DocumentType

        for doc_type in DEFAULT_DOCUMENT_TYPES:
            DocumentType.objects.get_or_create(
                institution=self,
                name=doc_type["name"],
                defaults={
                    "description": doc_type["description"],
                },
            )

    def save(self, *args, **kwargs):
        from payroll.utils import PayrollProcessor
        from users.models import Profile

        # from institutions.models import (
        #     Branch,
        #     InstitutionBankType,
        #     InstitutionBankAccount,
        # )

        with transaction.atomic():
            # Set country_code if not provided
            if not self.country_code:
                self.country_code = self._get_country_code_from_location()

            is_new = self._state.adding
            super().save(*args, **kwargs)

            if is_new:
                PayrollProcessor.setup_default_payroll_types_for_institution(self)
                self._create_calendar_for_institution()
                self._create_default_document_types()

                profile, _ = Profile.objects.get_or_create(
                    user=self.institution_owner,
                )

                profile.institution = self
                profile.save()

                bank_type = InstitutionBankType.objects.create(
                    institution=self,
                    bank_fullname="Default Bank",
                    bank_code="0001",
                    br_code="0001",
                    created_by=self.created_by,
                )

                bank_account = InstitutionBankAccount.objects.create(
                    institution_bank=bank_type,
                    account_name=f"{self.institution_name} Main Account",
                    account_number="0000000001",
                    created_by=self.created_by,
                )

                self._create_institution_working_days()

                Branch.objects.create(
                    institution=self,
                    branch_name=f"{self.institution_name} Main Branch",
                    branch_phone_number=self.first_phone_number,
                    branch_location="Main Location",
                    branch_email=self.institution_email,
                    created_by=self.created_by,
                    paying_bank_account=bank_account,
                )

    def _create_institution_working_days(self):
        from settings.models import SystemDay

        working_days, created = InstitutionWorkingDays.objects.get_or_create(
            institution=self
        )
        if created:
            working_days.days.set(SystemDay.objects.all())

    def _create_calendar_for_institution(self):
        from calendar2.models import Calendar

        current_year = timezone.now().year
        Calendar.create_with_holidays(institution=self, year=current_year)

    def get_zoom_access_token(self):
        import base64
        import requests

        if (
            not self.zoom_account_id
            or not self.zoom_client_id
            or not self.zoom_client_secret
        ):
            raise Exception(f"Institution {self} has no Zoom credentials configured.")

        credentials = f"{self.zoom_client_id}:{self.zoom_client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_credentials}",
        }

        params = {
            "grant_type": "account_credentials",
            "account_id": self.zoom_account_id,
        }

        response = requests.post(
            "https://zoom.us/oauth/token", headers=headers, params=params
        )

        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            raise Exception(f"Zoom token error: {response.text}")


class InstitutionKYCDocument(models.Model):
    institution = models.ForeignKey(
        Institution, related_name="documents", on_delete=models.CASCADE
    )
    document_title = models.CharField(max_length=255)
    document_file = models.FileField(upload_to="institutions/kyc/documents/")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.document_title} - {self.institution.institution_name}"

    class Meta:
        verbose_name = "Institution KYC Document"
        verbose_name_plural = "Institution KYC Documents"


class InstitutionBankType(BaseApprovableModel):
    institution = models.ForeignKey(
        Institution, related_name="banks", on_delete=models.CASCADE
    )
    bank_fullname = models.CharField(max_length=255, blank=False, null=False)
    bank_code = models.CharField(max_length=20, blank=False, null=False)
    br_code = models.CharField(max_length=20, blank=False, null=False)


    def __str__(self):
        return f"Type: {self.bank_fullname} FOR {self.institution.institution_name}"

    def get_institution(self):
        return self.institution


class InstitutionBankAccount(BaseApprovableModel):
    institution_bank = models.ForeignKey(
        InstitutionBankType, related_name="accounts", on_delete=models.CASCADE
    )
    account_name = models.CharField(max_length=255, blank=False, null=False)
    account_number = models.CharField(max_length=50, blank=False, null=False)



    class Meta:
        unique_together = ("institution_bank", "account_number")
        constraints = [
            UniqueConstraint(
                fields=["institution_bank", "account_number"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_account_number_per_instititution_bank",
            )
        ]

    def __str__(self):
        return f"{self.account_name} - {self.institution_bank.bank_fullname} - {self.institution_bank.institution.institution_name}"

    def get_institution(self):
        return self.institution_bank.institution


class InstitutionWorkingDays(BaseApprovableModel):
    institution = models.OneToOneField(
        Institution, related_name="working_days", on_delete=models.CASCADE
    )

    days = models.ManyToManyField(
        "settings.SystemDay",
        related_name="working_day",
        blank=True,
    )



    def __str__(self):
        return f"Working Days for {self.institution.institution_name}"

    def get_institution(self):
        return self.institution


class InstitutionTax(BaseApprovableModel):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, related_name="taxes"
    )
    tax_name = models.CharField(max_length=100, blank=False)
    tax_status = models.BooleanField(default=True)


    def __str__(self):
        return self.tax_name

    def get_institution(self):
        return self.institution

    class Meta:
        verbose_name_plural = "Institution Taxes"
        verbose_name = "Institution Tax"


class InstitutionTaxRule(BaseApprovableModel):
    institution_tax = models.ForeignKey(
        InstitutionTax, related_name="rules", on_delete=models.CASCADE
    )
    tax_rule_name = models.CharField(max_length=100, blank=False)
    tax_rule_description = models.TextField(blank=True, null=True)
    tax_rule_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True
    )
    tax_rule_fixed_amount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    salary_from = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    salary_to = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )

     

    def __str__(self):
        return self.tax_rule_name

    def get_institution(self):
        return self.institution_tax.institution


class Branch(BaseApprovableModel):
    institution = models.ForeignKey(
        Institution, related_name="branches", on_delete=models.CASCADE
    )

    paying_bank_account = models.ForeignKey(
        InstitutionBankAccount,
        related_name="paid_branches",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    branch_name = models.CharField(max_length=255, blank=True, null=True)
    branch_phone_number = models.CharField(max_length=20, blank=True, null=True)
    branch_location = models.CharField(max_length=255)
    branch_latitude = models.FloatField(blank=True, null=True)
    branch_longitude = models.FloatField(blank=True, null=True)
    branch_email = models.EmailField(max_length=255, blank=True, null=True)
    branch_opening_time = models.TimeField(default=time(8, 0, 0))
    branch_closing_time = models.TimeField(default=time(23, 0, 0))


    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if not self.paying_bank_account:
            first_account = (
                InstitutionBankAccount.objects.filter(
                    institution_bank__institution=self.institution
                )
                .order_by("created_at")
                .first()
            )
            if first_account:
                self.paying_bank_account = first_account

        super().save(*args, **kwargs)

        if is_new:
            BranchWorkingDays.objects.get_or_create(branch=self)

    def __str__(self):
        return (
            self.branch_location
            + " - "
            + self.institution.institution_name
            + " - "
            + self.branch_name
        )

    def get_institution(self):
        return self.institution


class BranchWorkingDays(BaseApprovableModel):
    branch = models.OneToOneField(
        "Branch", on_delete=models.CASCADE, related_name="working_days"
    )
    days = models.ManyToManyField(
        "settings.SystemDay",
        through="BranchDay",
        related_name="branch_working_days",
    )

    def __str__(self):
        return f"Branch Working days for: {self.branch.branch_name}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            self._create_branch_days()

        else:
            if not self.branch_days.exists():
                self._update_branch_days()

    def _create_branch_days(self):
        inst_working_days = InstitutionWorkingDays.objects.get(
            institution=self.branch.institution
        )

        for day in inst_working_days.days.all():
            BranchDay.objects.create(
                branch_working_days=self,
                day=day,
            )

    def _update_branch_days(self):
        inst_working_days = InstitutionWorkingDays.objects.get(
            institution=self.branch.institution
        )

        self.days.clear()

        for day in inst_working_days.days.all():
            BranchDay.objects.create(
                branch_working_days=self,
                day=day,
            )

        self.days.set(inst_working_days.days.all())

    def get_institution(self):
        return self.branch.institution


class BranchDay(models.Model):
    branch_working_days = models.ForeignKey(
        BranchWorkingDays, on_delete=models.CASCADE, related_name="branch_days"
    )

    day = models.ForeignKey("settings.SystemDay", on_delete=models.CASCADE)

    DAY_TYPE_CHOICES = (
        ("REMOTE", "Remote"),
        ("PHYSICAL", "Physical"),
    )

    day_type = models.CharField(
        choices=DAY_TYPE_CHOICES, max_length=255, default="PHYSICAL"
    )

    def __str__(self):
        return f"{self.branch_working_days.branch.branch_name} - {self.day.day_name}"

    class Meta:
        ordering = ("day__level",)


class BranchShift(BaseApprovableModel):
    branch = models.ForeignKey(
        "Branch", on_delete=models.CASCADE, related_name="shifts"
    )
    name = models.CharField(max_length=255)

    shift_day = models.ForeignKey(
        "BranchDay",
        on_delete=models.CASCADE,
        related_name="shifts",
        help_text="The day this shift occurs",
        # Will be deleted later
        blank=True,
        null=True,
    )
    start_time = models.TimeField()
    end_time = models.TimeField()

    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    def clean(self):
        branch_opening_time = self.branch.branch_opening_time
        branch_closing_time = self.branch.branch_closing_time

        if self.start_time < branch_opening_time:
            raise ValidationError(
                f"Shift start time ({self.start_time}) cannot be before branch opening time ({branch_opening_time})."
            )
        if self.end_time > branch_closing_time:
            raise ValidationError(
                f"Shift end time ({self.end_time}) cannot be after branch closing time ({branch_closing_time})."
            )
        if self.start_time >= self.end_time:
            raise ValidationError("Shift start time must be before end time.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ("branch", "name")
        ordering = (
            "shift_day__day__level",
            "name",
        )

    def get_institution(self):
        return self.branch.institution


class UserBranch(SoftDeletableTimeStampedModel):
    user = models.ForeignKey(
        "users.CustomUser", related_name="attached_branches", on_delete=models.CASCADE
    )
    branch = models.ForeignKey(
        Branch, related_name="attached_users", on_delete=models.CASCADE
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        unique_together = ["user", "branch"]
        verbose_name = "User Branch"
        verbose_name_plural = "User Branches"
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_default=True),
                name="unique_default_branch_per_user",
            )
        ]

    def save(self, *args, **kwargs):
        # Ensure only one default branch per user
        if self.is_default:
            UserBranch.objects.filter(user=self.user, is_default=True).exclude(
                id=self.id
            ).update(is_default=False)

        super().save(*args, **kwargs)

        # Update employee payroll_branch after saving
        self._update_employee_payroll_branch()

    def _update_employee_payroll_branch(self):
        """Update employee's payroll_branch if this is the default branch"""
        if self.is_default:
            from employee.models import Employee

            try:
                # Get the most recent employee for the user
                employee = Employee.objects.filter(user=self.user).order_by('-created_at').first()
                if employee:
                    employee.payroll_branch = self.branch
                    employee.save(update_fields=["payroll_branch"])
            except Employee.DoesNotExist:
                pass


class Department(BaseApprovableModel):
    name = models.CharField(max_length=255)
    description = models.TextField()
    institution = models.ForeignKey(
        Institution, related_name="departments", on_delete=models.CASCADE
    )
    # head_of_department = models.OneToOneField(
    #     "employee.Employee",
    #     related_name="department_head",
    #     on_delete=models.CASCADE,
    #     null=True,
    #     blank=True,
    # )


    def __str__(self):
        return self.name

    def get_institution(self):
        return self.institution


PENALTY_TYPES = [
    ("late_coming", "Late Coming"),
    ("early_leaving", "Early Leaving"),
    ("absent", "Absent"),
    ("no_response_spotcheck", "No Response for Spotcheck"),
    ("late_spotcheck_response", "Late Spotcheck Response"),
]

PENALTY_VALUE_TYPES = [
    ("fixed", "Fixed Amount"),
    ("percentage", "Percentage of Salary"),
]


class InstitutionPenaltyConfig(BaseApprovableModel):
    """Default penalty configuration at institution level"""

    institution = models.ForeignKey(
        Institution, related_name="penalty_config", on_delete=models.CASCADE
    )
    penalty_type = models.CharField(
        max_length=50, choices=PENALTY_TYPES, default="late_coming"
    )
    penalty_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)]
    )
    penalty_value_type = models.CharField(
        max_length=50, choices=PENALTY_VALUE_TYPES, default="fixed"
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        help_text="Percentage value when penalty_value_type is 'percentage'",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["institution", "penalty_type"],
                name="unique_institution_penalty_type",
            )
        ]

    def __str__(self):
        return f"Penalty Config for {self.institution.institution_name} - {self.get_penalty_type_display()}"

    def clean(self):
        super().clean()

        # prevent duplicates at validation level
        if (
            InstitutionPenaltyConfig.objects.exclude(pk=self.pk)
            .filter(institution=self.institution, penalty_type=self.penalty_type)
            .exists()
        ):
            raise ValidationError(
                {"error": "This penalty type already exists for this institution."}
            )

        if self.penalty_value_type == "percentage":
            if not self.percentage or self.percentage <= 0:
                raise ValidationError(
                    {
                        "error": "Percentage must be provided and greater than 0 when penalty type is percentage"
                    }
                )
        elif self.penalty_value_type == "fixed":
            if self.penalty_value <= 0:
                raise ValidationError(
                    {
                        "error": "Penalty value must be greater than 0 when penalty type is fixed"
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()  # ✅ ensures clean() is run
        return super().save(*args, **kwargs)

    def get_calculated_amount(self, employee_salary):
        """Calculate penalty amount based on method"""
        if self.penalty_value_type == "percentage":
            if not employee_salary or employee_salary <= 0:
                return 0.00
            if not self.percentage or self.percentage <= 0:
                return 0.00
            calculated = (employee_salary * self.percentage) / 100
            return calculated

        return self.penalty_value

    def get_institution(self):
        return self.institution


class BranchPenaltyConfig(BaseApprovableModel):
    """Branch-level penalty configuration (overrides institution defaults)"""

    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="penalty_configs"
    )
    penalty_type = models.CharField(max_length=50, choices=PENALTY_TYPES)
    penalty_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)]
    )
    penalty_value_type = models.CharField(
        max_length=20, choices=PENALTY_VALUE_TYPES, default="fixed"
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        help_text="Percentage value when penalty_value_type is 'percentage'",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "penalty_type"], name="unique_branch_penalty_type"
            )
        ]

    def __str__(self):
        return f"{self.get_penalty_type_display()} - {self.branch.branch_name}"

    def clean(self):
        super().clean()

        # prevent duplicates at validation level
        if (
            BranchPenaltyConfig.objects.exclude(pk=self.pk)
            .filter(branch=self.branch, penalty_type=self.penalty_type)
            .exists()
        ):
            raise ValidationError(
                {"error": "This penalty type already exists for this branch."}
            )

        if self.penalty_value_type == "percentage":
            if not self.percentage or self.percentage <= 0:
                raise ValidationError(
                    {
                        "error": "Percentage must be provided and greater than 0 when penalty type is percentage"
                    }
                )
        elif self.penalty_value_type == "fixed":
            if self.penalty_value <= 0:
                raise ValidationError(
                    {
                        "error": "Penalty value must be greater than 0 when penalty type is fixed"
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()  # ✅ ensures clean() is run
        return super().save(*args, **kwargs)

    def get_calculated_amount(self, employee_salary):
        """Calculate penalty amount based on method"""
        if self.penalty_value_type == "percentage":
            if not employee_salary or employee_salary <= 0:
                return 0.00
            if not self.percentage or self.percentage <= 0:
                return 0.00
            calculated = (employee_salary * self.percentage) / 100
            return calculated

        return self.penalty_value

    def get_institution(self):
        return self.branch.institution


class BranchLocationComparisonConfig(BaseApprovableModel):
    radius_in_meters = models.IntegerField(default=100)
    branch = models.OneToOneField(
        Branch, on_delete=models.CASCADE, related_name="location_comparison_settings"
    )

    def __str__(self):
        return f"Location Comparison Settings for {self.branch.branch_name}"

    def get_institution(self):
        return self.branch.institution
