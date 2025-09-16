from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    TaskListCreateView,
    TaskTimeSheetView,
    TaskDetailView,
    DashboardAnalyticsView,
)

urlpatterns = [
    path(
        "projects/<int:institution_id>/",
        ProjectListCreateView.as_view(),
        name="project-list-create",
    ),
    path(
        "projects/<int:project_id>/details/",
        ProjectDetailView.as_view(),
        name="project-detail",
    ),
    path(
        "tasks/", TaskListCreateView.as_view(), name="task-list-create"
    ),
    path("tasks/<int:task_id>/details/", TaskDetailView.as_view(), name="task-detail"),
    path(
        "start-end-task/<int:task_timesheet_id>/",
        TaskTimeSheetView.as_view(),
        name="task-timesheet",
    ),
    path("analytics/", DashboardAnalyticsView.as_view(), name="dashboard-analytics"),
]
