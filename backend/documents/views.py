from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import DocumentType
from .serializers import DocumentTypeSerializer
from utilities.pagination import CustomPageNumberPagination


class DocumentTypeListCreateAPIView(APIView):

    @extend_schema(
        description="Retrieve a paginated list of document types for a given institution.",
        responses={200: DocumentTypeSerializer(many=True)}
    )
    def get(self, request, institution_id):
        queryset = DocumentType.objects.filter(institution_id=institution_id).order_by('-created_at')
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = DocumentTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


    @extend_schema(
        description="Create a new document type for the given institution. The code is auto-generated from the name.",
        request=DocumentTypeSerializer,
        responses={201: DocumentTypeSerializer}
    )
    def post(self, request, institution_id):
        data = request.data.copy()
        data['institution'] = institution_id  
        serializer = DocumentTypeSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentTypeRetrieveUpdateDeleteAPIView(APIView):

    def get_object(self, pk):
        try:
            return DocumentType.objects.get(pk=pk)
        except DocumentType.DoesNotExist:
            return None

    @extend_schema(
        description="Retrieve a specific document type by ID",
        responses={200: DocumentTypeSerializer, 404: None}
    )
    def get(self, request, pk):
        document_type = self.get_object(pk)
        if not document_type:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = DocumentTypeSerializer(document_type)
        return Response(serializer.data)

    @extend_schema(
        description="Partially update a document type. The code is automatically regenerated if name changes.",
        request=DocumentTypeSerializer,
        responses={200: DocumentTypeSerializer, 404: None}
    )
    def patch(self, request, pk):
        document_type = self.get_object(pk)
        if not document_type:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = DocumentTypeSerializer(document_type, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete a document type",
        responses={204: None, 404: None}
    )
    def delete(self, request, pk):
        document_type = self.get_object(pk)
        if not document_type:
            return Response(status=status.HTTP_404_NOT_FOUND)
        document_type.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)