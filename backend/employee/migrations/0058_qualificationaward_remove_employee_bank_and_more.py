import django.db.models.deletion
from django.db import migrations, models
from django.utils import timezone

def populate_new_models(apps, schema_editor):
    Employee = apps.get_model('employee', 'Employee')
    EmployeeBankAccount = apps.get_model('employee', 'EmployeeBankAccount')
    NextOfKin = apps.get_model('employee', 'NextOfKin')
    Child = apps.get_model('employee', 'Child')
    Spouse = apps.get_model('employee', 'Spouse')
    QualificationAward = apps.get_model('employee', 'QualificationAward')
    Education = apps.get_model('employee', 'Education')
    WorkExperience = apps.get_model('employee', 'WorkExperience')
    InstitutionBankType = apps.get_model('institution', 'InstitutionBankType')

    # Lists for bulk creation
    bank_accounts = []
    next_of_kins = []
    children = []
    spouses = []
    educations = []
    work_experiences = []
    qualifications = set()
    skipped_employees = []

    # Cache InstitutionBankType records
    bank_cache = {(bank.bank_fullname, bank.institution_id): bank for bank in InstitutionBankType.objects.all()}

    for employee in Employee.objects.select_related('department__institution', 'user').all():
        # Transfer bank details
        if employee.bank and employee.bank.strip() and employee.bank_account_number and employee.bank_account_number.strip():
            try:
                institution = employee.department.institution
                bank_key = (employee.bank, institution.id)
                if bank_key in bank_cache:
                    bank = bank_cache[bank_key]
                else:
                    # Ensure unique bank_code
                    base_code = f'{employee.bank[:10]}'.replace(' ', '_')
                    bank_code = base_code
                    counter = 1
                    while InstitutionBankType.objects.filter(bank_code=bank_code).exists():
                        bank_code = f'{base_code}-{counter}'
                        counter += 1
                    bank, created = InstitutionBankType.objects.get_or_create(
                        bank_fullname=employee.bank,
                        institution=institution,
                        defaults={
                            'bank_code': bank_code,
                            # Add other required fields if needed, e.g.:
                            # 'is_active': True,
                            # 'created_at': timezone.now(),
                        }
                    )
                    if created:
                        bank_cache[bank_key] = bank
                bank_accounts.append(
                    EmployeeBankAccount(
                        employee=employee,
                        bank=bank,
                        account_name=employee.user.fullname or f'Employee {employee.id}',
                        account_number=employee.bank_account_number
                    )
                )
            except Exception as e:
                skipped_employees.append((employee.id, f"Bank account error: {str(e)}"))
        else:
            skipped_employees.append((employee.id, "Invalid or missing bank/bank_account_number"))

        # Transfer emergency contact to NextOfKin
        if employee.emergency_contact_name and employee.emergency_contact_phone:
            try:
                relationship = employee.emergency_contact_relationship or 'other'
                relationship = relationship.lower()
                if relationship not in ['father', 'mother', 'spouse', 'child', 'other']:
                    relationship = 'other'
                next_of_kins.append(
                    NextOfKin(
                        employee=employee,
                        name=employee.emergency_contact_name,
                        phone_number=employee.emergency_contact_phone,
                        address='Unknown',
                        relationship=relationship
                    )
                )
            except Exception as e:
                print(f"Failed to create NextOfKin for Employee {employee.id}: {e}")

        # Transfer children_count to has_children and Child
        if employee.children_count is not None and employee.children_count > 0:
            try:
                employee.has_children = True
                employee.save()
                for i in range(employee.children_count):
                    children.append(
                        Child(
                            employee=employee,
                            name=f'Child {i+1}',
                            date_of_birth=timezone.now().date(),
                            gender='other'
                        )
                    )
            except Exception as e:
                print(f"Failed to create Child for Employee {employee.id}: {e}")

        # Create Spouse if married
        if employee.marital_status == 'married' and not hasattr(employee, 'spouse'):
            try:
                spouses.append(
                    Spouse(
                        employee=employee,
                        name='Unknown Spouse',
                        date_of_birth=None,
                        phone_number=None
                    )
                )
            except Exception as e:
                print(f"Failed to create Spouse for Employee {employee.id}: {e}")

        # Transfer qualifications to QualificationAward and Education
        if employee.qualifications and employee.qualifications.strip():
            try:
                qual_list = employee.qualifications.split(',')
                for qual in qual_list:
                    qual = qual.strip()
                    if not qual:  # Skip empty qualifications
                        continue
                    if qual not in qualifications:
                        qualifications.add(qual)
                        QualificationAward.objects.get_or_create(
                            name=qual,
                            defaults={'description': 'Imported from old qualifications'}
                        )
                    try:
                        award = QualificationAward.objects.get(name=qual)
                        educations.append(
                            Education(
                                employee=employee,
                                institution='Unknown Institution',
                                year=2000,
                                qualification=qual,  # CharField
                                award=award  # ForeignKey to QualificationAward
                            )
                        )
                    except QualificationAward.DoesNotExist:
                        print(f"QualificationAward '{qual}' not found for Employee {employee.id}")
            except Exception as e:
                print(f"Failed to create Education for Employee {employee.id}: {e}")

        # Transfer experience to WorkExperience
        if employee.experience is not None and employee.experience > 0:
            try:
                work_experiences.append(
                    WorkExperience(
                        employee=employee,
                        company='Previous Employer',
                        position='Unknown Position',
                        duration=f'{employee.experience} years',
                        reason_of_leaving=''
                    )
                )
            except Exception as e:
                print(f"Failed to create WorkExperience for Employee {employee.id}: {e}")

    # Bulk create with error handling
    if bank_accounts:
        try:
            EmployeeBankAccount.objects.bulk_create(bank_accounts)
        except Exception as e:
            print(f"Failed to bulk create EmployeeBankAccount: {e}")
    if next_of_kins:
        try:
            NextOfKin.objects.bulk_create(next_of_kins)
        except Exception as e:
            print(f"Failed to bulk create NextOfKin: {e}")
    if children:
        try:
            Child.objects.bulk_create(children)
        except Exception as e:
            print(f"Failed to bulk create Child: {e}")
    if spouses:
        try:
            Spouse.objects.bulk_create(spouses)
        except Exception as e:
            print(f"Failed to bulk create Spouse: {e}")
    if educations:
        try:
            Education.objects.bulk_create(educations)
        except Exception as e:
            print(f"Failed to bulk create Education: {e}")
    if work_experiences:
        try:
            WorkExperience.objects.bulk_create(work_experiences)
        except Exception as e:
            print(f"Failed to bulk create WorkExperience: {e}")

    # Log skipped employees
    if skipped_employees:
        print("Skipped EmployeeBankAccount creation for the following employees:")
        for emp_id, reason in skipped_employees:
            print(f"Employee ID {emp_id}: {reason}")

def reverse_populate_new_models(apps, schema_editor):
    EmployeeBankAccount = apps.get_model('employee', 'EmployeeBankAccount')
    NextOfKin = apps.get_model('employee', 'NextOfKin')
    Child = apps.get_model('employee', 'Child')
    Spouse = apps.get_model('employee', 'Spouse')
    Education = apps.get_model('employee', 'Education')
    WorkExperience = apps.get_model('employee', 'WorkExperience')
    
    EmployeeBankAccount.objects.all().delete()
    NextOfKin.objects.all().delete()
    Child.objects.all().delete()
    Spouse.objects.all().delete()
    Education.objects.all().delete()
    WorkExperience.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('employee', '0057_alter_employee_options'),
        ('institution', '0041_branchpenaltyconfig_unique_branch_penalty_type_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='QualificationAward',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Child',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=50)),
                ('date_of_birth', models.DateField()),
                ('gender', models.CharField(choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], default='other', max_length=10)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='children', to='employee.employee')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='EmployeeBankAccount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('account_name', models.CharField(max_length=50)),
                ('account_number', models.CharField(max_length=50)),
                ('bank', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='employee_bank_accounts', to='institution.institutionbanktype')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bank_accounts', to='employee.employee')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='NextOfKin',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=255)),
                ('phone_number', models.CharField(max_length=50)),
                ('address', models.CharField(max_length=50)),
                ('relationship', models.CharField(choices=[('father', 'Father'), ('mother', 'Mother'), ('spouse', 'Spouse'), ('child', 'Child'), ('other', 'Other')], max_length=50)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='next_of_kins', to='employee.employee')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Education',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('institution', models.CharField(max_length=100)),
                ('qualification', models.CharField(max_length=255)),
                ('year', models.PositiveIntegerField()),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='educations', to='employee.employee')),
                ('award', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='educations', to='employee.qualificationaward')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Spouse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=50)),
                ('date_of_birth', models.DateField(blank=True, null=True)),
                ('phone_number', models.CharField(blank=True, max_length=20, null=True)),
                ('employee', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='spouse', to='employee.employee')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='WorkExperience',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('company', models.CharField(max_length=100)),
                ('position', models.CharField(max_length=100)),
                ('duration', models.CharField(max_length=50)),
                ('reason_of_leaving', models.CharField(blank=True, max_length=255, null=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='work_experiences', to='employee.employee')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunPython(populate_new_models, reverse_populate_new_models),
        migrations.AddField(
            model_name='employee',
            name='has_children',
            field=models.BooleanField(default=False),
        ),
        migrations.RemoveField(
            model_name='employee',
            name='bank',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='bank_account_number',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='children_count',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='emergency_contact_name',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='emergency_contact_phone',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='emergency_contact_relationship',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='experience',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='qualifications',
        ),
    ]