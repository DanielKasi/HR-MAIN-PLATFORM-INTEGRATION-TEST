# Institutions/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Branch, Institution
from users.utils import set_owner_user_work_place


@receiver(post_save, sender=Institution)
def attach_user_to_Institution(sender, instance, created, **kwargs):
    if created:
        set_owner_user_work_place(instance)
        Branch.objects.create(
            institution=instance,
            branch_name=f"{instance.institution_name} Main Branch",
            branch_phone_number=instance.first_phone_number,
            branch_location="Main Location",
            branch_email=instance.institution_email,
            created_by=instance.created_by,
        )
