from decimal import Decimal
from dj_database_url import config
from django.db import models, transaction
from django.utils import timezone
import requests
from calendar2.models import Calendar, Event
from django.db import models
from datetime import datetime, time
from settings.models import EmailProviderConfig
from institution.models import Branch, InstitutionBankType, UserBranch
from datetime import date, datetime
from django.core.exceptions import ValidationError
import PyPDF2
from pdf2image import convert_from_bytes
import pytesseract
from io import BytesIO
from difflib import SequenceMatcher
import re
from django.db.models import UniqueConstraint, Q, Sum, Count
import math
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from institution.models import Institution
from approval.models import Approval, BaseApprovableModel
from django.core.validators import MinValueValidator, MaxValueValidator
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from celery import uuid

class EmployeeType(BaseApprovableModel):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.name

    def get_institution(self):
        return self.institution


class WorkType(BaseApprovableModel):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.name

    def get_institution(self):
        return self.institution


class EmployeeBankAccount(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(
        "Employee", on_delete=models.CASCADE, related_name="bank_accounts"
    )
    bank = models.ForeignKey(
        InstitutionBankType,
        on_delete=models.CASCADE,
        related_name="employee_bank_accounts",
    )
    account_name = models.CharField(max_length=50)
    account_number = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.bank.bank_fullname} - {self.account_number}"


class NextOfKin(SoftDeletableTimeStampedModel):
    RELATIONSHIP_CHOICES = [
        ("parent", "Parent"),
        ("spouse", "Spouse"),
        ("child", "Child"),
        ("friend", "Friend"),
        ("sibling", "Sibling"),
        ("other", "Other"),
    ]
    employee = models.ForeignKey(
        "Employee", on_delete=models.CASCADE, related_name="next_of_kins"
    )
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=50)
    address = models.CharField(max_length=255)
    relationship = models.CharField(max_length=50, choices=RELATIONSHIP_CHOICES)

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.relationship}"


class Child(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(
        "Employee", on_delete=models.CASCADE, related_name="children"
    )
    name = models.CharField(max_length=50)
    date_of_birth = models.DateField()
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        default="other",
    )

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.name}"


class Spouse(SoftDeletableTimeStampedModel):
    employee = models.OneToOneField(
        "Employee", on_delete=models.CASCADE, related_name="spouse"
    )
    name = models.CharField(max_length=50)
    date_of_birth = models.DateField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.name}"


class QualificationAward(SoftDeletableTimeStampedModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Education(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(
        "Employee", on_delete=models.CASCADE, related_name="educations"
    )
    institution = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    qualification = models.ForeignKey(
        QualificationAward,
        on_delete=models.SET_NULL,
        related_name="educations",
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.qualification}"


class WorkExperience(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(
        "Employee", on_delete=models.CASCADE, related_name="work_experiences"
    )
    company = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    duration = models.CharField(max_length=50)
    reason_of_leaving = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.company}"



class EmployeeBirthdayTask(models.Model):
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE)
    task_id = models.CharField(max_length=255)
    scheduled_date = models.DateField()

class Employee(BaseApprovableModel):
    """
    Employee model to store employee details in the system.
    """

    class Meta:
        verbose_name = "Employee"
        verbose_name_plural = "Employees"
        ordering = ["user__fullname"]
        indexes = [
            models.Index(fields=['date_of_birth']),
        ]

    choices = (
        ("single", "Single"),
        ("married", "Married"),
        ("divorced", "Divorced"),
        ("widowed", "Widowed"),
    )

    user = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="employees",
    )
    name = models.CharField(max_length=255, blank=True, null=True)
    employee_id = models.CharField(
        max_length=10, unique=False, editable=False, blank=True
    )
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    position = models.ForeignKey(
        "recruitment.JobPosition",
        on_delete=models.CASCADE,
        related_name="employees",
        null=True,
        blank=True,
    )
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        default="other",
    )
    department = models.ForeignKey(
        "institution.Department",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="employees",
    )
    payroll_branch = models.ForeignKey(
        "institution.Branch",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="branch_payroll_employees",
    )
    date_of_birth = models.DateField(blank=True, null=True)
    work_type = models.ForeignKey(
        'employee.WorkType',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="employees",
    )
    employee_type = models.ForeignKey(
        'employee.EmployeeType',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="employees",
    )
    date_of_joining = models.DateField(default=timezone.now, null=True, blank=True)
    address = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    nin = models.CharField(max_length=20, blank=True, null=True)
    nssf_no = models.CharField(max_length=20, blank=True, null=True)
    tin = models.CharField(max_length=12, blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    marital_status = models.CharField(max_length=10, choices=choices, default="single")
    has_children = models.BooleanField(default=False)
    employee_profile_picture = models.ImageField(
        upload_to="employee_pictures/", blank=True, null=True
    )
    salary = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, null=True, blank=True
    )

    def __str__(self):
        return f"{self.user.fullname}  - {self.position}"

    def get_institution(self):
        return self.department.institution

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            date_of_joining__range=(start_date, end_date),
            department__institution=institution,
            **filters
        ).select_related('user', 'position', 'department', 'payroll_branch', 'work_type', 'employee_type')
        return list(queryset.values(
            'name',
            'employee_id',
            'email',
            'phone_number',
            'position__name',
            'department__name',
            'payroll_branch__name',
            'work_type__name',
            'employee_type__name',
            'date_of_joining',
            'gender',
            'marital_status',
            'salary'
        ))

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

        # Prevent future date of birth
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValidationError({"error": f"Date of birth cannot be in the future."})

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

    def create_birthday_event(self):
        if not self.date_of_birth or not self.department or not self.is_active:
            return
        if hasattr(self, 'deleted_at') and self.deleted_at:
            return
        institution = self.get_institution()
        if not institution or not self.user or not hasattr(self.user, 'profile') or not self.user.profile:
            return
        current_year = date.today().year
        calendar, _ = Calendar.objects.get_or_create(
            institution=institution,
            year=current_year,
            defaults={'deleted_at': None}
        )
        birthday_date = self.date_of_birth.replace(year=current_year)
        if birthday_date < date.today():
            birthday_date = birthday_date.replace(year=current_year + 1)
        
        existing_events = Event.objects.filter(
            is_birthday=True,
            institution=institution
        ).filter(specific_employees=self.user.profile)
        
        if existing_events.count() > 1:
            for event in existing_events[1:]:
                event.delete()
            event = existing_events.first()
            created = False
        elif existing_events.exists():
            event = existing_events.first()
            created = False
        else:
            event = Event.objects.create(
                is_birthday=True,
                institution=institution,
                title=f"{self.user.fullname}'s Birthday",
                date=birthday_date,
                description=f"Birthday celebration for {self.user.fullname}",
                target_audience='individual',
                event_mode='physical',
                department=self.department,
                frequency='yearly',
                repeat_until=birthday_date + relativedelta(years=20),
            )
            created = True
        
        if created:
            event.specific_employees.add(self.user.profile)
        else:
            event.specific_employees.set([self.user.profile])
            event.title = f"{self.user.fullname}'s Birthday"
            event.date = birthday_date
            event.department = self.department
            event.description = f"Birthday celebration for {self.user.fullname}"
            event.save()
        
        event._add_event_to_calendar()
        calendar.events.add(event)

    def schedule_birthday_email(self):
        from employee.tasks import send_birthday_email

        """
        Schedule a Celery task to send a birthday email on the employee's next birthday.
        """
        if not self.date_of_birth or not self.is_active or not self.user or not self.user.email:
            print(f"Skipping birthday email scheduling for employee ID {self.id}: missing required data")
            return

        # Cancel existing task if it exists
        existing_task = EmployeeBirthdayTask.objects.filter(employee=self).first()
        if existing_task:
            try:
                from celery import app
                app.control.revoke(existing_task.task_id)
                existing_task.delete()
                print(f"Revoked and deleted previous birthday task for employee ID {self.id}")
            except Exception as e:
                print(f"Failed to revoke task for employee ID {self.id}: {str(e)}")

        today = timezone.now().date()
        current_year = today.year
        birthday_this_year = self.date_of_birth.replace(year=current_year)
        if birthday_this_year < today:
            birthday_this_year = birthday_this_year.replace(year=current_year + 1)

        birthday_time = datetime.combine(birthday_this_year, time(hour=8, minute=0))
        if timezone.is_naive(birthday_time):
            birthday_time = timezone.make_aware(birthday_time)

        task_id = uuid()
        result = send_birthday_email.apply_async(
            args=[self.id],
            eta=birthday_time,
            task_id=task_id
        )

        EmployeeBirthdayTask.objects.create(
            employee=self,
            task_id=task_id,
            scheduled_date=birthday_this_year
        )
        print(f"Scheduled birthday email for employee ID {self.id} on {birthday_this_year}")

    def save(self, *args, **kwargs):
        self.full_clean()
        is_new = self._state.adding
        old_instance = None
        if not is_new:
            old_instance = Employee.objects.filter(pk=self.pk).first()

        if not is_new and old_instance and old_instance.date_of_birth != self.date_of_birth:
            Event.objects.filter(
                is_birthday=True,
                specific_employees=old_instance.user.profile
            ).delete()

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
        if self.position and hasattr(self.position, "salary_min") and not self.salary:
            self.salary = self.position.salary_min
        if not self.employee_id:
            self.employee_id = self.generate_employee_id()

        super().save(*args, **kwargs)

        if self.date_of_birth and self.is_active and self.user and self.user.email:
            self.schedule_birthday_email()
            self.create_birthday_event()

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
        Check if the given location is within the configured radius of any attached branch.
        Uses the branch-specific radius from BranchLocationComaparisonConfig if available,
        otherwise falls back to a default of 100 meters.
        """
        attached_branches = self.get_all_branches()
        if not attached_branches.exists():
            return False

        for branch in attached_branches:
            if branch.branch_latitude is None or branch.branch_longitude is None:
                continue

            # Get the branch-specific radius or use default
            try:
                threshold_meters = branch.location_comparison_settings.radius_in_meters
            except AttributeError:
                # If BranchLocationComaparisonConfig doesn't exist for this branch, use default
                threshold_meters = 100

            distance = self._haversine_distance(
                latitude, longitude, branch.branch_latitude, branch.branch_longitude
            )

            if distance <= threshold_meters:
                return True

        return False
    
class EmployeeCompanyEmail(BaseApprovableModel):
    """
    Model to store employee company email accounts.
    """


    STATUS_CHOICES = (
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('suspended', 'Suspended'),
        ('deleted', 'Deleted'),
    )

    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name='company_email',
        null=True,
        blank=True
    )
    email = models.EmailField(unique=False)
    provider = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=EmailProviderConfig.PROVIDER_CHOICES,
        help_text="Email provider (e.g., cPanel, Google Workspace)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    def __str__(self):
        return f"{self.email} for {self.employee.user.fullname}"
    
    def get_institution(self):
        return self.employee.get_institution()

class DocumentRequest(BaseApprovableModel):

    FORMAT_CHOICES = (
        ("pdf", "PDF"),
        ("word", "Word"),
        ("excel", "Excel"),
        ("jpg", "JPG"),
        ("any", "Any"),
        ("jpeg", "JPEG"),
        ("png", "PNG"),
    )

    employees = models.ManyToManyField(
        Employee,
        through="DocumentRequestEmployee",
        related_name="document_requests",
        help_text="Employees to whom the document is requested."
    )
    requested_by = models.ForeignKey(
       'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name="requested_documents",
        help_text="The user who made the document request."
    )
    document_type = models.CharField(
        max_length=100,
        help_text="Type of document requested (e.g., ID, Certificate, Contract)."
    )
    document_format = models.CharField(
        max_length=100,
        choices=FORMAT_CHOICES,
        help_text="Format of the document requested (e.g., PDF, Word)."
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional details about the document request."
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        help_text="Due date for submitting the document."
    )

    def __str__(self):
        return f"Request for {self.document_type} from {self.employees.name}"
    
    def get_institution(self):
        first_employee = self.employees.first()
        if first_employee:
            return first_employee.get_institution()
        return None
    
    def finish_workflow(self, approval: Approval):
        from communication.models import Announcement
        from employee.tasks import send_document_request_email_task
        def get_salutation(employee):
            """Get appropriate salutation based on employee gender"""
            gender_salutations = {
                'male': 'Mr.',
                'female': 'Ms.',
            }
            gender = getattr(employee, 'gender', '').lower()
            return gender_salutations.get(gender, 'Dear')
        
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    print(f"[CREATE ACTION] Processing approval {approval.id} for document request {self.id}")
                    self.is_active = True
                    self.deleted_at = None
                    self.employee_requests.update(
                        status="pending",
                        is_active=True
                    )
                    # Create announcements for each employee
                    employee_count = self.employees.count()
                    print(f"[CREATE ACTION] Found {employee_count} employees to notify")
                    
                    for idx, employee in enumerate(self.employees.all(), 1):
                        print(f"[CREATE ACTION] Processing employee {idx}/{employee_count}: {employee.id} - {employee.email}")
                        
                        title = f"Document Request: {self.document_type}"
                        content = (
                            f"You are requested to submit a {self.document_type} "
                            f"in {self.document_format} format"
                            f"{f' by {self.due_date}' if self.due_date else ''}. "
                            f"{self.description if self.description else 'No additional details provided.'}"
                        )
                        announcement = Announcement.objects.create(
                            title=title,
                            content=content,
                            requires_acknowledgment=True,
                            is_active=True
                        )
                        announcement.target_employees.add(employee)
                        print(f"[CREATE ACTION] Created announcement {announcement.id} for employee {employee.id}")
                        
                        # Queue email as a Celery task
                        print(f"[CREATE ACTION] Queuing email task for {employee.email}")
                        task = send_document_request_email_task.delay(
                            employee_email=employee.email,
                            employee_name=getattr(employee, 'first_name', '') or getattr(employee, 'name', 'Employee'),
                            employee_gender=getattr(employee, 'gender', ''),
                            document_type=self.document_type,
                            document_format=self.document_format,
                            due_date=self.due_date,
                            description=self.description,
                            is_update=False
                        )
                        print(f"[CREATE ACTION] Email task queued with task_id: {task.id} for {employee.email}")
                    
                    print(f"[CREATE ACTION] Completed processing for {employee_count} employees")
                        
                elif approval.action.name == "update":
                    print(f"[UPDATE ACTION] Processing approval {approval.id} for document request {self.id}")
                    self.is_active = True
                    self.deleted_at = None
                    self.employee_requests.update(is_active=True)
                    
                    employee_count = self.employees.count()
                    print(f"[UPDATE ACTION] Found {employee_count} employees to notify")
                    
                    # Recreate or update announcements for each employee
                    for idx, employee in enumerate(self.employees.all(), 1):
                        print(f"[UPDATE ACTION] Processing employee {idx}/{employee_count}: {employee.id} - {employee.email}")
                        
                        title = f"Document Request: {self.document_type}"
                        content = (
                            f"You are requested to submit a {self.document_type} "
                            f"in {self.document_format} format"
                            f"{f' by {self.due_date}' if self.due_date else ''}. "
                            f"{self.description if self.description else 'No additional details provided.'}"
                        )

                        # Check for existing active announcement to avoid duplicates
                        existing = Announcement.objects.filter(
                            target_employees=employee,
                            is_active=True,
                            title=title
                        ).first()
                        if existing:
                            existing.content = content
                            existing.save()
                            print(f"[UPDATE ACTION] Updated announcement {existing.id} for employee {employee.id}")
                        else:
                            announcement = Announcement.objects.create(
                                title=title,
                                content=content,
                                requires_acknowledgment=True,
                                is_active=True
                            )
                            announcement.target_employees.add(employee)
                            print(f"[UPDATE ACTION] Created announcement {announcement.id} for employee {employee.id}")
                        
                        # Queue email as a Celery task
                        print(f"[UPDATE ACTION] Queuing email task for {employee.email}")
                        task = send_document_request_email_task.delay(
                            employee_email=employee.email,
                            employee_name=getattr(employee, 'first_name', '') or getattr(employee, 'name', 'Employee'),
                            employee_gender=getattr(employee, 'gender', ''),
                            document_type=self.document_type,
                            document_format=self.document_format,
                            due_date=self.due_date,
                            description=self.description,
                            is_update=True
                        )
                        print(f"[UPDATE ACTION] Email task queued with task_id: {task.id} for {employee.email}")
                    
                    print(f"[UPDATE ACTION] Completed processing for {employee_count} employees")
                        
                elif approval.action.name == "delete":
                    print(f"[DELETE ACTION] Processing approval {approval.id} for document request {self.id}")
                    self.is_active = False
                    self.deleted_at = timezone.now()
                    self.employee_requests.update(
                        status="rejected",
                        is_active=False,
                        deleted_at=timezone.now()
                    )
                    print(f"[DELETE ACTION] Document request {self.id} marked as inactive")
                    
            elif approval.status == "rejected":
                print(f"[REJECTION] Processing rejected approval {approval.id} with action {approval.action.name}")
                
                if approval.action.name == "create":
                    self.is_active = False
                    self.deleted_at = timezone.now()
                    self.employee_requests.update(
                        status="rejected",
                        is_active=False,
                        deleted_at=timezone.now()
                    )
                    print(f"[REJECTION] Create action rejected - document request {self.id} marked as inactive")
                    
                elif approval.action.name == "update":
                    self.is_active = True
                    print(f"[REJECTION] Update action rejected - document request {self.id} remains active")
                    
                elif approval.action.name == "delete":
                    self.is_active = True
                    self.deleted_at = None
                    self.employee_requests.update(
                        is_active=True,
                        deleted_at=None
                    )
                    print(f"[REJECTION] Delete action rejected - document request {self.id} restored to active")
                    
            self.save()
            print(f"[WORKFLOW] Document request {self.id} saved successfully")

class DocumentRequestEmployee(SoftDeletableTimeStampedModel):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("submitted", "Submitted"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    )

    document_request = models.ForeignKey(
        DocumentRequest,
        on_delete=models.CASCADE,
        related_name="employee_requests"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="employee_requests"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Status of the document request for this employee."
    )

    def __str__(self):
        return f"{self.document_request.document_type} for {self.employee.name}"

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            document_request__created_at__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related('employee', 'document_request')
        return list(queryset.values(
            'employee__name',
            'document_request__document_type',
            'document_request__document_format',
            'status',
            'document_request__due_date',
            'document_request__created_at'
        ))    

class RequestedDocument(BaseApprovableModel):

    document_request_employee = models.ForeignKey(
        DocumentRequestEmployee,
        on_delete=models.CASCADE,
        related_name="documents",
        help_text="The document request and employee this file relates to."
    )
    file = models.FileField(
        upload_to="employee_documents/",
        help_text="The uploaded document file."
    )
    remarks = models.TextField(
        blank=True,
        null=True,
        help_text="Additional remarks about the document."
    )

    def __str__(self):
        return f"Document for {self.document_request_employee.document_request.document_type} by {self.document_request_employee.employee.name}"
    
    def get_institution(self):
        return self.employee.get_institution()

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.is_active = True
                    self.deleted_at = None
                    self.document_request_employee.status = "approved"
                    self.document_request_employee.is_active = True
                    self.document_request_employee.save(update_fields=["status", "is_active"])   
                elif approval.action.name == "update":
                    self.is_active = True
                    self.deleted_at = None
                    if self.document_request_employee.status != "approved":
                        self.document_request_employee.status = "submitted"
                        self.document_request_employee.is_active = True
                        self.document_request_employee.save(update_fields=["status", "is_active"])    
                elif approval.action.name == "delete":
                    self.is_active = False
                    self.deleted_at = timezone.now()
                    self.document_request_employee.status = "rejected"
                    self.document_request_employee.is_active = False
                    self.document_request_employee.save(update_fields=["status", "is_active"])   
            elif approval.action.name == "update":
                    self.is_active = True
                    if self.document_request_employee.status == "approved":
                        self.document_request_employee.is_active = True
                        self.document_request_employee.save(update_fields=["is_active"])       
                    elif approval.action.name == "delete":
                        self.is_active = True
                        self.deleted_at = None
                        if self.document_request_employee.status == "rejected":
                            self.document_request_employee.status = "submitted"
                            self.document_request_employee.is_active = True
                            self.document_request_employee.save(update_fields=["status", "is_active"])
                    self.save()           

class EmployeeWorkingDays(BaseApprovableModel):
    employee = models.OneToOneField(
        Employee, on_delete=models.CASCADE, related_name="custom_working_days"
    )

    days = models.ManyToManyField(
        "settings.SystemDay",
        related_name="employee_working_days",
        through="EmployeeDay",
        help_text="Must be selected from institution's working days",
    )

    def __str__(self):
        return f"{self.employee.user.fullname} - Custom Working Days"

    def get_institution(self):
        return self.employee.get_institution()


class EmployeeDay(BaseApprovableModel):
    employee_working_days = models.ForeignKey(
        "EmployeeWorkingDays", on_delete=models.CASCADE, related_name="employee_days"
    )
    day = models.ForeignKey("settings.SystemDay", on_delete=models.CASCADE)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    def __str__(self):
        return (
            f"{self.employee_working_days.employee.user.fullname} - {self.day.day_name}"
        )

    class Meta:
        unique_together = ("employee_working_days", "day")

    def get_institution(self):
        return self.employee_working_days.get_institution()


class EmployeeShift(BaseApprovableModel):
    CONTEXT_TYPES = [
        ("REQUEST", "Request"),
        ("ALLOCATION", "Allocation"),
    ]

    STATUS_CHOICES = [
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("PENDING", "Pending"),
    ]

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="employee_shift"
    )
    shift = models.ForeignKey(
        "institution.BranchShift",
        on_delete=models.CASCADE,
        related_name="employee_shift",
    )
    context = models.CharField(choices=CONTEXT_TYPES, max_length=200, default="REQUEST")
    shift_status = models.CharField(
        choices=STATUS_CHOICES, max_length=200, default="PENDING"
    )

    date = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"{self.employee.user.fullname} - shift {self.context.upper()}"

    def get_institution(self):
        return self.employee.get_institution()

    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            date__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related('employee', 'shift')
        return list(queryset.values(
            'employee__name',
            'shift__name',
            'context',
            'shift_status',
            'date',
            'created_at'
        ))    


class EmployeeMonthlyHourAccount(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="monthly_hour_accounts"
    )
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    total_worked_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=0.00
    )
    total_overtime_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=0.00
    )
    total_late_minutes = models.PositiveIntegerField(default=0)
    total_early_checkout_minutes = models.PositiveIntegerField(default=0)
    total_absent_days = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ["employee", "year", "month"]
        ordering = ["-year", "-month"]
        verbose_name = "Employee Monthly Hour Account"
        verbose_name_plural = "Employee Monthly Hour Accounts"

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.year}-{self.month:02d}"
    
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        # Convert start_date and end_date to year/month for filtering
        start_year, start_month = start_date.year, start_date.month
        end_year, end_month = end_date.year, end_date.month

        queryset = cls.objects.filter(
            year__gte=start_year,
            year__lte=end_year,
            month__gte=start_month,
            month__lte=end_month,
            employee__department__institution=institution,
            **filters
        ).select_related('employee')
        return list(queryset.values(
            'employee__name',
            'year',
            'month',
            'total_worked_hours',
            'total_overtime_hours',
            'total_late_minutes',
            'total_early_checkout_minutes',
            'total_absent_days'
        ))


class EmployeeAttendance(BaseApprovableModel):
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

    attendance_status = models.CharField(
        max_length=20,
        choices=[
            ("late", "Late"),
            ("early_checkout", "Early Checkout"),
            ("overtime", "Overtime"),
            ("on_time", "On Time"),
            ("absent", "Absent"),
            ("late_and_early", "Late and Early Checkout"),
            ("pending", "Pending"),
        ],
        default="pending",
    )

    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    late_minutes = models.IntegerField(default=0)
    early_checkout_minutes = models.IntegerField(default=0)
    worked_hours = models.IntegerField(default=0)

    class Meta:
        unique_together = ("employee", "date")

    def __str__(self):
        user = getattr(self.employee, "user", None)
        if user and hasattr(user, "fname") and hasattr(user, "lname"):
            return f"{user.fname} {user.lname} - {self.date} - {self.status}"
        return f"{self.employee} - {self.date} - {self.status}"

    def get_institution(self):
        return self.employee.get_institution()
    
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            date__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related('employee')
        return list(queryset.values(
            'employee__name',
            'date',
            'check_in_time',
            'check_out_time',
            'status',
            'attendance_status',
            'overtime_hours',
            'late_minutes',
            'early_checkout_minutes',
            'worked_hours'
        ))

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

    def calculate_late_minutes(self):
        if (
            self.date
            and self.check_in_time
            and self.employee
            and self.employee.payroll_branch
        ):
            branch_start_time = self.employee.payroll_branch.branch_opening_time
            datetime_checkin = datetime.combine(self.date, self.check_in_time)
            datetime_start = datetime.combine(self.date, branch_start_time)

            if datetime_checkin > datetime_start:
                delay = datetime_checkin - datetime_start
                minutes = int(delay.total_seconds() / 60)
                return minutes
        return 0

    def calculate_early_checkout_minutes(self):
        if (
            self.date
            and self.check_out_time
            and self.employee
            and self.employee.payroll_branch
        ):
            branch_end_time = self.employee.payroll_branch.branch_closing_time
            datetime_checkout = datetime.combine(self.date, self.check_out_time)
            datetime_end = datetime.combine(self.date, branch_end_time)

            if datetime_checkout < datetime_end:
                early_leave = datetime_end - datetime_checkout
                minutes = int(early_leave.total_seconds() / 60)
                return minutes
        return 0

    def calculate_worked_hours(self):
        """Calculate total worked hours based on check-in and check-out."""
        if self.check_in_time and self.check_out_time:
            datetime_checkin = datetime.combine(self.date, self.check_in_time)
            datetime_checkout = datetime.combine(self.date, self.check_out_time)
            if datetime_checkout > datetime_checkin:
                duration = datetime_checkout - datetime_checkin
                hours = duration.total_seconds() / 3600
                return Decimal(round(hours, 2))
        return Decimal("0.00")

    def update_attendance_status(self):
        """Calculate and set attendance status based on check-in/out times"""

        # Check for absence first
        if not self.check_in_time and not self.check_out_time:
            self.attendance_status = "absent"
            self.overtime_hours = 0
            self.late_minutes = 0
            self.early_checkout_minutes = 0
            self.worked_hours = Decimal("0.00")
            return

        # Calculate metrics
        self.overtime_hours = self.calculate_overtime_hours()
        self.late_minutes = self.calculate_late_minutes()
        self.early_checkout_minutes = self.calculate_early_checkout_minutes()
        self.worked_hours = self.calculate_worked_hours()

        # Determine status with priority order
        if self.late_minutes > 0 and self.early_checkout_minutes > 0:
            self.attendance_status = "late_and_early"
        elif self.late_minutes > 0:
            self.attendance_status = "late"
        elif self.early_checkout_minutes > 0:
            self.attendance_status = "early_checkout"
        elif self.overtime_hours > 0:
            self.attendance_status = "overtime"
        else:
            self.attendance_status = "on_time"

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
        Check if the given location is within the configured radius of any attached branch.
        Uses the branch-specific radius from BranchLocationComaparisonConfig if available,
        otherwise falls back to a default of 100 meters.
        """
        attached_branches = self.employee.get_all_branches()
        if not attached_branches.exists():
            return False

        for branch in attached_branches:
            if branch.branch_latitude is None or branch.branch_longitude is None:
                continue

            # Get the branch-specific radius or use default
            try:
                threshold_meters = branch.location_comparison_settings.radius_in_meters
            except AttributeError:
                # If BranchLocationComaparisonConfig doesn't exist for this branch, use default
                threshold_meters = 100

            distance = self._haversine_distance(
                latitude, longitude, branch.branch_latitude, branch.branch_longitude
            )

            if distance <= threshold_meters:
                return True

        return False

    def update_monthly_summary(self):
        """Update or create the monthly hour account summary for this attendance's employee, year, and month."""
        year = self.date.year
        month = self.date.month

        attendances = EmployeeAttendance.objects.filter(
            employee=self.employee, date__year=year, date__month=month
        )

        agg = attendances.aggregate(
            total_worked=Sum("worked_hours"),
            total_overtime=Sum("overtime_hours"),
            total_late=Sum("late_minutes"),
            total_early=Sum("early_checkout_minutes"),
            absent_count=Count("id", filter=Q(attendance_status="absent")),
        )

        EmployeeMonthlyHourAccount.objects.update_or_create(
            employee=self.employee,
            year=year,
            month=month,
            defaults={
                "total_worked_hours": agg["total_worked"] or Decimal("0.00"),
                "total_overtime_hours": agg["total_overtime"] or Decimal("0.00"),
                "total_late_minutes": agg["total_late"] or 0,
                "total_early_checkout_minutes": agg["total_early"] or 0,
                "total_absent_days": agg["absent_count"] or 0,
            },
        )

    def save(self, *args, **kwargs):
        """
        Save the attendance record and update attendance status and penalties.
        """
        # Set date if not provided
        if self.date is None:
            self.date = datetime.today().date()

        # Store previous data to detect significant changes
        old_attendance_status = None
        old_late_minutes = 0
        old_early_checkout_minutes = 0
        old_overtime_hours = 0
        old_worked_hours = Decimal("0.00")
        is_new_record = not self.pk

        if self.pk:
            try:
                old_instance = EmployeeAttendance.objects.get(pk=self.pk)
                old_attendance_status = old_instance.attendance_status
                old_late_minutes = old_instance.late_minutes
                old_early_checkout_minutes = old_instance.early_checkout_minutes
                old_overtime_hours = old_instance.overtime_hours
                old_worked_hours = old_instance.worked_hours
            except EmployeeAttendance.DoesNotExist:
                is_new_record = True

        # Run validation
        self.full_clean()

        # Calculate attendance status and metrics
        self.update_attendance_status()

        # Save the record
        super().save(*args, **kwargs)

        # Check if we need to update penalties
        status_changed = old_attendance_status != self.attendance_status
        metrics_changed = (
            old_late_minutes != self.late_minutes
            or old_early_checkout_minutes != self.early_checkout_minutes
            or old_overtime_hours != self.overtime_hours
            or old_worked_hours != self.worked_hours
        )

        should_update_penalties = is_new_record or status_changed or metrics_changed

        if should_update_penalties:
            from payroll.models import EmployeePenalty

            EmployeePenalty.update_or_remove_penalty_for_attendance(self)
            self.update_monthly_summary()

    def recalculate_and_save(self):
        """
        Manually trigger recalculation of attendance status and penalties.
        Useful when called from serializers or management commands.
        """
        old_status = self.attendance_status
        self.update_attendance_status()

        if old_status != self.attendance_status:
            self.save()  # This will trigger penalty updates


class EmployeeContract(BaseApprovableModel):
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
    
    @classmethod
    def get_report_data(cls, start_date, end_date, institution, **filters):
        queryset = cls.objects.filter(
            created_at__range=(start_date, end_date),
            employee__department__institution=institution,
            **filters
        ).select_related("employee")
        return list(queryset.values(
            'employee__name',
            'contract_reference',
            'status',
            'created_at',
            'status',
        ))

    def get_institution(self):
        return self.employee.get_institution() if self.employee else None

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
                pages_text.append(normalized_text)
            return pages_text
        except Exception as e:
            raise ValidationError({"error": f"OCR failed: {str(e)}"})

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
                original_pages = self.extract_text_with_ocr(original_content)
            if not any(original_pages):
                self.status = "NOT_MATCHED_NEEDS_REVIEW"
                raise ValidationError(
                    {"error": f"Cannot extract text from original contract."}
                )

            # Extract text from signed_contract
            signed_pages = self.extract_text_from_pdf(signed_content)
            if not any(signed_pages):

                signed_pages = self.extract_text_with_ocr(signed_content)
            if not any(signed_pages):

                self.status = "NOT_MATCHED_NEEDS_REVIEW"
                raise ValidationError(
                    {"error": f"Cannot extract text from signed contract."}
                )

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
            raise ValidationError({"error": f"Error comparing contracts: {str(e)}"})

    def save(self, *args, **kwargs):
        if not self.contract_reference:
            self.contract_reference = self.generate_contract_reference()

        if self.signed_contract and not self.original_contract:
            self.status = "NOT_MATCHED_NEEDS_REVIEW"

        super().save(*args, **kwargs)

class EmployeeeLogs(SoftDeletableTimeStampedModel):
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='logs')
    record_data = models.JSONField(help_text="JSON data of the log record")

    class Meta:
        verbose_name = "Employee Log"
        verbose_name_plural = "Employee Logs"

    def __str__(self):
        return f"Log for {self.employee} at {self.created_at}"
