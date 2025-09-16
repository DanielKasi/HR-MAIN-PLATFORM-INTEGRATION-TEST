import string
import random
from django.db import models
from django.utils.crypto import get_random_string
from .utils.history import create_asset_history
from django.db import transaction
from django.utils import timezone
from django.db.models import UniqueConstraint, Q
from utilities.utility_base_model import SoftDeletableTimeStampedModel
from approval.models import BaseApprovableModel
from approval.models import Approval


class AssetCategory(BaseApprovableModel):
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="asset_categories",
    )
    category_name = models.CharField(max_length=100)
    category_description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=5, unique=True, editable=False)

    def __str__(self):
        return self.category_name

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["institution", "category_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_category_per_institution",
            )
        ]

    def save(self, *args, **kwargs):
        # Auto-generate a 5-character code only if not already set
        if not self.code:
            self.code = self.generate_unique_code()
        super().save(*args, **kwargs)

    def get_institution(self):
        return self.institution

    @staticmethod
    def generate_unique_code():
        """Generates a unique 5-character alphanumeric code."""
        chars = string.ascii_uppercase + string.digits
        while True:
            code = "".join(random.choices(chars, k=5))
            if not AssetCategory.objects.filter(code=code).exists():
                return code

    @property
    def total_assets(self):
        """Returns the total number of assets in this category"""
        return self.assets.count()

    @property
    def total_available_assets(self):
        """Returns the total number of available assets in this category"""
        return self.assets.filter(status="available").count()

    @property
    def total_allocated_assets(self):
        """Returns the total number of allocated assets in this category"""
        return self.assets.filter(status="allocated").count()

    @property
    def assets_by_status(self):
        """Returns a dictionary with asset counts by status"""
        from django.db.models import Count

        status_counts = self.assets.values("status").annotate(count=Count("id"))
        return {item["status"]: item["count"] for item in status_counts}

    def save(self, *args, **kwargs):
        # Auto-generate a 5-character code only if not already set
        if not self.code:
            self.code = self.generate_unique_code()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_unique_code():
        """Generates a unique 5-character alphanumeric code."""
        chars = string.ascii_uppercase + string.digits
        while True:
            code = "".join(random.choices(chars, k=5))
            if not AssetCategory.objects.filter(code=code).exists():
                return code

    @property
    def total_assets(self):
        """Returns the total number of assets in this category"""
        return self.assets.count()

    @property
    def total_available_assets(self):
        """Returns the total number of available assets in this category"""
        return self.assets.filter(status="available").count()

    @property
    def total_allocated_assets(self):
        """Returns the total number of allocated assets in this category"""
        return self.assets.filter(status="allocated").count()

    @property
    def assets_by_status(self):
        """Returns a dictionary with asset counts by status"""
        from django.db.models import Count

        status_counts = self.assets.values("status").annotate(count=Count("id"))
        return {item["status"]: item["count"] for item in status_counts}


class Asset(BaseApprovableModel):
    ASSET_ALLOCATION_CHOICES = [
        ("available", "Available"),
        ("allocated", "Allocated"),
        ("maintenance", "Under Maintenance"),
        ("decommissioned", "Decommissioned"),
    ]
    institution = models.ForeignKey(
        "institution.Institution",
        on_delete=models.CASCADE,
        related_name="assets",
    )
    asset_name = models.CharField(max_length=100, blank=False)
    batch_number = models.CharField(max_length=50, blank=True)
    serial_number = models.CharField(max_length=50, blank=False)
    category = models.ForeignKey(
        AssetCategory,
        on_delete=models.CASCADE,
        related_name="assets",
    )
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=ASSET_ALLOCATION_CHOICES,
        default="available",
    )


    current_holder = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="currently_held_assets",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["institution", "serial_number", "batch_number"],
                condition=Q(deleted_at__isnull=True),
                name="unique_asset_serial_batch",
            )
        ]

    def __str__(self):
        return f"{self.asset_name} ({self.batch_number}) - {self.status}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new and not self.batch_number:
            batch_code = f"BA.N-{self.category.category_name[:3].upper()}-{self.serial_number[:5].upper()}"
            self.batch_number = batch_code
            super().save(update_fields=["batch_number"])

            create_asset_history(
                asset=self,
                event_type="created",
                performed_by=self.created_by.profile,
                affected_user=None,
                notes=f"Asset {self.asset_name} created with batch number {self.batch_number}.",
            )

    def get_institution(self):
        return self.institution


class AssetRequest(BaseApprovableModel):

    ASSET_REQUEST_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    asset = models.ForeignKey(
        "assets.Asset",  # Adjusted to assumed app_label if needed
        on_delete=models.CASCADE,
        related_name="requests",
    )
    requester = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="asset_requests",
    )

    request_reference_code = models.CharField(max_length=100)

    asset_request_status = models.CharField(
        max_length=20,
        choices=ASSET_REQUEST_STATUS_CHOICES,
        default="pending",
    )

    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Request for {self.asset.asset_name} by {self.requester.user.fullname}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["request_reference_code"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_request_reference_code",
            )
        ]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new and not self.request_reference_code:
            self.request_reference_code = (
                f"ASSET-REQ-{self.pk:05d}-{self.asset.id:05d}-{self.requester.id:05d}"
            )
            super().save(update_fields=["request_reference_code"])

    def get_institution(self):
        return self.asset.institution

    def finish_workflow(self, approval: Approval):
        with transaction.atomic():
            if approval.status == "completed":
                if approval.action.name == "create":
                    self.asset_request_status = "approved"
                    allocation = AssetAllocation(
                        asset=self.asset,
                        allocated_to=self.requester,
                        responding_to_request=self,
                        allocated_by=None,
                        allocation_status="allocated",
                        approval_status="active",
                    )
                    allocation.save()
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None
                elif approval.action.name == "update":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None
                elif approval.action.name == "delete":
                    self.asset_request_status = "cancelled"
                    self.approval_status = "under_deletion"
                    self.is_active = False
                    self.deleted_at = timezone.now()
                    self.delete()
                    return
            elif approval.status == "rejected":
                if approval.action.name == "create":
                    self.asset_request_status = "rejected"
                    self.approval_status = "active"
                    self.is_active = False
                    self.deleted_at = None
                elif approval.action.name == "update":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None
                elif approval.action.name == "delete":
                    self.approval_status = "active"
                    self.is_active = True
                    self.deleted_at = None
            self.save(
                update_fields=[
                    "approval_status",
                    "asset_request_status",
                    "is_active",
                    "deleted_at",
                ]
            )


class AssetAllocation(BaseApprovableModel):

    ASSET_ALLOCATION_STATUS_CHOICES = [
        ("cancelled", "Cancelled"),
        ("allocated", "Allocated"),
        ("pending", "Pending"),
        ("rejected", "Rejected"),
    ]

    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="allocations",
    )
    allocated_to = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="asset_allocations",
    )

    responding_to_request = models.ForeignKey(
        AssetRequest,
        on_delete=models.CASCADE,
        related_name="allocations",
        null=True,
        blank=True,
    )

    allocated_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.CASCADE,
        related_name="asset_allocations_made",
        blank=True,
        null=True,
    )

    allocation_status = models.CharField(
        max_length=20,
        choices=ASSET_ALLOCATION_STATUS_CHOICES,
        default="pending",
    )

    alloc_code = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Allocation of {self.asset.asset_name} to {self.allocated_to.user.fullname}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["alloc_code"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_alloc_code",
            )
        ]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            self.alloc_code = (
                f"ALLOC-{self.pk:05d}-{self.asset.id:05d}-{self.allocated_to.id:05d}"
            )
            super().save(update_fields=["alloc_code"])

    def get_institution(self):
        return self.asset.institution

    def finish_workflow(self, approval: Approval):
        if approval.status == "completed":
            if approval.action.name == "create":
                self.allocation_status = "allocated"
                create_asset_history(
                    asset=self.asset,
                    event_type="allocated",
                    performed_by=self.allocated_by,
                    affected_user=self.allocated_to,
                    notes=f"Asset {self.asset.asset_name} allocated to {self.allocated_to.user.fullname}.",
                )
                self.asset.status = "allocated"
                self.asset.current_holder = self.allocated_to
                self.asset.save(update_fields=["status", "current_holder"])
                self.approval_status = "active"
            elif approval.action.name == "update":
                self.approval_status = "active"
            elif approval.action.name == "delete":
                self.delete()  # Soft delete
                return
        elif approval.status == "rejected":
            if approval.action.name == "create":
                self.allocation_status = "rejected"
                self.approval_status = "active"  # Keep record
            elif approval.action.name == "update":
                self.approval_status = "active"
            elif approval.action.name == "delete":
                self.approval_status = "active"
        self.save()


class AssetReturn(BaseApprovableModel):
    ASSET_CONDITION_CHOICES = [
        ("good", "Good"),
        ("damaged", "Damaged"),
        ("lost", "Lost"),
    ]

    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="returns",
    )

    allocation = models.ForeignKey(
        AssetAllocation,
        on_delete=models.CASCADE,
        related_name="returns",
    )
    condition = models.CharField(max_length=20, choices=ASSET_CONDITION_CHOICES)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Return of {self.asset.asset_name} by {self.allocation.allocated_to.user.fullname}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def get_institution(self):
        return self.asset.institution

    def finish_workflow(self, approval: Approval):
        if approval.status == "completed":
            if approval.action.name == "create":
                create_asset_history(
                    asset=self.asset,
                    event_type="returned",
                    performed_by=self.allocation.allocated_by,
                    affected_user=self.allocation.allocated_to,
                    notes=f"Asset {self.asset.asset_name} returned by {self.allocation.allocated_to.user.fullname} in {self.condition}.",
                )
                if self.condition == "good":
                    self.asset.status = "available"
                elif self.condition == "damaged":
                    self.asset.status = "maintenance"
                elif self.condition == "lost":
                    self.asset.status = "decommissioned"
                self.asset.current_holder = None
                self.asset.save(update_fields=["status", "current_holder"])
                self.approval_status = "active"
            elif approval.action.name == "update":
                self.approval_status = "active"
            elif approval.action.name == "delete":
                self.delete()  # Soft delete
                return
        elif approval.status == "rejected":
            if approval.action.name == "create":
                self.delete()  # Soft delete on reject
                return
            elif approval.action.name == "update":
                self.approval_status = "active"
            elif approval.action.name == "delete":
                self.approval_status = "active"
        self.save()


class AssetHistory(SoftDeletableTimeStampedModel):
    EVENT_TYPE_CHOICES = [
        ("allocated", "Allocated"),
        ("returned", "Returned"),
        ("maintenance", "Maintenance"),
        ("decommissioned", "Decommissioned"),
        ("created", "Created"),
        ("reassigned", "Reassigned"),
    ]

    asset = models.ForeignKey(
        Asset, on_delete=models.CASCADE, related_name="asset_histories"
    )

    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)

    performed_by = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        related_name="asset_events",
    )

    affected_user = models.ForeignKey(
        "users.Profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="asset_event_history",
    )

    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.asset.asset_name} - {self.event_type}"
