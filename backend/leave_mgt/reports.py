from .models import (
    LeaveType,
    LeaveBalance,
    LeaveApplication,
)
from recruitment.models import JobPositionAdvert

REPORT_CONFIG = {
    'leave types': LeaveType,
    'leave balances': LeaveBalance,
    'leave application': LeaveApplication,
}