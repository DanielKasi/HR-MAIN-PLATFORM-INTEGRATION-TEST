from django.core.management.base import BaseCommand
from django.utils import timezone
from leave_mgt.utils import LeaveBalanceManager


class Command(BaseCommand):
    help = 'Initialize leave balances for all employees for a given year'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            default=timezone.now().year,
            help='Year to initialize balances for (default: current year)'
        )

    def handle(self, *args, **options):
        year = options['year']
        
        self.stdout.write(
            self.style.SUCCESS(f'Initializing leave balances for year {year}...')
        )
        
        created_count = LeaveBalanceManager.initialize_yearly_balances(year)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} leave balance records for year {year}'
            )
        )