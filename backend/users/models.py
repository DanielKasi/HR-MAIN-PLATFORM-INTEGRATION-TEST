from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import TextChoices
import secrets
from jsignature.utils import draw_signature
from jsignature.fields import JSignatureField
from django import forms
from jsignature.forms import JSignatureField as JSignatureFormField
from django.db.models import UniqueConstraint, Q


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if email:
            email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class UserType(TextChoices):
    STAFF = "STAFF", "Staff"

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
    
    def delete(self, *args, **kwargs):
        """Soft deletes a record by setting the deleted_at timestamp"""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deleted_at", "is_active"])

    
class CustomUser(AbstractBaseUser, PermissionsMixin, BaseModel):
    email = models.EmailField(unique=True)
    fullname = models.CharField(max_length=255)
    # is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    is_password_verified = models.BooleanField(default=True)
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
        blank=True,
        null=True,
    )
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.STAFF,
    )
    permissions = models.JSONField(default=list)
    # created_at = models.DateTimeField(auto_now_add=True)
    # updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["fullname"]

    def get_token(self):
        """Generate a custom JWT token with additional user details."""
        refresh = RefreshToken.for_user(self)
        refresh["email"] = self.email
        refresh["fullname"] = self.fullname
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    def get_all_permissions(self, obj=None):
        """Get all permissions for this user."""
        perms = Permission.objects.filter(
            roles__role__user_roles__user=self
        ).values_list("permission_code", flat=True)
        return set(perms)

    def has_perm(self, perm, obj=None):
        """Override Django's default has_perm method."""
        if self.is_active and self.is_superuser:
            return True
        return self.has_permission(perm)

    def has_perms(self, perm_list, obj=None):
        """Check multiple permissions at once."""
        return all(self.has_perm(perm, obj) for perm in perm_list)

    def get_group_permissions(self, obj=None):
        """For compatibility with Django's auth system."""
        return self.get_all_permissions(obj)

    def __str__(self):
        return self.fullname


class OneTimePassword(models.Model):
    otp_hash = models.CharField(max_length=256)
    expiry = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    purpose = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.expiry

    class Meta:
        indexes = [
            models.Index(fields=["otp_hash"]),
            models.Index(fields=["purpose"]),
            models.Index(fields=["expiry"]),
        ]

    def __str__(self):
        return f"OTP {self.purpose} (expires: {self.expiry})"


class Profile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    institution = models.ForeignKey(
        "institution.Institution",
        related_name="employees",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    bio = models.TextField(blank=True)
    # add fields custom to the project that you are working on

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.email}"


class PermissionCategory(BaseModel):
    permission_category_name = models.CharField(max_length=255)
    permission_category_description = models.TextField()

    def __str__(self):
        return self.permission_category_name
    
    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["permission_category_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_permission_category_name"
            )
        ]
        


# many to many relationship between roles and permissions
# Role - RolePermission - Permission
class Permission(BaseModel):
    permission_code = models.CharField(max_length=255)
    permission_name = models.CharField(max_length=255)
    permission_description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(
        PermissionCategory, related_name="permissions", on_delete=models.CASCADE
    )

    def __str__(self):
        return f"{self.permission_name} ({self.category})"
    
    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["permission_code"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_permission_code"
            ),
            UniqueConstraint(
                fields=["permission_name"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_permission_name"
            )
        ]

class Role(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField()
    institution = models.ForeignKey(
        "institution.Institution",
        related_name="roles_created",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["name", "institution"],
                condition=Q(deleted_at__isnull=True),
                name="unique_active_name_per_institution"
            )
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    role = models.ForeignKey(Role, related_name="permissions", on_delete=models.CASCADE)
    permission = models.ForeignKey(
        Permission, related_name="roles", on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.role} - {self.permission}"


class UserRole(models.Model):
    user = models.ForeignKey(
        CustomUser, related_name="user_roles", on_delete=models.CASCADE
    )
    role = models.ForeignKey(Role, related_name="user_roles", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.role.name}"


class OTPModel(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    value = models.CharField(max_length=64, unique=True)
    purpose = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.expires_at


class SystemType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class System(models.Model):
    code = models.CharField(max_length=100, unique=True)
    system_type = models.ForeignKey(SystemType, on_delete=models.CASCADE)
    description = models.TextField(blank=True, null=True)
    api_key = models.CharField(max_length=255, blank=True, null=True, unique=True)

    def generate_api_credentials(self):
        """Generate new API key"""
        self.api_key = f"hr_{secrets.token_urlsafe(32)}"

    def save(self, *args, **kwargs):
        if not self.api_key:
            self.generate_api_credentials()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code


class Signature(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    signature = JSignatureField(null=True, blank=True)

    def __str__(self):
        return f"Signature of {self.user.fullname}"
