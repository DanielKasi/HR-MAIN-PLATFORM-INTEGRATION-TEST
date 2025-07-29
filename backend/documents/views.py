from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import DocumentType, DocumentTemplate, Document
from .serializers import DocumentTypeSerializer, DocumentTemplateSerializer, GenerateDocumentResponseSerializer, GenerateDocumentRequestSerializer
from utilities.pagination import CustomPageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from institution.models import Institution
from audit.models import AuditLog
from django.contrib.contenttypes.models import ContentType
from onboarding.models import OnBoarding
from settings.models import SystemConfiguration
from django.shortcuts import get_object_or_404
from datetime import datetime



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

class GenerateDocumentView(APIView):
    @extend_schema(
        tags=['Document Generation'],
        parameters=[
            OpenApiParameter(
                name='context',
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                enum=['onboarding', 'employee', 'leave'],
                description='The context for document generation (e.g., onboarding, employee, leave)'
            ),
            OpenApiParameter(
                name='context_id',
                type=int,
                location=OpenApiParameter.QUERY,
                required=True,
                description='The ID of the context record (e.g., OnBoarding ID, Employee ID)'
            ),
        ],
        responses={
            200: GenerateDocumentResponseSerializer,
            404: {'description': 'Template or context record not found'}
        },
        description='Fetches placeholders for a document template with pre-filled values based on context'
    )
    def get(self, request, template_id):
        # Fetch the document template
        template = get_object_or_404(DocumentTemplate, pk=template_id)
        template_placeholders = template.placeholders or []

        # Get system configuration for required fields
        system_config = SystemConfiguration.objects.filter(code='doc_required_fields').first()
        required_placeholders = system_config.content if system_config else []

        # Combine placeholders (remove duplicates, preserve template formatting for non-required placeholders)
        # Convert template placeholders to clean format (strip {{}})
        clean_template_placeholders = [p.strip('{}') for p in template_placeholders]
        # Ensure all required placeholders are included, even if not in template
        all_placeholders = list(set(clean_template_placeholders + required_placeholders))

        # Get context and context_id from query params
        context = request.query_params.get('context')
        context_id = request.query_params.get('context_id')

        if not context or not context_id:
            return Response(
                {'error': 'context and context_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Dynamic value mapping based on context
        known_values = {}
        if context == 'onboarding':
            onboarding = get_object_or_404(OnBoarding, pk=context_id)
            known_values = {
                'FULLNAME': onboarding.application.applicant_name if onboarding.application else '',
                'SALARY': str(onboarding.application.job_position_advert.job_position.salary) if onboarding.application.job_position_advert.job_position.salary else '',
                'DATE': str(datetime.now().date()),
            }
        elif context == 'employee':
            employee = get_object_or_404(Employee, pk=context_id)
            known_values = {
                'FULLNAME': employee.fullname if hasattr(employee, 'fullname') else '',
                'SALARY': str(employee.salary) if hasattr(employee, 'salary') else '',
                'DATE': str(datetime.now().date()),
            }
        elif context == 'leave':
            leave = get_object_or_404(Leave, pk=context_id)
            known_values = {
                'FULLNAME': leave.employee.fullname if hasattr(leave.employee, 'fullname') else '',
                'DATE': str(datetime.now().date()),
            }
        else:
            return Response(
                {'error': 'Invalid context'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Construct placeholder data
        placeholder_data = {}
        for placeholder in all_placeholders:
            value = known_values.get(placeholder, '')
            placeholder_data[placeholder] = {
                'value': value
            }

        serializer = GenerateDocumentResponseSerializer({
            'placeholders': placeholder_data,
            'template_id': template_id
        })
        return Response(serializer.data)


    @extend_schema(
        tags=['Document Generation'],
        request=GenerateDocumentRequestSerializer,
        responses={
            201: {'description': 'Document created successfully', 'properties': {'status': {'type': 'string'}, 'document_id': {'type': 'integer'}}},
            400: {'description': 'Invalid input or missing required placeholders'},
            404: {'description': 'Template or context record not found'}
        },
        description='Creates a new document with the provided placeholder values and updates OnBoarding status to contract_review if context is onboarding'
    )
    def post(self, request, template_id):
        # Fetch the document template
        template = get_object_or_404(DocumentTemplate, pk=template_id)

        # Get system configuration for required fields
        system_config = SystemConfiguration.objects.filter(code='doc_required_fields').first()
        required_placeholders = system_config.content if system_config else []

        # Validate input
        serializer = GenerateDocumentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        placeholder_values = serializer.validated_data['placeholders']
        context = serializer.validated_data.get('context')
        context_id = serializer.validated_data.get('context_id')

        # Validate required placeholders
        for placeholder in required_placeholders:
            if placeholder not in placeholder_values or not placeholder_values[placeholder]:
                return Response(
                    {'error': f'Missing required placeholder: {placeholder}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create Document instance
        document = Document.objects.create(
            document_template=template,
            placeholder_values=placeholder_values,
            status='pending'
        )

        # Update OnBoarding status if context is onboarding
        if context == 'onboarding' and context_id:
            try:
                onboarding = OnBoarding.objects.get(pk=context_id)
                onboarding.status = 'contract_review'
                onboarding.save()
            except OnBoarding.DoesNotExist:
                return Response(
                    {'error': 'OnBoarding record not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(
            {'status': 'success', 'document_id': document.pk},
            status=status.HTTP_201_CREATED
        )
