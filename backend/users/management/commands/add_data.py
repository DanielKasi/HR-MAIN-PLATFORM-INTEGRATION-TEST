import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings

from users.models import Permission, PermissionCategory, SystemType, System
from workflows.models import WorkflowAction, WorkflowCategory


class Command(BaseCommand):
    help = "Sync permissions, workflows, and systems from JSON files"

    def handle(self, *args, **kwargs):
        self.sync_permissions()
        self.sync_systems()
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

        print("valid_permission_codes:", valid_permission_codes)

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