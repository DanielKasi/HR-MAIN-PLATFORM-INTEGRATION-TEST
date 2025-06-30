from django.core.management.base import BaseCommand
from django.utils import timezone
from leave_mgt.models import LeaveBalance, LeaveApplication
from decimal import Decimal


class Command(BaseCommand):
    help = 'Audit leave balances for consistency'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            default=timezone.now().year,
            help='Year to audit (default: current year)'
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Fix inconsistencies found'
        )

    def handle(self, *args, **options):
        year = options['year']
        fix_issues = options['fix']
        
        self.stdout.write(
            self.style.SUCCESS(f'Auditing leave balances for year {year}...')
        )
        
        inconsistencies = []
        
        balances = LeaveBalance.objects.filter(year=year).select_related('employee', 'leave_type')
        
        for balance in balances:
            # Calculate actual used and pending days from applications
            applications = LeaveApplication.objects.filter(
                employee=balance.employee,
                leave_type=balance.leave_type,
                start_date__year=year
            )
            
            actual_used = sum(
                app.total_days for app in applications 
                if app.status == 'approved'
            )
            actual_pending = sum(
                app.total_days for app in applications 
                if app.status == 'pending'
            )
            
            # Check for inconsistencies
            if balance.used_days != Decimal(str(actual_used)):
                inconsistencies.append({
                    'balance': balance,
                    'issue': 'used_days_mismatch',
                    'recorded': balance.used_days,
                    'actual': Decimal(str(actual_used))
                })
            
            if balance.pending_days != Decimal(str(actual_pending)):
                inconsistencies.append({
                    'balance': balance,
                    'issue': 'pending_days_mismatch',
                    'recorded': balance.pending_days,
                    'actual': Decimal(str(actual_pending))
                })
        
        if inconsistencies:
            self.stdout.write(
                self.style.WARNING(f'Found {len(inconsistencies)} inconsistencies:')
            )
            
            for issue in inconsistencies:
                balance = issue['balance']
                self.stdout.write(
                    f'  {balance.employee.user.fullname} - {balance.leave_type.name}: '
                    f'{issue["issue"]} (recorded: {issue["recorded"]}, actual: {issue["actual"]})'
                )
                
                if fix_issues:
                    if issue['issue'] == 'used_days_mismatch':
                        balance.used_days = issue['actual']
                    elif issue['issue'] == 'pending_days_mismatch':
                        balance.pending_days = issue['actual']
                    balance.save()
            
            if fix_issues:
                self.stdout.write(
                    self.style.SUCCESS('All inconsistencies have been fixed.')
                )
        else:
            self.stdout.write(
                self.style.SUCCESS('No inconsistencies found.')
            )
