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
        fields = [
            "id",
            "task",
            "start_time",
            "end_time",
            "time_spent",
            "notes",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

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
    managers = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), many=True
    )
    project_documents = serializers.SerializerMethodField()
    assignees = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), many=True
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "institution",
            "project_name",
            "managers",
            "assignees",
            "description",
            "start_date",
            "end_date",
            "project_status",
            "project_documents",
            "project_tasks",
            "is_active",
        ]
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
        documents = ProjectDocument.objects.filter(project=obj)
        return ProjectDocumentSerializer(documents, many=True).data

    def validate(self, data):
        institution = data.get("institution")
        managers = data.get("managers", [])
        assignees = data.get("assignees", [])

        manager_ids = [manager.id for manager in managers]
        assignee_ids = [assignee.id for assignee in assignees]

        if not institution:
            raise serializers.ValidationError({"error": "Institution is required"})

        from employee.models import Employee

        if managers:
            valid_managers = Employee.objects.filter(
                id__in=manager_ids, department__institution=institution
            ).values_list("id", flat=True)

            invalid_managers = set(manager_ids) - set(valid_managers)
            if invalid_managers:
                raise serializers.ValidationError(
                    {"error": f"Managers with IDs {list(invalid_managers)} do not belong to the selected institution"}
                )

        if assignees:
            valid_assignees = Employee.objects.filter(
                id__in=assignee_ids, department__institution=institution
            ).values_list("id", flat=True)

            invalid_assignees = set(assignee_ids) - set(valid_assignees)
            if invalid_assignees:
                raise serializers.ValidationError(
                    {"error": f"Assignees with IDs {list(invalid_assignees)} do not belong to the selected institution"}
                )

        return data

    @transaction.atomic
    def create(self, validated_data):
        managers = validated_data.pop("managers", [])
        assignees = validated_data.pop("assignees", [])

        project = Project.objects.create(**validated_data)

        if managers:
            project.managers.set(managers)

        if assignees:
            project.assignees.set(assignees)

        return project

    @transaction.atomic
    def update(self, instance, validated_data):
        managers = validated_data.pop("managers", None)
        assignees = validated_data.pop("assignees", None)

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
        fields = [
            "id",
            "project",
            "task_name",
            "description",
            "managers",
            "assignees",
            "task_status",
            "start_date",
            "end_date",
            "priority",
            "task_time_sheet",
            "is_active",
        ]
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