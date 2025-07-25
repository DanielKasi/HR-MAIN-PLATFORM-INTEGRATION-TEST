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
from rest_framework.exceptions import ValidationError


class EmployeeType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, unique=True, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class WorkType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, unique=True, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Employee(models.Model):
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
        blank=True,
        null=True,
        related_name="employees",
    )
    employee_id = models.CharField(
        max_length=10, unique=False, editable=False, blank=True
    )
    email = models.EmailField(unique=True, blank=True, null=True)
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
        'institution.Branch',
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
    nin = models.CharField(max_length=20, unique=True, blank=True, null=True)
    nssf_no = models.CharField(max_length=20, blank=True, null=True)
    tin = models.CharField(max_length=12, blank=True, null=True)
    bank = models.CharField(max_length=50, blank=True, null=True)
    bank_account_number = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
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

    def clean(self):
        """Custom validation for the Employee model"""
        super().clean()

        # Validate minimum age of 18 years
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
                    {
                        "date_of_birth": f"Employee must be at least 18 years old. Current age: {age} years."
                    }
                )

        # Validate date of birth is not in the future
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValidationError(
                {"date_of_birth": "Date of birth cannot be in the future."}
            )

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
        is_new_employee = self.pk is None
        old_department = None
        old_gender = None
        old_is_active = None

        # Get old values for comparison if updating
        if not is_new_employee:
            old_employee = Employee.objects.get(pk=self.pk)
            old_department = old_employee.department
            old_gender = old_employee.gender
            old_is_active = old_employee.is_active

        # Auto-set payroll_branch to default branch if not set
        if self.user and not self.payroll_branch:
            self.payroll_branch = self.get_default_branch()

        if self.position and hasattr(self.position, "salary"):
            if is_new_employee:
                self.salary = self.position.salary
            else:
                self.salary = self.position.salary

        # Generate employee_id if not set
        if not self.employee_id:
            self.employee_id = self.generate_employee_id()

        super().save(*args, **kwargs)

        # Create contract for new employees
        if is_new_employee:
            try:
                contract = Contract(employee=self, start_date=self.date_of_joining)
                contract.save()  # This will trigger contract generation
            except Exception as e:
                print(f"Failed to create contract for employee {self.employee_id}: {e}")

        # Initialize or update leave balances based on changes
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
            characters = string.ascii_letters + string.digits + string.punctuation
            password = ''.join(random.choice(characters) for _ in range(length))
            return password

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
                expires_at=timezone.now() + timedelta(minutes=expiry_minutes)
            )
            return token

        def build_password_link(request, token):
            return request.build_absolute_uri(
                reverse('set_password', kwargs={'token': token})
            )

        def send_password_link_to_user(user, link):
            send_mail(
                subject='Set Your Password',
                message=f'Please use the following link to set your password: {link}',
                from_email='no-reply@yourinstitution.com',
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


class EmployeeAttendance(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField(auto_now_add=True)
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
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

    def save(self, *args, **kwargs):

        if self.date is None:
            self.date = datetime.today().date()

        self.overtime_hours = self.calculate_overtime_hours()
        super().save(*args, **kwargs)


class Contract(models.Model):
    """
    Model to store employment contract details for an employee.
    """
    class Meta:
        verbose_name = "Contract"
        verbose_name_plural = "Contracts"
        ordering = ["-created_at"]

    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("active", "Active"),
        ("expired", "Expired"),
        ("terminated", "Terminated"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="contracts",
    )
    contract_id = models.CharField(
        max_length=15, unique=True, editable=False, blank=True
    )
    contract_file = models.FileField(
        upload_to="contracts/", blank=True, null=True
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="draft"
    )
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Contract {self.contract_id} - {self.employee.user.fullname}"

    def generate_contract_id(self):
        """Generate a unique contract ID."""
        prefix = "CON"
        last_contract = (
            Contract.objects.filter(contract_id__startswith=prefix)
            .order_by("-contract_id")
            .first()
        )
        if last_contract and last_contract.contract_id:
            last_number = int(last_contract.contract_id.replace(prefix, ""))
            new_number = last_number + 1
        else:
            new_number = 1
        return f"{prefix}{new_number:06d}"

    def generate_contract_pdf(self):
        print(f"Starting PDF generation for contract {self.contract_id}")
        output_dir = os.path.join(settings.MEDIA_ROOT, "contracts")
        print(f"Output directory: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)

        # Prepare data for the contract
        context = {
            'institution_name': (
                self.employee.department.institution.institution_name
                if self.employee.department and self.employee.department.institution
                else "Your Institution Name"
            ),
            'institution_address': (
                self.employee.department.institution.location
                if self.employee.department and self.employee.department.institution
                else "Your Institution Address"
            ),
            'employee_name': self.employee.user.fullname if self.employee.user else "Unknown Employee",
            'position_title': self.employee.position.name if self.employee.position else "Unknown Position",
            'department_name': self.employee.department.name if self.employee.department else "Unknown Department",
            'work_type': self.employee.work_type.name if self.employee.work_type else "Full-Time",
            'salary': f"{int(self.employee.salary):,}" if self.employee.salary else "0",
            'start_date': self.start_date.strftime("%B %d, %Y") if self.start_date else "Unknown Date",
            'employee_address': self.employee.address if self.employee.address else "Unknown Address",
            'employee_country': self.employee.country if self.employee.country else "Unknown Country",
            'signing_date': timezone.now().strftime("%B %d, %Y"),
            'contract_id': self.contract_id or self.generate_contract_id(),
        }
        print(f"Prepared context: institution={context['institution_name']}, employee={context['employee_name']}")

        # Render HTML template
        try:
            html_content = render_to_string('employment_contract_template.html', context)
            print("HTML template rendered successfully")
        except Exception as e:
            print(f"Failed to render HTML template: {str(e)}")
            raise

        # Convert to PDF
        pdf_path = os.path.join(output_dir, f"contract_{self.contract_id}.pdf")
        print(f"Saving PDF to: {pdf_path}")
        try:
            HTML(string=html_content).write_pdf(pdf_path)
            print("PDF generated successfully")
        except Exception as e:
            print(f"Failed to generate PDF with WeasyPrint: {str(e)}")
            raise

        # Save to contract_file
        with open(pdf_path, "rb") as pdf_file:
            self.contract_file.save(f"contract_{self.contract_id}.pdf", File(pdf_file))
        print(f"PDF saved to contract_file: {self.contract_file.path}")

        return pdf_path

    def save(self, *args, **kwargs):
        if not self.contract_id:
            self.contract_id = self.generate_contract_id()
        super().save(*args, **kwargs)
        if not self.contract_file:
            try:
                if not self.employee.department or not self.employee.department.institution:
                    print(f"Skipping PDF generation for contract {self.contract_id}: Missing department or institution")
                    return
                print(f"Generating PDF for contract {self.contract_id}")
                self.generate_contract_pdf()
                self.status = "active"
                super().save(*args, **kwargs)
                print(f"PDF generated and saved for contract {self.contract_id}")
            except Exception as e:
                print(f"Failed to generate contract PDF for contract {self.contract_id}: {str(e)}")
