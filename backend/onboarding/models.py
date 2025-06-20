from django.db import models


class OnBoarding(models.Model):
    STATUS_CHOICES = [
        ('initial', 'Initial'),
        ('training', 'Training'),
        ('issued_contract', 'Issued Contract'),
        ('declined_offer', 'Declined Offer'),
        ('accepted_offer', 'Accepted Offer'),
    ]
    
    application = models.OneToOneField(
        'recruitment.JobAdvertApplication',
        on_delete=models.PROTECT,
        related_name='onboarding',
        null=True,
        blank=True
    )
    accepted_to_work = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='initial'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OnBoarding for {self.application.applicant_name}"

    
    