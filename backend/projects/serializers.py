from rest_framework import serializers
from .models import Project, Task, TaskDocument, TaskTimeSheet, ProjectDocument
from django.db import transaction
from employee.models import Employee
from approval.serializers import BaseApprovableSerializer
from django.utils import timezone


class ProjectDocumentSerializer(BaseApprovableSerializer):
    class Meta:
        model = ProjectDocument
        fields = "__all__"


class TaskDocumentSerializer(BaseApprovableSerializer):
    class Meta:
        model = TaskDocument
        fields = "__all__"


class TaskTimeSheetSerializer(BaseApprovableSerializer):
    time_spent = serializers.SerializerMethodField()

    class Meta:
        model = TaskTimeSheet
        fields = '__all__'

    def get_time_spent(self, obj):
        if obj.timespent:
            total_seconds = int(obj.timespent.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{hours}h {minutes}m {seconds}s"
        return None

    def validate(self, data):
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError({"error": "User context is required."})

        current_user_profile = getattr(request.user, "profile", None)

        if not current_user_profile:
            raise serializers.ValidationError({"error": "User must have a profile."})

        task = self.instance.task if self.instance else None

        if task:
            task_managers = task.managers.all()
            if current_user_profile not in task_managers:
                raise serializers.ValidationError(
                    {"error": "Only task managers can update timesheets for this task"}
                )

            if start_time and not self.instance.start_time:
                if task.task_status != "not_started":
                    raise serializers.ValidationError(
                        {"error": "Start time can only be set when the task is not started"}
                    )

        current_start = self.instance.start_time if self.instance else None
        current_end = self.instance.end_time if self.instance else None

        final_start = start_time if start_time is not None else current_start
        final_end = end_time if end_time is not None else current_end

        if final_start and final_end:
            if final_start >= final_end:
                raise serializers.ValidationError({"error": "Start time must be before end time"})

        return data

    def validate_start_time(self, value):
        if (
            self.instance
            and self.instance.start_time
            and value != self.instance.start_time
        ):
            if self.instance.start_time is not None:
                raise serializers.ValidationError(
                    {"error": "Start time can only be set once and cannot be changed"}
                )
        return value

    def create(self, validated_data):
        raise serializers.ValidationError(
            {"error": "Timesheets are automatically created when tasks are created."}
        )

    def update(self, instance, validated_data):
        start_time = validated_data.get("start_time")
        end_time = validated_data.get("end_time")

        request = self.context.get("request")
        current_user_profile = request.user.profile

        if current_user_profile not in instance.task.managers.all():
            raise serializers.ValidationError({"error": "Only task managers can update timesheets"})

        task = instance.task

        if start_time and not instance.start_time:
            if task.task_status == "not_started":
                task.task_status = "in_progress"
                task.save(update_fields=["task_status"])

        if end_time and not instance.end_time:
            if task.task_status == "in_progress":
                task.task_status = "completed"
                task.completion_date = timezone.now().date()
                task.save(update_fields=["task_status", "completion_date"])

        validated_data["updated_by"] = current_user_profile

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance



class ProjectSerializer(BaseApprovableSerializer):
    project_tasks = serializers.SerializerMethodField()
    managers = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of manager IDs"
    )
    project_documents = serializers.SerializerMethodField()
    assignees = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of assignee IDs"
    )
    documents = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
        help_text="List of documents to upload with the project"
    )
    # Explicit field definitions to enforce string conversion
    project_name = serializers.CharField(max_length=255, allow_blank=False)
    project_status = serializers.ChoiceField(
        choices=Project.PROJECT_STATUS_CHOICES,
        default="not_started"
    )

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "project_tasks",
            "project_documents",
        ]

    def get_project_tasks(self, obj):
        tasks = Task.objects.filter(project=obj)
        return TaskSerializer(tasks, many=True).data
    
    def get_project_documents(self, obj):
        documents = ProjectDocument.objects.filter(project=obj, deleted_at__isnull=True)
        return ProjectDocumentSerializer(documents, many=True).data

    def to_internal_value(self, data):
        data_copy = dict(data)   
        documents = data_copy.pop('documents', [])  

        if 'managers' in data_copy:
            data_copy['managers'] = self._parse_array_field(data_copy['managers'])
        if 'assignees' in data_copy:
            data_copy['assignees'] = self._parse_array_field(data_copy['assignees'])

        single_value_fields = [
            'project_name', 'description', 'start_date', 'end_date', 
            'project_status', 'institution'
        ]
        
        for field in single_value_fields:
            if field in data_copy:
                value = data_copy[field]
                if isinstance(value, list):
                    if len(value) == 1:
                        data_copy[field] = value[0]
                    elif len(value) > 1:
                        raise serializers.ValidationError(
                            {field: f"Expected a single value for {field}, got multiple: {value}"}
                        )
                    else:
                        data_copy[field] = None
                elif isinstance(value, str) and value.startswith('[') and value.endswith(']'):
                    try:
                        import json
                        parsed_value = json.loads(value)
                        if isinstance(parsed_value, list) and len(parsed_value) == 1:
                            data_copy[field] = parsed_value[0]
                        else:
                            raise serializers.ValidationError(
                                {field: f"Invalid stringified list for {field}: {value}"}
                            )
                    except json.JSONDecodeError:
                        data_copy[field] = value

        if documents:
            data_copy['documents'] = documents

        return super().to_internal_value(data_copy)

    def _parse_array_field(self, field_value):
        if isinstance(field_value, str):
            if field_value:
                try:
                    return [int(x.strip()) for x in field_value.split(',') if x.strip()]
                except ValueError:
                    return []
            return []
        elif isinstance(field_value, list):
            result = []
            for item in field_value:
                if isinstance(item, str) and ',' in item:
                    try:
                        result.extend([int(x.strip()) for x in item.split(',') if x.strip()])
                    except ValueError:
                        continue
                else:
                    try:
                        result.append(int(item))
                    except (ValueError, TypeError):
                        continue
            return result
        return []

    def validate(self, data):
        institution = data.get("institution")
        managers = data.get("managers", [])
        assignees = data.get("assignees", [])
        documents = data.get("documents", [])
        project_status = data.get("project_status")

        managers = self._parse_array_field(managers)
        assignees = self._parse_array_field(assignees)
        data['managers'] = managers
        data['assignees'] = assignees

        if not institution:
            raise serializers.ValidationError({"error": "Institution is required"})

        if project_status and project_status not in dict(Project.PROJECT_STATUS_CHOICES):
            raise serializers.ValidationError(
                {"project_status": f"'{project_status}' is not a valid choice."}
            )

        manager_objects = []
        if managers:
            for manager_id in managers:
                try:
                    manager = Employee.objects.get(id=manager_id, department__institution=institution)
                    manager_objects.append(manager)
                except Employee.DoesNotExist:
                    raise serializers.ValidationError(
                        {"managers": f"Manager with ID {manager_id} does not belong to the selected institution"}
                    )
            data['managers'] = manager_objects

        assignee_objects = []
        if assignees:
            for assignee_id in assignees:
                try:
                    assignee = Employee.objects.get(id=assignee_id, department__institution=institution)
                    assignee_objects.append(assignee)
                except Employee.DoesNotExist:
                    raise serializers.ValidationError(
                        {"assignees": f"Assignee with ID {assignee_id} does not belong to the selected institution"}
                    )
            data['assignees'] = assignee_objects

        if documents:
            for document in documents:
                if not isinstance(document, (str, bytes)) and hasattr(document, 'size'):
                    if document.size > 10 * 1024 * 1024:  # 10MB limit
                        raise serializers.ValidationError(
                            {"documents": f"File {document.name} exceeds maximum size of 10MB"}
                        )
                else:
                    raise serializers.ValidationError(
                        {"documents": f"Invalid file format for {document}"}
                    )

        return data

    def _create_project_documents(self, project, documents):
        """Helper method to create project documents."""
        for document_file in documents:
            ProjectDocument.objects.create(
                project=project,
                document=document_file,
            )

    @transaction.atomic
    def create(self, validated_data):
        managers = validated_data.pop("managers", [])
        assignees = validated_data.pop("assignees", [])
        documents = validated_data.pop("documents", [])


        # Create project
        project = Project.objects.create(
            **validated_data,
        )

        # Set managers and assignees
        if managers:
            project.managers.set(managers)
        if assignees:
            project.assignees.set(assignees)

        # Handle document creation
        if documents:
            self._create_project_documents(project, documents)

        return project

    @transaction.atomic
    def update(self, instance, validated_data):
        managers = validated_data.pop("managers", None)
        assignees = validated_data.pop("assignees", None)
        documents = validated_data.pop("documents", [])


        # Update project fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update managers and assignees if provided
        if managers is not None:
            instance.managers.set(managers)
        if assignees is not None:
            instance.assignees.set(assignees)

        # Handle document creation
        if documents:
            self._create_project_documents(instance, documents)

        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        from employee.serializers import EmployeeSerializer
        rep["managers"] = EmployeeSerializer(instance.managers.all(), many=True).data
        rep["assignees"] = EmployeeSerializer(instance.assignees.all(), many=True).data
        return rep


class TaskSerializer(BaseApprovableSerializer):
    task_time_sheet = serializers.SerializerMethodField()
    managers = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), many=True, required=False
    )
    assignees = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), many=True, required=False
    )

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "task_time_sheet",
        ]

    def get_task_time_sheet(self, obj):
        try:
            timesheet = obj.timesheet
        except TaskTimeSheet.DoesNotExist:
            return None

        return TaskTimeSheetSerializer(timesheet).data

    def validate(self, data):
        project = data.get("project")
        managers = data.get("managers", [])
        assignees = data.get("assignees", [])

        if not project:
            raise serializers.ValidationError({"error": "Project is required."})

        # Enforce project matches URL project_id if provided in context
        context_project_id = self.context.get('project_id')
        if context_project_id and project.id != context_project_id:
            raise serializers.ValidationError({"error": "Project does not match the specified ID."})

        # Get the project's managers and assignees
        project_managers = set(project.managers.values_list("id", flat=True))
        project_assignees = set(project.assignees.values_list("id", flat=True))
        project_participants = project_managers.union(project_assignees)

        # Validate managers
        manager_ids = [manager.id for manager in managers]
        invalid_managers = [manager_id for manager_id in manager_ids if manager_id not in project_participants]
        if invalid_managers:
            raise serializers.ValidationError(
                {"error": f"Managers with IDs {list(invalid_managers)} are not part of the project."}
            )

        # Validate assignees
        assignee_ids = [assignee.id for assignee in assignees]
        invalid_assignees = [assignee_id for assignee_id in assignee_ids if assignee_id not in project_participants]
        if invalid_assignees:
            raise serializers.ValidationError(
                {"error": f"Assignees with IDs {list(invalid_assignees)} are not part of the project."}
            )

        # Validate institution
        from employee.models import Employee

        if managers:
            valid_managers = Employee.objects.filter(
                id__in=manager_ids, department__institution=project.institution
            ).values_list("id", flat=True)
            invalid_managers = set(manager_ids) - set(valid_managers)
            if invalid_managers:
                raise serializers.ValidationError(
                    {"error": f"Managers with IDs {list(invalid_managers)} do not belong to the institution."}
                )

        if assignees:
            valid_assignees = Employee.objects.filter(
                id__in=assignee_ids, department__institution=project.institution
            ).values_list("id", flat=True)
            invalid_assignees = set(assignee_ids) - set(valid_assignees)
            if invalid_assignees:
                raise serializers.ValidationError(
                    {"error": f"Assignees with IDs {list(invalid_assignees)} do not belong to the institution."}
                )

        # Validate dates
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"error": "Start date cannot be after end date."})

        return data

    @transaction.atomic
    def create(self, validated_data):
        managers = validated_data.pop("managers", [])
        assignees = validated_data.pop("assignees", [])

        task = Task.objects.create(**validated_data)

        if managers:
            task.managers.set(managers)

        if assignees:
            task.assignees.set(assignees)

        return task

    @transaction.atomic
    def update(self, instance, validated_data):
        managers = validated_data.pop("managers", None)
        assignees = validated_data.pop("assignees", None)

        # Capture old status before update
        old_status = instance.task_status

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()


        if managers is not None:
            instance.managers.set(managers)
        if assignees is not None:
            instance.assignees.set(assignees)

        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)

        from employee.serializers import EmployeeSerializer

        rep["managers"] = EmployeeSerializer(instance.managers.all(), many=True).data
        rep["assignees"] = EmployeeSerializer(instance.assignees.all(), many=True).data

        return rep