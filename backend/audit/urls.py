from django.urls import path
from . import views

urlpatterns = [
    path('institutions/audit-logs/', views.InstitutionAuditLogsView.as_view(), name='institution-audit-logs')
]