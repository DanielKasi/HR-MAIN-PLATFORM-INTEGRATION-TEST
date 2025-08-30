from django.db.models import Count, Case, When, IntegerField, Sum, F, ExpressionWrapper, fields, Avg, Q
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from employee.models import Employee, EmployeeAttendance


def get_employee_demographics_analytics(institution_id):
    """
    Calculates key employee demographic and workforce composition metrics.

    Args:
        institution_id (UUID): The UUID of the institution.

    Returns:
        dict: A dictionary containing demographic analytics data.
    """
    employees = Employee.objects.filter(
        department__institution_id=institution_id,
        deleted_at__isnull=True,
    )

    if not employees.exists():
        return None

    # 1. Total Headcount
    headcount = employees.count()

    # 2. Headcount by Department
    headcount_by_department = list(employees.values('department__name').annotate(
        count=Count('id')
    ).order_by('department__name'))

    # 3. Headcount by Position
    headcount_by_position = list(employees.values('position__name').annotate(
        count=Count('id')
    ).order_by('position__name'))

    # 4. Headcount by Gender
    headcount_by_gender = list(employees.values('gender').annotate(
        count=Count('id')
    ).order_by('gender'))

    # 5. Headcount by Employee Type
    headcount_by_employee_type = list(employees.values('employee_type__name').annotate(
        count=Count('id')
    ).order_by('employee_type__name'))

    # 6. Headcount by Work Type
    headcount_by_work_type = list(employees.values('work_type__name').annotate(
        count=Count('id')
    ).order_by('work_type__name'))

    # 7. Age Distribution (using an efficient database-level query if possible, but the original loop is fine for smaller datasets)
    today = date.today()
    age_brackets = {
        '20-30': 0, '31-40': 0, '41-50': 0, '51+': 0, 'Unknown': 0,
    }

    # The original loop is fine for this calculation
    for employee in employees:
        if employee.date_of_birth:
            age = relativedelta(today, employee.date_of_birth).years
            if 20 <= age <= 30:
                age_brackets['20-30'] += 1
            elif 31 <= age <= 40:
                age_brackets['31-40'] += 1
            elif 41 <= age <= 50:
                age_brackets['41-50'] += 1
            else:
                age_brackets['51+'] += 1
        else:
            age_brackets['Unknown'] += 1
            
    age_distribution = [{'bracket': k, 'count': v} for k, v in age_brackets.items()]

    return {
        'headcount': headcount,
        'headcount_by_department': headcount_by_department,
        'headcount_by_position': headcount_by_position,
        'headcount_by_gender': headcount_by_gender,
        'headcount_by_employee_type': headcount_by_employee_type,
        'headcount_by_work_type': headcount_by_work_type,
        'age_distribution': age_distribution,
    }


def get_employee_attendance_analytics(institution_id):
    """
    Calculates key employee attendance and productivity metrics.

    Args:
        institution_id (UUID): The UUID of the institution.

    Returns:
        dict: A dictionary containing attendance analytics data.
    """
    attendance_records = EmployeeAttendance.objects.filter(
        employee__department__institution_id=institution_id,
        deleted_at__isnull=True,
    )

    if not attendance_records.exists():
        return None

    # 1. Total Hours Worked
    total_worked_seconds = attendance_records.exclude(
        Q(check_in_time__isnull=True) | Q(check_out_time__isnull=True)
    ).aggregate(
        total=Sum(
            ExpressionWrapper(
                F('check_out_time') - F('check_in_time'),
                output_field=fields.DurationField()
            )
        )
    )['total'] or timedelta(0)
    
    total_hours_worked = total_worked_seconds.total_seconds() / 3600

    # 2. Total Late Minutes & Overtime Hours
    aggregated_metrics = attendance_records.aggregate(
        total_late_minutes=Sum('late_minutes', default=0),
        total_overtime_hours=Sum('overtime_hours', default=0.0)
    )
    
    total_late_minutes = aggregated_metrics['total_late_minutes']
    total_overtime_hours = aggregated_metrics['total_overtime_hours']

    # 3. Attendance Rates
    total_records = attendance_records.count()
    status_counts = attendance_records.values('attendance_status').annotate(
        count=Count('id')
    )
    
    status_dict = {item['attendance_status']: item['count'] for item in status_counts}

    on_time_count = status_dict.get('on_time', 0)
    late_count = status_dict.get('late', 0)
    overtime_count = status_dict.get('overtime', 0)
    early_checkout_count = status_dict.get('early_checkout', 0)
    absent_count = status_dict.get('absent', 0)

    attendance_rate = (total_records - absent_count) / total_records * 100
    absence_rate = absent_count / total_records * 100

    return {
        "total_hours_worked": round(total_hours_worked, 2),
        "total_late_minutes": total_late_minutes,
        "total_overtime_hours": round(total_overtime_hours, 2),
        "attendance_metrics": {
            "total_records": total_records,
            "on_time_count": on_time_count,
            "late_count": late_count,
            "overtime_count": overtime_count,
            "early_checkout_count": early_checkout_count,
            "absent_count": absent_count,
            "overall_attendance_rate": round(attendance_rate, 2),
            "overall_absence_rate": round(absence_rate, 2),
        }
    }


def get_employee_salary_analytics(institution_id):
    """
    Calculates key employee salary and compensation metrics.

    Args:
        institution_id (UUID): The UUID of the institution.

    Returns:
        dict: A dictionary containing salary analytics data.
    """
    employees_with_salary = Employee.objects.filter(
        department__institution_id=institution_id,
        deleted_at__isnull=True,
        salary__gt=0
    )

    if not employees_with_salary.exists():
        return None

    # 1. Average Salary by Department
    avg_salary_by_department = list(employees_with_salary.values('department__name').annotate(
        average_salary=Avg('salary')
    ).order_by('department__name'))

    # 2. Average Salary by Position
    avg_salary_by_position = list(employees_with_salary.values('position__name').annotate(
        average_salary=Avg('salary')
    ).order_by('position__name'))

    # 3. Salary Distribution
    salary_distribution = {
        '0-1,000': 0, '1,001-5,000': 0, '5,001-10,000': 0, '10,001-25,000': 0, '25,001+': 0,
    }
    
    for employee in employees_with_salary:
        if employee.salary <= 1000:
            salary_distribution['0-1,000'] += 1
        elif 1000 < employee.salary <= 5000:
            salary_distribution['1,001-5,000'] += 1
        elif 5000 < employee.salary <= 10000:
            salary_distribution['5,001-10,000'] += 1
        elif 10000 < employee.salary <= 25000:
            salary_distribution['10,001-25,000'] += 1
        else:
            salary_distribution['25,001+'] += 1
    
    salary_distribution_list = [{'bracket': k, 'count': v} for k, v in salary_distribution.items()]

    # 4. Gender Pay Gap
    gender_avg_salaries = employees_with_salary.values('gender').annotate(
        average_salary=Avg('salary')
    ).order_by('gender')

    gender_pay_gap = {
        'male_average_salary': 0.0, 'female_average_salary': 0.0, 'other_average_salary': 0.0,
    }
    for item in gender_avg_salaries:
        if item['gender'] == 'male':
            gender_pay_gap['male_average_salary'] = round(item['average_salary'], 2)
        elif item['gender'] == 'female':
            gender_pay_gap['female_average_salary'] = round(item['average_salary'], 2)
        elif item['gender'] == 'other':
            gender_pay_gap['other_average_salary'] = round(item['average_salary'], 2)

    return {
        'average_salary_by_department': avg_salary_by_department,
        'average_salary_by_position': avg_salary_by_position,
        'salary_distribution': salary_distribution_list,
        'gender_pay_gap': gender_pay_gap,
    }