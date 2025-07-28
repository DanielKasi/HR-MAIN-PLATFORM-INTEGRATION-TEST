from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import DocumentType, DocumentTemplate
from .serializers import DocumentTypeSerializer, DocumentTemplateSerializer
from utilities.pagination import CustomPageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from institution.models import Institution
from audit.models import AuditLog
from django.contrib.contenttypes.models import ContentType


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

class DocumentTemplateListCreateAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=DocumentTemplateSerializer,
        responses={201: DocumentTemplateSerializer, 400: None},
        description="Create a new document template.",
        tags=["Document Templates"]
    )
    def post(self, request, institution_id):
        try:
            institution = Institution.objects.get(pk=institution_id)
        except Institution.DoesNotExist:
            return Response({"error": "Institution not found"}, status=status.HTTP_404_NOT_FOUND)

        # Ensure document_type belongs to the institution
        document_type_id = request.data.get("document_type")
        if document_type_id:
            try:
                document_type = DocumentType.objects.get(pk=document_type_id, institution=institution)
            except DocumentType.DoesNotExist:
                return Response({"error": "Document type does not belong to this institution"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = DocumentTemplateSerializer(
            data=request.data,
            context={'request': request, 'institution_id': institution_id}
        )
        if serializer.is_valid():
            template = serializer.save()
            # Create audit log
            AuditLog.objects.create(
                content_type=ContentType.objects.get_for_model(DocumentTemplate),
                object_id=template.pk,
                action='CREATE',
                user=request.user if request.user.is_authenticated else None,
                description=f"Created DocumentTemplate: {template.name}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: DocumentTemplateSerializer(many=True), 404: None},
        description="Retrieve a list of document templates for an institution.",
        tags=["Document Templates"]
    )
    def get(self, request, institution_id):
        try:
            Institution.objects.get(pk=institution_id)
        except Institution.DoesNotExist:
            return Response({"error": "Institution not found"}, status=status.HTTP_404_NOT_FOUND)
        
        templates = DocumentTemplate.objects.filter(document_type__institution=institution_id).order_by('-created_at')
        paginator = CustomPageNumberPagination()
        paginated_templates = paginator.paginate_queryset(templates, request)
        serializer = DocumentTemplateSerializer(paginated_templates, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

class DocumentTemplateDetailAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self, pk):
        try:
            return DocumentTemplate.objects.get(pk=pk)
        except DocumentTemplate.DoesNotExist:
            return None

    @extend_schema(
        responses={200: DocumentTemplateSerializer, 404: None},
        description="Retrieve a specific document template by ID.",
        tags=["Document Templates"]
    )
    def get(self, request, pk):
        template = self.get_object(pk)
        if not template:
            return Response({"error": "Document template not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = DocumentTemplateSerializer(template, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        request=DocumentTemplateSerializer,
        responses={200: DocumentTemplateSerializer, 400: None, 404: None},
        description="Update a document template.",
        tags=["Document Templates"]
    )
    def patch(self, request, pk):
        template = self.get_object(pk)
        if not template:
            return Response({"error": "Document template not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Capture old state for changes
        old_data = {
            'document_type': template.document_type_id,
            'name': template.name,
            'template_type': template.template_type,
            'file': template.file.name if template.file else None,
            'content': template.content,
            'placeholders': template.placeholders,
        }
        
        serializer = DocumentTemplateSerializer(template, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated_template = serializer.save()
            # Calculate changes
            changes = {}
            new_data = {
                'document_type': updated_template.document_type_id,
                'name': updated_template.name,
                'template_type': updated_template.template_type,
                'file': updated_template.file.name if updated_template.file else None,
                'content': updated_template.content,
                'placeholders': updated_template.placeholders,
            }
            for field, old_value in old_data.items():
                new_value = new_data[field]
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}
            
            # Create audit log
            AuditLog.objects.create(
                content_type=ContentType.objects.get_for_model(DocumentTemplate),
                object_id=updated_template.pk,
                action='UPDATE',
                user=request.user if request.user.is_authenticated else None,
                changes=changes if changes else None,
                description=f"Updated DocumentTemplate: {updated_template.name}"
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={204: None, 404: None},
        description="Delete a document template.",
        tags=["Document Templates"]
    )
    def delete(self, request, pk):
        template = self.get_object(pk)
        if not template:
            return Response({"error": "Document template not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create audit log before deletion
        AuditLog.objects.create(
            content_type=ContentType.objects.get_for_model(DocumentTemplate),
            object_id=template.pk,
            action='DELETE',
            user=request.user if request.user.is_authenticated else None,
            description=f"Deleted DocumentTemplate: {template.name}"
        )
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class AuditLogListAPIView(APIView):
    @extend_schema(
        responses={200: None, 404: None},  # Add serializer if needed
        description="Retrieve audit logs for a specific document template.",
        tags=["Document Templates"]
    )
    def get(self, request, institution_id, template_id):
        try:
            DocumentTemplate.objects.get(pk=template_id)
        except DocumentTemplate.DoesNotExist:
            return Response({"error": "Document template not found"}, status=status.HTTP_404_NOT_FOUND)
        
        content_type = ContentType.objects.get_for_model(DocumentTemplate)
        audit_logs = AuditLog.objects.filter(
            content_type=content_type,
            object_id=template_id
        ).select_related('user').order_by('-timestamp')
        
        response_data = [
            {
                'id': log.id,
                'action': log.action,
                'user': log.user.username if log.user else None,
                'timestamp': log.timestamp.isoformat(),
                'changes': log.changes,
                'description': log.description
            }
            for log in audit_logs
        ]
        return Response(response_data, status=status.HTTP_200_OK)