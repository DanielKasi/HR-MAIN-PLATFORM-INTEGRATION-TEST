from django.urls import path
from .views import (
    PublicHolidayListCreateView,
    PublicHolidayDetailView,
    InstitutionCalendarView,
    EventDetailView,
    EventListCreateView,
)

urlpatterns = [
    path(
        "public-holidays/",
        PublicHolidayListCreateView.as_view(),
        name="public_holiday_list_create",
    ),
    path(
        "public-holidays/<int:pk>/",
        PublicHolidayDetailView.as_view(),
        name="public_holiday_detail",
    ),
    path(
        "events/",
        EventListCreateView.as_view(),
        name="event_list_create",
    ),
    path(
        "events/<int:pk>/",
        EventDetailView.as_view(),
        name="event_detail",
    ),
    path(
        "institutions-calendar/",
        InstitutionCalendarView.as_view(),
        name="institution_calendar_view",
    ),
]
