from django.shortcuts import render

from employee.models import Employee
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
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse
from django.db.models import Count, Q
from django.db import transaction
from utilities.sortable_api import SortableAPIMixin
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser


class ProjectListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['project_name', 'created_at', 'managers', 'is_active', 'assignees', 'description', 'start_date', 'end_date', 'project_status']
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
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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
        serializer = ProjectSerializer(data={**request.data, "institution": institution.id})
        if serializer.is_valid():
            instance = serializer.save(created_by=request.user.profile)
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
        project = Project.objects.filter(id=project_id, deleted_at__isnull=True).first()
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
    @transaction.atomic
    def patch(self, request, project_id):
        print(request.data)
        project = Project.objects.filter(id=project_id, deleted_at__isnull=True).first()
        if not project:
            return Response(
                {"detail": "Project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        project.approval_status = 'under_update'
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
    @transaction.atomic
    def delete(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, deleted_at__isnull=True)
        project.approval_status = 'under_deletion'
        project.save(update_fields=['approval_status'])
        project.confirm_delete()
        return Response(
            {"detail": "Project deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class TaskListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['task_name', 'created_at', 'managers', 'is_active', 'assignees', 'description', 'start_date', 'end_date', 'project', 'task_status', 'priority']
    default_ordering = ['task_name']

    @extend_schema(
        operation_id="List Tasks",
        summary="List all tasks for a project (or all in institution if no project filter), with optional filters for status, priority, and assignees",
        responses={
            200: TaskSerializer(many=True),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Projects Mgt"],
    )
    def get(self, request, project_id=None):
        user = request.user.profile
        institution = user.institution
        search_query = request.query_params.get('search', None)
        status_filter = request.query_params.get('status', None)
        priority_filter = request.query_params.get('priority', None)
        assignee_id = request.query_params.get('assignee', None)
        project_filter_id = request.query_params.get('project_id', None) or project_id

        tasks = Task.objects.filter(project__institution=institution, deleted_at__isnull=True)

        if search_query:
            tasks = tasks.filter(
                Q(task_name__icontains=search_query)
            )

        if project_filter_id:
            tasks = tasks.filter(project__id=project_filter_id)

        if status_filter:
            if status_filter not in dict(Task.TASK_STATUS_CHOICES):
                return Response({"detail": f"Invalid status: {status_filter}"}, status=status.HTTP_400_BAD_REQUEST)
            tasks = tasks.filter(task_status=status_filter)

        if priority_filter:
            if priority_filter not in dict(Task.PRIORITY_CHOICES):
                return Response({"detail": f"Invalid priority: {priority_filter}"}, status=status.HTTP_400_BAD_REQUEST)
            tasks = tasks.filter(priority=priority_filter)

        if assignee_id:
            if assignee_id.lower() == 'me':
                try:
                    employee = Employee.objects.get(user=request.user)
                    assignee_id = employee.id
                except Employee.DoesNotExist:
                    return Response({"detail": "User is not associated with an employee."}, status=status.HTTP_400_BAD_REQUEST)
            tasks = tasks.filter(assignees__id=assignee_id)

        try:
            tasks = self.apply_sorting(tasks, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
    @transaction.atomic
    def post(self, request, project_id=None):
        context = {'request': request}
        if project_id:
            context['project_id'] = project_id
        serializer = TaskSerializer(data=request.data, context=context)
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
        task = Task.objects.filter(id=task_id, deleted_at__isnull=True).first()
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
    @transaction.atomic
    def patch(self, request, task_id):
        task = Task.objects.filter(id=task_id, deleted_at__isnull=True).first()
        if not task:
            return Response(
                {"detail": "Task not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        task.approval_status = 'under_update'
        serializer = TaskSerializer(task, data=request.data, partial=True, context={'request': request})
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
    @transaction.atomic
    def delete(self, request, task_id):
        task = get_object_or_404(Task, id=task_id, deleted_at__isnull=True)
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
            403: OpenApiResponse(description="Forbidden"),
        },
        tags=["Projects Mgt"],
    )
    @transaction.atomic
    def patch(self, request, task_timesheet_id):
        task_timesheet = TaskTimeSheet.objects.filter(id=task_timesheet_id, deleted_at__isnull=True).first()

        if not task_timesheet:
            return Response(
                {"detail": "Task timesheet not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.profile not in task_timesheet.task.managers.all():
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
            serializer.save(updated_by=request.user.profile)
            task_timesheet.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardAnalyticsView(APIView):
    @extend_schema(
        tags=['Dashboard'],
        summary='Retrieve dashboard analytics for user institution',
        description='Provides analytics data for projects and tasks filtered by the user\'s institution, including counts by status, priority, and other metrics.',
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'projects': {
                        'type': 'object',
                        'properties': {
                            'total': {'type': 'integer'},
                            'by_status': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'status': {'type': 'string'},
                                        'count': {'type': 'integer'}
                                    }
                                }
                            }
                        }
                    },
                    'tasks': {
                        'type': 'object',
                        'properties': {
                            'total': {'type': 'integer'},
                            'by_status': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'status': {'type': 'string'},
                                        'count': {'type': 'integer'}
                                    }
                                }
                            },
                            'by_priority': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'priority': {'type': 'string'},
                                        'count': {'type': 'integer'}
                                    }
                                }
                            }
                        }
                    },
                    'active_projects': {'type': 'integer'},
                    'overdue_tasks': {'type': 'integer'}
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            }
        },
        examples=[
            OpenApiExample(
                'Success Response',
                value={
                    'projects': {
                        'total': 5,
                        'by_status': [
                            {'status': 'not_started', 'count': 2},
                            {'status': 'in_progress', 'count': 2},
                            {'status': 'completed', 'count': 1},
                            {'status': 'on_hold', 'count': 0},
                            {'status': 'cancelled', 'count': 0}
                        ]
                    },
                    'tasks': {
                        'total': 15,
                        'by_status': [
                            {'status': 'not_started', 'count': 6},
                            {'status': 'in_progress', 'count': 5},
                            {'status': 'completed', 'count': 3},
                            {'status': 'on_hold', 'count': 1}
                        ],
                        'by_priority': [
                            {'priority': 'low', 'count': 3},
                            {'priority': 'medium', 'count': 7},
                            {'priority': 'high', 'count': 4},
                            {'priority': 'urgent', 'count': 1}
                        ]
                    },
                    'active_projects': 4,
                    'overdue_tasks': 2
                }
            ),
            OpenApiExample(
                'Error Response',
                value={
                    'error': 'User has no associated institution'
                },
                status_codes=['400']
            )
        ]
    )
    def get(self, request):
        # Get user's institution
        institution = getattr(request.user.profile, 'institution', None)
        if not institution:
            return Response({'error': 'User has no associated institution'}, status=status.HTTP_400_BAD_REQUEST)

        # Project analytics filtered by institution
        project_counts = Project.objects.filter(
            deleted_at__isnull=True,
            institution=institution
        ).aggregate(total=Count('id'))
        project_status_counts = Project.objects.filter(
            deleted_at__isnull=True,
            institution=institution
        ).values('project_status').annotate(count=Count('id'))
        active_projects = Project.objects.filter(
            deleted_at__isnull=True,
            institution=institution
        ).exclude(project_status__in=['completed', 'cancelled']).count()

        # Task analytics filtered by institution
        task_counts = Task.objects.filter(
            deleted_at__isnull=True,
            project__institution=institution
        ).aggregate(total=Count('id'))
        task_status_counts = Task.objects.filter(
            deleted_at__isnull=True,
            project__institution=institution
        ).values('task_status').annotate(count=Count('id'))
        task_priority_counts = Task.objects.filter(
            deleted_at__isnull=True,
            project__institution=institution
        ).values('priority').annotate(count=Count('id'))
        overdue_tasks = Task.objects.filter(
            deleted_at__isnull=True,
            project__institution=institution,
            end_date__lt=timezone.now().date(),
            task_status__in=['not_started', 'in_progress', 'on_hold']
        ).count()

        # Format response
        response_data = {
            'projects': {
                'total': project_counts['total'],
                'by_status': [
                    {
                        'status': status['project_status'],
                        'count': status['count']
                    } for status in project_status_counts
                ]
            },
            'tasks': {
                'total': task_counts['total'],
                'by_status': [
                    {
                        'status': status['task_status'],
                        'count': status['count']
                    } for status in task_status_counts
                ],
                'by_priority': [
                    {
                        'priority': priority['priority'],
                        'count': priority['count']
                    } for priority in task_priority_counts
                ]
            },
            'active_projects': active_projects,
            'overdue_tasks': overdue_tasks
        }

        return Response(response_data, status=status.HTTP_200_OK)