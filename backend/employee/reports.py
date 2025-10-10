from discipline.models import DisciplinaryAction
from .models import (
    DocumentRequestEmployee,
    Employee,
    EmployeeAttendance,
    EmployeeMonthlyHourAccount,
    EmployeeShift, 
)

REPORT_CONFIG = {
    # 'employee': Employee,
    'Document Requests': DocumentRequestEmployee,
    'Shifts': EmployeeShift,
    'Disciplinary Actions': DisciplinaryAction,
    'Employee Attendance': EmployeeAttendance,
    'Employee Monthly Hours': EmployeeMonthlyHourAccount,
}
