from django.db import models
import datetime

class Employee(models.Model):
    """
    Employee model to store employee details in the system."""

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
        'institution.WorkType',
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="employees",
    )
    employee_type = models.ForeignKey(
        'institution.EmployeeType',
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="employees",
    )
    date_of_joining = models.DateField(default=datetime.datetime.now)
    address = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    nin = models.CharField(max_length=20, unique=True, blank=True, null=True)
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
    salary_overridden = models.BooleanField(default=False)  # Track manual salary changes

    def __str__(self):
        return f"{self.user.fullname}  - {self.position}"

    def get_default_branch(self):
        # Placeholder: Replace with actual logic to get default branch
        from institution.models import Branch
        return Branch.objects.first()

    def sync_leave_balances(self):
        # Placeholder for sync_leave_balances logic
        pass

    def save(self, *args, **kwargs):
        is_new_employee = self.pk is None
        old_department = None
        old_gender = None
        old_is_active = None
        old_position = None

        # Get old values for comparison if updating
        if not is_new_employee:
            old_employee = Employee.objects.get(pk=self.pk)
            old_department = old_employee.department
            old_gender = old_employee.gender
            old_is_active = old_employee.is_active
            old_position = old_employee.position

        # Auto-set payroll_branch to default branch if not set
        if self.user and not self.payroll_branch:
            self.payroll_branch = self.get_default_branch()

        # Update salary if position is set/changed and salary not overridden
        if self.position and hasattr(self.position, "salary"):
            if is_new_employee or old_position != self.position:
                # Set salary for new employees or when position changes
                self.salary = self.position.salary
                self.salary_overridden = False
            elif not self.salary_overridden:
                # Update salary if not overridden and position salary changed
                self.salary = self.position.salary

        super().save(*args, **kwargs)

        # Initialize or update leave balances based on changes
        should_initialize = (
            is_new_employee and self.is_active and self.department
        ) or (
            not is_new_employee and self.is_active and (
                old_department != self.department or  # Department changed
                old_gender != self.gender or          # Gender changed
                (not old_is_active and self.is_active)  # Reactivated
            )
        )

        if should_initialize:
            self.sync_leave_balances()
