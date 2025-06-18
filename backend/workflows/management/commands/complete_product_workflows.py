from django.core.management.base import BaseCommand
from products.models import Product
from django.db import transaction as db_transaction


class Command(BaseCommand):
    help = "Check and complete workflow for all products"

    def handle(self, *args, **options):
        success_count = 0
        fail_count = 0

        for product in Product.objects.all():
            try:
                with db_transaction.atomic():

                    product.finish_workflow()
                    self.stdout.write(f"✅ Finished workflow for: {product}")
                    success_count += 1
            except Exception as e:
                self.stderr.write(
                    self.style.WARNING(f"⚠️  Skipped: {product} - Reason: {str(e)}")
                )
                fail_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✔️ Completed: {success_count}, ❌ Failed: {fail_count}"
            )
        )
