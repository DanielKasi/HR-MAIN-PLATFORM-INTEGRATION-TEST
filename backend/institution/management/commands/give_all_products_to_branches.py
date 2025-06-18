from django.core.management.base import BaseCommand
from Institutions.models import Branch, Institution
from Institutions.utils import give_branch_all_products_from_Institution
class Command(BaseCommand):
    help = 'Gives all missing products to branches in all Institutions'

    def handle(self, *args, **kwargs):
        Institutions = Institution.objects.all()

        for Institution in Institutions:
            branches = Branch.objects.filter(Institution=Institution)
            
            for branch in branches:
                self.stdout.write(f"Giving products to branch {branch.branch_name} in Institution {Institution.Institution_name}...")
                give_branch_all_products_from_Institution(branch)
                self.stdout.write(f"Products given to branch {branch.branch_name}.\n")
        
        self.stdout.write(self.style.SUCCESS('Successfully gave all missing products to branches!'))
