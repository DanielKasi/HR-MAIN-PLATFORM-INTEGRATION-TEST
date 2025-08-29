from django.contrib import admin
from .models import (
    Institution,
    Branch,
    UserBranch,
    Department,
    InstitutionBankType,
    InstitutionBankAccount,
    InstitutionWorkingDays,
    InstitutionTax,
    InstitutionTaxRule,
    InstitutionKYCDocument,
    InstitutionPenaltyConfig,
    BranchPenaltyConfig,
    BranchLocationComparisonConfig
)


class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("institution_name", "institution_owner", "country_code")
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
admin.site.register(UserBranch)
admin.site.register(Department)
admin.site.register(InstitutionBankType)
admin.site.register(InstitutionBankAccount)
admin.site.register(InstitutionWorkingDays)
admin.site.register(InstitutionTax)
admin.site.register(InstitutionTaxRule)
admin.site.register(InstitutionKYCDocument)
admin.site.register(InstitutionPenaltyConfig)
admin.site.register(BranchPenaltyConfig)
admin.site.register(BranchLocationComparisonConfig)
