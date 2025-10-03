import string
import secrets

import json
import os
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from .models import Institution, InstitutionTax, InstitutionTaxRule, TaxRuleCategory
from employee.models import EmployeeType, WorkType
import logging

logger = logging.getLogger(__name__)


def generate_compliant_password(length=12):
    if length < 8:
        raise ValueError("Password must be at least 8 characters long.")

    # Required components
    lower = secrets.choice(string.ascii_lowercase)
    upper = secrets.choice(string.ascii_uppercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice("!@#$%^&*()-_=+[]{};:,.<>?")

    # Remaining random characters
    all_chars = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[]{};:,.<>?"
    remaining = [secrets.choice(all_chars) for _ in range(length - 4)]

    # Combine and shuffle
    password_list = [lower, upper, digit, special] + remaining
    secrets.SystemRandom().shuffle(password_list)

    return "".join(password_list)


import uuid
from datetime import datetime
import os
import json

CHAT_DIR = "AI_ASSISTANT_PERRACOSOFT_CHATS"
os.makedirs(CHAT_DIR, exist_ok=True)


# JSON-FILE-BASED-MEMORY-FUNCTIONS
def get_file_path(user_id):
    return os.path.join(CHAT_DIR, f"user_{user_id}.json")


def _load_user_file(user_id):
    try:
        with open(get_file_path(user_id), "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"user_id": user_id, "chats": []}


def _save_user_file(user_id, data):

    def convert(obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, dict):
            return {k: convert(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [convert(i) for i in obj]
        return obj

    with open(get_file_path(user_id), "w") as f:
        json.dump(convert(data), f, indent=4)


def add_message(user_id, role, message_text, chat_id=None, chat_title="New Chat"):
    data = _load_user_file(user_id)


    if chat_id is None:
        chat_id = str(uuid.uuid4())
        new_chat = {"chat_id": chat_id, "title": chat_title, "messages": []}
        data["chats"].append(new_chat)

        new_chat["messages"].append(
            {
                "role": role,
                "message": message_text,
                "timestamp": datetime.now().isoformat(),
            }
        )
    else:
        chat_found = False
        for chat in data["chats"]:

            if str(chat["chat_id"]).strip() == str(chat_id).strip():

                chat["messages"].append(
                    {
                        "role": role,
                        "message": message_text,
                        "timestamp": datetime.now().isoformat(),
                    }
                )
                chat_found = True
                break

        if not chat_found:
            new_chat = {
                "chat_id": chat_id,
                "title": chat_title,
                "messages": [
                    {
                        "role": role,
                        "message": message_text,
                        "timestamp": datetime.now().isoformat(),
                    }
                ],
            }
            data["chats"].append(new_chat)

    _save_user_file(user_id, data)
    return chat_id


def get_messages(user_id, chat_id, limit=None):
    data = _load_user_file(user_id)
    for chat in data["chats"]:
        if str(chat["chat_id"]) == str(chat_id):
            msgs = chat["messages"]
            if limit:
                return msgs[-limit:]
            return msgs
    return []


def get_user_chats(user_id):
    data = _load_user_file(user_id)
    return [
        {
            "chat_id": c["chat_id"],
            "title": c["title"],
            "messages_count": len(c["messages"]),
        }
        for c in data["chats"]
    ]


def load_db_rules(file_path: str) -> str:
    """Function to read the DB rules from a file and return as a string."""
    with open(file_path, "r") as file:
        return file.read()

class TaxRuleManager:
    
    @classmethod
    def load_tax_rules(cls):
        """Load tax rules from JSON file with proper error handling"""
        try:
            # Try multiple possible paths
            possible_paths = [
                os.path.join(settings.BASE_DIR, 'utilities', 'tax_rules.json'),
                os.path.join(settings.BASE_DIR, 'backend', 'utilities', 'tax_rules.json'),
                os.path.join(os.path.dirname(__file__), '..', 'utilities', 'tax_rules.json'),
            ]
            
            file_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    file_path = path
                    break
            
            if not file_path:
                logger.error("❌ Tax rules file not found in any location")
                return None
                
            logger.info(f"📁 Loading tax rules from: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.info(f"✅ Successfully loaded tax rules. Available countries: {list(data.keys())}")
                return data
                
        except FileNotFoundError:
            logger.error("❌ Tax rules file not found")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in tax rules file: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Error loading tax rules: {str(e)}")
            return None

    @classmethod
    def create_country_tax_rules(cls, institution):
        """Main method to create/update tax rules for an institution"""
        logger.info(f"🏢 Starting tax rules for: {institution.institution_name} ({institution.country_code})")
        
        try:
            # 1. Load tax rules data
            tax_rules_data = cls.load_tax_rules()
            if not tax_rules_data:
                logger.error("❌ No tax rules data available")
                return False

            # 2. Check if country exists in tax rules
            country = institution.country_code
            if not country:
                logger.error("❌ Institution has no country code")
                return False
                
            logger.info(f"🌍 Checking country: {country} in {list(tax_rules_data.keys())}")
            
            if country not in tax_rules_data:
                logger.warning(f"❌ No tax rules found for country: {country}")
                return False

            # 3. Create global defaults (employee types, work types)
            cls.create_global_defaults(institution, tax_rules_data)
            
            # 4. Create country-specific taxes
            country_data = tax_rules_data[country]
            success = cls.create_country_taxes(institution, country, country_data)
            
            if success:
                logger.info(f"✅ SUCCESS: Tax rules created for {institution.institution_name}")
            else:
                logger.error(f"❌ FAILED: Tax rules creation failed for {institution.institution_name}")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ ERROR in create_country_tax_rules: {str(e)}", exc_info=True)
            return False

    @classmethod
    def create_global_defaults(cls, institution, tax_rules_data):
        """Create employee types and work types"""
        try:
            global_data = tax_rules_data.get('global', {})
            logger.info(f"👥 Creating global defaults: {list(global_data.keys())}")
            
            # Employee Types
            employee_types_data = global_data.get('employee_types', [])
            for et_data in employee_types_data:
                obj, created = EmployeeType.objects.get_or_create(
                    institution=institution,
                    code=et_data['code'],
                    defaults={
                        'name': et_data['name'],
                        'description': et_data['description']
                    }
                )
                if created:
                    logger.info(f"✅ Created employee type: {obj.name}")
                else:
                    logger.info(f"📝 Employee type exists: {obj.name}")

            # Work Types
            work_types_data = global_data.get('work_types', [])
            for wt_data in work_types_data:
                obj, created = WorkType.objects.get_or_create(
                    institution=institution,
                    code=wt_data['code'],
                    defaults={
                        'name': wt_data['name'],
                        'description': wt_data['description']
                    }
                )
                if created:
                    logger.info(f"✅ Created work type: {obj.name}")
                else:
                    logger.info(f"📝 Work type exists: {obj.name}")
                    
        except Exception as e:
            logger.error(f"❌ Error creating global defaults: {str(e)}")

    @classmethod
    @transaction.atomic
    def create_country_taxes(cls, institution, country, country_data):
        """Create all taxes and tax rules for a country"""
        try:
            taxes_data = country_data.get('taxes', [])
            logger.info(f"💰 Creating {len(taxes_data)} taxes for {country}")
            
            created_taxes = 0
            created_rules = 0
            
            for tax_data in taxes_data:
                tax_success, rule_count = cls.create_tax_with_rules(institution, tax_data)
                if tax_success:
                    created_taxes += 1
                    created_rules += rule_count
            
            logger.info(f"🎯 Created {created_taxes} taxes with {created_rules} rules total")
            return created_taxes > 0
            
        except Exception as e:
            logger.error(f"❌ Error creating country taxes: {str(e)}")
            return False

    @classmethod
    def create_tax_with_rules(cls, institution, tax_data):
        """Create a single tax with all its rules"""
        try:
            # Create or update the tax
            tax, created = InstitutionTax.objects.update_or_create(
                institution=institution,
                tax_name=tax_data['tax_name'],
                defaults={
                    'tax_status': tax_data['tax_status'],
                    'created_by': institution.institution_owner
                }
            )
            
            action = "Created" if created else "Updated"
            logger.info(f"✅ {action} tax: {tax.tax_name}")

            # Create all rules for this tax
            rules_data = tax_data.get('rules', [])
            created_rules = cls.create_tax_rules(tax, rules_data, institution.institution_owner)
            
            logger.info(f"📊 Created {created_rules} rules for {tax.tax_name}")
            return True, created_rules
            
        except Exception as e:
            logger.error(f"❌ Error creating tax {tax_data.get('tax_name')}: {str(e)}")
            return False, 0

    @classmethod
    def create_tax_rules(cls, tax, rules_data, user):
        """Create all rules for a tax"""
        created_count = 0
        
        for rule_data in rules_data:
            try:
                rule_success = cls.create_single_tax_rule(tax, rule_data, user)
                if rule_success:
                    created_count += 1
            except Exception as e:
                logger.error(f"❌ Error creating rule: {str(e)}")
                continue
                
        return created_count

    @classmethod
    def create_single_tax_rule(cls, tax, rule_data, user):
        """Create a single tax rule"""
        # Prepare rule data
        rule_data_copy = rule_data.copy()
        
        # Convert numeric fields to Decimal
        decimal_fields = [
            'tax_rule_percentage', 'tax_rule_fixed_amount', 
            'salary_from', 'salary_to'
        ]
        for field in decimal_fields:
            if field in rule_data_copy and rule_data_copy[field] is not None:
                try:
                    rule_data_copy[field] = Decimal(str(rule_data_copy[field]))
                except (ValueError, TypeError):
                    rule_data_copy[field] = None

        # Handle tax rule category
        tax_rule_category = None
        category_code = rule_data_copy.get('tax_rule_category')
        if category_code:
            tax_rule_category = cls.get_or_create_tax_rule_category(category_code)

        # Create or update the tax rule
        rule, created = InstitutionTaxRule.objects.update_or_create(
            institution_tax=tax,
            tax_rule_name=rule_data_copy['tax_rule_name'],
            defaults={
                'tax_rule_description': rule_data_copy.get('tax_rule_description'),
                'tax_rule_percentage': rule_data_copy.get('tax_rule_percentage'),
                'tax_rule_fixed_amount': rule_data_copy.get('tax_rule_fixed_amount'),
                'tax_rule_formula': rule_data_copy.get('tax_rule_formula'),
                'taxable_income_source': rule_data_copy.get('taxable_income_source', 'taxable_gross_salary'),
                'tax_rule_category': tax_rule_category,
                'salary_from': rule_data_copy.get('salary_from'),
                'salary_to': rule_data_copy.get('salary_to'),
                'created_by': user
            }
        )
        
        action = "Created" if created else "Updated"
        logger.info(f"✅ {action} tax rule: {rule.tax_rule_name}")
        return True

    @classmethod
    def get_or_create_tax_rule_category(cls, category_code):
        """Get or create tax rule category"""
        category_map = {
            'RE': ('Resident', 'Tax rules applicable to resident employees'),
            'NR': ('Non-Resident', 'Tax rules applicable to non-resident employees')
        }
        
        if category_code in category_map:
            name, description = category_map[category_code]
            category, _ = TaxRuleCategory.objects.get_or_create(
                name=name,
                defaults={'description': description}
            )
            return category
        return None

    @classmethod
    def get_institution_tax_status(cls, institution_id):
        """Check what taxes exist for an institution"""
        try:
            institution = Institution.objects.get(id=institution_id)
            taxes = InstitutionTax.objects.filter(institution=institution)
            tax_rules = InstitutionTaxRule.objects.filter(institution_tax__institution=institution)
            
            return {
                'institution': {
                    'id': institution.id,
                    'name': institution.institution_name,
                    'country_code': institution.country_code,
                },
                'taxes_count': taxes.count(),
                'tax_rules_count': tax_rules.count(),
                'taxes': list(taxes.values('id', 'tax_name', 'tax_status')),
                'tax_rules': list(tax_rules.values('id', 'tax_rule_name', 'institution_tax__tax_name')),
            }
        except Institution.DoesNotExist:
            return {'error': 'Institution not found'}

    @classmethod
    def force_create_tax_rules(cls, institution_id):
        """Force create tax rules for an institution (for debugging)"""
        try:
            institution = Institution.objects.get(id=institution_id)
            logger.info(f"🔧 FORCE creating tax rules for: {institution.institution_name}")
            return cls.create_country_tax_rules(institution)
        except Exception as e:
            logger.error(f"❌ Force creation failed: {str(e)}")
            return False