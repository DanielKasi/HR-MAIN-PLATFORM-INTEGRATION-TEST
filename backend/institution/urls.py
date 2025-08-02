from django.urls import path
from .views import (
    BranchDetailAPIView,
    BranchListAPIView,
    InstitutionBranchAPIView,
    InstitutionDetailAPIView,
    InstitutionListAPIView,
    InstitutionUserProfileAPIView,
    SystemActivationView,
    UserProfileListAPIView,
    UserProfileDetailAPIView,
    UserBranchListCreateView,
    UserBranchDetailAPIView,
    DepartmentListAPIView,
    DepartmentDetailAPIView,
    delete_user_branch_by_ids,
    DefaultDataAPIView,
    InstitutionBankTypeListAPIView,
    InstitutionBankTypeDetailView,
    InstitutionBankAccountListAPIView,
    InstitutionBankAccountDetailView,
)

urlpatterns = [
    path("", InstitutionListAPIView.as_view(), name="institution-management"),
    path(
        "<int:institution_id>/",
        InstitutionDetailAPIView.as_view(),
        name="institution-detail",
    ),
    path("bank-type/", InstitutionBankTypeListAPIView.as_view(), name="bank-type-list"),
    path(
        "bank-type/<int:bank_type_id>/",
        InstitutionBankTypeDetailView.as_view(),
        name="bank-type-detail",
    ),
    path(
        "bank-account/",
        InstitutionBankAccountListAPIView.as_view(),
        name="bank-account-list",
    ),
    path(
        "bank-account/<int:bank_account_id>/",
        InstitutionBankAccountDetailView.as_view(),
        name="bank-account-detail",
    ),
    path("branch/", BranchListAPIView.as_view(), name="branch-management"),
    path(
        "branch/<int:branch_id>/", BranchDetailAPIView.as_view(), name="branch-detail"
    ),
    path("profile/", UserProfileListAPIView.as_view(), name="user-profile"),
    path(
        "profile/<int:institution_id>/",
        UserProfileDetailAPIView.as_view(),
        name="user-profile-detail",
    ),
    path(
        "profile/user/<int:user_id>/",
        InstitutionUserProfileAPIView.as_view(),
        name="user-profile-detail",
    ),
    path("branch/user/", UserBranchListCreateView.as_view(), name="user-branch-list"),
    path(
        "branch/user/<int:user_branch_id>/",
        UserBranchDetailAPIView.as_view(),
        name="user-branch-detail",
    ),
    path(
        "branch/user/<int:user_id>/<int:branch_id>/",
        delete_user_branch_by_ids,
        name="delete-user-branch-by-ids",
    ),
    path(
        "<int:institution_id>/branch",
        InstitutionBranchAPIView.as_view(),
        name="institution-branch-list",
    ),
    path(
        "<int:institution_id>/department/",
        DepartmentListAPIView.as_view(),
        name="department-list",
    ),
    path(
        "department/<int:department_id>/",
        DepartmentDetailAPIView.as_view(),
        name="department-detail",
    ),
    path("api/activate/", SystemActivationView.as_view(), name="system_activation"),
    path("default-data/", DefaultDataAPIView.as_view(), name="default-data"),
]
