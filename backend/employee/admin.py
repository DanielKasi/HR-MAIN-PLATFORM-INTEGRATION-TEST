from django.contrib import admin
from .models import (
    Employee,
    WorkType,
    EmployeeType,
    EmployeeAttendance,
    EmployeeContract,
    EmployeeWorkingDays,
    EmployeeShift,
    EmployeeDay,
    EmployeeMonthlyHourAccount,
    Spouse,
    Education,
    EmployeeBankAccount,
    NextOfKin,
    WorkExperience,
    Child,
    QualificationAward,
    EmployeeCompanyEmail,
    DocumentRequest,
    DocumentRequestEmployee,
    RequestedDocument,
)

class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "get_user_fullname",
        "get_institution",
        "name",
        "position",
        "department",
        "get_user_email",
    )
    search_fields = (
        "name",
        "position",
        "department",
        "user__email",
        "user__fullname",
    )
    list_filter = (
        "department",
        "position",
        "position__department__institution",
    )

    def get_user_fullname(self, obj):
        return obj.user.fullname if obj.user else "-"

    get_user_fullname.short_description = "User Full Name"
    get_user_fullname.admin_order_field = "user__fullname"

    def get_user_email(self, obj):
        return obj.user.email if obj.user else "-"

    get_user_email.short_description = "Email"
    get_user_email.admin_order_field = "user__email"

    def get_institution(self, obj):
        return obj.position.department.institution

    get_institution.short_description = "Institution"
    get_institution.admin_order_field = "position__department__institution"


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
admin.site.register(DocumentRequest)
admin.site.register(DocumentRequestEmployee)
admin.site.register(RequestedDocument)
admin.site.register(Employee)
