import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings

from users.models import Permission, PermissionCategory, SystemType, System
from workflows.models import WorkflowAction, WorkflowCategory
from discipline.models import DisciplineType


class Command(BaseCommand):
    help = "Add/sync permissions, workflows, systems, and discipline types from JSON files"

    def handle(self, *args, **kwargs):
        self.sync_permissions()
        self.sync_systems()
        self.sync_discipline_types()
        # self.sync_workflows()

    def sync_permissions(self):
        filepath = os.path.join(
            settings.BASE_DIR, "users", "fixtures", "permissions.json"
        )
        if not os.path.exists(filepath):
            self.stdout.write(
                self.style.ERROR(f"Permissions file not found at {filepath}")
            )
            return

        with open(filepath, "r") as file:
            permissions_data = json.load(file)

        self.stdout.write(self.style.MIGRATE_HEADING("⏳ Syncing permissions...\n"))

        valid_permission_codes = set()
        valid_category_names = set()

        for category_name, perms in permissions_data.items():
            category, _ = PermissionCategory.objects.get_or_create(
                permission_category_name=category_name,
                defaults={
                    "permission_category_description": f"{category_name} related permissions"
                },
            )
            valid_category_names.add(category.permission_category_name)

            for perm in perms:
                Permission.objects.update_or_create(
                    permission_code=perm["code"],
                    defaults={
                        "permission_name": perm["name"],
                        "permission_description": perm["description"],
                        "category": category,
                    },
                )
                valid_permission_codes.add(perm["code"])

 

        deleted_permissions, _ = Permission.objects.exclude(
            permission_code__in=valid_permission_codes
        ).delete()

        deleted_categories, _ = PermissionCategory.objects.exclude(
            permission_category_name__in=valid_category_names
        ).delete()

        self.stdout.write("\n" + self.style.MIGRATE_LABEL("📋 Permissions Summary"))
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed Permissions: {deleted_permissions}")
        )
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed Categories: {deleted_categories}")
        )
        self.stdout.write(self.style.SUCCESS("\n🎉 Permissions synced successfully!"))

    def sync_systems(self):
        filepath = os.path.join(
            settings.BASE_DIR, "users", "fixtures", "default_systems.json"
        )
        if not os.path.exists(filepath):
            self.stdout.write(
                self.style.ERROR(f"Systems file not found at {filepath}")
            )
            return

        with open(filepath, "r") as file:
            systems_data = json.load(file)

        self.stdout.write(self.style.MIGRATE_HEADING("\n⏳ Syncing systems...\n"))

        valid_system_type_names = set()
        valid_system_codes = set()

        # Sync system types
        for st_data in systems_data.get("system_types", []):
            SystemType.objects.update_or_create(
                name=st_data["name"],
                defaults={
                    "description": st_data.get("description", "")
                },
            )
            valid_system_type_names.add(st_data["name"])

        # Sync systems
        for sys_data in systems_data.get("systems", []):
            try:
                system_type = SystemType.objects.get(name=sys_data["system_type"])
            except SystemType.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipping System {sys_data['code']} (unknown type: {sys_data['system_type']})"
                    )
                )
                continue

            System.objects.update_or_create(
                code=sys_data["code"],
                defaults={
                    "description": sys_data.get("description", ""),
                    "system_type": system_type,
                },
            )
            valid_system_codes.add(sys_data["code"])

        deleted_systems, _ = System.objects.exclude(
            code__in=valid_system_codes
        ).delete()

        deleted_system_types, _ = SystemType.objects.exclude(
            name__in=valid_system_type_names
        ).delete()

        self.stdout.write("\n" + self.style.MIGRATE_LABEL("📋 Systems Summary"))
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed Systems: {deleted_systems}")
        )
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed System Types: {deleted_system_types}")
        )
        self.stdout.write(self.style.SUCCESS("\n🎉 Systems synced successfully!"))

    def sync_discipline_types(self):
        self.stdout.write(self.style.MIGRATE_HEADING("\n⏳ Syncing discipline types...\n"))
        
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
        
        valid_discipline_names = set()
        created_count = 0
        updated_count = 0
        
        for type_data in default_types:
            discipline_type, created = DisciplineType.objects.update_or_create(
                name=type_data['name'],
                defaults={
                    'description': type_data['description'],
                    'severity': type_data['severity']
                }
            )
            valid_discipline_names.add(type_data['name'])
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✅ Created discipline type: {discipline_type.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.NOTICE(f'  ♻️  Updated discipline type: {discipline_type.name}')
                )
        
        # Remove discipline types that are no longer in the default list
        deleted_discipline_types, _ = DisciplineType.objects.exclude(
            name__in=valid_discipline_names
        ).delete()
        
        self.stdout.write("\n" + self.style.MIGRATE_LABEL("📋 Discipline Types Summary"))
        self.stdout.write(
            self.style.NOTICE(f"  ➕ Created: {created_count}")
        )
        self.stdout.write(
            self.style.NOTICE(f"  ♻️  Updated: {updated_count}")
        )
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed: {deleted_discipline_types}")
        )
        self.stdout.write(self.style.SUCCESS("\n🎉 Discipline types synced successfully!"))

    def sync_workflows(self):
        filepath = os.path.join(
            settings.BASE_DIR, "users", "fixtures", "workflows.json"
        )
        if not os.path.exists(filepath):
            self.stdout.write(
                self.style.ERROR(f"Workflows file not found at {filepath}")
            )
            return

        with open(filepath, "r") as file:
            workflows_data = json.load(file)

        self.stdout.write(self.style.MIGRATE_HEADING("\n⏳ Syncing workflows...\n"))

        valid_workflow_codes = set()
        valid_action_codes = set()

        for workflow in workflows_data:
            category, _ = WorkflowCategory.objects.update_or_create(
                code=workflow["code"],
                defaults={"label": workflow["label"]},
            )
            valid_workflow_codes.add(workflow["code"])

            for action in workflow.get("workflow_actions", []):
                WorkflowAction.objects.update_or_create(
                    code=action["code"],
                    defaults={"label": action["label"], "category": category},
                )
                valid_action_codes.add(action["code"])

        deleted_actions, _ = WorkflowAction.objects.exclude(
            code__in=valid_action_codes
        ).delete()

        deleted_categories, _ = WorkflowCategory.objects.exclude(
            code__in=valid_workflow_codes
        ).delete()

        self.stdout.write("\n" + self.style.MIGRATE_LABEL("📋 Workflows Summary"))
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed Workflow Actions: {deleted_actions}")
        )
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed Workflow Categories: {deleted_categories}")
        )
        self.stdout.write(self.style.SUCCESS("\n🎉 Workflows synced successfully!"))