from django.urls import path
from .views import (
    BulkOnBoardingCreateAPI,
    HandoverReportDetailView,
    OffboardingDetailView,
    OffboardingListCreateView,
    OnBoardingListAPI,
    OnBoardingDetailAPI,

    OffboardingDashboardView,
    TerminationStageDetailView,
    TerminationStageListCreateView,
    TerminationTypeDetailView,
    TerminationTypeListCreateView,
)

urlpatterns = [
    path(
        "list/<int:institution_id>/",
        OnBoardingListAPI.as_view(),
        name="onboarding-list-create",
    ),
    path(
        "record/<int:onboarding_id>/",
        OnBoardingDetailAPI.as_view(),
        name="onboarding-detail",
    ),
    path(
        "bulk-create/", BulkOnBoardingCreateAPI.as_view(), name="bulk-onboarding-create"
    ),
    path("termination/stages/", TerminationStageListCreateView.as_view()),
    path("termination/stages/<int:pk>/", TerminationStageDetailView.as_view()),
    path("termination/types/", TerminationTypeListCreateView.as_view()),
    path("termination/types/<int:pk>/", TerminationTypeDetailView.as_view()),
    path("terminations/", OffboardingListCreateView.as_view()),
    path("terminations/<int:pk>/", OffboardingDetailView.as_view()),
    path("analytics/", OffboardingDashboardView.as_view(), name="offboarding-analytics"),
    path('termination/handover-reports/<int:pk>/', HandoverReportDetailView.as_view(), name='handover-report-detail'),
]
