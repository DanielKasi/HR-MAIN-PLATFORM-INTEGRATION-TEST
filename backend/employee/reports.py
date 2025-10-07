from discipline.models import DisciplinaryAction
from .models import (
    DocumentRequestEmployee,
    Employee,
    EmployeeAttendance,
    EmployeeMonthlyHourAccount,
    EmployeeShift, 
)

REPORT_CONFIG = {
    'employee': Employee,
    'document requests': DocumentRequestEmployee,
    'shifts': EmployeeShift,
    'disciplinary actions': DisciplinaryAction,
    'employee attendance': EmployeeAttendance,
    'employee monthly hours': EmployeeMonthlyHourAccount,
}
