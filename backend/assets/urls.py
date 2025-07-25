from django.urls import path
from .views import AssetRequestListCreateView, AssetRequestDetailView


urlpatterns = [
    path(
        "asset-requests/",
        AssetRequestListCreateView.as_view(),
        name="asset-request-list-create",
    ),
    path(
        "asset-requests/<int:pk>/",
        AssetRequestDetailView.as_view(),
        name="asset-request-detail",
    ),
]
