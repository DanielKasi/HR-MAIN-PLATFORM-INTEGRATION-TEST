from decimal import Decimal
from django.db import models
from django.utils import timezone
from datetime import datetime
from institution.utils import generate_compliant_password
from utilities.helpers import (
    build_password_link,
    create_and_institution_otp,
    send_password_link_to_user,
    create_and_institution_token,
)

from django.db import models
from datetime import datetime
from institution.models import Branch, UserBranch
from datetime import date, datetime
from weasyprint import HTML
from django.template.loader import render_to_string
from django.core.files import File
import os
from django.conf import settings
import hashlib
from django.core.exceptions import ValidationError
import PyPDF2
from pdf2image import convert_from_bytes
import pytesseract
from django.core.files.base import ContentFile
import io
from io import BytesIO
from difflib import Differ, SequenceMatcher
import re
from django.db.models import UniqueConstraint, Q
import math
from utilities.utility_base_model import UtilityBaseModel


class EmployeeType(UtilityBaseModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_employee_type_name",
            ),
            UniqueConstraint(
                fields=["code"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_employee_type_code",
            ),
        ]


class WorkType(UtilityBaseModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_work_type_name",
            ),
            UniqueConstraint(
                fields=["code"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_work_type_code",
            ),
        ]


class Employee(UtilityBaseModel):
    """
    Employee model to store employee details in the system.
    """

    class Meta:
        verbose_name = "Employee"
        verbose_name_plural = "Employees"
        ordering = ["-created_at"]

    choices = (
        ("single", "Single"),
        ("married", "Married"),
        ("divorced", "Divorced"),
        ("widowed", "Widowed"),
    )

    user = models.OneToOneField(
        "users.CustomUser",
        on_delete=models.PROTECT,
        unique=True,
        blank=True,
        null=True,
        related_name="employees",
    )
    employee_id = models.CharField(
        max_length=10, unique=False, editable=False, blank=True
    )
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    position = models.ForeignKey(
        "recruitment.JobPosition",
        on_delete=models.PROTECT,
        related_name="employees",
        null=True,
        blank=True,
    )
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        "institution.Department",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="employees",
    )
    payroll_branch = models.ForeignKey(
        "institution.Branch",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="payroll_employees",
    )
    date_of_birth = models.DateField(blank=True, null=True)
    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="employees",
    )
    employee_type = models.ForeignKey(
        EmployeeType,
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="employees",
    )
    date_of_joining = models.DateField(default=timezone.now)
    address = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    nin = models.CharField(max_length=20, blank=True, null=True)
    nssf_no = models.CharField(max_length=20, blank=True, null=True)
    tin = models.CharField(max_length=12, blank=True, null=True)
    bank = models.CharField(max_length=50, blank=True, null=True)
    bank_account_number = models.CharField(max_length=20, blank=True, null=True)
    experience = models.PositiveIntegerField(default=0)
    qualifications = models.TextField(blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=50, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_relationship = models.CharField(
        max_length=30, blank=True, null=True
    )
    marital_status = models.CharField(max_length=10, choices=choices, default="single")
    children_count = models.PositiveIntegerField(default=0, blank=True, null=True)
    employee_profile_picture = models.ImageField(
        upload_to="employee_pictures/", blank=True, null=True
    )
    salary = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, null=True, blank=True
    )

    def __str__(self):
        return f"{self.user.fullname}  - {self.position}"

    class Meta:
        constraints = [
            # A OneToOneField is essentially a ForeignKey with unique=True
            # To make it conditional, we use a UniqueConstraint.
            UniqueConstraint(
                fields=["user"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_employee_user",
            ),
            UniqueConstraint(
                fields=["email"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_employee_email",
            ),
            UniqueConstraint(
                fields=["nin"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_employee_nin",
            ),
        ]

    def clean(self):
        """Custom validation for the Employee model"""
        super().clean()

        # 🚫 Enforce unique phone number only if provided
        if self.phone_number:
            existing = Employee.objects.filter(phone_number=self.phone_number)
            if self.pk:
                existing = existing.exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError(
                    "An employee with this phone number already exists."
                )

        # ✅ Validate minimum age of 18 years
        if self.date_of_birth:
            today = date.today()
            age = (
                today.year
                - self.date_of_birth.year
                - (
                    (today.month, today.day)
                    < (self.date_of_birth.month, self.date_of_birth.day)
                )
            )
            if age < 18:
                raise ValidationError(
                    f"Employee must be at least 18 years old. Current age: {age} years."
                )

        # Prevent future date of birth
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValidationError("Date of birth cannot be in the future.")

    @property
    def age(self):
        """Calculate and return the employee's current age"""
        if not self.date_of_birth:
            return None

        today = date.today()
        return (
            today.year
            - self.date_of_birth.year
            - (
                (today.month, today.day)
                < (self.date_of_birth.month, self.date_of_birth.day)
            )
        )

    def generate_employee_id(self):
        prefix = "EMP"
        last_employee = (
            Employee.objects.filter(employee_id__startswith=prefix)
            .order_by("-employee_id")
            .first()
        )

        if last_employee and last_employee.employee_id:
            last_number = int(last_employee.employee_id.replace(prefix, ""))
            new_number = last_number + 1
        else:
            new_number = 1

        return f"{prefix}{new_number:05d}"

    def save(self, *args, **kwargs):
        # 🔐 Ensure validations run before saving
        self.full_clean()

        is_new_employee = self.pk is None
        old_department = None
        old_gender = None
        old_is_active = None

        if not is_new_employee:
            old_employee = Employee.objects.get(pk=self.pk)
            old_department = old_employee.department
            old_gender = old_employee.gender
            old_is_active = old_employee.is_active

        if self.user and not self.payroll_branch:
            self.payroll_branch = self.get_default_branch()

        if self.position and hasattr(self.position, "salary"):
            self.salary = self.position.salary

        if not self.employee_id:
            self.employee_id = self.generate_employee_id()

        super().save(*args, **kwargs)

        should_initialize = (
            is_new_employee and self.is_active and self.department
        ) or (
            not is_new_employee
            and self.is_active
            and (
                old_department != self.department
                or old_gender != self.gender
                or (not old_is_active and self.is_active)
            )
        )

        if should_initialize:
            self.sync_leave_balances()

        # if is_new_employee and self.is_active:
        #     self.sync_employee_working_days()

    def sync_employee_working_days(self):
        department = self.department
        institution = getattr(department, "institution", None)

        if institution and hasattr(institution, "working_days"):
            institution_days = institution.working_days.days.all()

            employee_days, created = EmployeeWorkingDays.objects.get_or_create(
                employee=self
            )
            employee_days.days.set(institution_days)
            employee_days.save()

    def sync_leave_balances(self, year=None):
        """
        Synchronize leave balances for this employee.
        Creates missing balances and removes inappropriate ones (e.g., gender-specific).
        """
        if year is None:
            year = timezone.now().year

        from leave_mgt.models import LeaveType, LeaveBalance
        from leave_mgt.utils import LeaveCalculator

        if not self.department or not self.department.institution:
            return []

        institution = self.department.institution
        leave_types = LeaveType.objects.filter(is_active=True, institution=institution)

        synced_balances = []

        for leave_type in leave_types:
            self._cleanup_duplicate_balances(institution, leave_type, year)

            applies_to_employee = leave_type.gender_specific == "all" or (
                hasattr(self, "gender") and self.gender == leave_type.gender_specific
            )

            if applies_to_employee:
                entitlement = LeaveCalculator.calculate_leave_entitlement(
                    self, leave_type, year
                )

                balance, created = LeaveBalance.objects.get_or_create(
                    institution=institution,
                    employee=self,
                    leave_type=leave_type,
                    year=year,
                    defaults={
                        "allocated_days": entitlement,
                        "used_days": Decimal("0"),
                        "pending_days": Decimal("0"),
                        "carried_forward_days": Decimal("0"),
                    },
                )

                if not created and balance.allocated_days != entitlement:
                    balance.allocated_days = entitlement
                    balance.save()

                synced_balances.append(balance)
            else:
                LeaveBalance.objects.filter(
                    institution=institution,
                    employee=self,
                    leave_type=leave_type,
                    year=year,
                    used_days=0,
                    pending_days=0,
                ).delete()

        return synced_balances

    def _cleanup_duplicate_balances(self, institution, leave_type, year):
        """
        Clean up duplicate leave balances for this employee, leave type, and year.
        """
        from leave_mgt.models import LeaveBalance

        duplicates = LeaveBalance.objects.filter(
            institution=institution, employee=self, leave_type=leave_type, year=year
        ).order_by("-used_days", "-pending_days", "-created_at")

        if duplicates.count() > 1:
            keeper = duplicates.first()
            duplicates.exclude(id=keeper.id).delete()
            return True
        return False

    def get_leave_balance_summary(self, year=None):
        """Get leave balance summary for this employee"""
        from leave_mgt.utils import LeaveBalanceManager

        return LeaveBalanceManager.get_employee_balance_summary(self, year)

    def get_default_branch(self):
        """Get the default branch for this employee"""
        try:
            user_branch = UserBranch.objects.get(user=self.user, is_default=True)
            return user_branch.branch
        except UserBranch.DoesNotExist:
            institution = self.department.institution

            if institution:
                return institution.branches.first()
            return None

    def get_all_branches(self):
        """Get all branches this employee is attached to"""
        return Branch.objects.filter(attached_users__user=self.user)

    def is_attached_to_branch(self, branch):
        """Check if employee is attached to a specific branch"""
        return UserBranch.objects.filter(user=self.user, branch=branch).exists()

    def should_generate_password(self):
        """
        Check if password should be generated for this employee.
        """
        if not self.user or not self.position or not self.position.department:
            return False

        try:
            institution_owner = self.position.department.institution.institution_owner
            return self.user != institution_owner
        except AttributeError:
            return False

    def generate_and_set_password(self):
        """Generate and set a compliant password for the user."""
        from django.contrib.auth.hashers import make_password
        import string
        import random

        def generate_compliant_password(length=12):
            lowercase = string.ascii_lowercase
            uppercase = string.ascii_uppercase
            digits = string.digits
            special = string.punctuation

        password = [
            random.choice(lowercase),
            random.choice(uppercase),
            random.choice(digits),
            random.choice(special),
        ]

        all_characters = lowercase + uppercase + digits + special
        for _ in range(length - 4):
            password.append(random.choice(all_characters))

        random.shuffle(password)
        return "".join(password)

        random_password = generate_compliant_password()
        self.user.set_password(random_password)
        self.user.is_password_verified = False
        self.user.save()
        return random_password

    def create_password_token_and_send_link(self, request):
        """Create token and send password link to user."""
        from django.urls import reverse
        from django.core.mail import send_mail
        import uuid
        from datetime import timedelta

        def create_and_institution_token(user, purpose, expiry_minutes):
            token = uuid.uuid4().hex
            Token.objects.create(
                user=user,
                token=token,
                purpose=purpose,
                expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
            )
            return token

        def build_password_link(request, token):
            return request.build_absolute_uri(
                reverse("set_password", kwargs={"token": token})
            )

        def send_password_link_to_user(user, link):
            send_mail(
                subject="Set Your Password",
                message=f"Please use the following link to set your password: {link}",
                from_email="no-reply@yourinstitution.com",
                recipient_list=[user.email],
                fail_silently=False,
            )

        token = create_and_institution_token(
            user=self.user, purpose="registration", expiry_minutes=15
        )
        password_link = build_password_link(request=request, token=token)
        send_password_link_to_user(user=self.user, link=password_link)
        return True

    def setup_employee_password(self, request):
        """
        Complete password setup process for new employees.
        """
        if not self.should_generate_password():
            return {"success": False, "reason": "Institution owner or invalid data"}

        try:
            password = self.generate_and_set_password()
            link_sent = self.create_password_token_and_send_link(request)
            return {
                "success": True,
                "password_generated": bool(password),
                "link_sent": link_sent,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


class EmployeeWorkingDays(models.Model):
    employee = models.OneToOneField(
        Employee, on_delete=models.CASCADE, related_name="custom_working_days"
    )

    days = models.ManyToManyField(
        "settings.SystemDay",
        related_name="employee_working_days",
        help_text="Must be selected from institution's working days",
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee.user.fullname} - Custom Working Days"


class EmployeeAttendance(UtilityBaseModel):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField(auto_now_add=True)
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    check_in_latitude = models.FloatField(null=True, blank=True)
    check_in_longitude = models.FloatField(null=True, blank=True)
    check_out_latitude = models.FloatField(null=True, blank=True)
    check_out_longitude = models.FloatField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("approved", "Approved"),
            ("rejected", "Rejected"),
            ("pending", "Pending"),
        ],
        default="pending",
    )
    overtime_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00, null=True, blank=True
    )

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.date} - {self.status}"

    def calculate_overtime_hours(self):

        if (
            self.date
            and self.check_out_time
            and self.employee
            and self.employee.payroll_branch
        ):
            branch_end_time = self.employee.payroll_branch.branch_closing_time

            datetime_checkout = datetime.combine(self.date, self.check_out_time)
            datetime_end = datetime.combine(self.date, branch_end_time)

            if datetime_checkout > datetime_end:
                overtime_duration = datetime_checkout - datetime_end
                hours = round(overtime_duration.total_seconds() / 3600, 2)
                return hours
        return 0.0

    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        if None in (lat1, lon1, lat2, lon2):
            return float("inf")

        R = 6371000  # Earth radius in meters

        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _is_location_valid(self, latitude, longitude):
        """
        Check if the given location is within 100 meters of any attached branch.
        """

        THRESHOLD_METERS = 500

        attached_branches = self.employee.get_all_branches()
        if not attached_branches.exists():
            return False

        for branch in attached_branches:
            if branch.branch_latitude is None or branch.branch_longitude is None:
                continue
            distance = self._haversine_distance(
                latitude, longitude, branch.branch_latitude, branch.branch_longitude
            )
            if distance <= THRESHOLD_METERS:
                return True
        return False

    def clean(self):
        super().clean()

        # Validate check-in location if provided
        if self.check_in_time and (
            self.check_in_latitude is not None or self.check_in_longitude is not None
        ):
            if self.check_in_latitude is None or self.check_in_longitude is None:
                raise ValidationError(
                    "Both check-in latitude and longitude must be provided if one is set."
                )
            if not self._is_location_valid(
                self.check_in_latitude, self.check_in_longitude
            ):
                raise ValidationError(
                    "Check-in location does not match any attached branch location."
                )

        # Validate check-out location if provided
        if self.check_out_time and (
            self.check_out_latitude is not None or self.check_out_longitude is not None
        ):
            if self.check_out_latitude is None or self.check_out_longitude is None:
                raise ValidationError(
                    "Both check-out latitude and longitude must be provided if one is set."
                )
            if not self._is_location_valid(
                self.check_out_latitude, self.check_out_longitude
            ):
                raise ValidationError(
                    "Check-out location does not match any attached branch location."
                )

    def save(self, *args, **kwargs):

        if self.date is None:
            self.date = datetime.today().date()

        self.full_clean()

        self.overtime_hours = self.calculate_overtime_hours()
        super().save(*args, **kwargs)


class EmployeeContract(UtilityBaseModel):
    STATUS_CHOICES = (
        ("MATCHED_NEEDS_REVIEW", "Matched, Needs Review"),
        ("NOT_MATCHED_NEEDS_REVIEW", "Not Matched, Needs Review"),
        ("APPROVED", "Approved"),
    )

    applicant = models.ForeignKey(
        "recruitment.JobAdvertApplication",
        on_delete=models.CASCADE,
        related_name="applicant_contract",
        null=True,
        blank=True,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="contracts",
        null=True,
        blank=True,
    )
    contract_reference = models.CharField(max_length=20, blank=True, null=True)
    original_contract = models.FileField(
        upload_to="contracts/original/", blank=True, null=True
    )
    signed_contract = models.FileField(
        upload_to="contracts/signed/", blank=True, null=True
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="PENDING",
        blank=True,
    )

    differences = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Contract {self.contract_reference} "

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["contract_reference"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_contract_reference",
            )
        ]

    def generate_contract_reference(self):
        prefix = "CON"
        last_contract = (
            EmployeeContract.objects.filter(contract_reference__startswith=prefix)
            .order_by("-contract_reference")
            .first()
        )
        if last_contract and last_contract.contract_reference:
            last_number = int(last_contract.contract_reference.replace(prefix, ""))
            new_number = last_number + 1
        else:
            new_number = 1
        return f"{prefix}{new_number:05d}"

    def normalize_text(self, text):
        """Normalize text by removing extra whitespace and standardizing punctuation."""
        text = re.sub(r"\s+", " ", text.strip())
        text = re.sub(r"[.,;:!?]+", "", text)
        return text.lower()

    def extract_text_from_pdf(self, file_content):
        """Extract text from PDF content using PyPDF2, returning page-by-page text."""

        pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
        page_count = len(pdf_reader.pages)
        pages_text = []
        for page_num, page in enumerate(pdf_reader.pages, 1):
            page_text = page.extract_text() or ""
            normalized_text = self.normalize_text(page_text)
            print(f"Page {page_num} extracted text length: {len(normalized_text)}")
            pages_text.append(normalized_text)
        return pages_text

    def extract_text_with_ocr(self, file_content, max_pages=3):
        """Extract text from PDF content using OCR, returning page-by-page text."""
        try:
            images = convert_from_bytes(file_content, first_page=1, last_page=max_pages)
            pages_text = []
            for image_num, image in enumerate(images, 1):
                page_text = pytesseract.image_to_string(image)
                normalized_text = self.normalize_text(page_text)
                print(f"OCR text length for image {image_num}: {len(normalized_text)}")
                pages_text.append(normalized_text)
            return pages_text
        except Exception as e:
            raise ValidationError(f"OCR failed: {str(e)}")

    def compare_contracts(self):
        """Compare original_contract and signed_contract, setting status."""
        if not self.original_contract or not self.signed_contract:
            self.status = "NOT_MATCHED_NEEDS_REVIEW"
            return

        try:
            # Read original_contract content
            with self.original_contract.open("rb") as original_file:
                original_content = original_file.read()

            # Read signed_contract content
            with self.signed_contract.open("rb") as signed_file:
                signed_content = signed_file.read()

            original_pages = self.extract_text_from_pdf(original_content)
            if not any(original_pages):
                print("No text extracted from original_contract, trying OCR")
                original_pages = self.extract_text_with_ocr(original_content)
            if not any(original_pages):
                self.status = "NOT_MATCHED_NEEDS_REVIEW"
                raise ValidationError("Cannot extract text from original contract.")

            # Extract text from signed_contract
            signed_pages = self.extract_text_from_pdf(signed_content)
            if not any(signed_pages):

                signed_pages = self.extract_text_with_ocr(signed_content)
            if not any(signed_pages):

                self.status = "NOT_MATCHED_NEEDS_REVIEW"
                raise ValidationError("Cannot extract text from signed contract.")

            # Compare number of pages
            if len(original_pages) != len(signed_pages):
                self.status = "NOT_MATCHED_NEEDS_REVIEW"
                # raise ValidationError(
                #     f"Page count mismatch: original has {len(original_pages)} pages, signed has {len(signed_pages)} pages"
                # )

            # Compare page-by-page, focusing on word differences
            differences = []
            for page_num, (orig_text, sign_text) in enumerate(
                zip(original_pages, signed_pages), 1
            ):
                if orig_text != sign_text:
                    print(f"Page {page_num} differs")
                    matcher = SequenceMatcher(
                        None, orig_text.split(), sign_text.split()
                    )
                    word_diffs = []
                    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                        if tag in ("replace", "delete", "insert"):
                            orig_words = (
                                " ".join(orig_text.split()[i1:i2])[:100] or "None"
                            )
                            sign_words = (
                                " ".join(sign_text.split()[j1:j2])[:100] or "None"
                            )
                            word_diffs.append(f"- Original: {orig_words}")
                            word_diffs.append(f"+ Signed: {sign_words}")
                    if word_diffs:
                        differences.append(
                            f"Page {page_num} differences:\n"
                            + "\n".join(word_diffs[:3])
                        )
                    else:
                        differences.append(
                            f"Page {page_num} differs (no specific word differences detected)"
                        )

            if differences:
                self.status = "NOT_MATCHED_NEEDS_REVIEW"
                diff_message = "\n".join(differences[:3])
                # raise ValidationError(
                #     f"The signed contract content does not match the original contract at:\n{diff_message}"
                # )
                self.differences = diff_message

            else:
                self.status = "MATCHED_NEEDS_REVIEW"

        except ValidationError as e:
            self.status = "NOT_MATCHED_NEEDS_REVIEW"
            raise e
        except Exception as e:
            self.status = "NOT_MATCHED_NEEDS_REVIEW"
            raise ValidationError(f"Error comparing contracts: {str(e)}")

    def save(self, *args, **kwargs):
        if not self.contract_reference:
            self.contract_reference = self.generate_contract_reference()

        if self.signed_contract and not self.original_contract:
            self.status = "NOT_MATCHED_NEEDS_REVIEW"

        super().save(*args, **kwargs)
