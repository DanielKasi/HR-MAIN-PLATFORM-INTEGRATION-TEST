from .models import (
    Period,
    Objectives,
    EmployeeObjectives,
    KeyResult,
    Feedback360,
    EmployeeBonusPoint,
    Meeting,
    PerformanceImprovementPlan,
)

REPORT_CONFIG = {
    'Periods': Period,
    'Objectives': Objectives,
    'Employee Objectives': EmployeeObjectives,
    'Key Results': KeyResult,
    '360 Feedback': Feedback360,
    'Employee Bonus Points': EmployeeBonusPoint,
    'Meetings': Meeting,
    'Performance Improvement Plans': PerformanceImprovementPlan,
}
