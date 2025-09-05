from django.contrib import admin
from .models import (
    Employee,
    WorkType,
    EmployeeType,
    EmployeeAttendance,
    EmployeeContract,
    EmployeeWorkingDays,
EmployeeShift,EmployeeDay,
EmployeeMonthlyHourAccount,
Spouse,
Education,
EmployeeBankAccount,
NextOfKin,
WorkExperience,
Child,
QualificationAward,
)

admin.site.register(Employee)
admin.site.register(WorkType)
admin.site.register(EmployeeType)
admin.site.register(EmployeeAttendance)
admin.site.register(EmployeeContract)
admin.site.register(EmployeeShift)
admin.site.register(EmployeeWorkingDays)
admin.site.register(EmployeeDay)
admin.site.register(EmployeeMonthlyHourAccount)
admin.site.register(Spouse)
admin.site.register(Education)
admin.site.register(EmployeeBankAccount)
admin.site.register(NextOfKin)
admin.site.register(WorkExperience)
admin.site.register(Child)
admin.site.register(QualificationAward)

