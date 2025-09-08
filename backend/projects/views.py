from django.shortcuts import render
from .models import Project, Task, TaskTimeSheet
from .serializers import (
    ProjectSerializer,
    TaskTimeSheetSerializer,
    TaskSerializer,
)
from rest_framework.views import APIView, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from institution.models import Institution
from utilities.pagination import CustomPageNumberPagination
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.db.models import Q
from django.db import transaction
from utilities.sortable_api import SortableAPIMixin



class ProjectListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['project_name', 'created_at', 'leaders', 'is_active', 'members', 'description', 'start_date', 'end_date', 'project_status']
    default_ordering = ['project_name']

    @extend_schema(
        operation_id="List Projects",
        summary="List all projects",
        responses={
            200: ProjectSerializer(many=True),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        institution = get_object_or_404(Institution, id=institution_id)
        projects = Project.objects.filter(institution=institution, deleted_at__isnull=True)

        if search_query:
            projects = projects.filter(
                Q(project_name__icontains=search_query)
            )
        try:
            projects = self.apply_sorting(projects, request)
        except ValueError as e:
            return Response ({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        paginator = CustomPageNumberPagination()
        paginated_projects = paginator.paginate_queryset(projects, request)
        serializer = ProjectSerializer(paginated_projects, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        operation_id="Create Project",
        summary="Create a new project",
        request=ProjectSerializer,
        responses={
            201: ProjectSerializer,
            400: OpenApiResponse(description="Bad Request"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    @transaction.atomic
    def post(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)

        serializer = ProjectSerializer(data=request.data)

        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Get Project Details",
        summary="Retrieve project details",
        responses={
            200: ProjectSerializer,
            404: OpenApiResponse(description="Project not found"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    def get(self, request, project_id):
        project = Project.objects.filter(id=project_id).first()
        if not project:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ProjectSerializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="Update Project",
        summary="Update project details",
        request=ProjectSerializer,
        responses={
            200: ProjectSerializer,
            400: OpenApiResponse(description="Bad Request"),
            404: OpenApiResponse(description="Project not found"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, project_id):
        project = Project.objects.filter(id=project_id).first()
        project.approval_status = 'under_update'
        if not project:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(updated_by=request.user.profile)
            project.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        operation_id="Delete Project",
        summary="Delete a project",
        responses={
            204: OpenApiResponse(description="Project deleted successfully"),
            404: OpenApiResponse(description="Project not found"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        project.approval_status = 'under_deletion'
        project.save(update_fields=['approval_status'])
        project.confirm_delete()
        return Response(
            {"detail": "Project deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class TaskListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['task_name', 'created_at', 'leaders', 'is_active', 'assigned_to', 'description', 'start_date', 'end_date', 'project', 'task_status', 'priority']
    default_ordering = ['task_name']

    @extend_schema(
        operation_id="List Tasks",
        summary="List all tasks for a project",
        responses={
            200: TaskSerializer(many=True),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    def get(self, request, project_id):
        search_query = request.query_params.get('search', None)
        project = Project.objects.filter(id=project_id).first()
        if not project:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tasks = Task.objects.filter(project_id=project_id, deleted_at__isnull=True)

        if search_query:
            tasks = tasks.filter(
                Q(task_name__icontains=search_query)
            )

        try:
            tasks = self.apply_sorting(tasks, request)
        except ValueError as e:
            return Response ({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST) 
        
        paginator = CustomPageNumberPagination()
        paginated_tasks = paginator.paginate_queryset(tasks, request)
        serializer = TaskSerializer(paginated_tasks, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        operation_id="Create Task",
        summary="Create a new task for a project",
        request=TaskSerializer,
        responses={
            201: TaskSerializer,
            400: OpenApiResponse(description="Bad Request"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    @transaction.atomic()
    def post(self, request, project_id):
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save(created_by=request.user.profile)
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Get Task Details",
        summary="Retrieve task details",
        responses={
            200: TaskSerializer,
            404: OpenApiResponse(description="Task not found"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    def get(self, request, task_id):
        task = Task.objects.filter(id=task_id).first()
        if not task:
            return Response(
                {"detail": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="Update Task",
        summary="Update task details",
        request=TaskSerializer,
        responses={
            200: TaskSerializer,
            400: OpenApiResponse(description="Bad Request"),
            404: OpenApiResponse(description="Task not found"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, task_id):
        task = Task.objects.filter(id=task_id).first()
        task.approval_status = 'under_update'
        if not task:
            return Response(
                {"detail": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(updated_by=request.user.profile)
            task.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        operation_id="Delete Task",
        summary="Delete a task",
        responses={
            204: OpenApiResponse(description="Task deleted successfully"),
            404: OpenApiResponse(description="Task not found"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    def delete(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)
        task.approval_status = 'under_deletion'
        task.save(update_fields=['approval_status'])
        task.confirm_delete()
        return Response(
            {"detail": "Task deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class TaskTimeSheetView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Start or End Task",
        summary="Start or end a task",
        request=TaskTimeSheetSerializer,
        responses={
            200: TaskTimeSheetSerializer,
            400: OpenApiResponse(description="Bad Request"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, task_timesheet_id):
        task_timesheet = TaskTimeSheet.objects.filter(id=task_timesheet_id).first()

        if not task_timesheet:
            return Response(
                {"detail": "Task timesheet not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.profile not in task_timesheet.task.leaders.all():
            return Response(
                {"detail": "You do not have permission to update this task timesheet."},
                status=status.HTTP_403_FORBIDDEN,
            )

        task_timesheet.approval_status = 'under_update'

        

        serializer = TaskTimeSheetSerializer(
            task_timesheet,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            task_timesheet.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
