from django.urls import path
from . import views

urlpatterns = [
    path('periods/', views.PeriodListCreateView.as_view(), name='period_list_create'),
    path('periods/<int:pk>/', views.PeriodDetailView.as_view(), name='period_detail'),
    path('objectives/', views.ObjectivesListCreateView.as_view(), name='objectives_list_create'),
    path('objectives/<int:pk>/', views.ObjectivesDetailView.as_view(), name='objectives_detail'),
    path('employee-objectives/', views.EmployeeObjectivesListCreateView.as_view(), name='employee_objectives_list_create'),
    path('employee-objectives/<int:pk>/', views.EmployeeObjectivesDetailView.as_view(), name='employee_objectives_detail'),
    path('key-results/', views.KeyResultListCreateView.as_view(), name='key_result_list_create'),
    path('key-results/<int:pk>/', views.KeyResultDetailView.as_view(), name='key_result_detail'),
    path('feedback/', views.Feedback360ListCreateView.as_view(), name='feedback_list_create'),
    path('feedback/<int:pk>/', views.Feedback360DetailView.as_view(), name='feedback_detail'),
    path('bonus-points/', views.EmployeeBonusPointListCreateView.as_view(), name='bonus_point_list_create'),
    path('bonus-points/<int:pk>/', views.EmployeeBonusPointDetailView.as_view(), name='bonus_point_detail'),
    path('question-templates/', views.QuestionTemplateListCreateView.as_view(), name='question_template_list_create'),
    path('question-templates/<int:pk>/', views.QuestionTemplateDetailView.as_view(), name='question_template_detail'),
    path('bonus-point-settings/', views.BonusPointSettingsListCreateView.as_view(), name='bonus_point_settings_list_create'),
    path('bonus-point-settings/<int:pk>/', views.BonusPointSettingsDetailView.as_view(), name='bonus_point_settings_detail'),
    path('meetings/', views.MeetingListCreateView.as_view(), name='meeting_list_create'),
    path('meetings/<int:pk>/', views.MeetingDetailView.as_view(), name='meeting_detail'),
    path('initiate-oauth/', views.initiate_oauth, name='initiate_oauth'),
    path('oauth2callback/', views.oauth2callback, name='oauth2callback'),
    path('analytics/', views.AnalyticsView.as_view(), name='analytics'),
]