from .models import (
    LeaveType,
    LeaveBalance,
    LeaveApplication,
)
from recruitment.models import JobPositionAdvert

REPORT_CONFIG = {
    'Leave Types': LeaveType,
    'Leave Balances': LeaveBalance,
    'Leave Applications': LeaveApplication,
}
