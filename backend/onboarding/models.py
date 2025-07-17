from django.utils import timezone
from django.db import models
from employee.models import Employee
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings


class OnBoarding(models.Model):
    STATUS_CHOICES = [
        ("initial", "Initial"),
        ("training", "Training"),
        ("issued_contract", "Issued Contract"),
        ("declined_offer", "Declined Offer"),
        ("accepted_offer", "Accepted Offer"),
    ]

    application = models.OneToOneField(
        "recruitment.JobAdvertApplication",
        on_delete=models.PROTECT,
        related_name="onboarding",
        null=True,
        blank=True,
    )
    attended = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="initial")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OnBoarding for {self.application.applicant_name}"

    def save(self, *args, **kwargs):
        """Override save method to create employee when status is accepted_offer"""
        is_new = self.pk is None
        old_status = None

        if not is_new:
            print("---" * 50)
            print(f"Updating OnBoarding record for {self.application.applicant_name}")
            print(f"Old status: {self.status}")
            # Get the old status before saving
            old_instance = OnBoarding.objects.get(pk=self.pk)
            old_status = old_instance.status

        super().save(*args, **kwargs)

        # Create employee if status changed to accepted_offer
        if self.status == "accepted_offer" and old_status != "accepted_offer":
            self.create_employee_record()

    def create_employee_record(self):
        """Create an employee record from the accepted application"""
        from users.models import CustomUser  # Import here to avoid circular imports

        if not self.application:
            return

        # Check if employee already exists for this application
        if hasattr(self.application, "created_employee"):
            return  # Employee already created

        try:
            # Create CustomUser first
            user = CustomUser.objects.create_user(
                email=self.application.applicant_email,
                fullname=self.application.applicant_name,
                is_active=True,
            )

            # Create Employee record

            employee = Employee.objects.create(
                user=user,
                email=self.application.applicant_email,
                phone_number=self.application.applicant_phone,
                position=self.application.job_position_advert.job_position,
                address=self.application.address,
                date_of_joining=timezone.now().date(),
                is_active=True,
                department=self.application.job_position_advert.job_position.department,
                salary=self.application.job_position_advert.job_position.salary,
            )

            print(f"Employee record created for {self.application.applicant_name}")

            context = {
                "employee_name": self.application.applicant_name,
                "position": self.application.job_position_advert.job_position.name,
                "department": self.application.job_position_advert.job_position.department.name,
                "date_of_joining": timezone.now().date(),
                "email": self.application.applicant_email,
                "phone_number": self.application.applicant_phone,
            }

            html_message = render_to_string("emails/onboarding_email.html", context)
            plain_message = render_to_string("emails/onboarding_email.txt", context)

            send_mail(
                subject="Welcome to the Team!",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.application.applicant_email],
                html_message=html_message,
                fail_silently=False,
            )

        except Exception as e:
            print(f"Error creating employee record: {str(e)}")
        return f"OnBoarding for {self.application.applicant_name}"
