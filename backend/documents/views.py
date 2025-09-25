from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
import os
from performance.models import PerformanceImprovementPlan
from utilities.sortable_api import SortableAPIMixin
from .models import DocumentType, DocumentTemplate, Document
from .serializers import (
    DocumentTypeSerializer,
    DocumentTemplateSerializer,
    GenerateDocumentResponseSerializer,
    GenerateDocumentRequestSerializer,
    DocumentContentPreviewSerializer,
    DocumentStatusUpdateSerializer,
)
from utilities.pagination import CustomPageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from institution.models import Institution
from audit.models import AuditLog
from django.contrib.contenttypes.models import ContentType
from onboarding.models import OnBoarding
from settings.models import SystemConfiguration
from django.shortcuts import get_object_or_404
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from datetime import datetime, timedelta
import re
from django.core.files.base import ContentFile
from weasyprint import HTML
from employee.models import EmployeeContract, Employee
import logging
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
import subprocess
import tempfile

# Set up logging
logger = logging.getLogger(__name__)


class DocumentTypeListCreateAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['name', 'created_at', 'code', 'is_active']
    default_ordering = ['name']

    @extend_schema(
        description="Retrieve a paginated list of document types for a given institution.",
        responses={200: DocumentTypeSerializer(many=True)},
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        queryset = DocumentType.objects.filter(
            institution_id=institution_id, 
            deleted_at__isnull=True,
        ).order_by("-created_at")

        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) | Q(code__icontains=search_query) | 
                Q(description__icontains=search_query)
            )

        try:
            queryset = self.apply_sorting(queryset, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)        

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = DocumentTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        description="Create a new document type for the given institution. The code is auto-generated from the name.",
        request=DocumentTypeSerializer,
        responses={201: DocumentTypeSerializer},
    )
    @transaction.atomic()
    def post(self, request, institution_id):
        data = request.data.copy()
        data["institution"] = institution_id
        serializer = DocumentTypeSerializer(data=data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
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
        responses={200: DocumentTypeSerializer, 404: None},
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
        responses={200: DocumentTypeSerializer, 404: None},
    )
    @transaction.atomic()
    def patch(self, request, pk):
        document_type = self.get_object(pk)
        document_type.approval_status = 'under-update'
        if not document_type:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = DocumentTypeSerializer(
            document_type, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            document_type.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete a document type", responses={204: None, 404: None}
    )
    @transaction.atomic()
    def delete(self, request, pk):
        document_type = self.get_object(pk)
        if not document_type:
            return Response(status=status.HTTP_404_NOT_FOUND)
        document_type.approval_status = 'under_deletion'
        document_type.save(update_fields=['approval_status'])
        document_type.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentTemplateListCreateAPIView(APIView, SortableAPIMixin):
    parser_classes = [MultiPartParser, FormParser]
    allowed_ordering_fields = ['name', 'created_at', 'document_type', 'is_active', 'template_type']
    default_ordering = ['name']

    @extend_schema(
        request=DocumentTemplateSerializer,
        responses={201: DocumentTemplateSerializer, 400: None},
        description="Create a new document template.",
        tags=["Document Templates"],
    )
    @transaction.atomic()
    def post(self, request, institution_id):
        try:
            institution = Institution.objects.get(pk=institution_id)
        except Institution.DoesNotExist:
            return Response(
                {"error": "Institution not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Ensure document_type belongs to the institution
        document_type_id = request.data.get("document_type")
        if document_type_id:
            try:
                document_type = DocumentType.objects.get(
                    pk=document_type_id, institution=institution
                )
            except DocumentType.DoesNotExist:
                return Response(
                    {"error": "Document type does not belong to this institution"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = DocumentTemplateSerializer(
            data=request.data,
            context={"request": request, "institution_id": institution_id},
        )
        if serializer.is_valid():
            template = serializer.save()
            template.confirm_create()
            # Create audit log
            AuditLog.objects.create(
                content_type=ContentType.objects.get_for_model(DocumentTemplate),
                object_id=template.pk,
                action="CREATE",
                user=request.user if request.user.is_authenticated else None,
                description=f"Created DocumentTemplate: {template.name}",
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: DocumentTemplateSerializer(many=True), 404: None},
        description="Retrieve a list of document templates for an institution.",
        tags=["Document Templates"],
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        try:
            Institution.objects.get(pk=institution_id)
        except Institution.DoesNotExist:
            return Response(
                {"error": "Institution not found"}, status=status.HTTP_404_NOT_FOUND
            )

        templates = DocumentTemplate.objects.filter(
            document_type__institution=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:    
            templates = templates.filter(
                Q(document_type__name__icontains=search_query) |
                Q(name__icontains=search_query) |
                Q(template_type__icontains=search_query)
            )

        try:
            templates = self.apply_sorting(templates, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)        
        paginator = CustomPageNumberPagination()
        paginated_templates = paginator.paginate_queryset(templates, request)
        serializer = DocumentTemplateSerializer(
            paginated_templates, many=True, context={"request": request}
        )
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
        tags=["Document Templates"],
    )
    def get(self, request, pk):
        template = self.get_object(pk)
        if not template:
            return Response(
                {"error": "Document template not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = DocumentTemplateSerializer(template, context={"request": request})
        return Response(serializer.data)

    @extend_schema(
        request=DocumentTemplateSerializer,
        responses={200: DocumentTemplateSerializer, 400: None, 404: None},
        description="Update a document template.",
        tags=["Document Templates"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        template = self.get_object(pk)
        template.approval_status = 'under_update'
        if not template:
            return Response(
                {"error": "Document template not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Capture old state for changes
        old_data = {
            "document_type": template.document_type_id,
            "name": template.name,
            "template_type": template.template_type,
            "file": template.file.name if template.file else None,
            "content": template.content,
            "placeholders": template.placeholders,
        }

        serializer = DocumentTemplateSerializer(
            template, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            updated_template = serializer.save()
            template.confirm_update()
            # Calculate changes
            changes = {}
            new_data = {
                "document_type": updated_template.document_type_id,
                "name": updated_template.name,
                "template_type": updated_template.template_type,
                "file": updated_template.file.name if updated_template.file else None,
                "content": updated_template.content,
                "placeholders": updated_template.placeholders,
            }
            for field, old_value in old_data.items():
                new_value = new_data[field]
                if old_value != new_value:
                    changes[field] = {"old": old_value, "new": new_value}

            # Create audit log
            AuditLog.objects.create(
                content_type=ContentType.objects.get_for_model(DocumentTemplate),
                object_id=updated_template.pk,
                action="UPDATE",
                user=request.user if request.user.is_authenticated else None,
                changes=changes if changes else None,
                description=f"Updated DocumentTemplate: {updated_template.name}",
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={204: None, 404: None},
        description="Delete a document template.",
        tags=["Document Templates"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        template = self.get_object(pk)
        if not template:
            return Response(
                {"error": "Document template not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create audit log before deletion
        AuditLog.objects.create(
            content_type=ContentType.objects.get_for_model(DocumentTemplate),
            object_id=template.pk,
            action="DELETE",
            user=request.user if request.user.is_authenticated else None,
            description=f"Deleted DocumentTemplate: {template.name}",
        )
        template.approval_status = 'under_deletion'
        template.save(update_firlds=['approval_status'])
        template.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AuditLogListAPIView(APIView):
    @extend_schema(
        responses={200: None, 404: None},  # Add serializer if needed
        description="Retrieve audit logs for a specific document template.",
        tags=["Document Templates"],
    )
    def get(self, request, institution_id, template_id):
        try:
            DocumentTemplate.objects.get(pk=template_id)
        except DocumentTemplate.DoesNotExist:
            return Response(
                {"error": "Document template not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        content_type = ContentType.objects.get_for_model(DocumentTemplate)
        audit_logs = (
            AuditLog.objects.filter(content_type=content_type, object_id=template_id)
            .select_related("user")
            .order_by("-timestamp")
        )

        response_data = [
            {
                "id": log.id,
                "action": log.action,
                "user": log.user.username if log.user else None,
                "timestamp": log.timestamp.isoformat(),
                "changes": log.changes,
                "description": log.description,
            }
            for log in audit_logs
        ]
        return Response(response_data, status=status.HTTP_200_OK)


class BaseDocumentView(APIView):
    def _normalize_placeholder(self, placeholder):
        """Normalize placeholder to snake_case {{variable_name}} format, removing apostrophes."""
        cleaned_name = re.sub(r"[\{\}<>\[\]]+", "", placeholder).strip()
        normalized_name = re.sub(r"\s+", "_", cleaned_name.replace("'", "")).lower()
        return f"{{{{{normalized_name}}}}}" if normalized_name else placeholder

    def _replace_placeholders(self, content, placeholder_values, template_type="text"):
        """Replace all placeholder formats in content with values, supporting HTML and LaTeX."""
        if not content:
            return ""

        preview = content
        normalized_values = {
            re.sub(r"\s+", "_", k.replace("'", "")).lower(): v
            for k, v in placeholder_values.items()
            if v is not None
        }

        # Define placeholder patterns
        placeholder_patterns = [
            r"\{\{[\w\s\'-]+\}\}",  # {{variable_name}} or {{Employee's Name}}
            r"\{[\w\s\'-]+\}",      # {variable_name} or {Employee's Name}
            r"\[\[[\w\s\'-]+\]\]",  # [[variable_name]] or [[Employee's Name]]
            r"\[[\w\s\'-]*\w+\]",   # [variable_name] or [Parent]
            r"<<[\w\s\'-]+>>",      # <<variable_name>> or <<Employee's Name>>
            r"<[\w\s\'-]+>",        # <variable_name> or <Employee's Name>
            r"([\w\s\'-]+?)\s*:?\s*_{10,}",  # Phrase: __________
        ]
        combined_pattern = "|".join(f"({pattern})" for pattern in placeholder_patterns)
        all_matches = re.findall(combined_pattern, preview, re.IGNORECASE)
        matches = [match for match_tuple in all_matches for match in match_tuple if match]

        # Process each match
        for match in matches:
            if re.match(r"([\w\s\'-]+?)\s*:?\s*_{10,}", match, re.IGNORECASE):
                # Handle underscore placeholders (e.g., "Name: ________")
                phrase = re.match(r"([\w\s\'-]+?)\s*:?\s*_{10,}", match, re.IGNORECASE).group(1).strip()
                normalized_key = re.sub(r"\s+", "_", phrase.replace("'", "")).lower()
                value = normalized_values.get(normalized_key, "__________")
                replacement = f"{phrase}: {value}"
                preview = re.sub(re.escape(match), replacement, preview, count=1)
            else:
                # Handle other placeholder formats
                normalized_key = re.sub(r"[\{\}<>\[\]]+", "", match).strip()
                normalized_key = re.sub(r"\s+", "_", normalized_key.replace("'", "")).lower()
                value = normalized_values.get(normalized_key, match)
                if template_type == "text":
                    # For LaTeX, replace directly
                    preview = preview.replace(match, str(value))
                else:
                    # For HTML, escape < and > to prevent tag confusion
                    if match.startswith("<") and match.endswith(">"):
                        escaped_match = match.replace("<", "&lt;").replace(">", "&gt;")
                        preview = preview.replace(match, str(value))
                    else:
                        preview = preview.replace(match, str(value))

        # Handle special case placeholders (e.g., "initials: __________")
        special_keys = ["initials", "signature", "days", "state"]
        for key in special_keys:
            if key in normalized_values:
                preview = re.sub(
                    rf"(?i){key}\s*:?\s*_{{10,}}",
                    f"{key.title()}: {normalized_values[key]}",
                    preview,
                    count=1,
                )

        return preview


class GenerateDocumentView(BaseDocumentView):
    @extend_schema(
        tags=["Document Generation"],
        parameters=[
            OpenApiParameter(
                name="context",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                enum=["onboarding", "employee", "leave", "pip"],
                description="The context for document generation (e.g., onboarding, employee, leave, pip)",
            ),
            OpenApiParameter(
                name="context_id",
                type=int,
                location=OpenApiParameter.QUERY,
                required=True,
                description="The ID of the context record (e.g., OnBoarding ID, Employee ID, PIP ID)",
            ),
        ],
        responses={
            200: GenerateDocumentResponseSerializer,
            400: {"description": "Invalid input or missing required parameters"},
            404: {"description": "Template or context record not found"},
        },
        description="Fetches placeholders for a document template with pre-filled values based on context. If no template_id is provided and context is 'pip', uses default PIP template.",
    )
    def get(self, request, template_id=None):
        context = request.query_params.get("context")
        context_id = request.query_params.get("context_id")
        if not context or not context_id:
            return Response(
                {"error": "context and context_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle template selection
        if template_id is None and context == "pip":
            template_file_path = os.path.join(settings.BASE_DIR, 'templates', 'documents', 'default_pip_template.tex')
            try:
                with open(template_file_path, 'r') as file:
                    template_content = file.read()
                template = DocumentTemplate.objects.filter(name="Default PIP Template").first()
                # Use serializer to extract placeholders
                serializer = DocumentTemplateSerializer(data={
                    "name": "Default PIP Template",
                    "content": template_content,
                    "template_type": "text",
                    "document_type": None  # Adjust as needed
                })
                serializer.is_valid(raise_exception=True)
                placeholders = serializer._extract_placeholders(template_content, template_type="text")
                if not template:
                    template = DocumentTemplate.objects.create(
                        name="Default PIP Template",
                        content=template_content,
                        placeholders=placeholders,
                        template_type="text"
                    )
                else:
                    template.content = template_content
                    template.placeholders = placeholders
                    template.template_type = "text"
                    template.save()
            except FileNotFoundError:
                return Response(
                    {"error": "Default PIP template file not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif template_id is not None:
            template = get_object_or_404(DocumentTemplate, pk=template_id)
        else:
            return Response(
                {"error": "template_id is required for non-pip contexts"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        template_placeholders = template.placeholders or []
        system_config = SystemConfiguration.objects.filter(code="doc_required_fields").first()
        required_placeholders = system_config.content if system_config else []
        required_placeholders = [ph for ph in required_placeholders if ph in template_placeholders]
        clean_template_placeholders = [p.strip("{}").lower() for p in template_placeholders]
        all_placeholders = list(set(clean_template_placeholders + required_placeholders))

        known_values = {}
        if context == "pip":
            pip = get_object_or_404(PerformanceImprovementPlan, pk=context_id)
            issues = [issue.description for issue in pip.issues.all()] if pip.issues.exists() else ["", ""]
            support_resources = [resource.description for resource in pip.support_resources.all()] if pip.support_resources.exists() else ["", ""]
            known_values = {
                "employee_name": (
                    pip.employee.user.fullname if hasattr(pip.employee.user, "fullname") else ""
                ),
                "position": (
                    pip.employee.job_position.title if hasattr(pip.employee, "job_position") else ""
                ),
                "department": (
                    pip.employee.department.name if hasattr(pip.employee, "department") else ""
                ),
                "supervisor": (
                    pip.employee.job_position.reports_to.name if hasattr(pip.employee, "supervisor") else ""
                ),
                "date_issued": str(pip.start_date) if pip.start_date else "",
                "review_period": f"{pip.start_date} to {pip.end_date}" if pip.start_date and pip.end_date else "",
                "concern_1": issues[0] if len(issues) > 0 else "",
                "concern_2": issues[1] if len(issues) > 1 else "",
                "support_resource_1": support_resources[0] if len(support_resources) > 0 else "",
                "support_resource_2": support_resources[1] if len(support_resources) > 1 else "",
                "support_resource_3": support_resources[2] if len(support_resources) > 2 else "",
                "reviewer_role": "Supervisor",
                "consequences": "Failure to meet objectives may result in further disciplinary action."
            }
        elif context == "onboarding":
            onboarding = get_object_or_404(OnBoarding, pk=context_id)
            known_values = {
                "fullname": (
                    onboarding.application.applicant_name
                    if onboarding.application
                    else ""
                ),
                "salary": (
                    str(
                        onboarding.application.job_position_advert.job_position.salary_min
                    )
                    if onboarding.application.job_position_advert.job_position.salary_min
                    else ""
                ),
                "date": str(timezone.now().date()),
            } 
        elif context == "employee":
            employee = get_object_or_404(Employee, pk=context_id)
            known_values = {
                "fullname": (
                    employee.user.fullname if hasattr(employee.user, "fullname") else ""
                ),
                "salary": str(employee.salary) if hasattr(employee, "salary") else "",
                "date": str(timezone.now().date()),
            }       

        placeholder_data = {
            ph: {"value": known_values.get(ph, "")} for ph in all_placeholders
        }
        serializer = GenerateDocumentResponseSerializer(
            {"placeholders": placeholder_data, "template_id": template.id}
        )
        return Response(serializer.data)

    @extend_schema(
        tags=["Document Generation"],
        request=GenerateDocumentRequestSerializer,
        responses={
            201: {
                "description": "Document created successfully",
                "properties": {
                    "status": {"type": "string"},
                    "document_id": {"type": "integer"},
                },
            },
            400: {"description": "Invalid input or missing required placeholders"},
            404: {"description": "Template or context record not found"},
        },
        description="Creates a new document with provided placeholder values. If no template_id is provided and context is 'pip', uses default PIP template.",
    )
    @transaction.atomic()
    def post(self, request, template_id=None):
        context = request.data.get("context")
        context_id = request.data.get("context_id")
        if not context or not context_id:
            return Response(
                {"error": "context and context_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if template_id is None and context == "pip":
            template_file_path = os.path.join(settings.BASE_DIR, 'templates', 'documents', 'default_pip_template.tex')
            try:
                with open(template_file_path, 'r') as file:
                    template_content = file.read()
                serializer = DocumentTemplateSerializer(data={
                    "name": "Default PIP Template",
                    "content": template_content,
                    "template_type": "text",
                    "document_type": None
                })
                serializer.is_valid(raise_exception=True)
                placeholders = serializer._extract_placeholders(template_content, template_type="text")
                template = DocumentTemplate.objects.filter(name="Default PIP Template").first()
                if not template:
                    template = DocumentTemplate.objects.create(
                        name="Default PIP Template",
                        content=template_content,
                        placeholders=placeholders,
                        template_type="text"
                    )
                else:
                    template.content = template_content
                    template.placeholders = placeholders
                    template.template_type = "text"
                    template.save()
            except FileNotFoundError:
                return Response(
                    {"error": "Default PIP template file not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif template_id is not None:
            template = get_object_or_404(DocumentTemplate, pk=template_id)
        else:
            return Response(
                {"error": "template_id is required for non-pip contexts"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = GenerateDocumentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        placeholder_values = serializer.validated_data["placeholders"]
        flattened_placeholders = {
            k: v.get("value", "") if isinstance(v, dict) else v
            for k, v in placeholder_values.items()
        }
        flattened_placeholders["context"] = context

        document = Document.objects.create(
            document_template=template,
            placeholder_values=flattened_placeholders,
            status="pending",
        )

        if context == "onboarding" and context_id:
            try:
                onboarding = OnBoarding.objects.get(pk=context_id)
                onboarding.status = "contract_review"
                onboarding.save()
            except OnBoarding.DoesNotExist:
                return Response(
                    {"error": "OnBoarding record not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response(
            {"status": "success", "document_id": document.pk},
            status=status.HTTP_201_CREATED,
        )



class DocumentContentPreviewView(BaseDocumentView):
    @extend_schema(
        tags=["Document Generation"],
        responses={
            200: DocumentContentPreviewSerializer,
            404: {"description": "Document or template not found"},
        },
        description="Generates a preview of the document content by replacing placeholders with stored values, using the document's associated template.",
    )
    def get(self, request, document_id):
        document = get_object_or_404(Document, pk=document_id)
        template = document.document_template
        
        if not template:
            return Response(
                {"error": "No template associated with the document"},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        template_content = template.content or ""
        if not template_content and template.name == "Default PIP Template":
            template_file_path = os.path.join(settings.BASE_DIR, 'templates', 'documents', 'default_pip_template.tex')
            try:
                with open(template_file_path, 'r') as file:
                    template_content = file.read()
                serializer = DocumentTemplateSerializer(data={
                    "name": "Default PIP Template",
                    "content": template_content,
                    "template_type": "text",
                    "document_type": None
                })
                serializer.is_valid(raise_exception=True)
                placeholders = serializer._extract_placeholders(template_content, template_type="text")
                template.content = template_content
                template.placeholders = placeholders
                template.template_type = "text"
                template.save()
            except FileNotFoundError:
                return Response(
                    {"error": "Default PIP template file not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif not template_content:
            return Response(
                {"error": "Template content is empty"},
                status=status.HTTP_404_NOT_FOUND,
            )

        placeholder_values = document.placeholder_values or {}
        preview = self._replace_placeholders(template_content, placeholder_values, template_type=template.template_type)
        serializer = DocumentContentPreviewSerializer({"preview": preview})
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentStatusUpdateView(BaseDocumentView):
    def _generate_pdf(self, content, placeholder_values, context):
        """Generate a PDF from content, using WeasyPrint for HTML or latexmk for LaTeX based on context."""
        logger.debug(f"Generating PDF with content length: {len(content)}")
        rendered_content = self._replace_placeholders(content, placeholder_values)

        if context == "pip":
            # Handle LaTeX content for PIP documents
            try:
                with tempfile.NamedTemporaryFile(suffix=".tex", delete=False) as temp_tex:
                    temp_tex.write(rendered_content.encode('utf-8'))
                    temp_tex_path = temp_tex.name

                # Run latexmk to generate PDF
                output_dir = tempfile.mkdtemp()
                pdf_path = os.path.join(output_dir, "output.pdf")
                cmd = ["latexmk", "-pdf", "-interaction=nonstopmode", f"-output-directory={output_dir}", temp_tex_path]
                subprocess.run(cmd, check=True, capture_output=True)

                with open(pdf_path, 'rb') as pdf_file:
                    pdf_content = pdf_file.read()
                
                # Clean up temporary files
                subprocess.run(["latexmk", "-C", "-output-directory={output_dir}"])
                os.remove(temp_tex_path)
                os.rmdir(output_dir)

                logger.info("LaTeX PDF generated successfully")
                return pdf_content
            except subprocess.CalledProcessError as e:
                logger.error(f"Error generating LaTeX PDF: {e.stderr.decode()}")
                raise
            except Exception as e:
                logger.error(f"Error generating LaTeX PDF: {str(e)}")
                raise
        else:
            # Handle HTML content for other contexts
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Document</title>
                <style>
                    @page {{
                        size: A4 portrait;
                        margin: 2cm 2.5cm 2cm 2.5cm;
                    }}
                    body {{
                        font-family: Arial, sans-serif;
                        font-size: 12pt;
                        margin: 35px;
                        text-align: left;
                    }}
                    p {{
                        text-align: left;
                        margin: 0 0 10pt 0;
                    }}
                    h1, h2, h3 {{
                        font-weight: bold;
                        margin: 12pt 0 6pt 0;
                        page-break-after: avoid;
                    }}
                    h1 {{ font-size: 14pt; }}
                    h2 {{ font-size: 12pt; }}
                </style>
            </head>
            <body>
                {rendered_content}
            </body>
            </html>
            """

            try:
                pdf_file = HTML(string=html_content).write_pdf()
                logger.info("HTML PDF generated successfully")
                return pdf_file
            except Exception as e:
                logger.error(f"Error generating HTML PDF: {str(e)}")
                raise

    def _get_email_values(self, placeholder_values, context, context_obj):
        """Derive email values based on context and context object."""
        email_values = {
            "due_date": str(timezone.now().date() + timedelta(days=7)),
            "hr_email": getattr(settings, "HR_EMAIL", settings.DEFAULT_FROM_EMAIL),
        }

        def get_salutation(gender, name=""):
            """Generate appropriate salutation based on gender."""
            if not gender:
                return f"Dear {name}" if name else "Dear Sir/Madam"
            
            gender_lower = gender.lower()
            if gender_lower in ['male', 'm']:
                return f"Dear Mr. {name}" if name else "Dear Sir"
            elif gender_lower in ['female', 'f']:
                return f"Dear Ms. {name}" if name else "Dear Madam"
            else:
                return f"Dear {name}" if name else "Dear Sir/Madam"

        if context == "onboarding":
            job_position = (
                context_obj.application.job_position_advert.job_position
                if context_obj.application
                and context_obj.application.job_position_advert
                else None
            )
            gender = None
            employee_name = ""
            if context_obj.application:
                employee_name = context_obj.application.applicant_name or ""
                if hasattr(context_obj.application, 'applicant') and context_obj.application.applicant:
                    gender = getattr(context_obj.application.applicant, 'gender', None)
                elif hasattr(context_obj.application, 'user') and context_obj.application.user:
                    gender = getattr(context_obj.application.user, 'gender', None)
            
            email_values.update(
                {
                    "employee_name": employee_name,
                    "salutation": get_salutation(gender, employee_name.split()[0] if employee_name else ""),
                    "position_title": job_position.name if job_position else "",
                    "institution_name": (
                        context_obj.application.job_position_advert.job_position.department.institution.institution_name
                        if context_obj.application
                        and context_obj.application.job_position_advert
                        and context_obj.application.job_position_advert.job_position
                        and context_obj.application.job_position_advert.job_position.department
                        else ""
                    ),
                }
            )
        elif context == "employee":
            gender = None
            employee_name = ""
            if hasattr(context_obj, "user") and context_obj.user:
                employee_name = context_obj.user.fullname or ""
                gender = getattr(context_obj.user, 'gender', None)
            
            email_values.update(
                {
                    "employee_name": employee_name,
                    "salutation": get_salutation(gender, employee_name.split()[0] if employee_name else ""),
                    "position_title": (
                        context_obj.job_position.name
                        if hasattr(context_obj, "job_position")
                        else ""
                    ),
                }
            )
        elif context == "pip":
            gender = None
            employee_name = ""
            if hasattr(context_obj, "employee") and hasattr(context_obj.employee, "user"):
                employee_name = context_obj.employee.user.fullname or ""
                gender = getattr(context_obj.employee.user, 'gender', None)
            
            email_values.update(
                {
                    "employee_name": employee_name,
                    "salutation": get_salutation(gender, employee_name.split()[0] if employee_name else ""),
                    "start_date": str(context_obj.start_date) if context_obj.start_date else "",
                    "end_date": str(context_obj.end_date) if context_obj.end_date else "",
                    "issues": (
                        ", ".join([issue.description for issue in context_obj.issues.all()])
                        if context_obj.issues.exists()
                        else ""
                    ),
                    "objectives": (
                        ", ".join([objective.description for objective in context_obj.objectives.all()])
                        if context_obj.objectives.exists()
                        else ""
                    ),
                    "consequences": context_obj.consequences or "",
                }
            )
        elif context == "leave":
            gender = None
            employee_name = ""
            if hasattr(context_obj, "employee") and hasattr(context_obj.employee, "user"):
                employee_name = context_obj.employee.user.fullname or ""
                gender = getattr(context_obj.employee.user, 'gender', None)
            
            email_values.update(
                {
                    "employee_name": employee_name,
                    "salutation": get_salutation(gender, employee_name.split()[0] if employee_name else ""),
                    "leave_type": (
                        context_obj.leave_type
                        if hasattr(context_obj, "leave_type")
                        else ""
                    ),
                    "start_date": (
                        str(context_obj.start_date)
                        if hasattr(context_obj, "start_date")
                        else ""
                    ),
                    "end_date": (
                        str(context_obj.end_date)
                        if hasattr(context_obj, "end_date")
                        else ""
                    ),
                }
            )

        for key in email_values:
            if key in placeholder_values:
                email_values[key] = placeholder_values[key].get("value", "") if isinstance(placeholder_values[key], dict) else placeholder_values[key]
        
        logger.debug(f"Email values for {context}: {email_values}")
        return email_values

    def _get_context_object(self, context, context_id):
        """Retrieve the context object based on context type and ID."""
        if context == "onboarding":
            return get_object_or_404(OnBoarding, pk=context_id)
        elif context == "employee":
            return get_object_or_404(Employee, pk=context_id)
        elif context == "pip":
            return get_object_or_404(PerformanceImprovementPlan, pk=context_id)

        raise ValueError("Invalid context")

    @extend_schema(
    tags=["Document Generation"],
    parameters=[
        OpenApiParameter(
            name="context",
            type=str,
            location=OpenApiParameter.QUERY,
            required=True,
            enum=["onboarding", "employee", "leave", "pip"],
            description="The context for document generation",
        ),
        OpenApiParameter(
            name="context_id",
            type=int,
            location=OpenApiParameter.QUERY,
            required=True,
            description="The ID of the context record",
        ),
    ],
    request=DocumentStatusUpdateSerializer,
    responses={
        200: DocumentContentPreviewSerializer,
        400: {"description": "Invalid input or missing required placeholders"},
        404: {"description": "Document or context record not found"},
    },
    description="Updates document status, sends PDF email, and creates context-specific records if status is reviewed. For PIP context, generates LaTeX-based PDF and uses PIP-specific email templates.",
    )
    @transaction.atomic()
    def patch(self, request, document_id):
        context = request.query_params.get("context")
        context_id = request.query_params.get("context_id")
        if not context or not context_id:
            return Response(
                {"error": "context and context_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document = get_object_or_404(Document, pk=document_id)
        serializer = DocumentStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data["status"]
        placeholder_values = document.placeholder_values or {}

        document.status = new_status
        document.save()

        try:
            context_obj = self._get_context_object(context, context_id)
        except ValueError:
            return Response(
                {"error": "Invalid context"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Context record not found: {str(e)}"},
                status=status.HTTP_404_NOT_FOUND,
            )

        template = document.document_template
        if not template:
            return Response(
                {"error": "No template associated with the document"},
                status=status.HTTP_404_NOT_FOUND,
            )

        template_content = template.content or ""
        if not template_content and template.name == "Default PIP Template":
            template_file_path = os.path.join(settings.BASE_DIR, 'templates', 'documents', 'default_pip_template.tex')
            try:
                with open(template_file_path, 'r') as file:
                    template_content = file.read()
                template.content = template_content
                template.save()
            except FileNotFoundError:
                return Response(
                    {"error": "Default PIP template file not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif not template_content:
            return Response(
                {"error": "Template content is empty"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            context == "onboarding"
            and hasattr(context_obj, "application")
            and context_obj.application.job_position_advert
        ):
            job_position = context_obj.application.job_position_advert.job_position
            template_content = (
                job_position.contract_template.content
                if job_position and job_position.contract_template
                else template_content
            )
        elif context == "employee" and hasattr(context_obj, "job_position"):
            template_content = (
                context_obj.job_position.contract_template.content
                if context_obj.job_position
                and context_obj.job_position.contract_template
                else template_content
            )

        if new_status == "reviewed":
            try:
                email_values = self._get_email_values(
                    placeholder_values, context, context_obj
                )
                pdf_content = self._generate_pdf(template_content, placeholder_values, context)
                # Use a descriptive filename for PIP context
                pdf_filename = (
                    f"Performance_Improvement_Plan_{email_values.get('employee_name', 'Employee').replace(' ', '_')}.pdf"
                    if context == "pip"
                    else f"document_{context}_{document.pk}.pdf"
                )
                document_file = ContentFile(pdf_content, name=pdf_filename)

                if context == "onboarding":
                    employee_contract = EmployeeContract.objects.create(
                        applicant=context_obj.application,
                        is_active=False,
                        original_contract=document_file,
                    )
                    context_obj.status = "issued_contract"
                    context_obj.save()
                elif context == "employee":
                    employee_contract = EmployeeContract.objects.create(
                        employee=context_obj,
                        is_active=False,
                        original_contract=document_file,
                    )
                    context_obj.status = "issued_contract"
                    context_obj.save()
                elif context == "pip":
                    document.original_file = document_file
                    document.save()
                elif context == "leave":
                    pass

                recipient_email = None
                if context == "onboarding" and hasattr(context_obj, "application"):
                    recipient_email = getattr(
                        context_obj.application, "applicant_email", None
                    )
                elif context == "employee" and hasattr(context_obj, "email"):
                    recipient_email = context_obj.email
                elif context == "pip" and hasattr(context_obj.employee, "user"):
                    recipient_email = getattr(context_obj.employee.user, "email", None)
                elif context == "leave" and hasattr(context_obj.employee, "email"):
                    recipient_email = context_obj.employee.email

                if recipient_email:
                    try:
                        # Use PIP-specific templates for pip context
                        email_template_html = (
                            "emails/pip_email.html" if context == "pip" else "emails/contract_email.html"
                        )
                        email_template_txt = (
                            "emails/pip_email.txt" if context == "pip" else "emails/contract_email.txt"
                        )
                        html_message = render_to_string(email_template_html, email_values)
                        text_message = render_to_string(email_template_txt, email_values)
                        email = EmailMultiAlternatives(
                            subject=f"Your {context.capitalize()} Document",
                            body=text_message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            to=[recipient_email],
                        )
                        email.attach_alternative(html_message, "text/html")
                        email.attach(pdf_filename, pdf_content, "application/pdf")
                        email.send(fail_silently=False)
                        logger.info(f"Email sent to {recipient_email}")
                    except Exception as e:
                        logger.error(f"Error sending {context} email: {str(e)}")
                        raise

            except Exception as e:
                logger.error(f"Error processing {context} document: {str(e)}")
                return Response(
                    {"error": f"Error processing document: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        preview = self._replace_placeholders(template_content, placeholder_values)
        serializer = DocumentContentPreviewSerializer({"preview": preview})
        return Response(serializer.data, status=status.HTTP_200_OK)
