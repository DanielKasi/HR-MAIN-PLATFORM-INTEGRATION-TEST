from django.db import models
from datetime import time, datetime
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from django.core.exceptions import ValidationError
import logging
from utilities.default_document_types import DEFAULT_DOCUMENT_TYPES
from utilities.default_data import default_data
from django.db import transaction
from django.utils import timezone
from recruitment.models import JobPosition
import json
from django.utils import timezone
from django.db.models import UniqueConstraint, Q
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from django.core.validators import MinValueValidator, MaxValueValidator


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
        "users.System", on_delete=models.PROTECT, blank=True, null=True
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
    zoom_account_id = models.CharField(max_length=100, blank=True, null=True)
    zoom_client_id = models.CharField(max_length=100, blank=True, null=True)
    zoom_client_secret = models.CharField(max_length=100, blank=True, null=True)
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
        on_delete=models.PROTECT,
        blank=True,
        null=True,
    )
    rejection_reason = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_institutions",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

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
        from calendar2.models import Calendar
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

                Branch.objects.create(
                    institution=self,
                    branch_name=f"{self.institution_name} Main Branch",
                    branch_phone_number=self.first_phone_number,
                    branch_location="Main Location",
                    branch_email=self.institution_email,
                    created_by=self.created_by,
                    paying_bank_account=bank_account,
                )

                self._create_institution_working_days()

    def _create_institution_working_days(self):
        from settings.models import SystemDay

        working_days, created = InstitutionWorkingDays.objects.get_or_create(
            institution=self
        )
        if created:
            working_days.days.set(SystemDay.objects.all())

    def _create_calendar_for_institution(self):
        from calendar2.models import Calendar

        current_year = datetime.now().year
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


class InstitutionBankType(SoftDeletableTimeStampedModel):
    institution = models.ForeignKey(
        Institution, related_name="banks", on_delete=models.CASCADE
    )
    bank_fullname = models.CharField(max_length=255, blank=False, null=False)
    bank_code = models.CharField(max_length=20, blank=False, null=False)
    br_code = models.CharField(max_length=20, blank=False, null=False)
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_institution_banks",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        "users.CustomUser",
        related_name="updated_institution_banks",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Type: {self.bank_fullname} FOR {self.institution.institution_name}"


class InstitutionBankAccount(SoftDeletableTimeStampedModel):
    institution_bank = models.ForeignKey(
        InstitutionBankType, related_name="accounts", on_delete=models.CASCADE
    )
    account_name = models.CharField(max_length=255, blank=False, null=False)
    account_number = models.CharField(max_length=50, blank=False, null=False)

    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_institution_bank_accounts",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        "users.CustomUser",
        related_name="updated_institution_bank_accounts",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

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


class InstitutionWorkingDays(SoftDeletableTimeStampedModel):
    institution = models.OneToOneField(
        Institution, related_name="working_days", on_delete=models.CASCADE
    )

    days = models.ManyToManyField(
        "settings.SystemDay",
        related_name="working_day",
        blank=True,
    )

    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_institution_working_days",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        "users.CustomUser",
        related_name="updated_institution_working_days",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Working Days for {self.institution.institution_name}"


class InstitutionTax(SoftDeletableTimeStampedModel):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, related_name="taxes"
    )
    tax_name = models.CharField(max_length=100, blank=False)
    tax_status = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.CASCADE,
        related_name="created_taxes",
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.CASCADE,
        related_name="updated_taxes",
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.tax_name

    class Meta:
        verbose_name_plural = "Institution Taxes"
        verbose_name = "Institution Tax"


class InstitutionTaxRule(SoftDeletableTimeStampedModel):
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

    updated_by = models.ForeignKey(
        "users.CustomUser",
        related_name="updated_tax_rules",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_tax_rules",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.tax_rule_name


class Branch(SoftDeletableTimeStampedModel):
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
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_branches",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    def save(self, *args, **kwargs):
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

    def __str__(self):
        return (
            self.branch_location
            + " - "
            + self.institution.institution_name
            + " - "
            + self.branch_name
        )


# Many to many relationship between branches and users
# user can have multiple branches and branches can have multiple users
class UserBranch(models.Model):
    user = models.ForeignKey(
        "users.CustomUser", related_name="attached_branches", on_delete=models.CASCADE
    )
    branch = models.ForeignKey(
        Branch, related_name="attached_users", on_delete=models.CASCADE
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_user_branches",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

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
                employee = Employee.objects.get(user=self.user)
                employee.payroll_branch = self.branch
                employee.save(update_fields=["payroll_branch"])
            except Employee.DoesNotExist:
                pass

    def __str__(self):
        return self.user.email + " - " + self.branch.branch_location


class Department(SoftDeletableTimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.TextField()
    institution = models.ForeignKey(
        Institution, related_name="departments", on_delete=models.CASCADE
    )
    # head_of_department = models.OneToOneField(
    #     "employee.Employee",
    #     related_name="department_head",
    #     on_delete=models.PROTECT,
    #     null=True,
    #     blank=True,
    # )
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_departments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.name


PENALTY_TYPES = [
    ("late_coming", "Late Coming"),
    ("early_leaving", "Early Leaving"),
    ("absent", "Absent"),
    ("no_response_spotcheck", "No Response for Spotcheck"),
    ("late_spotcheck_response", "Late Spotcheck Response"),
]

PENALTY_VALUE_TYPES = [
    ('fixed', 'Fixed Amount'),
    ('percentage', 'Percentage of Salary'),
]

class InstitutionPenaltyConfig(SoftDeletableTimeStampedModel):
    """Default penalty configuration at institution level"""
    institution = models.ForeignKey(
        Institution, related_name="penalty_config", on_delete=models.CASCADE
    )
    penalty_type = models.CharField(
        max_length=50, choices=PENALTY_TYPES, default="late_coming"
    )
    penalty_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)]
    )
    penalty_value_type = models.CharField(
        max_length=50, choices=PENALTY_VALUE_TYPES, default='fixed'
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        help_text="Percentage value when penalty_value_type is 'percentage'"
    )



    def __str__(self):
        return f"Penalty Config for {self.institution.institution_name} - {self.get_penalty_type_display()}"

    def clean(self):
        from django.core.exceptions import ValidationError
        
        if self.penalty_value_type == 'percentage':
            if not self.percentage or self.percentage <= 0:
                raise ValidationError("Percentage must be provided and greater than 0 when penalty type is percentage")
        elif self.penalty_value_type == 'fixed':
            if self.penalty_value <= 0:
                raise ValidationError("Penalty value must be greater than 0 when penalty type is fixed")

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

class BranchPenaltyConfig(SoftDeletableTimeStampedModel):
    """Branch-level penalty configuration (overrides institution defaults)"""
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="penalty_configs"
    )
    penalty_type = models.CharField(
        max_length=50,
        choices=PENALTY_TYPES
    )
    penalty_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0)]
    )
    penalty_value_type = models.CharField(
        max_length=20,
        choices=PENALTY_VALUE_TYPES,
        default='fixed'
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        help_text="Percentage value when penalty_value_type is 'percentage'"
    )




    def __str__(self):
        return f"{self.get_penalty_type_display()} - {self.branch.branch_name}"

    def clean(self):
        from django.core.exceptions import ValidationError
        
        if self.penalty_value_type == 'percentage':
            if not self.percentage or self.percentage <= 0:
                raise ValidationError("Percentage must be provided and greater than 0 when penalty type is percentage")
        elif self.penalty_value_type == 'fixed':
            if self.penalty_value <= 0:
                raise ValidationError("Penalty value must be greater than 0 when penalty type is fixed")

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

class BranchLocationComaparisonConfig(SoftDeletableTimeStampedModel):
    radius_in_meters = models.IntegerField(default=100)
    branch = models.OneToOneField(
        Branch,
        on_delete=models.CASCADE,
        related_name="location_comparison_settings"
    )

    def __str__(self):
        return f"Location Comparison Settings for {self.branch.branch_name}"            
