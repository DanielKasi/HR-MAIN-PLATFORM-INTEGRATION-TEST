from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    CustomUser,
    Profile,
    PermissionCategory,
    Permission,
    Role,
    RolePermission,
    UserRole,
)


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 1
    verbose_name = "Role"
    verbose_name_plural = "Roles"


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = "Profile"


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 1
    verbose_name = "Permission"
    verbose_name_plural = "Permissions"


class PermissionInline(admin.TabularInline):
    model = Permission
    extra = 1


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ("email", "fullname", "is_active", "is_staff", "get_roles")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("fullname","user_type")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "fullname",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )
    search_fields = ("email", "fullname")
    ordering = ("email",)
    inlines = [ProfileInline, UserRoleInline]

    def get_roles(self, obj):
        return ", ".join([user_role.role.name for user_role in obj.user_roles.all()])

    get_roles.short_description = "Roles"

    def get_queryset(self, request):
        # Optimize the admin view by prefetching related roles
        return super().get_queryset(request).prefetch_related("user_roles__role")


class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "bio", "institution")
    search_fields = ("user__email", "bio")
    list_filter = ("user__is_staff", "institution")
    ordering = ("user__email",)
    list_per_page = 20


class PermissionCategoryAdmin(admin.ModelAdmin):
    list_display = ("permission_category_name", "permission_category_description")
    search_fields = ("permission_category_name",)
    ordering = ("permission_category_name",)
    list_per_page = 20
    inlines = [PermissionInline]


class PermissionAdmin(admin.ModelAdmin):
    list_display = (
        "permission_code",
        "permission_name",
        "permission_description",
        "category",
    )
    search_fields = (
        "permission_name",
        "permission_code",
        "category__permission_category_name",
    )
    list_filter = ("category",)
    ordering = ("permission_name",)
    list_per_page = 20


class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "institution", "get_permissions_count")
    search_fields = ("name",)
    list_filter = ("institution",)
    ordering = ("name",)
    list_per_page = 20
    inlines = [RolePermissionInline]

    def get_permissions_count(self, obj):
        return obj.permissions.count()

    get_permissions_count.short_description = "# of Permissions"

    def get_queryset(self, request):
        # Optimize the admin view
        return super().get_queryset(request).prefetch_related("permissions")


class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission")
    search_fields = ("role__name", "permission__permission_name")
    list_filter = ("role", "permission__category")
    ordering = ("role__name",)
    list_per_page = 20


class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    search_fields = ("user__email", "role__name")
    list_filter = ("role",)
    ordering = ("user__email",)
    list_per_page = 20


admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(PermissionCategory, PermissionCategoryAdmin)
admin.site.register(Permission, PermissionAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(RolePermission, RolePermissionAdmin)
admin.site.register(UserRole, UserRoleAdmin)
