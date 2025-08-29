from django.contrib import admin
from .models import (
    Employee,
    WorkType,
    EmployeeType,
    EmployeeAttendance,
    EmployeeContract,
    EmployeeWorkingDays,
EmployeeShift,EmployeeDay,
)

admin.site.register(Employee)
admin.site.register(WorkType)
admin.site.register(EmployeeType)
admin.site.register(EmployeeAttendance)
admin.site.register(EmployeeContract)
admin.site.register(EmployeeShift)
admin.site.register(EmployeeWorkingDays)
admin.site.register(EmployeeDay)

