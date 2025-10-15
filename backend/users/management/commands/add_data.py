import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db.models import Q
from django.db import transaction
from employee.service import create_owner_employee
from users.models import Permission, PermissionCategory, SystemType, System, CustomUser
from approval.models import Action
from discipline.models import DisciplineType
from institution.models import (
    BranchWorkingDays,
    Department,
    Institution,
    InstitutionBankType,
    InstitutionBankAccount,
    Branch,
    InstitutionWorkingDays,
    InstitutionDay,
    InstitutionTax,
    InstitutionTaxRule,
    TaxRuleCategory,
)
from employee.models import Employee, QualificationAward
from settings.models import SystemDay
from employee.tasks import send_employee_welcome_email
from employee.views import generate_compliant_password
from performance.models import PerformanceConcernType, PIPSupportResourceType
import uuid
from datetime import time

class Command(BaseCommand):
    help = "Add/sync permissions, systems, discipline types, approval actions, system days, bank info, awards, birthday events, performance data, resend welcome emails, sync employee names, delete inactive employees, create tax rules, schedule birthday emails, and generate usernames for users without usernames"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Reset passwords for all resent welcome emails",
        )
        parser.add_argument(
            "--employee-ids",
            type=str,
            help="Comma-separated list of employee IDs to resend welcome emails to",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting inactive employees",
        )
        parser.add_argument(
            "--no-confirm",
            action="store_true",
            help="Skip confirmation prompt for deleting inactive employees",
        )

    def handle(self, *args, **kwargs):
        self.sync_permissions()
        self.sync_systems()
        self.sync_discipline_types()
        self.sync_approval_actions()
        self.create_default_system_days()
        self.create_default_bank_info()
        self.create_default_performance_data()
        self.create_tax_rules_for_institutions()
        self.create_default_awards()
        self.generate_usernames()
        self.resend_welcome_emails(kwargs["reset_password"], kwargs.get("employee_ids"))
        self.delete_inactive_employees(kwargs["dry_run"], kwargs["no_confirm"])

    def generate_usernames(self):
        """Generate usernames for CustomUser records without usernames."""
        self.stdout.write(
            self.style.MIGRATE_HEADING("\n⏳ Generating usernames for users without usernames...\n")
        )
        users_without_usernames = CustomUser.objects.filter(Q(username__isnull=True) | Q(username=''))
        if not users_without_usernames.exists():
            self.stdout.write(
                self.style.NOTICE("No users found without usernames.")
            )
            return

        updated_count = 0
        for user in users_without_usernames:
            try:
                name_parts = user.fullname.strip().split()
                if len(name_parts) >= 2:
                    base_username = f"{name_parts[0][0].lower()}{name_parts[1].lower().replace(' ', '')}"
                else:
                    base_username = ''.join(c for c in user.fullname.lower() if c.isalnum())
                if not base_username:
                    base_username = 'user'

                username = base_username[:50]  # Ensure within max_length
                counter = 1
                while CustomUser.objects.exclude(id=user.id).filter(username=username).exists():
                    username = f"{base_username}{counter}"[:50]
                    counter += 1
                    if len(username) > 50 or counter > 100:  # Prevent excessive iterations
                        username = f"user{str(uuid.uuid4())[:8]}"
                        counter = 1
                user.username = username
                user.save()
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  ✅ Generated username '{username}' for user '{user.fullname}' (ID: {user.id})")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"  ❌ Failed to generate username for user '{user.fullname}' (ID: {user.id}): {str(e)}"
                    )
                )
        self.stdout.write(
            "\n" + self.style.MIGRATE_LABEL("📋 Username Generation Summary")
        )
        self.stdout.write(
            self.style.NOTICE(f"  ➕ Updated: {updated_count} user(s) with new usernames")
        )
        self.stdout.write(
            self.style.SUCCESS("\n🎉 Username generation completed successfully!")
        )

    def create_tax_rules_for_institutions(self):
        """Create tax rule categories globally and tax rules per institution based on country_code"""
        filepath = os.path.join(settings.BASE_DIR, "utilities", "tax_rules.json")
        if not os.path.exists(filepath):
            self.stdout.write(
                self.style.ERROR(f"Tax rules file not found at {filepath}")
            )
            return

        with open(filepath, "r") as file:
            tax_data = json.load(file)

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "\n⏳ Creating tax rule categories and rules for institutions...\n"
            )
        )

        global_data = tax_data.get("global", {})
        residency_categories = global_data.get("residency_category", [])

        created_categories = 0
        updated_categories = 0
        for cat_data in residency_categories:
            category, created = TaxRuleCategory.objects.update_or_create(
                code=cat_data["code"],
                defaults={
                    "name": cat_data["name"],
                    "description": cat_data["description"],
                },
            )
            if created:
                created_categories += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✅ Created tax rule category: {category.name} ({category.code})"
                    )
                )
            else:
                updated_categories += 1
                self.stdout.write(
                    self.style.NOTICE(
                        f"  ♻️ Updated tax rule category: {category.name} ({category.code})"
                    )
                )

        self.stdout.write(
            self.style.NOTICE(
                f"Tax Rule Categories: Created {created_categories}, Updated {updated_categories}"
            )
        )

        institutions = Institution.objects.all()
        total_taxes_created = 0
        total_taxes_updated = 0
        total_rules_created = 0
        total_rules_updated = 0

        for institution in institutions:
            country_code = getattr(institution, "country_code", None)
            if not country_code:
                self.stdout.write(
                    self.style.WARNING(
                        f"  ⏭️ Skipping {institution.institution_name}: No country_code"
                    )
                )
                continue

            if country_code not in tax_data:
                self.stdout.write(
                    self.style.WARNING(
                        f"  ⏭️ Skipping {institution.institution_name}: No tax data for {country_code}"
                    )
                )
                continue

            country_data = tax_data[country_code]
            taxes = country_data.get("taxes", [])

            self.stdout.write(
                f"Processing tax rules for {institution.institution_name} ({country_code})"
            )

            for tax_data_item in taxes:
                tax_name = tax_data_item["tax_name"]
                tax_status = tax_data_item["tax_status"]

                try:
                    tax_obj, tax_created = InstitutionTax.objects.update_or_create(
                        institution=institution,
                        tax_name=tax_name,
                        defaults={"tax_status": tax_status},
                    )
                except InstitutionTax.MultipleObjectsReturned:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Multiple InstitutionTax records found for institution '{institution}' and tax_name '{tax_name}'. Using the first one."
                        )
                    )
                    tax_obj = InstitutionTax.objects.filter(
                        institution=institution, tax_name=tax_name
                    ).first()
                    if tax_obj:
                        tax_obj.tax_status = tax_status
                        tax_obj.save()
                        tax_created = False
                    else:
                        tax_obj = InstitutionTax.objects.create(
                            institution=institution,
                            tax_name=tax_name,
                            tax_status=tax_status,
                        )
                        tax_created = True

                if tax_created:
                    total_taxes_created += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Created tax: {tax_name} (Institution: {institution})"
                        )
                    )
                else:
                    total_taxes_updated += 1
                    self.stdout.write(
                        self.style.NOTICE(
                            f"  ♻️ Updated tax: {tax_name} (Institution: {institution})"
                        )
                    )

                rules = tax_data_item.get("rules", [])
                rule_created_count = 0
                rule_updated_count = 0
                for rule_data in rules:
                    try:
                        category_code = rule_data.get("tax_rule_category")
                        if category_code:
                            category, _ = TaxRuleCategory.objects.get_or_create(
                                code=category_code, defaults={"name": category_code}
                            )
                        else:
                            category = None

                        rule_obj, rule_created = (
                            InstitutionTaxRule.objects.update_or_create(
                                institution_tax=tax_obj,
                                tax_rule_name=rule_data["tax_rule_name"],
                                defaults={
                                    "tax_rule_description": rule_data[
                                        "tax_rule_description"
                                    ],
                                    "tax_rule_percentage": rule_data.get(
                                        "tax_rule_percentage"
                                    ),
                                    "tax_rule_fixed_amount": rule_data.get(
                                        "tax_rule_fixed_amount"
                                    ),
                                    "tax_rule_formula": rule_data.get(
                                        "tax_rule_formula"
                                    ),
                                    "salary_from": rule_data.get("salary_from"),
                                    "salary_to": rule_data.get("salary_to"),
                                    "tax_rule_category": category,
                                    "taxable_income_source": rule_data.get(
                                        "taxable_income_source"
                                    ),
                                },
                            )
                        )

                        if rule_created:
                            rule_created_count += 1
                            total_rules_created += 1
                        else:
                            rule_updated_count += 1
                            total_rules_updated += 1

                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"    ❌ Error creating rule '{rule_data.get('tax_rule_name', 'Unknown')}': {str(e)}"
                            )
                        )

                self.stdout.write(
                    self.style.NOTICE(
                        f"    └─ Rules for {tax_name}: Created {rule_created_count}, Updated {rule_updated_count}"
                    )
                )

        self.stdout.write("\n" + self.style.MIGRATE_LABEL("📋 Tax Rules Summary"))
        self.stdout.write(
            self.style.NOTICE(
                f"  🏛️ Taxes - Created: {total_taxes_created}, Updated: {total_taxes_updated}"
            )
        )
        self.stdout.write(
            self.style.NOTICE(
                f"  📜 Rules - Created: {total_rules_created}, Updated: {total_rules_updated}"
            )
        )
        self.stdout.write(self.style.SUCCESS("\n🎉 Tax rules created successfully!"))

    def create_default_performance_data(self):
        """Create default PerformanceConcernType and PIPSupportResourceType for all institutions"""
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "\n⏳ Creating default performance data for institutions...\n"
            )
        )

        default_concern_types = [
            {
                "name": "Attendance Issues",
                "description": "Chronic tardiness, absenteeism, or irregular attendance patterns",
            },
            {
                "name": "Quality of Work",
                "description": "Work output does not meet expected standards or contains frequent errors",
            },
            {
                "name": "Productivity",
                "description": "Consistently failing to meet productivity targets or deadlines",
            },
            {
                "name": "Communication Skills",
                "description": "Poor written or verbal communication affecting work relationships",
            },
            {
                "name": "Team Collaboration",
                "description": "Difficulty working effectively with team members or colleagues",
            },
            {
                "name": "Customer Service",
                "description": "Issues with customer interaction, service delivery, or client satisfaction",
            },
            {
                "name": "Technical Skills",
                "description": "Lack of required technical competencies for the role",
            },
            {
                "name": "Policy Compliance",
                "description": "Failure to follow company policies, procedures, or guidelines",
            },
            {
                "name": "Initiative and Problem-Solving",
                "description": "Lack of proactive approach or difficulty in resolving work-related issues",
            },
            {
                "name": "Professional Conduct",
                "description": "Inappropriate behavior or failure to maintain professional standards",
            },
        ]

        default_resource_types = [
            {
                "name": "Training Programs",
                "description": "Skills development courses, workshops, and professional training sessions",
            },
            {
                "name": "Mentoring",
                "description": "One-on-one guidance and support from experienced colleagues or supervisors",
            },
            {
                "name": "Coaching Sessions",
                "description": "Regular coaching meetings to address specific performance areas",
            },
            {
                "name": "Online Learning Resources",
                "description": "E-learning platforms, webinars, and digital training materials",
            },
            {
                "name": "Job Shadowing",
                "description": "Observing and learning from high-performing team members",
            },
            {
                "name": "External Training",
                "description": "Professional development courses offered by external training providers",
            },
            {
                "name": "Documentation and Guides",
                "description": "Standard operating procedures, best practice guides, and reference materials",
            },
            {
                "name": "Regular Check-ins",
                "description": "Scheduled progress review meetings with supervisors or managers",
            },
            {
                "name": "Peer Support Groups",
                "description": "Support networks with colleagues facing similar challenges",
            },
            {
                "name": "Performance Tools",
                "description": "Software, templates, or tools to help improve work efficiency and quality",
            },
        ]

        institutions = Institution.objects.all()
        total_concern_created = 0
        total_concern_updated = 0
        total_resource_created = 0
        total_resource_updated = 0

        for institution in institutions:
            self.stdout.write(
                f"Processing performance data for {institution.institution_name}"
            )

            concern_created = 0
            concern_updated = 0
            for concern_data in default_concern_types:
                concern_type, created = PerformanceConcernType.objects.update_or_create(
                    institution=institution,
                    name=concern_data["name"],
                    defaults={"description": concern_data["description"]},
                )
                if created:
                    concern_created += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Created concern type: {concern_type.name}"
                        )
                    )
                else:
                    concern_updated += 1
                    self.stdout.write(
                        self.style.NOTICE(
                            f"  ♻️ Updated concern type: {concern_type.name}"
                        )
                    )

            resource_created = 0
            resource_updated = 0
            for resource_data in default_resource_types:
                resource_type, created = (
                    PIPSupportResourceType.objects.update_or_create(
                        institution=institution,
                        name=resource_data["name"],
                        defaults={"description": resource_data["description"]},
                    )
                )
                if created:
                    resource_created += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Created resource type: {resource_type.name}"
                        )
                    )
                else:
                    resource_updated += 1
                    self.stdout.write(
                        self.style.NOTICE(
                            f"  ♻️ Updated resource type: {resource_type.name}"
                        )
                    )

            total_concern_created += concern_created
            total_concern_updated += concern_updated
            total_resource_created += resource_created
            total_resource_updated += resource_updated

            self.stdout.write(
                self.style.NOTICE(
                    f"  📊 {institution.institution_name}: "
                    f"Concerns (Created: {concern_created}, Updated: {concern_updated}), "
                    f"Resources (Created: {resource_created}, Updated: {resource_updated})"
                )
            )

        self.stdout.write(
            "\n" + self.style.MIGRATE_LABEL("📋 Performance Data Summary")
        )
        self.stdout.write(
            self.style.NOTICE(
                f"  🎯 Performance Concern Types - Created: {total_concern_created}, Updated: {total_concern_updated}"
            )
        )
        self.stdout.write(
            self.style.NOTICE(
                f"  🛠️ PIP Support Resource Types - Created: {total_resource_created}, Updated: {total_resource_updated}"
            )
        )
        self.stdout.write(
            self.style.SUCCESS("\n🎉 Performance data created successfully!")
        )

    def delete_inactive_employees(self, dry_run, no_confirm):
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "\n⏳ Processing inactive employees for deletion...\n"
            )
        )
        inactive_employees = Employee.objects.filter(
            is_active=False, deleted_at__isnull=False
        ).select_related("user")
        employee_count = inactive_employees.count()
        user_count = sum(1 for emp in inactive_employees if emp.user)
        if employee_count == 0:
            self.stdout.write(self.style.SUCCESS("No inactive employees found."))
            return
        if dry_run:
            self.stdout.write("Dry run mode: No records will be deleted.")
            self.stdout.write(f"Found {employee_count} inactive employee(s):")
            for employee in inactive_employees:
                self.stdout.write(
                    f'- Employee: {employee.user.fullname if employee.user else "Unnamed"}'
                )
            return
        if not no_confirm:
            self.stdout.write(
                f"Found {employee_count} inactive employee(s) and {user_count} related user(s) to permanently delete."
            )
            confirm = input(
                "Are you sure you want to permanently delete these records? (yes/no): "
            )
            if confirm.lower() != "yes":
                self.stdout.write(self.style.WARNING("Deletion cancelled by user."))
                return
        try:
            with transaction.atomic():
                deleted_employees = []
                deleted_users = []
                for employee in inactive_employees:
                    self.stdout.write(
                        self.style.NOTICE(
                            f'Attempting to delete Employee: {employee.user.fullname if employee.user else "Unnamed"}'
                        )
                    )
                    Employee._base_manager.filter(id=employee.id).delete()
                    deleted_employees.append(str(employee))
                    if employee.user:
                        self.stdout.write(
                            self.style.NOTICE(
                                f"Attempting to delete User: {employee.user.fullname}"
                            )
                        )
                        CustomUser._base_manager.filter(id=employee.user.id).delete()
                        deleted_users.append(str(employee.user))
                remaining = Employee.objects.filter(
                    is_active=False, deleted_at__isnull=True
                ).count()
                if remaining > 0:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Warning: {remaining} inactive employees remain after deletion."
                        )
                    )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully deleted {len(deleted_employees)} inactive employee(s) and {len(deleted_users)} related user(s):"
                    )
                )
                self.stdout.write("Deleted Employees:")
                for emp in deleted_employees:
                    self.stdout.write(f"- {emp}")
                self.stdout.write("Deleted Users:")
                for user in deleted_users:
                    self.stdout.write(f"- {user}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during deletion: {str(e)}"))
            raise

    def resend_welcome_emails(self, reset_password, employee_ids=None):
        self.stdout.write(
            self.style.MIGRATE_HEADING("\n⏳ Resending welcome emails...\n")
        )
        if employee_ids:
            try:
                employee_ids = [int(id.strip()) for id in employee_ids.split(",")]
                employees = Employee.objects.filter(id__in=employee_ids)
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(
                        "Invalid employee IDs provided. Use comma-separated integers."
                    )
                )
                return
        else:
            employees = Employee.objects.filter(
                Q(user__welcome_email_sent=False)
                | Q(user__welcome_email_sent__isnull=True)
            )
        if not employees.exists():
            self.stdout.write(
                self.style.NOTICE("No employees found to resend welcome emails.")
            )
            return
        success_count = 0
        error_count = 0
        skip_count = 0
        for employee in employees:
            if not employee.user or not employee.user.email:
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipping employee {employee.user.fullname if employee.user else 'Unnamed'}: No user or email"
                    )
                )
                skip_count += 1
                continue
            try:
                password = None
                if reset_password:
                    password = generate_compliant_password()
                    employee.user.set_password(password)
                    employee.user.is_password_verified = True
                    employee.user.welcome_email_sent = False
                    employee.user.save()
                send_employee_welcome_email.delay_on_commit(
                    employee.user.email,
                    employee.user.fullname,
                    password,
                )
                employee.user.welcome_email_sent = True
                employee.user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Welcome email resent to {employee.user.email} for employee '{employee.user.fullname}'"
                    )
                )
                success_count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Failed to resend email to {employee.user.email} for employee '{employee.user.fullname}': {str(e)}"
                    )
                )
                error_count += 1
        self.stdout.write("\n" + self.style.MIGRATE_LABEL("📋 Welcome Emails Summary"))
        self.stdout.write(
            self.style.NOTICE(f"  ➕ Successfully resent: {success_count}")
        )
        self.stdout.write(self.style.NOTICE(f"  ❌ Failed: {error_count}"))
        self.stdout.write(self.style.NOTICE(f"  ⏭️ Skipped: {skip_count}"))
        self.stdout.write(
            self.style.SUCCESS("\n🎉 Welcome emails processing completed!")
        )

    def create_default_awards(self):
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "\n⏳ Creating default qualification awards...\n"
            )
        )
        default_awards = [
            {"name": "PLE", "description": "Primary Leaving Examination"},
            {"name": "UCE", "description": "Uganda Certificate of Education (O'Level)"},
            {
                "name": "UACE",
                "description": "Uganda Advanced Certificate of Education (A'Level)",
            },
            {"name": "Diploma", "description": "Diploma level qualification"},
            {"name": "Bachelor's Degree", "description": "Undergraduate degree"},
            {"name": "Master's Degree", "description": "Postgraduate degree"},
            {"name": "PhD", "description": "Doctor of Philosophy"},
        ]
        valid_award_names = set()
        created_count = 0
        updated_count = 0
        for award_data in default_awards:
            award, created = QualificationAward.objects.update_or_create(
                name=award_data["name"],
                defaults={"description": award_data["description"]},
            )
            valid_award_names.add(award_data["name"])
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  ✅ Created award: {award.name}")
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.NOTICE(f"  ♻️ Updated award: {award.name}")
                )
        deleted_awards, _ = QualificationAward.objects.exclude(
            name__in=valid_award_names
        ).delete()
        self.stdout.write(
            "\n" + self.style.MIGRATE_LABEL("📋 Qualification Awards Summary")
        )
        self.stdout.write(self.style.NOTICE(f"  ➕ Created: {created_count}"))
        self.stdout.write(self.style.NOTICE(f"  ♻️ Updated: {updated_count}"))
        self.stdout.write(self.style.NOTICE(f"  🧹 Removed: {deleted_awards}"))
        self.stdout.write(
            self.style.SUCCESS("\n🎉 Qualification awards synced successfully!")
        )

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
            self.stdout.write(self.style.ERROR(f"Systems file not found at {filepath}"))
            return
        with open(filepath, "r") as file:
            systems_data = json.load(file)
        self.stdout.write(self.style.MIGRATE_HEADING("\n⏳ Syncing systems...\n"))
        valid_system_type_names = set()
        valid_system_codes = set()
        for st_data in systems_data.get("system_types", []):
            SystemType.objects.update_or_create(
                name=st_data["name"],
                defaults={"description": st_data.get("description", "")},
            )
            valid_system_type_names.add(st_data["name"])
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
        self.stdout.write(self.style.NOTICE(f"  🧹 Removed Systems: {deleted_systems}"))
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed System Types: {deleted_system_types}")
        )
        self.stdout.write(self.style.SUCCESS("\n🎉 Systems synced successfully!"))

    def sync_discipline_types(self):
        self.stdout.write(
            self.style.MIGRATE_HEADING("\n⏳ Syncing discipline types...\n")
        )
        default_types = [
            {
                "name": "Verbal Warning",
                "description": "Informal verbal warning for minor infractions",
                "severity": "low",
            },
            {
                "name": "Written Warning",
                "description": "Formal written warning documented in employee file",
                "severity": "medium",
            },
            {
                "name": "Final Warning",
                "description": "Final written warning before suspension or termination",
                "severity": "high",
            },
            {
                "name": "Suspension",
                "description": "Temporary suspension from work duties",
                "severity": "high",
            },
            {
                "name": "Termination",
                "description": "Employment termination for serious violations",
                "severity": "critical",
            },
            {
                "name": "Performance Improvement Plan",
                "description": "Structured plan to address performance issues",
                "severity": "medium",
            },
            {
                "name": "Counseling",
                "description": "Professional counseling or coaching session",
                "severity": "low",
            },
        ]
        valid_discipline_names = set()
        created_count = 0
        updated_count = 0
        for type_data in default_types:
            discipline_type, created = DisciplineType.objects.update_or_create(
                name=type_data["name"],
                defaults={
                    "description": type_data["description"],
                    "severity": type_data["severity"],
                },
            )
            valid_discipline_names.add(type_data["name"])
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✅ Created discipline type: {discipline_type.name}"
                    )
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.NOTICE(
                        f"  ♻️ Updated discipline type: {discipline_type.name}"
                    )
                )
        deleted_discipline_types, _ = DisciplineType.objects.exclude(
            name__in=valid_discipline_names
        ).delete()
        self.stdout.write(
            "\n" + self.style.MIGRATE_LABEL("📋 Discipline Types Summary")
        )
        self.stdout.write(self.style.NOTICE(f"  ➕ Created: {created_count}"))
        self.stdout.write(self.style.NOTICE(f"  ♻️ Updated: {updated_count}"))
        self.stdout.write(
            self.style.NOTICE(f"  🧹 Removed: {deleted_discipline_types}")
        )
        self.stdout.write(
            self.style.SUCCESS("\n🎉 Discipline types synced successfully!")
        )

    def sync_approval_actions(self):
        self.stdout.write(
            self.style.MIGRATE_HEADING("\n⏳ Syncing approval actions...\n")
        )
        default_actions = [
            {
                "name": "create",
                "description": "Action for creating new records that require approval",
            },
            {
                "name": "update",
                "description": "Action for updating existing records that require approval",
            },
            {
                "name": "delete",
                "description": "Action for deleting records that require approval",
            },
        ]
        valid_action_names = set()
        created_count = 0
        updated_count = 0
        for action_data in default_actions:
            action, created = Action.objects.update_or_create(
                name=action_data["name"],
                defaults={"description": action_data["description"]},
            )
            valid_action_names.add(action_data["name"])
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✅ Created approval action: {action.name} (Code: {action.code})"
                    )
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.NOTICE(
                        f"  ♻️ Updated approval action: {action.name} (Code: {action.code})"
                    )
                )
        self.stdout.write(
            "\n" + self.style.MIGRATE_LABEL("📋 Approval Actions Summary")
        )
        self.stdout.write(self.style.NOTICE(f"  ➕ Created: {created_count}"))
        self.stdout.write(self.style.NOTICE(f"  ♻️ Updated: {updated_count}"))
        self.stdout.write(
            self.style.SUCCESS("\n🎉 Approval actions synced successfully!")
        )

    def create_default_system_days(self):
        self.stdout.write(
            self.style.MIGRATE_HEADING("\n⏳ Creating default system days...\n")
        )
        default_days = [
            {"day_code": "MON", "day_name": "Monday", "level": 1},
            {"day_code": "TUE", "day_name": "Tuesday", "level": 2},
            {"day_code": "WED", "day_name": "Wednesday", "level": 3},
            {"day_code": "THU", "day_name": "Thursday", "level": 4},
            {"day_code": "FRI", "day_name": "Friday", "level": 5},
            {"day_code": "SAT", "day_name": "Saturday", "level": 6},
            {"day_code": "SUN", "day_name": "Sunday", "level": 7},
        ]
        for day_data in default_days:
            day_code = day_data["day_code"]
            if SystemDay.objects.filter(day_code=day_code).exists():
                self.stdout.write(
                    self.style.NOTICE(
                        f"  ♻️ System day '{day_data['day_name']}' already exists, skipping."
                    )
                )
            else:
                SystemDay.objects.create(
                    day_code=day_code,
                    day_name=day_data["day_name"],
                    level=day_data["level"],
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✅ Created system day: {day_data['day_name']}"
                    )
                )

    def create_default_bank_info(self):
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "\n⏳ Creating default bank info, working days, and updating employees...\n"
            )
        )
        default_bank_data = {
            "bank_fullname": "Centenary Bank",
            "bank_code": "0001",
            "br_code": "MAIN",
            "account_name": "Default Account",
            "account_number": "1234567890",
        }
        default_working_hours = [
            {"day_code": "MON", "opening_time": time(9, 0), "closing_time": time(17, 0)},
            {"day_code": "TUE", "opening_time": time(9, 0), "closing_time": time(17, 0)},
            {"day_code": "WED", "opening_time": time(9, 0), "closing_time": time(17, 0)},
            {"day_code": "THU", "opening_time": time(9, 0), "closing_time": time(17, 0)},
            {"day_code": "FRI", "opening_time": time(9, 0), "closing_time": time(17, 0)},
            {"day_code": "SAT", "opening_time": time(9, 0), "closing_time": time(13, 0)},
            {"day_code": "SUN", "opening_time": None, "closing_time": None},
        ]
        institutions = Institution.objects.all()
        for institution in institutions:
            self.stdout.write(f"Processing {institution.institution_name}")
            bank_type, created = InstitutionBankType.objects.get_or_create(
                institution=institution,
                bank_fullname=default_bank_data["bank_fullname"],
                bank_code=default_bank_data["bank_code"],
                br_code=default_bank_data["br_code"],
                defaults={"created_by": None, "updated_by": None},
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✅ Created default bank type for {institution.institution_name}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        f"  ♻️ Default bank type already exists for {institution.institution_name}"
                    )
                )
            account, acc_created = InstitutionBankAccount.objects.get_or_create(
                institution_bank=bank_type,
                account_number=default_bank_data["account_number"],
                defaults={
                    "account_name": default_bank_data["account_name"],
                    "created_by": None,
                    "updated_by": None,
                },
            )
            if acc_created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✅ Created default bank account for {institution.institution_name}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        f"  ♻️ Default bank account already exists for {institution.institution_name}"
                    )
                )
            branches = Branch.objects.filter(institution=institution)
            for branch in branches:
                if branch.paying_bank_account is None:
                    branch.paying_bank_account = account
                    branch.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"    └─ Updated branch '{branch.branch_name or branch.branch_location}' with default bank account"
                        )
                    )
                branch_working_days, created = BranchWorkingDays.objects.get_or_create(
                    branch=branch
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"    └─ Created working days for branch '{branch.branch_name or branch.branch_location}'"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.NOTICE(
                            f"    └─ Branch '{branch.branch_name or branch.branch_location}' already has working days"
                        )
                    )
            employees = Employee.objects.filter(
                department__institution=institution
            ).select_related("user")
            if not employees.exists():
                self.stdout.write(
                    self.style.NOTICE(
                        f"    └─ No employees found for {institution.institution_name}"
                    )
                )
            for employee in employees:
                update_fields = []
                if employee.payroll_branch is None:
                    default_branch = institution.branches.first()
                    if default_branch:
                        employee.payroll_branch = default_branch
                        update_fields.append("payroll_branch")
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"    └─ Updated employee '{employee.user.fullname if employee.user else 'Unnamed'}' with default payroll branch '{default_branch.branch_name or default_branch.branch_location}'"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"    └─ No default branch available for employee '{employee.user.fullname if employee.user else 'Unnamed'}'"
                            )
                        )
                if update_fields:
                    employee.save(update_fields=update_fields)
            self.stdout.write(
                f"\nProcessing Working Days for {institution.institution_name}"
            )
            working_days, created = InstitutionWorkingDays.objects.get_or_create(
                institution=institution
            )
            if created:
                for day_data in default_working_hours:
                    system_day = SystemDay.objects.filter(day_code=day_data["day_code"]).first()
                    if system_day and day_data["opening_time"] and day_data["closing_time"]:
                        InstitutionDay.objects.create(
                            institution_working_days=working_days,
                            day=system_day,
                            opening_time=day_data["opening_time"],
                            closing_time=day_data["closing_time"],
                        )
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"   └─ Created InstitutionDay for {system_day.day_name} ({day_data['opening_time'].strftime('%H:%M')} - {day_data['closing_time'].strftime('%H:%M')})"
                            )
                        )
                working_days.days.set([day.day for day in working_days.institution_days.all()])
                self.stdout.write(
                    self.style.SUCCESS(
                        f"   └─ Created default working days for {institution.institution_name}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        f"   └─ Default working days already exist for {institution.institution_name}"
                    )
                )
            owner_user = institution.institution_owner
            owner_employee = Employee.objects.filter(
                user=owner_user, payroll_branch__institution__id=institution.id
            ).first()
            if not owner_employee:
                owner_employee = create_owner_employee(institution)
                if owner_employee:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  └─ Created employee for owner user {owner_user.email}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  └─ Failed to create employee for owner user {owner_user.email}"
                        )
                    )
            else:
                self.stdout.write(
                    self.style.NOTICE(
                        f"  └─ Employee already exists for owner user {owner_user.email}"
                    )
                )