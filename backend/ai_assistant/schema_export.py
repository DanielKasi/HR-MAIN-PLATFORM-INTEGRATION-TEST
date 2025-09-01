from django.apps import apps
from django.db import models


def get_database_schema_for_ai() -> str:
    """
    Returns a string representation of the entire database schema:
    - Tables (models)
    - Fields per table
    - Relationships (ForeignKey, ManyToMany)
    This version assumes a shared schema across tenants.
    """
    schema_lines = []

    for model in apps.get_models():
        model_name = model._meta.db_table
        schema_lines.append(f"\nTable: {model_name}")

        for field in model._meta.get_fields():
            if isinstance(field, models.ForeignKey):
                schema_lines.append(
                    f"  {field.name} -> ForeignKey to {field.related_model._meta.db_table}"
                )
            elif isinstance(field, models.ManyToManyField):
                schema_lines.append(
                    f"  {field.name} -> ManyToMany to {field.related_model._meta.db_table}"
                )
            elif isinstance(field, models.OneToOneField):
                schema_lines.append(
                    f"  {field.name} -> OneToOne to {field.related_model._meta.db_table}"
                )
            elif isinstance(field, models.Field):
                schema_lines.append(f"  {field.name} ({field.get_internal_type()})")

    return "\n".join(schema_lines)
