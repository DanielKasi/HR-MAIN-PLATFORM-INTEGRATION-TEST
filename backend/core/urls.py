from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf import settings
from django.conf.urls.static import static
from institution.views import home

urlpatterns = [
    path("", home, name="home"),
    path("login", home, name="fix-login"),
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/user/", include("users.urls")),
    path("api/institution/", include("institution.urls")),
    # path("api/workflow/", include("workflows.urls")),
    path("api/recruitment/", include("recruitment.urls")),
    path("api/on-boarding/", include("onboarding.urls")),
    path("api/employee/", include("employee.urls")),
    path("api/discipline/", include("discipline.urls")),
    path("api/leave-mgt/", include("leave_mgt.urls")),
    path("api/payroll/", include("payroll.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/calendar/", include("calendar2.urls")),
    path("api/assets/", include("assets.urls")),
    path("api/documents/", include("documents.urls")),
    path("api/settings/", include("settings.urls")),
    path("api/performance/", include("performance.urls")),
    path("markdownx/", include("markdownx.urls")),
    path("ckeditor/", include("ckeditor_uploader.urls")),
    path("api/approval/", include("approval.urls")),
    path("api/spotcheck/", include("spotcheck.urls")),
    path("api/communication/", include("communication.urls")),
    path("api/help-desk/", include("helpdesk.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/devices/", include("devices.urls")),
    path("api/audit/", include("audit.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
