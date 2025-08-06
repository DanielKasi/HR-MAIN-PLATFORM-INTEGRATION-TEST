from django.contrib import admin
from .models import (
    Employee,
    WorkType,
    EmployeeType,
    EmployeeAttendance,
    EmployeeContract,
    EmployeeWorkingDays,
)

admin.site.register(Employee)
admin.site.register(WorkType)
admin.site.register(EmployeeType)
admin.site.register(EmployeeAttendance)
admin.site.register(EmployeeContract)
admin.site.register(EmployeeWorkingDays)
