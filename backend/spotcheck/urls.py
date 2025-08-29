
from django.urls import path
from spotcheck import views as SpotCheckViews

urlpatterns = [
    path("institution/<int:institution_id>/setting/", SpotCheckViews.InstitutionStopCheckSettingCreateView.as_view(), name='institution-spotchecksetting-create'),
    path("institution/<int:institution_id>/setting/details/", SpotCheckViews.InstitutionStopCheckSettingDetailView.as_view(), name='institution-spotchecksetting-detail'),
    path("institution/<int:institution_id>/setting/update/", SpotCheckViews.InstitutionStopCheckSettingUpdateView.as_view(), name='institution-spotchecksetting-update'),

    path("branch/<int:branch_id>/setting/", SpotCheckViews.BranchStopCheckSettingCreateView.as_view(), name='branch-spotchecksetting-create'),
    path("branch/<int:branch_id>/setting/details/", SpotCheckViews.BranchStopCheckSettingDetailView.as_view(), name='branch-spotchecksetting-detail'),
    path("branch/<int:branch_id>/setting/update/", SpotCheckViews.BranchStopCheckSettingUpdateView.as_view(), name='branch-spotchecksetting-update'),

    path("employee/<int:employee_id>/setting/", SpotCheckViews.EmployeeStopCheckSettingCreateView.as_view(), name='employee-spotchecksetting-create'),
    path("employee/<int:employee_id>/setting/details/", SpotCheckViews.EmployeeStopCheckSettingDetailView.as_view(), name='branch-spotchecksetting-detail'),
    path("employee/<int:employee_id>/setting/update/", SpotCheckViews.EmployeeStopCheckSettingUpdateView.as_view(), name='employee-spotchecksetting-update'),

    path("employee/<int:spotcheck_id>/spotcheck/create/", SpotCheckViews.EmployeeStopCheckCreateView.as_view(), name='employee-spotcheck-create'),
    path("employee/<int:spotcheck_id>/spotcheck/details/", SpotCheckViews.EmployeeStopCheckDetailView.as_view(), name='employee-spotcheck-detail'),
    path("employee/<int:spotcheck_id>/spotcheckt/update/", SpotCheckViews.EmployeeStopCheckUpdateView.as_view(), name='employee-spotcheck-update'),
]
