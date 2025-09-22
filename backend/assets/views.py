# from workflows.serializers import (
#     AssetRequestSerializer,
#     AssetAllocationSerializer,
# )
from .serializers import (
    AssetRequestSerializer,
    AssetCategorySerializer,
    AssetSerializer,
    AssetAllocationSerializer,
    AssetReturnSerializer,
    AssetHistorySerializer,
)
from .models import (
    AssetCategory,
    Asset,
    AssetRequest,
    AssetAllocation,
    AssetReturn,
    AssetHistory,
)
from utilities.pagination import CustomPageNumberPagination
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from institution.models import Institution
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from users.models import Profile
from django.db.models import Q, Count
from employee.models import Employee
from django.db import transaction
from utilities.sortable_api import SortableAPIMixin



class AssetCategoryListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['category_name', 'created_at', 'code', 'is_active']
    default_ordering = ['category_name']

    @extend_schema(
        request=AssetCategorySerializer,
        responses={
            201: OpenApiResponse(
                response=AssetCategorySerializer,
                description="Asset category created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = AssetCategorySerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by name, description, or code"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "status", "type": "str", "description": "Filter by status (active/inactive)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'category_name,-is_active,created_at,asset_count')"},
        ],
        responses={
            200: OpenApiResponse(
                response=AssetCategorySerializer(many=True),
                description="List of asset categories.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        categories = AssetCategory.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if search_query:
            categories = categories.filter(
                Q(category_name__icontains=search_query)
                | Q(category_description__icontains=search_query)
                | Q(code__icontains=search_query)
            )

        if created_at:
            categories = categories.filter(created_at=created_at)

        if status_filter == "active":
            categories = categories.filter(is_active=True)
        elif status_filter == "inactive":
            categories = categories.filter(is_active=False)

        try:
            categories = self.apply_sorting(categories, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(categories, request)
        serializer = AssetCategorySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetCategorySerializer,
                description="Asset category details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset category not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request, pk):
        category = get_object_or_404(AssetCategory, pk=pk)
        serializer = AssetCategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset category marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset category not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        category = get_object_or_404(AssetCategory, pk=pk)

        # Soft delete workflow: mark under_deletion
        category.approval_status = 'under_deletion'
        category.save(update_fields=['approval_status'])

        # Trigger workflow
        category.confirm_delete()

        return Response(
            {"message": "Asset category submitted for deletion approval."},
            status=status.HTTP_200_OK
        )


    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetCategorySerializer,
                description="Asset category updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset category not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        category = get_object_or_404(AssetCategory, pk=pk)
        category.approval_status = 'under_update'
        serializer = AssetCategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            category.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssetListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['asset_name', 'batch_number', 'status', 'is_active', 'created_at', 'category', 'serial_number']
    default_ordering = ['asset_name']

    @extend_schema(
        request=AssetSerializer,
        responses={
            201: OpenApiResponse(
                response=AssetSerializer,
                description="Asset created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def post(self, request):
        data = request.data.copy()
        user = request.user

        data["created_by"] = user.id

        serializer = AssetSerializer(data=data, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetSerializer(many=True),
                description="List of assets.",
            ),
        },
        tags=["Asset Mgt"],
    )
    
    def get(self, request):
        user = request.user.profile if request and hasattr(request, "user") else None

        search_query = request.query_params.get("search", None)
        category_id = request.query_params.get("category", None)  # Get category filter from query params

        if not user:
            return Response(
                {"detail": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Start with all assets for this institution
        assets = Asset.objects.filter(institution=institution, deleted_at__isnull=True)

        # Apply search filter
        if search_query:
            assets = assets.filter(
                Q(asset_name__icontains=search_query)
                | Q(batch_number__icontains=search_query)
                | Q(serial_number__icontains=search_query)
            )

        # Apply category filter
        if category_id:
            assets = assets.filter(category_id=category_id)

        try:
            assets = self.apply_sorting(assets, request)
        except ValueError as e:
            return Response({"detail":str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        # Paginate results
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(assets, request)
        serializer = AssetSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetSerializer,
                description="Asset details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        serializer = AssetSerializer(asset)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            204: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset deleted successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        asset.approval_status = 'under_deletion'
        asset.save(update_fields=['approval_status'])
        asset.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetSerializer,
                description="Asset updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def patch(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        asset.approval_status = 'under_update'
        serializer = AssetSerializer(asset, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            asset.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssetRequestListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['asset', 'created_at', 'requester', 'is_active', 'asset_request_status']
    default_ordering = ['asset']

    @extend_schema(
        request=AssetRequestSerializer,
        responses={
            201: OpenApiResponse(
                response=AssetRequestSerializer,
                description="Asset request created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()

    def post(self, request):
        serializer = AssetRequestSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetRequestSerializer(many=True),
                description="List of asset requests.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request):
        user = request.user.profile if request and hasattr(request, "user") else None
        employee_id = request.query_params.get("employee_id", None)
        search_query = request.query_params.get("search", None)
        requester_id = request.query_params.get("requester_id", None)
        status_param = request.query_params.get("status", None)  # Renamed for clarity

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        asset_requests = AssetRequest.objects.filter(
            asset__institution=institution,
            deleted_at__isnull=True,
        )

        if employee_id:
            try:
                employee = Employee.objects.get(employee_id=employee_id)
            except Employee.DoesNotExist:
                return Response(
                    {"detail": f"Employee with ID {employee_id} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not employee.user:
                return Response(
                    {"detail": f"Employee {employee_id} has no associated user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                profile = employee.user.profile
            except Profile.DoesNotExist:
                return Response(
                    {"detail": f"User for employee {employee_id} has no profile."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            asset_requests = asset_requests.filter(requester=profile)  # Fixed assignment

        if requester_id:
            asset_requests = asset_requests.filter(requester__id=requester_id)

        if status_param:
            asset_requests = asset_requests.filter(asset_request_status=status_param)  # Fixed: Use asset_request_status

        if search_query:
            asset_requests = asset_requests.filter(
                Q(request_reference_code__icontains=search_query)
                | Q(asset_request_status__icontains=search_query)
                | Q(notes__icontains=search_query)
                | Q(asset__asset_name__icontains=search_query)
                | Q(asset__batch_number__icontains=search_query)
                | Q(requester__user__fullname__icontains=search_query)
                | Q(requester__user__email__icontains=search_query)
            )

        try:
            asset_requests = self.apply_sorting(asset_requests, request)
        except ValueError as e:
            return Response({"detail":str(e)}, status=status.HTTP_400_BAD_REQUEST)       

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(asset_requests, request)
        serializer = AssetRequestSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetRequestSerializer,
                description="Asset request details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset request not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request, pk):
        asset_request = get_object_or_404(AssetRequest, pk=pk)
        serializer = AssetRequestSerializer(asset_request)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            204: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset request deleted successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset request not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        asset_request = get_object_or_404(AssetRequest, pk=pk)
        asset_request.approval_status = 'under_deletion'
        asset_request.save(update_fields=['approval_status'])
        asset_request.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetRequestSerializer,
                description="Asset request updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset request not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        asset_request = get_object_or_404(AssetRequest, pk=pk)
        asset_request.approval_status = 'under_update'
        serializer = AssetRequestSerializer(
            asset_request, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            asset_request.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_404_NOT_FOUND)



class AssetAllocationListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['asset', 'created_at', 'allocated_to', 'allocation_status', 'is_active']
    default_ordering = ['asset']

    @extend_schema(
        request=AssetAllocationSerializer,
        responses={
            201: OpenApiResponse(
                response=AssetAllocationSerializer,
                description="Asset allocation created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = AssetAllocationSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetAllocationSerializer(many=True),
                description="List of asset allocations.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        employee_id = request.query_params.get("employee_id", None)
        status = request.query_params.get("status", None)
        user = request.user
        try:
            institution = Institution.objects.get(id=user.profile.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        asset_allocations = AssetAllocation.objects.filter(
            asset__institution=institution, deleted_at__isnull=True
        )

        if employee_id:
            try:
                employee = Employee.objects.get(employee_id=employee_id)

            except Employee.DoesNotExist:
                return Response(
                    {"detail": f"Employee with ID {employee_id} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Step 2: Check if employee has a user
            if not employee.user:
                return Response(
                    {"detail": f"Employee {employee_id} has no associated user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Step 3: Check if user has a profile
            try:
                profile = employee.user.profile
            except Profile.DoesNotExist:

                return Response(
                    {"detail": f"User for employee {employee_id} has no profile."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            employee_asset_allocations = asset_allocations.filter(allocated_to=profile)

        if search_query:
            asset_allocations = asset_allocations.filter(
                Q(asset__asset_name__icontains=search_query)
                | Q(asset__batch_number__icontains=search_query)
                | Q(asset__serial_number__icontains=search_query)
                | Q(allocated_to__user__fullname__icontains=search_query)
                | Q(allocated_to__user__email__icontains=search_query)
            )

        if status:
            asset_allocations = asset_allocations.filter(allocation_status=status)    

        try:
            asset_allocations = self.apply_sorting(asset_allocations, request)
        except ValueError as e:
            return Response({"detail":str(e)}, status=status.HTTP_400_BAD_REQUEST)    
            
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(asset_allocations, request)
        serializer = AssetAllocationSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetAllocationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetAllocationSerializer,
                description="Asset allocation details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset allocation not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request, pk):
        asset_allocation = get_object_or_404(AssetAllocation, pk=pk)
        serializer = AssetAllocationSerializer(asset_allocation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            204: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset allocation deleted successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset allocation not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        asset_allocation = get_object_or_404(AssetAllocation, pk=pk)
        asset_allocation.approval_status = 'under_deletion'
        asset_allocation.save(update_fields=['approval_status'])
        asset_allocation.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetAllocationSerializer,
                description="Asset allocation updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset allocation not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        asset_allocation = get_object_or_404(AssetAllocation, pk=pk)
        asset_allocation.approval_status = 'under_update'
        serializer = AssetAllocationSerializer(
            asset_allocation, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            asset_allocation.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_404_NOT_FOUND)



class AssetReturnListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['asset', 'allocation', 'condition', 'created_at', 'is_active']
    default_ordering = ['asset']

    @extend_schema(
        request=AssetReturnSerializer,
        responses={
            201: OpenApiResponse(
                response=AssetReturnSerializer,
                description="Asset return created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = AssetReturnSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetReturnSerializer(many=True),
                description="List of asset returns.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request):
        search_query = request.query_params.get("search", None)
        user = request.user.profile if request and hasattr(request, "user") else None
        condition = request.query_params.get("condition", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        asset_returns = AssetReturn.objects.filter(
            asset__institution=institution, deleted_at__isnull=True
        )

        if search_query:
            asset_returns = asset_returns.filter(
                Q(asset__asset_name__icontains=search_query)
                | Q(allocation__allocated_to__user__fullname__icontains=search_query)
                | Q(condition__icontains=search_query)
            )

        if condition:
            asset_returns = asset_returns.filter(condition=condition) 

        try:
            asset_returns = self.apply_sorting(asset_returns, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                  
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(asset_returns, request)
        serializer = AssetReturnSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetReturnDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetReturnSerializer,
                description="Asset return details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset return not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request, pk):
        asset_return = get_object_or_404(AssetReturn, pk=pk)
        serializer = AssetReturnSerializer(asset_return)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            204: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset return deleted successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset return not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        asset_return = get_object_or_404(AssetReturn, pk=pk)
        asset_return.approval_status = 'under_deletion'
        asset_return.save(update_fields=['approval_status'])
        asset_return.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetReturnSerializer,
                description="Asset return updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset return not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        asset_return = get_object_or_404(AssetReturn, pk=pk)
        asset_return.approval_status = 'under_update'
        serializer = AssetReturnSerializer(
            asset_return, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            asset_return.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AssetHistoryListView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['asset', 'created_at', 'event_type', 'is_active']
    default_ordering = ['asset']

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetHistorySerializer(many=True),
                description="List of asset histories.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request):
        search_query = request.query_params.get("search", None)
        status = request.query_params.get("status", None)
        user = request.user.profile
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        asset_histories = AssetHistory.objects.filter(
            asset__institution=institution, deleted_at__isnull=True
        )

        if status:
            asset_histories = AssetHistory.filter(event_type=status)

        if search_query:
            asset_histories = asset_histories.filter(
                Q(asset__asset_name__icontains=search_query)
                | Q(performed_by__user__fullname__icontains=search_query)
                | Q(affected_user__user__fullname__icontains=search_query)
                | Q(event_type__icontains=search_query)
            )

        try:
            asset_histories = self.apply_sorting(asset_histories, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(asset_histories, request)
        serializer = AssetHistorySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetHistoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetHistorySerializer,
                description="Asset history details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset history not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def get(self, request, pk):
        asset_history = get_object_or_404(AssetHistory, pk=pk)
        serializer = AssetHistorySerializer(asset_history)
        return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(
    tags=['Assets'],
    summary='Retrieve assets dashboard data',
    description=(
        'This endpoint provides aggregated data for the assets dashboard, including: '
        '- Asset counts by status (available, allocated, maintenance, decommissioned, total). '
        '- Category counts (number of assets per category). '
        '- Pending requests and allocations counts. '
        '- List of recent assets (last 10, ordered by creation date descending). '
        'Data is filtered by the institution associated with the authenticated user.'
    ),
    responses={
        200: OpenApiResponse(
            description='Successful response with dashboard data',
            response={
                'type': 'object',
                'properties': {
                    'asset_counts': {
                        'type': 'object',
                        'properties': {
                            'available': {'type': 'integer'},
                            'allocated': {'type': 'integer'},
                            'maintenance': {'type': 'integer'},
                            'decommissioned': {'type': 'integer'},
                            'total': {'type': 'integer'},
                        }
                    },
                    'category_counts': {
                        'type': 'object',
                        'additionalProperties': {'type': 'integer'},
                        'description': 'Counts by asset category (e.g., "Laptops": 5)'
                    },
                    'pending_counts': {
                        'type': 'object',
                        'properties': {
                            'requests': {'type': 'integer'},
                            'allocations': {'type': 'integer'},
                            'returns': {'type': 'integer'},
                            'total': {'type': 'integer'},
                        }
                    },
                    'recent_assets': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'asset_name': {'type': 'string'},
                                'batch_number': {'type': 'string'},
                                'serial_number': {'type': 'string'},
                                'category_name': {'type': 'string'},
                                'status': {'type': 'string'},
                                'description': {'type': 'string', 'nullable': True},
                                'current_holder_name': {'type': 'string', 'nullable': True},
                            }
                        }
                    }
                }
            }
        ),
        400: OpenApiResponse(description='Bad request (e.g., user institution not found)')
    }
)
class AssetsDashboardView(APIView):
    """
    Endpoint to retrieve data for the assets dashboard.
    Assumes the request.user has a profile with an associated institution.
    If not, adjust the institution retrieval logic as needed (e.g., via query params).
    GET /api/assets/dashboard/
    """

    def get(self, request):
        # Retrieve the institution from the authenticated user (adjust if needed)
        try:
            institution = request.user.profile.institution  # Assuming Profile has institution field
        except AttributeError:
            return Response({"error": "User institution not found."}, status=400)

        # Filter assets for the institution
        assets = Asset.objects.filter(institution=institution)

        # Asset counts by status
        asset_counts = assets.aggregate(
            available=Count('id', filter=Q(status='available')),
            allocated=Count('id', filter=Q(status='allocated')),
            maintenance=Count('id', filter=Q(status='maintenance')),
            decommissioned=Count('id', filter=Q(status='decommissioned')),
            total=Count('id')
        )

        # Category counts
        category_counts = dict(
            assets.values('category__category_name')
            .annotate(count=Count('id'))
            .values_list('category__category_name', 'count')
        )

        # Pending counts
        pending_requests = AssetRequest.objects.filter(
            asset__institution=institution,
            asset_request_status='pending'
        ).count()

        pending_allocations = AssetAllocation.objects.filter(
            asset__institution=institution,
            allocation_status='pending'
        ).count()

        # Assuming AssetReturn uses approval workflow and 'pending' can be inferred (e.g., if not yet approved/rejected)
        # For simplicity, count all new returns; adjust if BaseApprovableModel has a status field
        pending_returns = AssetReturn.objects.filter(
            asset__institution=institution,
            # If no explicit status, perhaps filter by recent or approval_pending; here assuming all for example
        ).count()  # Adjust query as per actual model logic

        pending_counts = {
            'requests': pending_requests,
            'allocations': pending_allocations,
            'returns': pending_returns,
            'total': pending_requests + pending_allocations + pending_returns
        }

        # Recent assets (last 10, ordered by -id assuming no created_at; adjust if timestamps available)
        recent_assets = assets.order_by('-id')[:10]  # Use '-created_at' if available
        recent_assets_data = AssetSerializer(recent_assets, many=True).data

        # Compile dashboard data
        dashboard_data = {
            'asset_counts': asset_counts,
            'category_counts': category_counts,
            'pending_counts': pending_counts,
            'recent_assets': recent_assets_data
        }

        return Response(dashboard_data)