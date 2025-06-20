from django.urls import path
from .views import BulkOnBoardingCreateAPI, OnBoardingListAPI, OnBoardingDetailAPI

urlpatterns = [
    path(
        "onboarding/<int:institution_id>/",
        OnBoardingListAPI.as_view(),
        name="onboarding-list-create",
    ),
    path(
        "<int:onboarding_id>/",
        OnBoardingDetailAPI.as_view(),
        name="onboarding-detail",
    ),
    path('onboarding/bulk-create/', BulkOnBoardingCreateAPI.as_view(), name='bulk-onboarding-create'),
]