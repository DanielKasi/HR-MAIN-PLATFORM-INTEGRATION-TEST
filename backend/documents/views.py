from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
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
from employee.models import EmployeeContract
import logging

# Set up logging
logger = logging.getLogger(__name__)


class DocumentTypeListCreateAPIView(APIView):

    @extend_schema(
        description="Retrieve a paginated list of document types for a given institution.",
        responses={200: DocumentTypeSerializer(many=True)},
    )
    def get(self, request, institution_id):
        queryset = DocumentType.objects.filter(institution_id=institution_id).order_by(
            "-created_at"
        )
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = DocumentTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        description="Create a new document type for the given institution. The code is auto-generated from the name.",
        request=DocumentTypeSerializer,
        responses={201: DocumentTypeSerializer},
    )
    def post(self, request, institution_id):
        data = request.data.copy()
        data["institution"] = institution_id
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
    def patch(self, request, pk):
        document_type = self.get_object(pk)
        if not document_type:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = DocumentTypeSerializer(
            document_type, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description="Delete a document type", responses={204: None, 404: None}
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
        tags=["Document Templates"],
    )
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
        try:
            Institution.objects.get(pk=institution_id)
        except Institution.DoesNotExist:
            return Response(
                {"error": "Institution not found"}, status=status.HTTP_404_NOT_FOUND
            )

        templates = DocumentTemplate.objects.filter(
            document_type__institution=institution_id
        ).order_by("-created_at")
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
    def patch(self, request, pk):
        template = self.get_object(pk)
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
        template.delete()
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


class GenerateDocumentView(APIView):
    @extend_schema(
        tags=["Document Generation"],
        parameters=[
            OpenApiParameter(
                name="context",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                enum=["onboarding", "employee", "leave"],
                description="The context for document generation (e.g., onboarding, employee, leave)",
            ),
            OpenApiParameter(
                name="context_id",
                type=int,
                location=OpenApiParameter.QUERY,
                required=True,
                description="The ID of the context record (e.g., OnBoarding ID, Employee ID)",
            ),
        ],
        responses={
            200: GenerateDocumentResponseSerializer,
            404: {"description": "Template or context record not found"},
        },
        description="Fetches placeholders for a document template with pre-filled values based on context",
    )
    def get(self, request, template_id):
        # Fetch the document template
        template = get_object_or_404(DocumentTemplate, pk=template_id)
        template_placeholders = template.placeholders or []

        # Get system configuration for required fields
        system_config = SystemConfiguration.objects.filter(
            code="doc_required_fields"
        ).first()
        required_placeholders = system_config.content if system_config else []

        # remove placeholders from required_placeholders that are not in template_placeholders 
        required_placeholders = [
            ph for ph in required_placeholders if ph in template_placeholders
        ]
        

        # Combine placeholders (remove duplicates, preserve template formatting for non-required placeholders)
        # Convert template placeholders to clean format (strip {{}})
        clean_template_placeholders = [p.strip("{}") for p in template_placeholders]
        # Ensure all required placeholders are included, even if not in template
        all_placeholders = list(
            set(clean_template_placeholders + required_placeholders)
        )

        # Get context and context_id from query params
        context = request.query_params.get("context")
        context_id = request.query_params.get("context_id")

        if not context or not context_id:
            return Response(
                {"error": "context and context_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Dynamic value mapping based on context
        known_values = {}
        if context == "onboarding":
            onboarding = get_object_or_404(OnBoarding, pk=context_id)
            known_values = {
                "FULLNAME": (
                    onboarding.application.applicant_name
                    if onboarding.application
                    else ""
                ),
                "SALARY": (
                    str(onboarding.application.job_position_advert.job_position.salary)
                    if onboarding.application.job_position_advert.job_position.salary
                    else ""
                ),
                "DATE": str(datetime.now().date()),
            }
        elif context == "employee":
            employee = get_object_or_404(Employee, pk=context_id)
            known_values = {
                "FULLNAME": (
                    employee.user.fullname if hasattr(employee.user, "fullname") else ""
                ),
                "SALARY": str(employee.salary) if hasattr(employee, "salary") else "",
                "DATE": str(datetime.now().date()),
            }
        elif context == "leave":
            leave = get_object_or_404(Leave, pk=context_id)
            known_values = {
                "FULLNAME": (
                    leave.employee.fullname
                    if hasattr(leave.employee, "fullname")
                    else ""
                ),
                "DATE": str(datetime.now().date()),
            }
        else:
            return Response(
                {"error": "Invalid context"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Construct placeholder data
        placeholder_data = {}
        for placeholder in all_placeholders:
            value = known_values.get(placeholder, "")
            placeholder_data[placeholder] = {"value": value}

        serializer = GenerateDocumentResponseSerializer(
            {"placeholders": placeholder_data, "template_id": template_id}
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
        description="Creates a new document with the provided placeholder values and updates OnBoarding status to contract_review if context is onboarding",
    )
    def post(self, request, template_id):
        # Fetch the document template
        template = get_object_or_404(DocumentTemplate, pk=template_id)

        # Get system configuration for required fields
        system_config = SystemConfiguration.objects.filter(
            code="doc_required_fields"
        ).first()
        required_placeholders = system_config.content if system_config else []

        # Validate input
        serializer = GenerateDocumentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        placeholder_values = serializer.validated_data["placeholders"]
        context = serializer.validated_data.get("context")
        context_id = serializer.validated_data.get("context_id")

        # Validate required placeholders
        for placeholder in required_placeholders:
            if (
                placeholder not in placeholder_values
                or not placeholder_values[placeholder]
            ):
                return Response(
                    {"error": f"Missing required placeholder: {placeholder}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Create Document instance
        document = Document.objects.create(
            document_template=template,
            placeholder_values=placeholder_values,
            status="pending",
        )

        # Update OnBoarding status if context is onboarding
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


class DocumentContentPreviewView(APIView):
    def _normalize_placeholder(self, placeholder):
        """Normalize placeholder to snake_case {{variable_name}} format, removing apostrophes."""
        # Remove delimiters ({{}}, <<>>, [[]], [])
        cleaned_name = re.sub(r"[\{\}<>\[\]]+", "", placeholder).strip()
        # Convert to snake_case, remove apostrophes
        normalized_name = re.sub(r"\s+", "_", cleaned_name.replace("'", "")).lower()
        return f"{{{{{normalized_name}}}}}" if normalized_name else placeholder

    def _replace_placeholders(self, content, placeholder_values):
        """Replace all placeholder formats in content with values, handling apostrophes."""
        if not content:
            return ""

        preview = content
        lines = content.split("\n")
        placeholder_values = {
            k.lower(): v for k, v in placeholder_values.items()
        }  # Normalize keys

        # Define placeholder patterns, supporting apostrophes
        placeholder_patterns = [
            r"\{\{[\w\s\'-]+\}\}",  # {{variable_name}} or {{Employee's Name}}
            r"<<[\w\s\'-]+>>",  # <<variable_name>> or <<Employee's Name>>
            r"\[\[[\w\s\'-]+\]\]",  # [[variable_name]] or [[Employee's Name]]
            r"\[[\w\s\'-]+\]",  # [variable_name] or [Employee's Name]
            r"_{10,}",  # ___________________
        ]
        combined_pattern = "|".join(f"({pattern})" for pattern in placeholder_patterns)
        all_matches = re.findall(combined_pattern, content)

        # Flatten matches
        matches = [match for group in all_matches for match in group if match]

        # Handle standard placeholders
        for match in matches:
            if not re.match(r"_{10,}", match):  # Skip underscores
                normalized = self._normalize_placeholder(match)
                normalized_key = normalized.strip("{}").lower()
                value = placeholder_values.get(
                    normalized_key, match
                )  # Keep placeholder if no value
                preview = preview.replace(match, value)

        # Handle underscore placeholders
        for line in lines:
            line_lower = line.lower().strip()
            # Find phrases before underscores, allowing apostrophes
            match = re.search(r"([\w\s\'-]+?)\s*:?\s*_{10,}", line_lower)
            if match:
                phrase = match.group(1).strip()
                normalized_key = re.sub(r"\s+", "_", phrase.replace("'", "")).lower()
                value = placeholder_values.get(normalized_key, None)
                # Replace with value if provided, else keep underscores
                replacement = f"{phrase}: {value}" if value else f"{phrase}: __________"
                preview = re.sub(
                    r"([\w\s\'-]+?)\s*:?\s*_{10,}", replacement, preview, count=1
                )
            # Handle special cases
            if "initials" in line_lower and "initials" in placeholder_values:
                preview = preview.replace("initials", placeholder_values["initials"], 1)
            if "signature" in line_lower and "signature" in placeholder_values:
                preview = preview.replace(
                    "signature", placeholder_values["signature"], 1
                )
            if "days" in line_lower and "days" in placeholder_values:
                preview = preview.replace("days", placeholder_values["days"], 1)
            if "state" in line_lower and "state" in placeholder_values:
                preview = preview.replace("state", placeholder_values["state"], 1)
            # Handle standalone underscores
            if re.search(r"_{10,}", line_lower) and not match:
                preview = re.sub(r"_{10,}", "__________", preview, count=1)

        return preview

    @extend_schema(
        tags=["Document Generation"],
        responses={
            200: DocumentContentPreviewSerializer,
            404: {"description": "Document not found"},
        },
        description="Generates a preview of the document content by replacing placeholders (including those with apostrophes) with stored values, removing underscores when values are provided",
    )
    def get(self, request, document_id):
        # Fetch the document
        document = get_object_or_404(Document, pk=document_id)
        template = document.document_template
        template_content = template.content or ""

        # Get placeholder values
        placeholder_values = document.placeholder_values or {}

        # Generate preview
        preview = self._replace_placeholders(template_content, placeholder_values)

        serializer = DocumentContentPreviewSerializer({"preview": preview})
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentStatusUpdateView(APIView):
    def _replace_placeholders(self, content, placeholder_values):
        """Replace all placeholder formats, removing underscores when values are provided."""
        if not content:
            logger.warning("Template content is empty")
            return ""

        preview = content
        lines = content.split("\n")
        placeholder_values = {k.lower(): v for k, v in placeholder_values.items() if v is not None}
        logger.debug(f"Placeholder values: {placeholder_values}")

        placeholder_patterns = [
            r'\{\{[\w\s\'-]+\}\}',  # {{variable_name}} or {{Employee's Name}}
            r'<<[\w\s\'-]+>>',      # <<variable_name>> or <<Employee's Name>>
            r'\[\[[\w\s\'-]+\]\]',  # [[variable_name]] or [[Employee's Name]]
            r'\[[\w\s\'-]+\]',      # [variable_name] or [Employee's Name]
            r'_{10,}',              # ___________________
        ]
        combined_pattern = '|'.join(f'({pattern})' for pattern in placeholder_patterns)
        all_matches = re.findall(combined_pattern, content)
        matches = [match for group in all_matches for match in group if match]
        logger.debug(f"Found placeholders: {matches}")

        for match in matches:
            if not re.match(r'_{10,}', match):
                cleaned_name = re.sub(r'[\{\}<>\[\]]+', '', match).strip()
                normalized_key = re.sub(r'\s+', '_', cleaned_name.replace("'", "")).lower()
                value = placeholder_values.get(normalized_key, match)
                logger.debug(f"Replacing {match} with {value}")
                preview = preview.replace(match, str(value))

        for line in lines:
            line_lower = line.lower().strip()
            match = re.search(r'([\w\s\'-]+?)\s*:?\s*_{10,}', line_lower)
            if match:
                phrase = match.group(1).strip()
                normalized_key = re.sub(r'\s+', '_', phrase.replace("'", "")).lower()
                value = placeholder_values.get(normalized_key, None)
                replacement = f"{phrase}: {value}" if value is not None else f"{phrase}: __________"
                logger.debug(f"Replacing underscore in '{line}' with '{replacement}'")
                preview = re.sub(r'([\w\s\'-]+?)\s*:?\s*_{10,}', replacement, preview, count=1)
            if "initials" in line_lower and "initials" in placeholder_values:
                value = placeholder_values.get("initials", None)
                replacement = str(value) if value is not None else "__________"
                preview = re.sub(r'initials\s*:?\s*_{10,}', f"initials: {replacement}", preview, count=1)
            if "signature" in line_lower and "signature" in placeholder_values:
                value = placeholder_values.get("signature", None)
                replacement = str(value) if value is not None else "__________"
                preview = re.sub(r'signature\s*:?\s*_{10,}', f"signature: {replacement}", preview, count=1)
            if "days" in line_lower and "days" in placeholder_values:
                value = placeholder_values.get("days", None)
                replacement = str(value) if value is not None else "__________"
                preview = re.sub(r'days\s*:?\s*_{10,}', f"days: {replacement}", preview, count=1)
            if "state" in line_lower and "state" in placeholder_values:
                value = placeholder_values.get("state", None)
                replacement = str(value) if value is not None else "__________"
                preview = re.sub(r'state\s*:?\s*_{10,}', f"state: {replacement}", preview, count=1)
            if re.search(r'_{10,}', line_lower) and not match:
                preview = re.sub(r'_{10,}', "__________", preview, count=1)

        return preview

    def _generate_pdf(self, content, placeholder_values):
        """Generate a PDF from content using weasyprint."""
        logger.debug(f"Generating PDF with content: {content[:100]}... and placeholders: {placeholder_values}")
        rendered_content = self._replace_placeholders(content, placeholder_values)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 20px; }}
                h1 {{ color: #003087; }}
            </style>
        </head>
        <body>
            <h1>Document</h1>
            <pre>{rendered_content}</pre>
        </body>
        </html>
        """
        try:
            pdf_file = HTML(string=html_content).write_pdf()
            logger.info("PDF generated successfully")
            return pdf_file
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            raise

    def _get_email_values(self, placeholder_values, context, context_obj):
        """Derive email values based on context and context object, with placeholder_values overrides."""
        email_values = {
            'due_date': str(datetime.now().date() + timedelta(days=7)),
            'hr_email': getattr(settings, 'HR_EMAIL', settings.DEFAULT_FROM_EMAIL),
        }

        if context == 'onboarding':
            onboarding = context_obj
            job_position = (onboarding.application.job_position_advert.job_position
                           if onboarding.application and onboarding.application.job_position_advert else None)
            email_values.update({
                'employee_name': onboarding.application.applicant_name if onboarding.application else '',
                'position_title': job_position.name if job_position else '',
                'institution_name': (onboarding.application.job_position_advert.job_position.department.institution.institution_name
                                    if onboarding.application and onboarding.application.job_position_advert and
                                    onboarding.application.job_position_advert.job_position and
                                    onboarding.application.job_position_advert.job_position.department else ''),
            })
        elif context == 'employee':
            employee = context_obj
            email_values.update({
                'employee_name': employee.user.fullname if hasattr(employee, 'user') else '',
                'position_title': employee.job_position.name if hasattr(employee, 'job_position') else '',
            })
        elif context == 'leave':
            leave = context_obj
            email_values.update({
                'employee_name': leave.employee.user.fullname if hasattr(leave.employee, 'user') else '',
                'leave_type': leave.leave_type if hasattr(leave, 'leave_type') else '',
                'start_date': str(leave.start_date) if hasattr(leave, 'start_date') else '',
                'end_date': str(leave.end_date) if hasattr(leave, 'end_date') else '',
            })

        for key in email_values:
            if key in placeholder_values:
                email_values[key] = placeholder_values[key]
        logger.debug(f"Email values for {context}: {email_values}")
        return email_values

    def _get_context_object(self, context, context_id):
        """Retrieve the context object based on context type and ID."""
        if context == 'onboarding':
            return get_object_or_404(OnBoarding, pk=context_id)
        elif context == 'employee':
            return get_object_or_404(Employee, pk=context_id)
        elif context == 'leave':
            return get_object_or_404(Leave, pk=context_id)
        else:
            raise ValueError('Invalid context')

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
                description='The ID of the context record (e.g., OnBoarding ID, Employee ID, Leave ID)'
            ),
        ],
        request=DocumentStatusUpdateSerializer,
        responses={
            200: DocumentContentPreviewSerializer,
            400: {'description': 'Invalid input or missing required placeholders'},
            404: {'description': 'Document or context record not found'}
        },
        description='Updates the status of a document, sends PDF email, and creates context-specific records (e.g., EmployeeContract for onboarding) if status is reviewed'
    )
    def patch(self, request, document_id):
        # Validate query parameters
        context = request.query_params.get('context')
        context_id = request.query_params.get('context_id')
        if not context or not context_id:
            return Response(
                {'error': 'context and context_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch document and validate serializer
        document = get_object_or_404(Document, pk=document_id)
        serializer = DocumentStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data['status']
        placeholder_values = document.placeholder_values or {}
        system_config = SystemConfiguration.objects.filter(code='doc_required_fields').first()
        required_placeholders = system_config.content if system_config else []

        # Validate required placeholders
        for placeholder in required_placeholders:
            if placeholder not in placeholder_values or not placeholder_values[placeholder]:
                return Response(
                    {'error': f'Missing required placeholder: {placeholder}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Update document status
        document.status = new_status
        document.save()

        # Fetch context object
        try:
            context_obj = self._get_context_object(context, context_id)
        except ValueError:
            return Response(
                {'error': 'Invalid context'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Context record not found: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Determine template content based on context
        template = document.document_template
        template_content = template.content or ''
        if context == 'onboarding' and hasattr(context_obj, 'application') and context_obj.application.job_position_advert:
            job_position = context_obj.application.job_position_advert.job_position
            template_content = (job_position.contract_template.content
                               if job_position and job_position.contract_template else template.content)
        # Add more context-specific template logic here if needed for employee or leave

        if new_status == 'reviewed':
            try:
                # Generate email values and PDF
                email_values = self._get_email_values(placeholder_values, context, context_obj)
                pdf_content = self._generate_pdf(template_content, placeholder_values)
                pdf_filename = f"document_{context}_{document.pk}.pdf"
                document_file = ContentFile(pdf_content, name=pdf_filename)

                # Context-specific logic
                if context == 'onboarding':
                    employee_contract = EmployeeContract.objects.create(
                        applicant=context_obj.application,
                        is_active=False,
                        original_contract=document_file
                    )
                    context_obj.status = 'issued_contract'
                    context_obj.save()
                elif context == 'employee':
                    employee_contract = EmployeeContract.objects.create(
                        employee=context_obj,
                        is_active=False,
                        original_contract=document_file
                    )
                    pass
                elif context == 'leave':
                    # Example: Save document to leave record or perform leave-specific action
                    pass

                # Send email if applicable
                recipient_email = None
                if context == 'onboarding' and hasattr(context_obj, 'application'):
                    recipient_email = getattr(context_obj.application, 'applicant_email', None)
                elif context == 'employee' and hasattr(context_obj, 'email'):
                    recipient_email = context_obj.email
                elif context == 'leave' and hasattr(context_obj.employee, 'email'):
                    recipient_email = context_obj.employee.email

                if recipient_email:
                    try:
                        html_message = render_to_string('emails/contract_email.html', email_values)
                        text_message = render_to_string('emails/contract_email.txt', email_values)
                        email = EmailMultiAlternatives(
                            subject=f'Your {context.capitalize()} Document',
                            body=text_message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            to=[recipient_email],
                        )
                        email.attach_alternative(html_message, 'text/html')
                        email.attach(pdf_filename, pdf_content, 'application/pdf')
                        email.send(fail_silently=False)
                        logger.info(f"Email sent to {recipient_email}")
                    except Exception as e:
                        logger.error(f"Error sending {context} email: {str(e)}")
                        raise

            except Exception as e:
                logger.error(f"Error processing {context} document: {str(e)}")
                return Response(
                    {'error': f'Error processing document: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Generate preview
        preview = self._replace_placeholders(template_content, placeholder_values)
        serializer = DocumentContentPreviewSerializer({'preview': preview})
        return Response(serializer.data, status=status.HTTP_200_OK)