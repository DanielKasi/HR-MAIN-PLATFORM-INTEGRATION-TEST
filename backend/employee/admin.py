from django.contrib import admin
from .models import Employee, WorkType, EmployeeType

admin.site.register(Employee)
admin.site.register(WorkType)
admin.site.register(EmployeeType)