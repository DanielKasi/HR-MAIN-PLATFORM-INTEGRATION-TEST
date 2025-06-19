from django.urls import path
from .views import JobPositionListAPI, JobPositionDetailAPI

urlpatterns = [
    path(
        "institution/<int:institution_id>/job-position/",
        JobPositionListAPI.as_view(),
        name="job-position-list-create",
    ),
    path(
        "job-position/<int:job_position_id>/",
        JobPositionDetailAPI.as_view(),
        name="job-position-detail",
    ),
]
