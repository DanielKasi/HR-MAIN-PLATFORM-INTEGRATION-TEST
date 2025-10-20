from django.contrib import admin
from .models import (
    OnBoarding,
    TerminationStage,
    TerminationType,
    TerminationTypeStage,
    Offboarding,
    OffboardingStageProgress,
    HandoverReport
)

admin.site.register(OnBoarding)
admin.site.register(TerminationStage)
admin.site.register(TerminationType)
admin.site.register(TerminationTypeStage)
admin.site.register(Offboarding)
admin.site.register(OffboardingStageProgress)
admin.site.register(HandoverReport)
