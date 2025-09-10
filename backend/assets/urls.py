from django.urls import path
from .views import (
    AssetRequestListCreateView,
    AssetRequestDetailView,
    AssetAllocationListCreateView,
    AssetAllocationDetailView,
    AssetCategoryListCreateView,
    AssetCategoryDetailView,
    AssetReturnListCreateView,
    AssetReturnDetailView,
    AssetListCreateView,
    AssetDetailView,
    AssetHistoryListView,
    AssetHistoryDetailView,
    AssetsDashboardView,

)


urlpatterns = [
    path("", AssetListCreateView.as_view(), name="asset-list-create"),
    path("<int:pk>/", AssetDetailView.as_view(), name="asset-detail"),
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
    path(
        "asset-allocations/",
        AssetAllocationListCreateView.as_view(),
        name="asset-allocation-list-create",
    ),
    path(
        "asset-allocations/<int:pk>/",
        AssetAllocationDetailView.as_view(),
        name="asset-allocation-detail",
    ),
    path(
        "asset-categories/",
        AssetCategoryListCreateView.as_view(),
        name="asset-category-list-create",
    ),
    path(
        "asset-categories/<int:pk>/",
        AssetCategoryDetailView.as_view(),
        name="asset-category-detail",
    ),
    path(
        "asset-returns/",
        AssetReturnListCreateView.as_view(),
        name="asset-return-list-create",
    ),
    path(
        "asset-returns/<int:pk>/",
        AssetReturnDetailView.as_view(),
        name="asset-return-detail",
    ),
    path(
        "asset-histories/",
        AssetHistoryListView.as_view(),
        name="asset-history-list",
    ),
    path(
        "asset-histories/<int:pk>/",
        AssetHistoryDetailView.as_view(),
        name="asset-history-detail",
    ),
    path('analytics/', AssetsDashboardView.as_view(), name='assets-dashboard-analytics'),

]
