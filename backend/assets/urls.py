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

    # Asset Analytics
    AssetCategoryAnalyticsViewSet,
    AssetStatusAnalyticsViewSet,
    AssetAllocationAnalyticsViewSet,
    AssetRequestAnalyticsViewSet,
    AssetReturnAnalyticsViewSet,
    AssetHistoryAnalyticsViewSet,
    AssetUtilizationAnalyticsViewSet,
    AssetMaintenanceAnalyticsViewSet,
    AssetDecommissionAnalyticsViewSet,
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



    # Asset Analytics
    path('assets/<int:institution_id>/categories/', AssetCategoryAnalyticsViewSet.as_view(), name='asset-category-analytics'),
    path('assets/<int:institution_id>/status/', AssetStatusAnalyticsViewSet.as_view(), name='asset-status-analytics'),
    path('assets/<int:institution_id>/allocations/', AssetAllocationAnalyticsViewSet.as_view(), name='asset-allocation-analytics'),
    path('assets/<int:institution_id>/requests/', AssetRequestAnalyticsViewSet.as_view(), name='asset-request-analytics'),
    path('assets/<int:institution_id>/returns/', AssetReturnAnalyticsViewSet.as_view(), name='asset-return-analytics'),
    path('assets/<int:institution_id>/history/', AssetHistoryAnalyticsViewSet.as_view(), name='asset-history-analytics'),
    path('assets/<int:institution_id>/utilization/', AssetUtilizationAnalyticsViewSet.as_view(), name='asset-utilization-analytics'),
    path('assets/<int:institution_id>/maintenance/', AssetMaintenanceAnalyticsViewSet.as_view(), name='asset-maintenance-analytics'),
    path('assets/<int:institution_id>/decommission/', AssetDecommissionAnalyticsViewSet.as_view(), name='asset-decommission-analytics'),
    path('analytics/', AssetsDashboardView.as_view(), name='assets-dashboard-analytics'),

]
