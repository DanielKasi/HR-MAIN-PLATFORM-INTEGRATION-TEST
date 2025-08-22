from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.db.models import Q
from .models import DisciplineType, DisciplinaryAction
from .serializers import DisciplinaryActionSerializer, DisciplineTypeSerializer
from utilities.pagination import CustomPageNumberPagination
from institution.models import Institution


class DisciplinaryActionAPIView(APIView):

    @extend_schema(
        responses=DisciplinaryActionSerializer(many=True),
        summary="List all disciplinary actions",
    )
    def get(self, request):
        search_query = request.query_params.get('search', None)
        employee_id = request.query_params.get("employee_id")
        user = request.user.profile

        if user and user.institution:
            try:
                institution = Institution.objects.get(id=user.institution.id)
            except Institution.DoesNotExist:
                return Response(
                    {"detail": "Institution not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        actions = DisciplinaryAction.objects.filter(
            employee__department__institution=institution,
            is_active=True,
            delated_at__isnull=True
        )

        if employee_id:
            actions = actions.filter(employee_id=employee_id)

        if search_query:
            actions = actions.filter(
                Q(employee__user__fullname__icontains=search_query) |
                Q(discipline_type__name__icontains=search_query) |
                Q(incident_date__icontains=search_query)
            )    

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
        types = DisciplineType.objects.all().order_by("-created_at")

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
