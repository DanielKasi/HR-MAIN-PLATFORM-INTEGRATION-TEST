from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import DocumentType, DocumentTemplate
from institution.models import Institution  
from institution.serializers import InstitutionSerializer
import re
from docx import Document
import PyPDF2

class DocumentTypeSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = DocumentType
        fields = ['id', 'institution', 'name', 'code', 'description']
        read_only_fields = ['code']

    def to_representation(self, instance):
        """Override to include institution name in the representation"""
        data = super().to_representation(instance)
        data['institution'] = InstitutionSerializer(instance.institution).data
        return data    


class DocumentTemplateSerializer(serializers.ModelSerializer):
    document_type = serializers.PrimaryKeyRelatedField(queryset=DocumentType.objects.all())

    class Meta:
        model = DocumentTemplate
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def _extract_file_content(self, file, template_type):
        """Extract text content from uploaded PDF or Word file."""
        try:
            if template_type == "pdf":
                reader = PyPDF2.PdfReader(file)
                return "\n".join(
                    page.extract_text() or "" for page in reader.pages
                )
            elif template_type == "word":
                doc = Document(file)
                return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            raise serializers.ValidationError(f"Error reading file: {str(e)}")
        return ""

    def _extract_placeholders(self, content):
        """Extract placeholders from content in various formats, handling apostrophes."""
        if not content:
            return []

        placeholders = []
        lines = content.split("\n")

        # Define placeholder patterns, supporting apostrophes
        placeholder_patterns = [
            r'\{\{[\w\s\'-]+\}\}',  # {{variable_name}} or {{Employee's Name}}
            r'<<[\w\s\'-]+>>',      # <<variable_name>> or <<Employee's Name>>
            r'\[\[[\w\s\'-]+\]\]',  # [[variable_name]] or [[Employee's Name]]
            r'\[[\w\s\'-]+\]',      # [variable_name] or [Employee's Name]
            r'_{10,}',              # ___________________
        ]

        # Combine patterns into a single regex
        combined_pattern = '|'.join(f'({pattern})' for pattern in placeholder_patterns)
        all_matches = re.findall(combined_pattern, content)

        # Flatten matches (since re.findall with groups returns tuples)
        matches = [match for group in all_matches for match in group if match]

        # Handle underscore placeholders
        for line in lines:
            line_lower = line.lower().strip()
            # Find phrases before underscores, allowing apostrophes
            match = re.search(r'([\w\s\'-]+?)\s*:?\s*_{10,}', line_lower)
            if match:
                phrase = match.group(1).strip()
                # Normalize to snake_case, removing apostrophes
                placeholder_name = '{{' + re.sub(r'\s+', '_', phrase.replace("'", "")).lower() + '}}'
                if placeholder_name not in placeholders:
                    placeholders.append(placeholder_name)
            # Handle special cases
            if "initials" in line_lower and "{{initials}}" not in placeholders:
                placeholders.append("{{initials}}")
            if "signature" in line_lower and "{{signature}}" not in placeholders:
                placeholders.append("{{signature}}")
            if "days" in line_lower and "{{days}}" not in placeholders:
                placeholders.append("{{days}}")
            if "state" in line_lower and "{{state}}" not in placeholders:
                placeholders.append("{{state}}")

        # Handle other placeholder formats
        for match in matches:
            if not re.match(r'_{10,}', match):  # Skip underscores
                # Extract variable name by removing delimiters
                cleaned_name = re.sub(r'[\{\}<>\[\]]+', '', match).strip()
                # Normalize to snake_case, removing apostrophes
                normalized_name = '{{' + re.sub(r'\s+', '_', cleaned_name.replace("'", "")).lower() + '}}'
                if normalized_name not in placeholders:
                    placeholders.append(normalized_name)

        return list(set(placeholders))  # Remove duplicates

    def validate(self, data):
        template_type = data.get(
            "template_type", self.instance.template_type if self.instance else None
        )
        file = data.get("file")
        content = data.get("content")

        # Validation for file-based templates
        if template_type in ("pdf", "word"):
            if not file:
                raise serializers.ValidationError(
                    "File is required for PDF or Word Document templates."
                )
            if template_type == "pdf" and not file.name.endswith(".pdf"):
                raise serializers.ValidationError("File must be a PDF.")
            if template_type == "word" and not file.name.endswith((".docx", ".doc")):
                raise serializers.ValidationError("File must be a Word document.")
        # Validation for richtext templates
        elif template_type == "text" and not content:
            raise serializers.ValidationError(
                "Content is required for Rich Text templates."
            )

        return data

    def create(self, validated_data):
        template_type = validated_data.get("template_type")
        file = validated_data.get("file")
        content = validated_data.get("content")

        # Extract content from file if provided
        if template_type in ("pdf", "word") and file:
            validated_data["content"] = self._extract_file_content(file, template_type)
        else:
            validated_data["content"] = content or ""

        # Extract placeholders
        validated_data["placeholders"] = self._extract_placeholders(validated_data["content"])

        return super().create(validated_data)

    def update(self, instance, validated_data):
        template_type = validated_data.get("template_type", instance.template_type)
        file = validated_data.get("file")
        content = validated_data.get("content")

        # Extract content from file if provided
        if template_type in ("pdf", "word") and file:
            validated_data["content"] = self._extract_file_content(file, template_type)
        elif template_type == "text":
            validated_data["content"] = content or instance.content

        # Extract placeholders
        validated_data["placeholders"] = self._extract_placeholders(validated_data.get("content", instance.content))

        return super().update(instance, validated_data)

class PlaceholderDataSerializer(serializers.Serializer):
    value = serializers.CharField(allow_blank=True)

class GenerateDocumentResponseSerializer(serializers.Serializer):
    placeholders = serializers.DictField(child=PlaceholderDataSerializer())
    template_id = serializers.IntegerField()
    preview = serializers.CharField(
        help_text="Preview of the template content with placeholders replaced by values",
        allow_blank=True
    )

class GenerateDocumentRequestSerializer(serializers.Serializer):
    context = serializers.CharField(
        required=True,
        help_text="The context for document generation (e.g., onboarding, employee, leave)"
    )
    context_id = serializers.IntegerField(
        required=True,
        help_text="The ID of the context record (e.g., OnBoarding ID, Employee ID)"
    )
    placeholders = serializers.DictField(
        child=serializers.CharField(),
        help_text="Dictionary of placeholder names and their values, e.g., {'full_name': 'John Doe', 'salary': '50000'}"
    )

class GenerateDocumentPostResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    document_id = serializers.IntegerField()
    preview = serializers.CharField(
        help_text="Preview of the generated document with placeholders replaced by provided values",
        allow_blank=True
    )

class DocumentContentPreviewSerializer(serializers.Serializer):
    preview = serializers.CharField(
        help_text="Preview of the document content with placeholders replaced by stored values",
        allow_blank=True
    )

class DocumentStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=['pending', 'in_review', 'reviewed'],
        required=True,
        help_text="New status for the document"
    )
    context = serializers.CharField(
        required=True,
        help_text="Context of the document (e.g., onboarding, employee, leave)"
    )
    context_id = serializers.IntegerField(
        required=True,
        help_text="ID of the context record (e.g., OnBoarding ID)"
    )    