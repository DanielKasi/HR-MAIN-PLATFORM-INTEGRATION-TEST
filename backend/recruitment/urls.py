from django.urls import path
from .views import (
    JobPositionListAPI, JobPositionDetailAPI,
    JobPositionAdvertListAPI, JobPositionAdvertDetailAPI,
    JobAdvertApplicationListAPI, JobAdvertApplicationDetailAPI,
    InterviewStageListAPI, InterviewStageDetailAPI,
    JobInterviewListAPI, JobInterviewDetailAPI,
    RecruitmentDashboardAPIView,
    SkillZoneCategoryListCreateView, SkillZoneCategoryDetailView,
    SkillZoneListCreateView, SkillZoneDetailView
)

urlpatterns = [
    path("institution/<int:institution_id>/job-position/", JobPositionListAPI.as_view()),
    path("job-position/<int:job_position_id>/", JobPositionDetailAPI.as_view()),

    path("institution/<int:institution_id>/job-advert/", JobPositionAdvertListAPI.as_view()),
    path("job-advert/<int:advert_id>/", JobPositionAdvertDetailAPI.as_view()),
    path('job-openings/', JobPositionAdvertListAPI.as_view(), name='portal-openings-list'),

    path("institution/<int:institution_id>/job-application/", JobAdvertApplicationListAPI.as_view()),
    path("job-application/<int:application_id>/", JobAdvertApplicationDetailAPI.as_view()),
    

    path("institution/<int:institution_id>/interview-stage/", InterviewStageListAPI.as_view()),
    path("interview-stage/<int:stage_id>/", InterviewStageDetailAPI.as_view()),

    path("institution/<int:institution_id>/job-interview/", JobInterviewListAPI.as_view()),
    path("job-interview/<int:interview_id>/", JobInterviewDetailAPI.as_view()),
    path('analytics/', RecruitmentDashboardAPIView.as_view(), name='recruitment-analytics'),
    path('skillzone-categories/', SkillZoneCategoryListCreateView.as_view(), name='skillzone-category-list-create'),
    path('skillzone-categories/<int:pk>/', SkillZoneCategoryDetailView.as_view(), name='skillzone-category-detail'),
    path('skillzone/', SkillZoneListCreateView.as_view(), name='skillzone-list-create'),
    path('skillzone/<int:pk>/', SkillZoneDetailView.as_view(), name='skillzone-detail'),
]
