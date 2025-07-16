from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import DisciplineType, DisciplinaryAction
from .serializers import DisciplinaryActionSerializer, DisciplineTypeSerializer
from utilities.pagination import CustomPageNumberPagination


class DisciplinaryActionAPIView(APIView):

    @extend_schema(
        responses=DisciplinaryActionSerializer(many=True),
        summary="List all disciplinary actions",
    )
    def get(self, request):
        actions = DisciplinaryAction.objects.all()

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(actions, request)
        serializer = DisciplinaryActionSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=DisciplinaryActionSerializer,
        responses=DisciplinaryActionSerializer,
        summary="Create a new disciplinary action",
    )
    def post(self, request):
        serializer = DisciplinaryActionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DisciplinaryActionDetailAPIView(APIView):

    @extend_schema(
        responses=DisciplinaryActionSerializer,
        summary="Retrieve a disciplinary action by ID",
    )
    def get(self, request, pk):
        action = get_object_or_404(DisciplinaryAction, pk=pk)
        serializer = DisciplinaryActionSerializer(action)
        return Response(serializer.data)

    @extend_schema(
        request=DisciplinaryActionSerializer,
        responses=DisciplinaryActionSerializer,
        summary="Update a disciplinary action (partial)",
    )
    def patch(self, request, pk):
        action = get_object_or_404(DisciplinaryAction, pk=pk)
        serializer = DisciplinaryActionSerializer(
            action, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a disciplinary action")
    def delete(self, request, pk):
        action = get_object_or_404(DisciplinaryAction, pk=pk)
        action.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DisciplineTypeAPIView(APIView):

    @extend_schema(
        responses=DisciplineTypeSerializer(many=True),
        summary="List all discipline types",
    )
    def get(self, request):
        types = DisciplineType.objects.all()

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(types, request)
        serializer = DisciplineTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=DisciplineTypeSerializer,
        responses=DisciplineTypeSerializer,
        summary="Create a new discipline type",
    )
    def post(self, request):
        serializer = DisciplineTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DisciplineTypeDetailAPIView(APIView):

    @extend_schema(
        responses=DisciplineTypeSerializer, summary="Retrieve a discipline type by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(DisciplineType, pk=pk)
        serializer = DisciplineTypeSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=DisciplineTypeSerializer,
        responses=DisciplineTypeSerializer,
        summary="Update a discipline type (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(DisciplineType, pk=pk)
        serializer = DisciplineTypeSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a discipline type")
    def delete(self, request, pk):
        instance = get_object_or_404(DisciplineType, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
