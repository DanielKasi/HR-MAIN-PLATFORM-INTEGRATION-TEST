from workflows.serializers import (
    AssetRequestWorkflowSerializer,
    AssetAllocationWorkflowSerializer,
)
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
from django.db.models import Q
from employee.models import Employee
from django.db import transaction


class AssetCategoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

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
        responses={
            200: OpenApiResponse(
                response=AssetCategorySerializer(many=True),
                description="List of asset categories.",
            ),
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


class AssetListCreateView(APIView):
    permission_classes = [IsAuthenticated]

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

        user_profile = get_object_or_404(Profile, user=request.user)
        data["created_by"] = user_profile.id

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


class AssetRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

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
                response=AssetRequestWorkflowSerializer(many=True),
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
        status = request.query_params.get("status", None)

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
            employee_asset_requests = asset_requests.filter(requester=profile)

            all_requests = AssetRequest.objects.filter(asset__institution=institution)

            for req in all_requests[:5]:  # Just first 5 for debugging

                asset_requests = employee_asset_requests

        if requester_id:
            asset_requests = asset_requests.filter(requester__id=requester_id)

        if status:
            asset_requests = asset_requests.filter(status=asset_request_status)    

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

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(asset_requests, request)
        serializer = AssetRequestWorkflowSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetRequestWorkflowSerializer,
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
        serializer = AssetRequestWorkflowSerializer(asset_request)
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
        assset_request.confirm_delete()
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



class AssetAllocationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

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
                response=AssetAllocationWorkflowSerializer(many=True),
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
            asset_allocations = asset_allocations.filter(status=allocation_status)    
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(asset_allocations, request)
        serializer = AssetAllocationWorkflowSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class AssetAllocationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=AssetAllocationWorkflowSerializer,
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
        serializer = AssetAllocationWorkflowSerializer(asset_allocation)
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



class AssetReturnListCreateView(APIView):
    permission_classes = [IsAuthenticated]

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


class AssetHistoryListView(APIView):
    permission_classes = [IsAuthenticated]

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
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        asset_histories = AssetHistory.objects.filter(
            asset__institution=institution, deleted_at__is_null=True
        )

        if status:
            asset_histories = AssetHistory.filter(status=event_type)

        if search_query:
            asset_histories = asset_histories.filter(
                Q(asset__asset_name__icontains=search_query)
                | Q(performed_by__user__fullname__icontains=search_query)
                | Q(affected_user__user__fullname__icontains=search_query)
                | Q(event_type__icontains=search_query)
            )
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





from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.db.models import Q, Count, Avg, Sum
from django.shortcuts import get_object_or_404
from institution.models import Institution
from utilities.pagination import CustomPageNumberPagination

# Asset Analytics
class AssetCategoryAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Category Analytics",
        summary="Get analytics for asset categories",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        filters = Q(deleted_at__isnull=True, institution=institution)

        categories = AssetCategory.objects.filter(filters).prefetch_related('assets')

        result = []
        for category in categories:
            assets = category.assets.filter(deleted_at__isnull=True)
            total = assets.count()
            available = assets.filter(status='available').count()
            allocated = assets.filter(status='allocated').count()
            maintenance = assets.filter(status='maintenance').count()
            decommissioned = assets.filter(status='decommissioned').count()

            result.append({
                'category_name': category.category_name,
                'total_assets': total,
                'available': available,
                'allocated': allocated,
                'maintenance': maintenance,
                'decommissioned': decommissioned,
                'status_distribution': {
                    'available': available,
                    'allocated': allocated,
                    'maintenance': maintenance,
                    'decommissioned': decommissioned,
                }
            })

        return Response({'asset_category_analytics': result}, status=status.HTTP_200_OK)

class AssetStatusAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Status Analytics",
        summary="Get analytics for asset statuses",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        filters = Q(deleted_at__isnull=True, institution=institution)

        assets = Asset.objects.filter(filters)

        status_dist = assets.values('status').annotate(count=Count('id')).order_by('-count')
        total_assets = assets.count()

        percentage_dist = []
        for item in status_dist:
            percentage = (item['count'] / total_assets * 100) if total_assets else 0
            percentage_dist.append({
                'status': item['status'],
                'count': item['count'],
                'percentage': round(percentage, 2)
            })

        return Response({
            'status_distribution': list(status_dist),
            'percentage_distribution': percentage_dist,
        }, status=status.HTTP_200_OK)

class AssetAllocationAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Allocation Analytics",
        summary="Get analytics for asset allocations",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        filters = Q(deleted_at__isnull=True, asset__institution=institution)
        if start_date and end_date:
            filters &= Q(created_at__range=[start_date, end_date])

        allocations = AssetAllocation.objects.filter(filters)

        status_dist = allocations.values('allocation_status').annotate(count=Count('id')).order_by('-count')

        total_assets = Asset.objects.filter(institution=institution, deleted_at__isnull=True).count()
        allocation_rate = (allocations.count() / total_assets * 100) if total_assets else 0

        most_allocated = allocations.values('asset__asset_name').annotate(count=Count('id')).order_by('-count')[:5]

        return Response({
            'total_allocations': allocations.count(),
            'allocation_status_distribution': list(status_dist),
            'allocation_rate': round(allocation_rate, 2),
            'most_allocated_assets': list(most_allocated),
        }, status=status.HTTP_200_OK)

class AssetRequestAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Request Analytics",
        summary="Get analytics for asset requests",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        filters = Q(deleted_at__isnull=True, asset__institution=institution)
        if start_date and end_date:
            filters &= Q(created_at__range=[start_date, end_date])

        requests = AssetRequest.objects.filter(filters)

        status_dist = requests.values('asset_request_status').annotate(count=Count('id')).order_by('-count')

        total_requests = requests.count()
        approved = requests.filter(asset_request_status='approved').count()
        approval_rate = (approved / total_requests * 100) if total_requests else 0

        most_requested = requests.values('asset__asset_name').annotate(count=Count('id')).order_by('-count')[:5]

        return Response({
            'total_requests': total_requests,
            'request_status_distribution': list(status_dist),
            'approval_rate': round(approval_rate, 2),
            'most_requested_assets': list(most_requested),
        }, status=status.HTTP_200_OK)

class AssetReturnAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Return Analytics",
        summary="Get analytics for asset returns",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        filters = Q(deleted_at__isnull=True, asset__institution=institution)
        if start_date and end_date:
            filters &= Q(created_at__range=[start_date, end_date])

        returns = AssetReturn.objects.filter(filters)

        condition_dist = returns.values('condition').annotate(count=Count('id')).order_by('-count')

        total_allocations = AssetAllocation.objects.filter(asset__institution=institution, deleted_at__isnull=True).count()
        return_rate = (returns.count() / total_allocations * 100) if total_allocations else 0

        return Response({
            'total_returns': returns.count(),
            'return_condition_distribution': list(condition_dist),
            'return_rate': round(return_rate, 2),
        }, status=status.HTTP_200_OK)

class AssetHistoryAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset History Analytics",
        summary="Get analytics for asset history",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        filters = Q(deleted_at__isnull=True, asset__institution=institution)
        if start_date and end_date:
            filters &= Q(created_at__range=[start_date, end_date])

        history = AssetHistory.objects.filter(filters)

        event_dist = history.values('event_type').annotate(count=Count('id')).order_by('-count')

        most_active = history.values('asset__asset_name').annotate(count=Count('id')).order_by('-count')[:5]

        return Response({
            'total_history_events': history.count(),
            'event_type_distribution': list(event_dist),
            'most_active_assets': list(most_active),
        }, status=status.HTTP_200_OK)

class AssetUtilizationAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Utilization Analytics",
        summary="Get analytics for asset utilization",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        filters = Q(deleted_at__isnull=True, institution=institution)

        assets = Asset.objects.filter(filters)
        allocations = AssetAllocation.objects.filter(asset__institution=institution, deleted_at__isnull=True)

        total_assets = assets.count()
        allocated_assets = assets.filter(status='allocated').count()
        utilization_rate = (allocated_assets / total_assets * 100) if total_assets else 0

        most_utilized = allocations.values('asset__asset_name').annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        return Response({
            'utilization_rate': round(utilization_rate, 2),
            'most_utilized_assets': list(most_utilized),
        }, status=status.HTTP_200_OK)

class AssetMaintenanceAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Maintenance Analytics",
        summary="Get analytics for asset maintenance",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        filters = Q(deleted_at__isnull=True, status='maintenance', institution=institution)

        assets = Asset.objects.filter(filters)

        most_maintained = AssetHistory.objects.filter(
            event_type='maintenance',
            asset__institution=institution,
            deleted_at__isnull=True
        ).values('asset__asset_name').annotate(count=Count('id')).order_by('-count')[:5]

        return Response({
            'total_assets_under_maintenance': assets.count(),
            'most_frequently_maintained_assets': list(most_maintained),
        }, status=status.HTTP_200_OK)

class AssetDecommissionAnalyticsViewSet(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="Asset Decommission Analytics",
        summary="Get analytics for asset decommission",
        responses={
            200: OpenApiResponse(description="OK"),
            401: OpenApiResponse(description="Unauthorized"),
        },
        tags=["Asset Analytics"],
    )
    def get(self, request, institution_id):
        institution = get_object_or_404(Institution, id=institution_id)
        filters = Q(deleted_at__isnull=True, status='decommissioned', institution=institution)

        assets = Asset.objects.filter(filters)

        total_assets = Asset.objects.filter(institution=institution, deleted_at__isnull=True).count()
        decommission_rate = (assets.count() / total_assets * 100) if total_assets else 0

        return Response({
            'total_decommissioned_assets': assets.count(),
            'decommission_rate': round(decommission_rate, 2),
        }, status=status.HTTP_200_OK)
