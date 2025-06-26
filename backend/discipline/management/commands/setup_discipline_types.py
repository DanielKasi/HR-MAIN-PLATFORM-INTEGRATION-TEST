from django.core.management.base import BaseCommand
from discipline.models import DisciplineType

class Command(BaseCommand):
    help = 'Setup default discipline types'
    
    def handle(self, *args, **options):
        default_types = [
            {
                'name': 'Verbal Warning',
                'description': 'Informal verbal warning for minor infractions',
                'severity': 'low'
            },
            {
                'name': 'Written Warning',
                'description': 'Formal written warning documented in employee file',
                'severity': 'medium'
            },
            {
                'name': 'Final Warning',
                'description': 'Final written warning before suspension or termination',
                'severity': 'high'
            },
            {
                'name': 'Suspension',
                'description': 'Temporary suspension from work duties',
                'severity': 'high'
            },
            {
                'name': 'Termination',
                'description': 'Employment termination for serious violations',
                'severity': 'critical'
            },
            {
                'name': 'Performance Improvement Plan',
                'description': 'Structured plan to address performance issues',
                'severity': 'medium'
            },
            {
                'name': 'Counseling',
                'description': 'Professional counseling or coaching session',
                'severity': 'low'
            },
        ]
        
        created_count = 0
        for type_data in default_types:
            discipline_type, created = DisciplineType.objects.get_or_create(
                name=type_data['name'],
                defaults=type_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created discipline type: {discipline_type.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} discipline types')
        )