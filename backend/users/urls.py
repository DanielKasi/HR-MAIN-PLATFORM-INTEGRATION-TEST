from django.urls import path
from .views import (
    LoginView,
    CustomTokenRefreshView,
    UserDetailAPIView,
    UserListAPIView,
    VerifyOTPAPIView,
    ResendOTPAPIView,
    VerifyPasswordResetAPIView,
    RoleListAPIView,
    RoleDetailAPIView,
    PermissionCategoryListAPIView,
    PermissionCategoryDetailAPIView,
    PermissionListAPIView,
    PermissionDetailAPIView,
    UserInstitutionsListAPIView,
    ForgotPasswordAPIView,
    VerifyTokenAPIView,
    ResetPasswordAPIView,
    GoogleAuthURLView,
    GoogleAuthCallbackView,
)


urlpatterns = [
    path("", UserListAPIView.as_view(), name="user-management"),
    path("<int:user_id>/", UserDetailAPIView.as_view(), name="user-detail"),
    path("institutions/", UserInstitutionsListAPIView.as_view(), name="user-attached-institutions"),
    path("verify-otp/", VerifyOTPAPIView.as_view(), name="verify-otp"),
    # path("resend-otp/", ResendOTPView.as_view(), name="resend-otp"),
    path("reset-password/", VerifyPasswordResetAPIView.as_view(), name="reset-password"),
    path("resend-otp/", ResendOTPAPIView.as_view(), name="resend-otp"),
    path("login/", LoginView.as_view(), name="user-login"),
    path("token/refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("role/", RoleListAPIView.as_view(), name="role-list"),
    path("role/<int:role_id>/", RoleDetailAPIView.as_view(), name="role-detail"),
    path(
        "permission-category/",
        PermissionCategoryListAPIView.as_view(),
        name="permission-category",
    ),
    path(
        "permission-category/<int:permission_category_id>",
        PermissionCategoryDetailAPIView.as_view(),
        name="permission-category-detail",
    ),
    path("permission/", PermissionListAPIView.as_view(), name="permission-list"),
    path(
        "permission/<int:permission_d>",
        PermissionDetailAPIView.as_view(),
        name="permission-detail",
    ),
    path(
        "forgot-password", ForgotPasswordAPIView.as_view(), name="forgot-password"
    ),
    path(
        "verify-token", VerifyTokenAPIView.as_view(), name="verify-token"
    ),
    path(
        "reset-password", ResetPasswordAPIView.as_view(), name="reset-password"
    ),

    # Continue with Google URLs
    path('auth/google/url/', GoogleAuthURLView.as_view(), name='google_auth_url'),
    path('auth/google/callback/', GoogleAuthCallbackView.as_view(), name='google_auth_callback'),
]
