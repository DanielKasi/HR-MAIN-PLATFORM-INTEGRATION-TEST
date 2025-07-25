from django.contrib import admin
from .models import Employee, WorkType, EmployeeType, EmployeeAttendance, Contract

admin.site.register(Employee)
admin.site.register(WorkType)
admin.site.register(EmployeeType)
admin.site.register(EmployeeAttendance)
admin.site.register(Contract)