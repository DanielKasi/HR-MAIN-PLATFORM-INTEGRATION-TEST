from django.contrib import admin
from .models import Period, KeyResult, BonusPointSettings, EmployeeObjectives, EmployeeBonusPoint, Objectives, QuestionTemplate, Meeting

admin.site.register(Period)
admin.site.register(KeyResult)
admin.site.register(BonusPointSettings)
admin.site.register(EmployeeObjectives)
admin.site.register(EmployeeBonusPoint)
admin.site.register(Objectives)
admin.site.register(QuestionTemplate)
admin.site.register(Meeting)
