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
    'periods': Period,
    'objectives': Objectives,
    'employee objectives': EmployeeObjectives,
    'key results': KeyResult,
    '360 feedback': Feedback360,
    'employee bonus points': EmployeeBonusPoint,
    'meetings': Meeting,
    'performance improvement plans': PerformanceImprovementPlan,
}
