from django.db import migrations, models
from django.db.models import Count, Q

def clean_phone_numbers(apps, schema_editor):
    Employee = apps.get_model('employee', 'Employee')
    # Handle null or blank phone numbers
    null_phone_employees = Employee.objects.filter(Q(phone_number__isnull=True) | Q(phone_number=''))
    for emp in null_phone_employees:
        # Assign a unique placeholder based on employee ID
        emp.phone_number = f"placeholder_{emp.id}"
        emp.save()

    # Handle duplicate phone numbers
    duplicates = Employee.objects.values('phone_number').annotate(count=Count('phone_number')).filter(count__gt=1, phone_number__isnull=False).exclude(phone_number='')
    for dup in duplicates:
        phone = dup['phone_number']
        employees = Employee.objects.filter(phone_number=phone)
        for i, emp in enumerate(employees[1:], 1):  # Skip first employee
            emp.phone_number = f"{phone}_{i}"  # Append suffix to make unique
            emp.save()

class Migration(migrations.Migration):
    dependencies = [
        ('employee', '0088_alter_employeeattendance_date'),
    ]

    operations = [
        migrations.RunPython(clean_phone_numbers, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='Employee',
            name='phone_number',
            field=models.CharField(max_length=20, unique=True),
        ),
    ]