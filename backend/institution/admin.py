from django.contrib import admin
from .models import (
    Institution,
    Branch,
    UserBranch,
    Department,
    InstitutionBankType,
    InstitutionBankAccount,
    InstitutionWorkingDays,
    InstitutionDay,
    InstitutionTax,
    InstitutionTaxRule,
    InstitutionKYCDocument,
    InstitutionPenaltyConfig,
    BranchPenaltyConfig,
    BranchDay, 
    BranchWorkingDays,
    BranchShift,
    BranchLocationComparisonConfig,
    OwnershipTransfer
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
admin.site.register(InstitutionDay)
admin.site.register(InstitutionTax)
admin.site.register(InstitutionTaxRule)
admin.site.register(InstitutionKYCDocument)
admin.site.register(InstitutionPenaltyConfig)
admin.site.register(BranchPenaltyConfig)
admin.site.register(BranchDay)
admin.site.register(BranchWorkingDays)
admin.site.register(BranchShift)
admin.site.register(BranchLocationComparisonConfig)
admin.site.register(OwnershipTransfer)