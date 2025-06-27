from django.core.management.base import BaseCommand
from django.utils import timezone
from leave.utils import LeaveReportGenerator
import csv
import os


class Command(BaseCommand):
    help = 'Generate leave reports'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            choices=['department', 'utilization', 'upcoming'],
            required=True,
            help='Type of report to generate'
        )
        parser.add_argument(
            '--year',
            type=int,
            default=timezone.now().year,
            help='Year for report (default: current year)'
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Output file path (optional)'
        )

    def handle(self, *args, **options):
        report_type = options['type']
        year = options['year']
        output_file = options.get('output')
        
        self.stdout.write(
            self.style.SUCCESS(f'Generating {report_type} report for year {year}...')
        )
        
        if report_type == 'department':
            data = LeaveReportGenerator.department_leave_report(year=year)
            self.generate_department_report(data, output_file)
        elif report_type == 'utilization':
            data = LeaveReportGenerator.leave_type_utilization_report(year=year)
            self.generate_utilization_report(data, output_file)
        elif report_type == 'upcoming':
            data = LeaveReportGenerator.upcoming_leaves_report()
            self.generate_upcoming_report(data, output_file)
        
        self.stdout.write(
            self.style.SUCCESS('Report generated successfully!')
        )

    def generate_department_report(self, data, output_file):
        if output_file:
            with open(output_file, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Employee', 'Department', 'Leave Type', 'Allocated', 'Used', 'Available'])
                
                for item in data:
                    employee = item['employee']
                    summary = item['summary']
                    
                    for leave_type, balance in summary.items():
                        if leave_type != 'totals':
                            writer.writerow([
                                employee.user.fullname,
                                getattr(employee, 'department', 'N/A'),
                                leave_type,
                                balance['allocated'],
                                balance['used'],
                                balance['available']
                            ])
        else:
            for item in data:
                employee = item['employee']
                summary = item['summary']
                self.stdout.write(f'\n{employee.user.fullname}:')
                for leave_type, balance in summary.items():
                    if leave_type != 'totals':
                        self.stdout.write(
                            f'  {leave_type}: {balance["used"]}/{balance["allocated"]} used, '
                            f'{balance["available"]} available'
                        )

    def generate_utilization_report(self, data, output_file):
        if output_file:
            with open(output_file, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Leave Type', 'Total Allocated', 'Total Used', 'Utilization %'])
                
                for item in data:
                    writer.writerow([
                        item['leave_type'],
                        item['total_allocated'],
                        item['total_used'],
                        item['utilization_rate']
                    ])
        else:
            self.stdout.write('\nLeave Type Utilization Report:')
            for item in data:
                self.stdout.write(
                    f'{item["leave_type"]}: {item["utilization_rate"]}% '
                    f'({item["total_used"]}/{item["total_allocated"]})'
                )

    def generate_upcoming_report(self, data, output_file):
        if output_file:
            with open(output_file, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days'])
                
                for leave in data:
                    writer.writerow([
                        leave.employee.user.fullname,
                        leave.leave_type.name,
                        leave.start_date,
                        leave.end_date,
                        leave.total_days
                    ])
        else:
            self.stdout.write('\nUpcoming Approved Leaves:')
            for leave in data:
                self.stdout.write(
                    f'{leave.employee.user.fullname} - {leave.leave_type.name}: '
                    f'{leave.start_date} to {leave.end_date} ({leave.total_days} days)'
                )