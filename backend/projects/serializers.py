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
    
    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        
        if self.instance:
            task = self.instance.task
            
        request = self.context.get('request')
        
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User context is required.")
        
        current_user_profile = getattr(request.user, 'profile', None)
        
        if not current_user_profile:
            raise serializers.ValidationError("User must have a profile.")
        
        task = None
            
        if task:
            task_leaders = task.leaders.all()
            if current_user_profile not in task_leaders:
                raise serializers.ValidationError(
                    "Only task leaders can update timesheets for this task"
                )
            
            if start_time and not self.instance.start_time:
                if task.status != "not_started":
                    raise serializers.ValidationError(
                        "Start time can only be set when the task is not started"
                    )
                    
        current_start = self.instance.start_time if self.instance else None
        current_end = self.instance.end_time if self.instance else None
        
        final_start = start_time if start_time is not None else current_start
        final_end = end_time if end_time is not None else current_end
        
        if final_start and final_end:
            if final_start >= final_end:
                raise serializers.ValidationError("Start time must be before end time")
        
        return data
            
    def validate_start_time(self, value):
        if self.instance and self.instance.start_time and value != self.instance.start_time:
            if self.instance.start_time is not None:
                raise serializers.ValidationError(
                    "Start time can only be set once and cannot be changed"
                )
                
        return value
    
    def create(self, validated_data):
        raise serializers.ValidationError("Timesheets are automatically created when tasks are created.")
    
    def update(self, instance, validated_data):
        start_time = validated_data.get('start_time')
        end_time = validated_data.get('end_time')
        
        request = self.context.get('request')
        current_user_profile = request.user.profile

        if current_user_profile not in instance.task.leaders.all():
            raise serializers.ValidationError(
                "Only task leaders can update timesheets"
            )
        
        task = instance.task
        
        if start_time and not instance.start_time:
            if task.status == 'not_started':
                task.status = 'in_progress'
                task.save(update_fields=['status'])
        
        if end_time and not instance.end_time:
            if task.status == 'in_progress':
                task.status = 'completed'
                task.save(update_fields=['status'])
                
        validated_data['updated_by'] = current_user_profile
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance


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
    
    def validate(self, data):
        institution = data.get('institution')
        leaders_ids = data.get('leaders', [])
        members_ids = data.get('members', [])
        
        if not institution:
            raise serializers.ValidationError("Institution is required")
        
        from users.models import Profile
        
        if leaders_ids:
            valid_leaders = Profile.objects.filter(
                id__in=leaders_ids,
                institution=institution
            ).values_list('id', flat=True)
            
            invalid_leaders = set(leaders_ids) - set(valid_leaders)
            if invalid_leaders:
                raise serializers.ValidationError(
                    f"Leaders with IDs {list(invalid_leaders)} do not belong to the selected institution"
                )
        
        if members_ids:
            valid_members = Profile.objects.filter(
                id__in=members_ids,
                institution=institution
            ).values_list('id', flat=True)
            
            invalid_members = set(members_ids) - set(valid_members)
            if invalid_members:
                raise serializers.ValidationError(
                    f"Members with IDs {list(invalid_members)} do not belong to the selected institution"
                )
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        leaders_ids = validated_data.pop("leaders", [])
        members_ids = validated_data.pop("members", [])

        project = Project.objects.create(**validated_data)

        if leaders_ids:
            project.leaders.set(leaders_ids)

        if members_ids:
            project.members.set(members_ids)

        return project
    
    @transaction.atomic
    def update(self, instance, validated_data):
        leaders_ids = validated_data.pop('leaders', None)
        members_ids = validated_data.pop('members', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if leaders_ids is not None:
            instance.leaders.set(leaders_ids)
        if members_ids is not None:
            instance.members.set(members_ids)

        return instance
    


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

    def validate(self, data):
        project = data.get("project")
        leaders_ids = data.get("leaders", [])
        assigned_to_ids = data.get("assigned_to", [])

        if not project:
            raise serializers.ValidationError("Project is required.")

        from users.models import Profile

        if leaders_ids:
            valid_leaders = Profile.objects.filter(
                id__in=leaders_ids, institution=project.institution
            ).values_list("id", flat=True)

            invalid_leaders = set(leaders_ids) - set(valid_leaders)

            if invalid_leaders:
                raise serializers.ValidationError(
                    f"Leaders with IDs {list(invalid_leaders)} do not belong to the institution."
                )

        if assigned_to_ids:
            valid_assigned_to = Profile.objects.filter(
                id__in=assigned_to_ids, institution=project.institution
            ).values_list("id", flat=True)

            invalid_assigned_to = set(assigned_to_ids) - set(valid_assigned_to)

        start_date = data.get("start_date")
        end_date = data.get("end_date")

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Start date cannot be after end date.")
        return data

    @transaction.atomic
    def create(self, validated_data):
        leaders_ids = validated_data.pop("leaders", [])
        assigned_to_ids = validated_data.pop("assigned_to", [])

        task = Task.objects.create(**validated_data)

        if leaders_ids:
            task.leaders.set(leaders_ids)

        if assigned_to_ids:
            task.assigned_to.set(assigned_to_ids)

        TaskTimeSheet.objects.create(
            task=task,
            start_time=None
            end_time=None,
            notes="",
        )
        
        return task
    
    @transaction.atomic
    def update(self, instance, validated_data):
        leaders_ids = validated_data.pop('leaders', None)
        assigned_to_ids = validated_data.pop('assigned_to', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if leaders_ids is not None:
            instance.leaders.set(leaders_ids)
        if assigned_to_ids is not None:
            instance.assigned_to.set(assigned_to_ids)
        
        return instance
