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
from rest_framework.views import APIView, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from institution.models import Institution
from utilities.pagination import CustomPageNumberPagination
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_view
from users.models import Profile



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

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        categories = AssetCategory.objects.filter(institution=institution)

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

        print(f"data {data}")
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
        assets = Asset.objects.filter(institution=institution)

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
        print(f"request {request.data}")
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

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        asset_requests = AssetRequest.objects.filter(asset__institution=institution)
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
        asset_request.delete()
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
        serializer = AssetAllocationSerializer(data=request.data)
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
        asset_allocations = AssetAllocation.objects.all()
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
        asset_allocation.delete()
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
        asset_returns = AssetReturn.objects.all()
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
        asset_return.delete()
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
        asset_histories = AssetHistory.objects.all()
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
