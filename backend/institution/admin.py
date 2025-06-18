from django.contrib import admin
from .models import Institution, Branch


class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("institution_name", "institution_owner")
    search_fields = ("institution_name",)
    ordering = ("institution_name",)
    list_per_page = 20


class BranchAdmin(admin.ModelAdmin):
    list_display = ("branch_name", "institution", "branch_location")
    search_fields = ("branch_name", "institution_name")
    ordering = ("branch_name",)
    list_per_page = 20


admin.site.register(Branch, BranchAdmin)
admin.site.register(Institution, InstitutionAdmin)
