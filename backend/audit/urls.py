from django.urls import path
from . import views

urlpatterns = [
    path('institutions/<int:institution_id>/audit-logs/', views.InstitutionAuditLogsView.as_view(), name='institution-audit-logs')
]