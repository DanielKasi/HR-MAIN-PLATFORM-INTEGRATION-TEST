from django.urls import path
from .views import ReportChoicesView, ReportGenerateView

urlpatterns = [
    path("reportable-models/", ReportChoicesView.as_view(), name="reportable-models"),
    path("report-generation/", ReportGenerateView.as_view(), name="report_generate"),
]
