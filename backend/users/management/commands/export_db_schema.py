from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import models
import os


def get_database_schema_for_ai() -> str:
    """
    Returns a string representation of the entire database schema suitable for AI agents:
    - Tables (models)
    - Fields per table (with types)
    - Relationships (ForeignKey, OneToOne, ManyToMany)
    - Foreign key graph for nested relationships
    - General SQL rules
    This version is schema-agnostic and supports nested relationships.
    """
    schema_lines = []
    fk_graph_lines = []

    for model in apps.get_models():
        model_name = model._meta.db_table
        schema_lines.append(f"\nTable: {model_name}")

        for field in model._meta.get_fields():
            if isinstance(field, models.ForeignKey):
                pk_info = "PK" if field.primary_key else ""
                schema_lines.append(
                    f"  {field.name} ({field.get_internal_type()}) -> ForeignKey to {field.related_model._meta.db_table} {pk_info}"
                )
                fk_graph_lines.append(
                    f"{model_name}.{field.name} -> {field.related_model._meta.db_table}.{field.related_model._meta.pk.name}"
                )

            elif isinstance(field, models.OneToOneField):
                pk_info = "PK" if field.primary_key else ""
                schema_lines.append(
                    f"  {field.name} ({field.get_internal_type()}) -> OneToOne to {field.related_model._meta.db_table} {pk_info}"
                )
                fk_graph_lines.append(
                    f"{model_name}.{field.name} -> {field.related_model._meta.db_table}.{field.related_model._meta.pk.name} (OneToOne)"
                )

            elif isinstance(field, models.ManyToManyField):
                schema_lines.append(
                    f"  {field.name} ({field.get_internal_type()}) -> ManyToMany to {field.related_model._meta.db_table}"
                )

            elif isinstance(field, models.Field):
                pk_info = "PK" if field.primary_key else ""
                schema_lines.append(
                    f"  {field.name} ({field.get_internal_type()}) {pk_info}"
                )

    schema_lines.append("\nForeign Key Graph:")
    if fk_graph_lines:
        schema_lines.extend(fk_graph_lines)
    else:
        schema_lines.append("  No foreign keys detected")

    schema_lines.append("\nSQL Rules and Best Practices:")
    schema_lines.append("- Always validate table and column names exist")
    schema_lines.append("- Avoid SELECT *; use explicit column names")
    schema_lines.append(
        "- Use joins following foreign key relationships for nested queries"
    )
    schema_lines.append("- Multiple joins are allowed for nested relationships")
    schema_lines.append("- Ensure query results match the intended entity")
    schema_lines.append("- Use parameterized queries to prevent SQL injection")
    schema_lines.append(
        "- For multi-tenant setups, always filter by tenant or parent entity ID"
    )

    return "\n".join(schema_lines)


class Command(BaseCommand):
    help = "Export the database schema and relationships for AI knowledge base"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default="db_schema_and_rules.txt",
            help="File path to write the schema output",
        )

    def handle(self, *args, **options):
        output_file = options["output"]

        schema_text = get_database_schema_for_ai()

        os.makedirs(os.path.dirname(output_file) or ".", exist_ok=True)

        with open(output_file, "w") as f:
            f.write(schema_text)

        self.stdout.write(
            self.style.SUCCESS(f"Database schema exported to {output_file}")
        )
