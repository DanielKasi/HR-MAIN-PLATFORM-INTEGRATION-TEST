from django.db import models

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
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    position = models.CharField(max_length=50)
    department = models.CharField(max_length=50)
    date_of_birth = models.DateField()
    date_of_joining = models.DateField()
    address = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    experience = models.PositiveIntegerField(default=0)
    qualifications = models.TextField(blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=50, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)
    emergency_contact_relationship = models.CharField(max_length=30, blank=True, null=True)
    marital_status = models.CharField(max_length=10, choices=choices, default='single')
    children_count = models.PositiveIntegerField(default=0, blank=True, null=True)
    employee_profile_picture = models.ImageField(upload_to='employee_pictures/', blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.position}"
