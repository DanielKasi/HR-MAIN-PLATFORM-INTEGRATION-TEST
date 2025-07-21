from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.shortcuts import get_object_or_404
from .models import PerformancePolicy
from .serializers import PerformancePolicySerializer
from utilities.pagination import CustomPageNumberPagination

class PerformancePolicyAPIView(APIView):

    @extend_schema(
        summary="List performance policies for a specific institution",
        responses=PerformancePolicySerializer(many=True),
    )
    def get(self, request, institution_id):
        policies = PerformancePolicy.objects.filter(
            institution_id=institution_id
        ).order_by("-effective_date")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(policies, request)
        serializer = PerformancePolicySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=PerformancePolicySerializer,
        responses=PerformancePolicySerializer,
        summary="Create a new performance policy",
    )
    def post(self, request, institution_id):
        serializer = PerformancePolicySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PerformancePolicyDetailAPIView(APIView):

    @extend_schema(
        responses=PerformancePolicySerializer,
        summary="Retrieve a performance policy by ID",
    )
    def get(self, BE request, pk):
        instance = get_object_or_404(PerformancePolicy, pk=pk)
        serializer = PerformancePolicySerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=PerformancePolicySerializer,
        responses=PerformancePolicySerializer,
        summary="Update a performance policy (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(PerformancePolicy, pk=pk)
        serializer = PerformancePolicySerializer(
            instance, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a performance policy")
    def delete(self, request, pk):
        instance = get_object_or_404(PerformancePolicy, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)