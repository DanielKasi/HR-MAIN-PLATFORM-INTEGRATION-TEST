from discipline.models import DisciplinaryAction
from .models import (
    DocumentRequestEmployee,
    Employee,
    EmployeeShift, 
)

REPORT_CONFIG = {
    'employee': Employee,
    'document requests': DocumentRequestEmployee,
    'shifts': EmployeeShift,
    'disciplinary actions': DisciplinaryAction
}
