from django.db import models
from datetime import time
# from django.contrib.gis.db import models as gis_models


class Institution(models.Model):
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('under_review', 'Under Review'),
    ]
    institution_owner = models.ForeignKey(
        "users.CustomUser", related_name="institutions_owned", on_delete=models.CASCADE
    )
    institution_email = models.EmailField(max_length=255, blank=True, null=True)
    institution_name = models.CharField(max_length=255)
    first_phone_number = models.CharField(max_length=20, blank=True, null=True)
    second_phone_number = models.CharField(max_length=20, blank=True, null=True)
    institution_logo = models.ImageField(upload_to="institutions/images/", blank=True, null=True)

    theme_color = models.CharField(max_length=400, blank=True, null=True)
    setup = models.BooleanField(default=False)

    # Location fields
    location = models.CharField(max_length=500, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    # location_geodjango = gis_models.PointField(geography=True, null=True, blank=True)

    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default='approved' #This will later be changed to pending when a whole implementation of approval at the management side is done
    )
    approval_date = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        "users.CustomUser",
        related_name="approved_institutions",
        on_delete=models.PROTECT,
        blank=True,
        null=True
    )
    rejection_reason = models.TextField(blank=True, null=True)

    description = models.TextField(blank=True, null=True)


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_institutions",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    class Meta:
        unique_together = ('institution_owner', 'institution_name')

    def __str__(self):
        return self.name

    @property
    def is_approved(self):
        return self.approval_status == 'approved'

    def save(self, *args, **kwargs):
        # if self.latitude and self.longitude:
        #     from django.contrib.gis.geos import Point
        #     self.location_geodjango = Point(float(self.longitude), float(self.latitude))
        super().save(*args, **kwargs)


class InstitutionDocument(models.Model):
    institution = models.ForeignKey(Institution, related_name="documents", on_delete=models.CASCADE)
    document_title = models.CharField(max_length=255)
    document_file = models.FileField(upload_to="institutions/documents/")
    document_type = models.CharField(max_length=10, blank=True, null=True)
    document_size = models.PositiveIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.document_title} - {self.institution.institution_name}"

    class Meta:
        verbose_name = "Shop Document"
        verbose_name_plural = "Shop Documents"

    def save(self, *args, **kwargs):
        if self.document_file and not self.pk:
            self.document_size = self.document_file.size
            self.document_type = self.document_file.name.split('.')[-1].lower()
        super().save(*args, **kwargs)

    @property
    def document_size_mb(self):
        if self.document_size:
            return round(self.document_size / (1024 * 1024), 2)
        return 0



class Branch(models.Model):
    institution = models.ForeignKey(Institution, related_name="branches", on_delete=models.CASCADE)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    branch_phone_number = models.CharField(max_length=20, blank=True, null=True)
    branch_location = models.CharField(max_length=255)
    branch_latitude = models.FloatField(blank=True, null=True)
    branch_longitude = models.FloatField(blank=True, null=True)
    branch_email = models.EmailField(max_length=255, blank=True, null=True)
    branch_opening_time = models.TimeField(default=time(8, 0, 0))  # Default to 8:00 AM
    branch_closing_time = models.TimeField(
        default=time(23, 0, 0)
    )  # Default to 11:00 PM
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "users.CustomUser",
        related_name="created_branches",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    def __str__(self):
        return (
            self.branch_location
            + " - "
            + self.institution.name
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

    def save(self, *args, **kwargs):
        if self.is_default:
            UserBranch.objects.filter(user=self.user, is_default=True).update(
                is_default=False
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return self.user.email + " - " + self.branch.branch_location
