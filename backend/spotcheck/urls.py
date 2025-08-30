
from django.urls import path
from spotcheck import views as SpotCheckViews

urlpatterns = [
    path("institution/<int:institution_id>/setting/", SpotCheckViews.InstitutionSpotCheckSettingCreateView.as_view(), name='institution-spotchecksetting-create'),
    path("institution/<int:institution_id>/setting/details/", SpotCheckViews.InstitutionSpotCheckSettingDetailView.as_view(), name='institution-spotchecksetting-detail'),
    path("institution/<int:institution_id>/setting/update/", SpotCheckViews.InstitutionSpotCheckSettingUpdateView.as_view(), name='institution-spotchecksetting-update'),

    path("branch/<int:branch_id>/setting/", SpotCheckViews.BranchSpotCheckSettingCreateView.as_view(), name='branch-spotchecksetting-create'),
    path("branch/<int:branch_id>/setting/details/", SpotCheckViews.BranchSpotCheckSettingDetailView.as_view(), name='branch-spotchecksetting-detail'),
    path("branch/<int:branch_id>/setting/update/", SpotCheckViews.BranchSpotCheckSettingUpdateView.as_view(), name='branch-spotchecksetting-update'),

    path("employee/<int:employee_id>/setting/", SpotCheckViews.EmployeeSpotCheckSettingCreateView.as_view(), name='employee-spotchecksetting-create'),
    path("employee/<int:employee_id>/setting/details/", SpotCheckViews.EmployeeSpotCheckSettingDetailView.as_view(), name='branch-spotchecksetting-detail'),
    path("employee/<int:employee_id>/setting/update/", SpotCheckViews.EmployeeSpotCheckSettingUpdateView.as_view(), name='employee-spotchecksetting-update'),

    path("", SpotCheckViews.EmployeeStopCheckListView.as_view(), name='spotcheck-list'),
    path("create/", SpotCheckViews.EmployeeSpotCheckCreateView.as_view(), name='employee-spotcheck-create'),
    path("<int:spotcheck_id>/details/", SpotCheckViews.EmployeeSpotCheckDetailView.as_view(), name='employee-spotcheck-detail'),
    path("<int:spotcheck_id>/checkin/", SpotCheckViews.EmployeeSpotCheckInView.as_view(), name='employee-spotcheck-update'),
]
