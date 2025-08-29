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
    def post(self, request):
        serializer = AssetCategorySerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
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
            204: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset category deleted successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Asset category not found.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def delete(self, request, pk):
        category = get_object_or_404(AssetCategory, pk=pk)
        # Custom delete method on the model instance, which handles the soft deletion.
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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
    def patch(self, request, pk):
        category = get_object_or_404(AssetCategory, pk=pk)
        serializer = AssetCategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
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
    def post(self, request):
        data = request.data.copy()

        user_profile = get_object_or_404(Profile, user=request.user)
        data["created_by"] = user_profile.id

        serializer = AssetSerializer(data=data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
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
        assets = Asset.objects.filter(institution=institution, deleted_at__isnull=True)

        if search_query:
            assets = assets.filter(
                Q(asset_name__icontains=search_query)
                | Q(batch_number__icontains=search_query)
                | Q(serial_number__icontains=search_query)
            )

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
    def delete(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        # Custom delete method that handles a soft delete
        asset.delete()
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
        serializer = AssetSerializer(asset, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
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
    def post(self, request):
        serializer = AssetRequestSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
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
        employee_id = request.query_params.get("employee_id")
        search_query = request.query_params.get("search", None)
        requester_id = request.query_params.get("requester_id", None)

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
    def delete(self, request, pk):
        asset_request = get_object_or_404(AssetRequest, pk=pk)
        asset_request.delete()  # Custom delete that handles a soft delete
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
    def patch(self, request, pk):
        asset_request = get_object_or_404(AssetRequest, pk=pk)
        serializer = AssetRequestSerializer(
            asset_request, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["approve", "reject"]},
                    "comment": {"type": "string", "required": False},
                },
                "required": ["action"],
            }
        },
        responses={
            200: OpenApiResponse(
                response=AssetRequestWorkflowSerializer,
                description="Asset request approval action completed successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
            403: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="User not authorized to approve this request.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def post(self, request, pk):
        """Handle approval/rejection of asset request tasks"""
        asset_request = get_object_or_404(AssetRequest, pk=pk)
        action = request.data.get("action")
        comment = request.data.get("comment", "")

        if action not in ["approve", "reject"]:
            return Response(
                {"error": "Invalid action. Must be 'approve' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the current user's approval tasks for this request
        content_type = ContentType.objects.get_for_model(AssetRequest)
        pending_tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=asset_request.id, status="pending"
        ).order_by("step__level")

        if not pending_tasks.exists():
            return Response(
                {"error": "No pending approval tasks found for this request"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_task = pending_tasks.first()
        user = request.user
        user_roles = user.user_roles.values_list("role_id", flat=True)

        # Check if user can approve this task
        step_role_ids = set(
            InstitutionApprovalStepApprovorRole.objects.filter(
                step=current_task.step
            ).values_list("approver_role_id", flat=True)
        )
        approver_user_ids = set(
            InstitutionApprovalStepApprovorUser.objects.filter(
                step=current_task.step
            ).values_list("approver_user__user__id", flat=True)
        )

        matching_role = next((x for x in step_role_ids if x in user_roles), None)

        if (
            matching_role is None
            and not request.user.id in approver_user_ids
            and request.user.id != current_task.step.institution.institution_owner.id
        ):
            return Response(
                {"error": "You are not authorized to approve this request"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Update the current task
        current_task.status = "completed" if action == "approve" else "rejected"
        current_task.comment = comment
        current_task.approved_by = user.profile
        current_task.save()

        # If approved, check if there are more steps or if workflow is complete
        if action == "approve":
            # Check if there are more pending tasks
            remaining_tasks = ApprovalTask.objects.filter(
                content_type=content_type,
                object_id=asset_request.id,
                status__in=["not_started", "pending"],
            ).exclude(id=current_task.id)

            if remaining_tasks.exists():
                # Activate the next task
                next_task = remaining_tasks.order_by("step__level").first()
                next_task.status = "pending"
                next_task.save()
            else:
                # All tasks completed, finish the workflow
                try:
                    asset_request.finish_workflow()
                except Exception as e:
                    return Response(
                        {"error": f"Error finishing workflow: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Return updated request with workflow information
        serializer = AssetRequestWorkflowSerializer(asset_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
    def post(self, request):
        print(f"request {request.data}")
        serializer = AssetAllocationSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
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
        employee_id = request.query_params.get("employee_id")
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
    def delete(self, request, pk):
        asset_allocation = get_object_or_404(AssetAllocation, pk=pk)
        asset_allocation.delete()  # Custom delete method to handle soft delete
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
    def patch(self, request, pk):
        asset_allocation = get_object_or_404(AssetAllocation, pk=pk)
        serializer = AssetAllocationSerializer(
            asset_allocation, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["approve", "reject"]},
                    "comment": {"type": "string", "required": False},
                },
                "required": ["action"],
            }
        },
        responses={
            200: OpenApiResponse(
                response=AssetAllocationWorkflowSerializer,
                description="Asset allocation approval action completed successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
            403: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="User not authorized to approve this allocation.",
            ),
        },
        tags=["Asset Mgt"],
    )
    def post(self, request, pk):
        """Handle approval/rejection of asset allocation tasks"""
        asset_allocation = get_object_or_404(AssetAllocation, pk=pk)
        action = request.data.get("action")
        comment = request.data.get("comment", "")

        if action not in ["approve", "reject"]:
            return Response(
                {"error": "Invalid action. Must be 'approve' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the current user's approval tasks for this allocation
        content_type = ContentType.objects.get_for_model(AssetAllocation)
        pending_tasks = ApprovalTask.objects.filter(
            content_type=content_type, object_id=asset_allocation.id, status="pending"
        ).order_by("step__level")

        if not pending_tasks.exists():
            return Response(
                {"error": "No pending approval tasks found for this allocation"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_task = pending_tasks.first()
        user = request.user
        user_roles = user.user_roles.values_list("role_id", flat=True)

        # Check if user can approve this task
        step_role_ids = set(
            InstitutionApprovalStepApprovorRole.objects.filter(
                step=current_task.step
            ).values_list("approver_role_id", flat=True)
        )
        approver_user_ids = set(
            InstitutionApprovalStepApprovorUser.objects.filter(
                step=current_task.step
            ).values_list("approver_user__user__id", flat=True)
        )

        matching_role = next((x for x in step_role_ids if x in user_roles), None)

        if (
            matching_role is None
            and not request.user.id in approver_user_ids
            and request.user.id != current_task.step.institution.institution_owner.id
        ):
            return Response(
                {"error": "You are not authorized to approve this allocation"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Update the current task
        current_task.status = "completed" if action == "approve" else "rejected"
        current_task.comment = comment
        current_task.approved_by = user.profile
        current_task.save()

        # If approved, check if there are more steps or if workflow is complete
        if action == "approve":
            # Check if there are more pending tasks
            remaining_tasks = ApprovalTask.objects.filter(
                content_type=content_type,
                object_id=asset_allocation.id,
                status__in=["not_started", "pending"],
            ).exclude(id=current_task.id)

            if remaining_tasks.exists():
                # Activate the next task
                next_task = remaining_tasks.order_by("step__level").first()
                next_task.status = "pending"
                next_task.save()
            else:
                # All tasks completed, finish the workflow
                try:
                    asset_allocation.finish_workflow()
                except Exception as e:
                    return Response(
                        {"error": f"Error finishing workflow: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Return updated allocation with workflow information
        serializer = AssetAllocationWorkflowSerializer(asset_allocation)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
    def post(self, request):
        print(f"request {request.data}")
        serializer = AssetReturnSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
    def delete(self, request, pk):
        asset_return = get_object_or_404(AssetReturn, pk=pk)
        asset_return.delete()  # Custom delete method to handle soft delete
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
    def patch(self, request, pk):
        asset_return = get_object_or_404(AssetReturn, pk=pk)
        serializer = AssetReturnSerializer(
            asset_return, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
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
