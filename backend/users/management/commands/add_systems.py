import os
import json
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import SystemType, System  

class Command(BaseCommand):
    help = 'Load default system types and systems from JSON'

    def handle(self, *args, **kwargs):
        path = os.path.join(settings.BASE_DIR, 'users/fixtures', 'default_systems.json')

        if not os.path.exists(path):
            self.stdout.write(self.style.ERROR(f"File not found: {path}"))
            return

        with open(path, 'r') as f:
            data = json.load(f)

        # Create system types
        for st_data in data.get("system_types", []):
            obj, created = SystemType.objects.get_or_create(
                name=st_data["name"],
                defaults={"description": st_data.get("description", "")}
            )
            action = "Created" if created else "Exists"
            self.stdout.write(f"{action} SystemType: {obj.name}")

        # Create systems
        for sys_data in data.get("systems", []):
            try:
                st = SystemType.objects.get(name=sys_data["system_type"])
            except SystemType.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Skipping System {sys_data['code']} (unknown type: {sys_data['system_type']})"))
                continue

            obj, created = System.objects.get_or_create(
                code=sys_data["code"],
                defaults={
                    "description": sys_data.get("description", ""),
                    "system_type": st
                }
            )
            action = "Created" if created else "Exists"
            self.stdout.write(f"{action} System: {obj.code}")
