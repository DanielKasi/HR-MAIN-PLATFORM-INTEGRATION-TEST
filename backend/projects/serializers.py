from rest_framework import serializers
from .models import Project, Task, TaskDocument, TaskTimeSheet, ProjectDocument


class ProjectDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectDocument
        fields = "__all__"


class TaskDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskDocument
        fields = "__all__"


class TaskTimeSheetSerializer(serializers.ModelSerializer):
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


class ProjectSerializer(serializers.ModelSerializer):
    project_tasks = serializers.SerializerMethodField()
    
    class Meta:
        model = Project

        fields = [
            "id",
            "institution",
            "project_name",
            "leaders",
            "members",
            "description",
            "start_date",
            "end_date",
            "status",
            "project_tasks",
            
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "project_tasks",
        ]
        
    def get_project_tasks(self, obj):
        tasks = Task.objects.filter(project=obj)
        return TaskSerializer(tasks, many=True).data

class TaskSerializer(serializers.ModelSerializer):
    task_time_sheet = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "task_name",
            "description",
            "assigned_to",
            "status",
            "start_date",
            "end_date",
            "priority",
            "task_time_sheet",
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
