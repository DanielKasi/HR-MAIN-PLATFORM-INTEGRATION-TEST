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
from drf_spectacular.utils import extend_schema_view
from users.models import Profile, CustomUser, UserRole
from django.contrib.contenttypes.models import ContentType
from workflows.models import (
    ApprovalTask,
    InstitutionApprovalStepApprovorRole,
    InstitutionApprovalStepApprovorUser,
)
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
