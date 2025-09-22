from django.contrib import admin
from .models import Period, KeyResult, BonusPointSettings, EmployeeObjectives, EmployeeBonusPoint, Objectives, QuestionTemplate, Meeting, PerformanceConcern, PerformanceConcernType, PerformanceImprovementPlan, PIPEmployeeObjectives, PIPSupportResource, PIPSupportResourceType

admin.site.register(Period)
admin.site.register(KeyResult)
admin.site.register(BonusPointSettings)
admin.site.register(EmployeeObjectives)
admin.site.register(EmployeeBonusPoint)
admin.site.register(Objectives)
admin.site.register(QuestionTemplate)
admin.site.register(Meeting)
admin.site.register(PerformanceConcern)
admin.site.register(PerformanceConcernType)
admin.site.register(PerformanceImprovementPlan)
admin.site.register(PIPEmployeeObjectives)
admin.site.register(PIPSupportResource)
admin.site.register(PIPSupportResourceType)
