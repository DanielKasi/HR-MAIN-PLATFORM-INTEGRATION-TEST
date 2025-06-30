from django.core.management.base import BaseCommand
from django.utils import timezone
from payroll.utils import PayrollProcessor, process_monthly_payroll


class Command(BaseCommand):
    help = 'Setup payroll system with default data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--setup-defaults',
            action='store_true',
            help='Create default allowance and deduction types',
        )
        parser.add_argument(
            '--create-period',
            action='store_true',
            help='Create payroll period for current month',
        )
        parser.add_argument(
            '--generate-payslips',
            action='store_true',
            help='Generate payslips for current period',
        )
        parser.add_argument(
            '--year',
            type=int,
            help='Year for payroll period (default: current year)',
        )
        parser.add_argument(
            '--month',
            type=int,
            help='Month for payroll period (default: current month)',
        )

    def handle(self, *args, **options):
        if options['setup_defaults']:
            self.setup_defaults()
        
        if options['create_period']:
            self.create_period(options.get('year'), options.get('month'))
        
        if options['generate_payslips']:
            self.generate_payslips(options.get('year'), options.get('month'))

    def setup_defaults(self):
        self.stdout.write('Setting up default allowance and deduction types...')
        PayrollProcessor.setup_default_allowances_and_deductions()
        self.stdout.write(
            self.style.SUCCESS('Successfully created default allowance and deduction types')
        )

    def create_period(self, year=None, month=None):
        now = timezone.now()
        year = year or now.year
        month = month or now.month
        
        self.stdout.write(f'Creating payroll period for {month}/{year}...')
        period, created = PayrollProcessor.create_monthly_period(year, month)
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created payroll period: {period.name}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Payroll period already exists: {period.name}')
            )

    def generate_payslips(self, year=None, month=None):
        now = timezone.now()
        year = year or now.year
        month = month or now.month
        
        self.stdout.write(f'Processing payroll for {month}/{year}...')
        result = process_monthly_payroll(year, month)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed payroll:\n'
                f'  Period: {result["period"].name}\n'
                f'  Payslips generated: {result["payslips_generated"]}'
            )
        )

    def display_usage_examples(self):
        self.stdout.write('\nUsage examples:')
        self.stdout.write('  python manage.py setup_payroll --setup-defaults')
        self.stdout.write('  python manage.py setup_payroll --create-period --year 2024 --month 12')
        self.stdout.write('  python manage.py setup_payroll --generate-payslips')
        self.stdout.write('  python manage.py setup_payroll --setup-defaults --create-period --generate-payslips')