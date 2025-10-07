from .models import (
    EmployeeAllowance,
    EmployeeDeduction,
    EmployeeTax,
    EmployeePenalty,
    PayrollPeriod,
    Payslip,

)
from employee.models import EmployeeContract

REPORT_CONFIG = {
    'employee allowance': EmployeeAllowance,
    'employee deductions': EmployeeDeduction,
    'employee tax': EmployeeTax,
    'employee penalties': EmployeePenalty,
    'payroll periods': PayrollPeriod,
    'payslips': Payslip,
    'contracts': EmployeeContract,
}