from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    AllowanceType,
    DeductionType,
    EmployeeAllowance,
    EmployeeDeduction,
    PayrollPeriod,
    Payslip,
    PayslipItem,
    EmployeeTax,
)

admin.site.register(AllowanceType)
admin.site.register(DeductionType)
admin.site.register(EmployeeAllowance)
admin.site.register(EmployeeDeduction)
admin.site.register(PayrollPeriod)
admin.site.register(Payslip)
admin.site.register(PayslipItem)
admin.site.register(EmployeeTax)
