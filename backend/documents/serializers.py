from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import DocumentType, DocumentTemplate
from institution.models import Institution
from institution.serializers import InstitutionSerializer
import re
import mammoth
import fitz
from docx import Document
import PyPDF2
from bs4 import BeautifulSoup


class DocumentTypeSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = DocumentType
        fields = ["id", "institution", "name", "code", "description"]
        read_only_fields = ["code"]

    def to_representation(self, instance):
        """Override to include institution name in the representation"""
        data = super().to_representation(instance)
        data["institution"] = InstitutionSerializer(instance.institution).data
        return data


class DocumentTemplateSerializer(serializers.ModelSerializer):
    document_type = serializers.PrimaryKeyRelatedField(
        queryset=DocumentType.objects.all()
    )

    class Meta:
        model = DocumentTemplate
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def _extract_file_content(self, file, template_type):
        """
        Extract formatted content from uploaded PDF or Word file as HTML.
        Returns HTML string to preserve bold, paragraphs, numbering, etc.
        """
        try:
            if template_type == "pdf":
                doc = fitz.open(stream=file.read(), filetype="pdf")
                html_content = ""
                for page in doc:
                    page_html = page.get_text("html")
                    html_content += page_html + "\n"
                doc.close()
                html_content = self._clean_html(html_content)
                return html_content

            elif template_type == "word":
                result = mammoth.convert_to_html(file)
                html_content = result.value
                if result.messages:
                    print("Mammoth warnings:", result.messages)
                html_content = self._clean_html(html_content)
                return html_content

            else:
                raise serializers.ValidationError(f"Unsupported template type: {template_type}")

        except Exception as e:
            raise serializers.ValidationError(f"Error reading file: {str(e)}")

    def _clean_html(self, html_content):
        """
        Clean and normalize HTML content, removing images and ensuring CKEditor compatibility.
        """
        if not html_content:
            return ""

        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, "html.parser")
        # Remove all <img> tags
        for img in soup.find_all("img"):
            img.decompose()
        # Convert back to string
        html_content = str(soup)

        # Basic cleanup: remove excessive newlines, normalize tags
        html_content = re.sub(r"\n\s*\n", "\n", html_content.strip())
        # Wrap plain text in <p> tags if not already structured
        if not html_content.startswith("<"):
            html_content = f"<p>{html_content}</p>"

        return html_content

    def _extract_placeholders(self, content):
        """
        Extract placeholders from HTML content, handling various formats and apostrophes.
        """
        if not content:
            return []

        placeholders = []
        # Parse HTML with BeautifulSoup to extract text
        soup = BeautifulSoup(content, "html.parser")
        text_content = soup.get_text(separator="\n")

        # Define placeholder patterns, supporting single-word placeholders
        placeholder_patterns = [
            r"\{\{[\w\s\'-]+\}\}",  # {{variable_name}} or {{Employee's Name}}
            r"<<[\w\s\'-]+>>",  # <<variable_name>> or <<Employee's Name>>
            r"\[\[[\w\s\'-]+\]\]",  # [[variable_name]] or [[Employee's Name]]
            r"\[[\w\s\'-]*\w+\]",  # [variable_name] or [Parent]
            r"_{10,}",  # ___________________
        ]

        # Combine patterns into a single regex
        combined_pattern = "|".join(f"({pattern})" for pattern in placeholder_patterns)
        all_matches = re.findall(combined_pattern, text_content)

        # Flatten matches
        matches = [match for group in all_matches for match in group if match]

        # Handle underscore placeholders
        lines = text_content.split("\n")
        for line in lines:
            line_lower = line.strip().lower()
            match = re.search(r"([\w\s\'-]+?)\s*:?\s*_{10,}", line_lower)
            if match:
                phrase = match.group(1).strip()
                placeholder_name = (
                    "{{" + re.sub(r"\s+", "_", phrase.replace("'", "")) + "}}"
                )
                if placeholder_name not in placeholders:
                    placeholders.append(placeholder_name)
            # Handle special cases
            for special in ["initials", "signature", "days", "state"]:
                if special in line_lower and f"{{{{{special}}}}}" not in placeholders:
                    placeholders.append(f"{{{{{special}}}}}")

        # Handle other placeholder formats
        for match in matches:
            if not re.match(r"_{10,}", match):
                cleaned_name = re.sub(r"[\{\}<>\[\]]+", "", match).strip()
                normalized_name = (
                    "{{" + re.sub(r"\s+", "_", cleaned_name.replace("'", "")) + "}}"
                )
                if normalized_name not in placeholders:
                    placeholders.append(normalized_name)

        return list(set(placeholders))

    def validate(self, data):
        template_type = data.get(
            "template_type", self.instance.template_type if self.instance else None
        )
        file = data.get("file")
        content = data.get("content")

        if template_type in ("pdf", "word"):
            if not file:
                raise serializers.ValidationError(
                    "File is required for PDF or Word Document templates."
                )
            if template_type == "pdf" and not file.name.endswith(".pdf"):
                raise serializers.ValidationError("File must be a PDF.")
            if template_type == "word" and not file.name.endswith((".docx", ".doc")):
                raise serializers.ValidationError("File must be a Word document.")
        elif template_type == "text" and not content:
            raise serializers.ValidationError(
                "Content is required for Rich Text templates."
            )

        return data

    def create(self, validated_data):
        template_type = validated_data.get("template_type")
        file = validated_data.get("file")
        content = validated_data.get("content")

        if template_type in ("pdf", "word") and file:
            validated_data["content"] = self._extract_file_content(file, template_type)
        else:
            validated_data["content"] = content or ""

        validated_data["placeholders"] = self._extract_placeholders(
            validated_data["content"]
        )

        return super().create(validated_data)

    def update(self, instance, validated_data):
        template_type = validated_data.get("template_type", instance.template_type)
        file = validated_data.get("file")
        content = validated_data.get("content")

        if template_type in ("pdf", "word") and file:
            validated_data["content"] = self._extract_file_content(file, template_type)
        elif template_type == "text":
            validated_data["content"] = content or instance.content

        validated_data["placeholders"] = self._extract_placeholders(
            validated_data.get("content", instance.content)
        )

        return super().update(instance, validated_data)


class PlaceholderDataSerializer(serializers.Serializer):
    value = serializers.CharField(allow_blank=True)


class GenerateDocumentResponseSerializer(serializers.Serializer):
    placeholders = serializers.DictField(child=PlaceholderDataSerializer())
    template_id = serializers.IntegerField()


class GenerateDocumentRequestSerializer(serializers.Serializer):
    context = serializers.CharField(
        required=True,
        help_text="The context for document generation (e.g., onboarding, employee, leave)",
    )
    context_id = serializers.IntegerField(
        required=True,
        help_text="The ID of the context record (e.g., OnBoarding ID, Employee ID)",
    )
    placeholders = serializers.DictField(
        child=serializers.CharField(),
        help_text="Dictionary of placeholder names and their values, e.g., {'full_name': 'John Doe', 'salary': '50000'}",
    )


class GenerateDocumentPostResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    document_id = serializers.IntegerField()
    preview = serializers.CharField(
        help_text="Preview of the generated document with placeholders replaced by provided values",
        allow_blank=True,
    )


class DocumentContentPreviewSerializer(serializers.Serializer):
    preview = serializers.CharField(
        help_text="Preview of the document content with placeholders replaced by stored values",
        allow_blank=True,
    )


class DocumentStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["pending", "in_review", "reviewed"],
        required=True,
        help_text="New status for the document",
    )
    context = serializers.CharField(
        required=True,
        help_text="Context of the document (e.g., onboarding, employee, leave)",
    )
    context_id = serializers.IntegerField(
        required=True, help_text="ID of the context record (e.g., OnBoarding ID)"
    )
