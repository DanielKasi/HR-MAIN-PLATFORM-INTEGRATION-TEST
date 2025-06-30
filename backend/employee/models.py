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


class EmployeeType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, unique=True, blank=True, null=True)
    
    def str(self):
        return self.name
    
class WorkType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10, unique=True, blank=True, null=True)
    
    def str(self):
        return self.name    


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

    user  = models.OneToOneField("users.CustomUser", on_delete=models.PROTECT, blank=True, null=True, related_name="employees")
    email = models.EmailField(unique=True, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    position = models.ForeignKey(
        "recruitment.JobPosition", on_delete=models.PROTECT, related_name="employees", null=True, blank=True
    )
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        blank=True,
        null=True,  
    )
    department = models.ForeignKey(
        "institution.Department", on_delete=models.PROTECT, blank=True, null=True, related_name="employees"
    )
    payroll_branch = models.ForeignKey(Branch, on_delete=models.PROTECT, blank=True, null=True, related_name="payroll_employees")
    date_of_birth = models.DateField(blank=True, null=True)
    work_type = models.ForeignKey(WorkType, on_delete=models.PROTECT, blank=True, null=True, related_name="employees")
    employee_type = models.ForeignKey(EmployeeType, on_delete=models.PROTECT, blank=True, null=True, related_name="employees")
    date_of_joining = models.DateField(default=datetime.now)
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
    emergency_contact_relationship = models.CharField(max_length=30, blank=True, null=True)
    marital_status = models.CharField(max_length=10, choices=choices, default='single')
    children_count = models.PositiveIntegerField(default=0, blank=True, null=True)
    employee_profile_picture = models.ImageField(upload_to='employee_pictures/', blank=True, null=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, null=True, blank=True)

    def str(self):
        return f"{self.user.fullname}  - {self.position}"
    
    def save(self, *args, **kwargs):
        is_new_employee = self.pk is None
        # Auto-set payroll_branch to default branch if not set
        if self.user and not self.payroll_branch:
            self.payroll_branch = self.get_default_branch()

        if self.position and hasattr(self.position, 'salary'):
            self.salary = self.position.salary    
        
        super().save(*args, **kwargs)
        
        if is_new_employee and self.is_active:
            self.initialize_leave_balances()
            
    def initialize_leave_balances(self, year=None):
        """Initialize leave balances for this employee for the given year"""
        if year is None:
            year = timezone.now().year   
            
        from leave_mgt.models import LeaveType, LeaveBalance
        from leave_mgt.utils import LeaveCalculator  
        
        leave_types = LeaveType.objects.filter(is_active=True)
        
        created_balances = []     
        
        
        for leave_type in leave_types:
            if leave_type.gender_specific != 'all':
                if hasattr(self, 'gender') and self.gender != leave_type.gender_specific:
                    continue
                
            entitlement = LeaveCalculator.calculate_leave_entitlement(
                self, leave_type, year
            )  
            
            balance, created = LeaveBalance.objects.get_or_create(
                employee=self,
                leave_type=leave_type,
                year=year,
                defaults={
                    'allocated_days': entitlement,
                    'used_days': Decimal('0'),
                    'pending_days': Decimal('0'),
                    'carried_forward_days': Decimal('0'),
                }
            ) 
            
            if created:
                created_balances.append(balance)
                
        return created_balances   
    
    def reinitialize_leave_balances(self, year=None):
        """Reinitialize leave balances for this employee (useful for updates)"""
        if year is None:
            year = timezone.now().year
            
        from leave_mgt.models import LeaveType, LeaveBalance
        from leave_mgt.utils import LeaveCalculator

        leave_types = LeaveType.objects.filter(is_active=True)
        
        updated_balances = []
        
        for leave_type in leave_types:
            # Skip gender-specific leaves if not applicable
            if leave_type.gender_specific != 'all':
                if hasattr(self, 'gender') and self.gender != leave_type.gender_specific:
                    LeaveBalance.objects.filter(
                        employee=self,
                        leave_type=leave_type,
                        year=year
                    ).delete()
                    continue
            
            entitlement = LeaveCalculator.calculate_leave_entitlement(
                self, leave_type, year
            )
            
            balance, created = LeaveBalance.objects.update_or_create(
                employee=self,
                leave_type=leave_type,
                year=year,
                defaults={
                    'allocated_days': entitlement,
                }
            )
            
            if created:
                balance.used_days = Decimal('0')
                balance.pending_days = Decimal('0')
                balance.carried_forward_days = Decimal('0')
                balance.save()
            
            updated_balances.append(balance)
        
        return updated_balances 
    
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
        Returns True if user is not the institution owner.
        """
        if not self.user or not self.position or not self.position.department:
            return False
        
        try:
            institution_owner = self.position.department.institution.institution_owner
            return self.user != institution_owner
        except AttributeError:
            # Handle case where institution or institution_owner doesn't exist
            return False

    def generate_and_set_password(self):
        """Generate and set a compliant password for the user."""
        
        random_password = generate_compliant_password()
        self.user.set_password(random_password)
        self.user.is_password_verified = False
        self.user.save()
        return random_password

    def create_password_token_and_send_link(self, request):
        """Create token and send password link to user."""
        
        token = create_and_institution_token(
            user=self.user, purpose="registration", expiry_minutes=15
        )
        password_link = build_password_link(request=request, token=token)
        send_password_link_to_user(user=self.user, link=password_link)
        return True

    def setup_employee_password(self, request):
        """
        Complete password setup process for new employees.
        Only applies if user is not the institution owner.
        """
        if not self.should_generate_password():
            return {"success": False, "reason": "Institution owner or invalid data"}
        
        try:
            # Generate and set password
            password = self.generate_and_set_password()
            
            # Create token and send password link
            link_sent = self.create_password_token_and_send_link(request)
            
            return {
                "success": True, 
                "password_generated": bool(password),
                "link_sent": link_sent
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

class EmployeeAttendance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField(auto_now_add=True)
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("approved", "Approved"), ("rejected", "Rejected"), ("pending", "Pending")],
        default="pending"
    )
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, null=True, blank=True)

    def __str__(self):
        return f"{self.employee.user.fullname} - {self.date} - {self.status}"

    def calculate_overtime_hours(self):
        print("Calculating overtime hours...")
        
        if not self.date:
            print("Missing: self.date is None")
        if not self.check_out_time:
            print("Missing: self.check_out_time is None")
        if not self.employee:
            print("Missing: self.employee is None")
        elif not self.employee.payroll_branch:
            print("Missing: self.employee.payroll_branch is None")

        if self.date and self.check_out_time and self.employee and self.employee.payroll_branch:
            branch_end_time = self.employee.payroll_branch.branch_closing_time
            print(f"Branch end time: {branch_end_time}")
            print(f"Check-out time: {self.check_out_time}")

            datetime_checkout = datetime.combine(self.date, self.check_out_time)
            datetime_end = datetime.combine(self.date, branch_end_time)

            print(f"Datetime checkout: {datetime_checkout}")
            print(f"Datetime end: {datetime_end}")

            if datetime_checkout > datetime_end:
                overtime_duration = datetime_checkout - datetime_end
                hours = round(overtime_duration.total_seconds() / 3600, 2)
                print(f"Overtime duration: {hours} hours")
                return hours
            else:
                print("No overtime. Checkout was before or at end time.")
        else:
            print("Insufficient data to calculate overtime.")

        return 0.0

    def save(self, *args, **kwargs):
        print("Saving model instance...")

        if self.date is None:
            self.date = datetime.today().date()
            print(f"Date was missing. Set to today: {self.date}")

        self.overtime_hours = self.calculate_overtime_hours()
        print(f"Overtime hours set to: {self.overtime_hours}")
        super().save(*args, **kwargs)