from django.core.management.base import BaseCommand
from django.utils import timezone
from leave_mgt.utils import LeaveBalanceManager


class Command(BaseCommand):
    help = 'Carry forward unused leaves from one year to another'

    def add_arguments(self, parser):
        parser.add_argument(
            '--from-year',
            type=int,
            required=True,
            help='Year to carry forward from'
        )
        parser.add_argument(
            '--to-year',
            type=int,
            default=timezone.now().year,
            help='Year to carry forward to (default: current year)'
        )

    def handle(self, *args, **options):
        from_year = options['from_year']
        to_year = options['to_year']
        
        if from_year >= to_year:
            self.stdout.write(
                self.style.ERROR('From year must be less than to year')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Carrying forward leaves from {from_year} to {to_year}...'
            )
        )
        
        carried_count = LeaveBalanceManager.carry_forward_leaves(from_year, to_year)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully carried forward {carried_count} leave balances'
            )
        )

