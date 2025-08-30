from django.db.models import Count, F, ExpressionWrapper, DurationField, Avg, Sum, Q
from django.db.models.functions import TruncMonth
from datetime import timedelta

from leave_mgt.models import LeaveApplication, LeaveBalance
from employee.models import Employee


def get_leave_trends_analytics(institution_id):
    """
    Calculates leave application trends and efficiency metrics.

    Args:
        institution_id (int): The ID of the institution.

    Returns:
        dict: A dictionary containing leave trend analytics data.
    """
    applications = LeaveApplication.objects.filter(
        institution_id=institution_id,
        # deleted_at__isnull=True,
    )

    if not applications.exists():
        return None

    # 1. Total Applications
    total_applications = applications.count()

    # 2. Applications by Month
    applications_by_month = list(applications.annotate(
        month=TruncMonth('created_at')
    ).values('month').annotate(
        count=Count('id')
    ).order_by('month'))

    # 3. Applications by Leave Type
    applications_by_leave_type = list(applications.values(
        'leave_type__name'
    ).annotate(
        count=Count('id')
    ).order_by('leave_type__name'))

    # 4. Application Status Breakdown
    status_counts = applications.values('status').annotate(count=Count('id'))
    status_dict = {item['status']: item['count'] for item in status_counts}
    
    approved_count = status_dict.get('approved', 0)
    rejected_count = status_dict.get('rejected', 0)
    pending_count = status_dict.get('pending', 0)
    cancelled_count = status_dict.get('cancelled', 0)
    
    application_status_breakdown = {
        "total": total_applications,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "pending_count": pending_count,
        "cancelled_count": cancelled_count,
        "approved_rate": round(approved_count / total_applications * 100, 2),
        "rejected_rate": round(rejected_count / total_applications * 100, 2),
        "pending_rate": round(pending_count / total_applications * 100, 2),
        "cancelled_rate": round(cancelled_count / total_applications * 100, 2),
    }

    # 5. Average Time to Approval
    approved_applications = applications.filter(status='approved', approved_at__isnull=False)
    
    avg_approval_duration = approved_applications.aggregate(
        avg_duration=Avg(
            ExpressionWrapper(
                F('approved_at') - F('created_at'),
                output_field=DurationField()
            )
        )
    )['avg_duration'] or timedelta(0)
    
    avg_approval_days = avg_approval_duration.total_seconds() / (60 * 60 * 24)

    return {
        "total_applications": total_applications,
        "applications_by_month": applications_by_month,
        "applications_by_leave_type": applications_by_leave_type,
        "application_status_breakdown": application_status_breakdown,
        "average_approval_time_in_days": round(avg_approval_days, 2),
    }
