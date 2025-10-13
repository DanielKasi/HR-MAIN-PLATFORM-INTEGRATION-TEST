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
    'Employee Allowance': EmployeeAllowance,
    'Employee Deductions': EmployeeDeduction,
    'Employee Tax': EmployeeTax,
    'Employee Penalties': EmployeePenalty,
    'Payroll Periods': PayrollPeriod,
    'Payslips': Payslip,
    'Contracts': EmployeeContract,
}
