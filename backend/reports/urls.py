from django.urls import path, include
from .views import ReportChoicesView, ReportGenerateView

urlpatterns = [
    path("reportable-models/", ReportChoicesView.as_view(), name="reportable-models"),
    path("generate/", ReportGenerateView.as_view(), name="reports")
]
