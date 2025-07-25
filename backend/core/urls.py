from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/user/", include("users.urls")),
    path("api/institution/", include("institution.urls")),
    path("api/workflow/", include("workflows.urls")),
    path("api/recruitment/", include("recruitment.urls")),
    path("api/on-boarding/", include("onboarding.urls")),
    path("api/employee/", include("employee.urls")),
    path("api/discipline/", include("discipline.urls")),
    path("api/leave-mgt/", include("leave_mgt.urls")),
    path("api/payroll/", include("payroll.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/calendar/", include("calendar2.urls")),
    path("api/assets/", include("assets.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
