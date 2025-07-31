from django.contrib import admin
from .models import (
    OnBoarding,
    OffboardingStage,
    InstitutionEmployeeSeparationTypes,
    InstitutionSeparationPolicy,
    ResignationRequest,
    TerminationInitiation,
    RetirementRequest,
)

admin.site.register(OnBoarding)
admin.site.register(OffboardingStage)
admin.site.register(InstitutionEmployeeSeparationTypes)
admin.site.register(InstitutionSeparationPolicy)
admin.site.register(ResignationRequest)
admin.site.register(TerminationInitiation)
admin.site.register(RetirementRequest)
