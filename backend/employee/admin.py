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
EmployeeCompanyEmail,
)

class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("name", "position", "department", "get_user_email", "get_user_fullname")
    search_fields = (
        "name",
        "position",
        "department",
        "user__email",
        "user__fullname",
    )

    def get_user_email(self, obj):
        return obj.user.email if obj.user else "-"
    get_user_email.short_description = "Email"

    def get_user_fullname(self, obj):
        return obj.user.fullname if obj.user else "-"
    get_user_fullname.short_description = "Full Name"


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
admin.site.register(EmployeeCompanyEmail)
admin.site.register(Employee, EmployeeAdmin)

