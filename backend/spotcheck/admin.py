from django.contrib import admin
from . models import (
    EmployeeSpotCheck,
    InstitutionSpotCheckSetting,
    BranchSpotCheckSetting,
    EmployeeSpotCheckSetting
    )


admin.site.register(EmployeeSpotCheck)
admin.site.register(InstitutionSpotCheckSetting)
admin.site.register(BranchSpotCheckSetting)
admin.site.register(EmployeeSpotCheckSetting)
