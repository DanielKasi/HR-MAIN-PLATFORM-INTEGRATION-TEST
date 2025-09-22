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
    path('pips/', views.PerformanceImprovementPlanListCreateView.as_view(), name='pip_list_create'),
    path('pips/<int:pk>/', views.PerformanceImprovementPlanDetailView.as_view(), name='pip_detail'),
    path('pips/<int:pip_id>/document/', views.PIPDocumentGenerateView.as_view(), name='pip_document_generate'),
    path(
        'concern-types/',
        views.PerformanceConcernTypeListCreateView.as_view(),
        name='performance-concern-type-list-create'
    ),
    path(
        'concern-types/<int:pk>/',
        views.PerformanceConcernTypeDetailView.as_view(),
        name='performance-concern-type-detail'
    ),

    # PerformanceConcern URLs
    path(
        'concerns/',
        views.PerformanceConcernListCreateView.as_view(),
        name='performance-concern-list-create'
    ),
    path(
        'concerns/<int:pk>/',
        views.PerformanceConcernDetailView.as_view(),
        name='performance-concern-detail'
    ),

    # PIPSupportResourceType URLs
    path(
        'support-resource-types/',
        views.PIPSupportResourceTypeListCreateView.as_view(),
        name='pip-support-resource-type-list-create'
    ),
    path(
        'support-resource-types/<int:pk>/',
        views.PIPSupportResourceTypeDetailView.as_view(),
        name='pip-support-resource-type-detail'
    ),

    # PIPSupportResource URLs
    path(
        'support-resources/',
        views.PIPSupportResourceListCreateView.as_view(),
        name='pip-support-resource-list-create'
    ),
    path(
        'support-resources/<int:pk>/',
        views.PIPSupportResourceDetailView.as_view(),
        name='pip-support-resource-detail'
    ),
        path(
        'employee-objectives/',
        views.PIPEmployeeObjectivesListCreateView.as_view(),
        name='pip-employee-objectives-list-create'
    ),
    path(
        'employee-objectives/<int:pk>/',
        views.PIPEmployeeObjectivesDetailView.as_view(),
        name='pip-employee-objectives-detail'
    ),
]