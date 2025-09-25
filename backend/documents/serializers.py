from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from approval.serializers import BaseApprovableSerializer
from .models import DocumentType, DocumentTemplate
from institution.models import Institution
from institution.serializers import InstitutionSerializer
import re
import mammoth
import fitz
from docx import Document
import PyPDF2
from bs4 import BeautifulSoup


class DocumentTypeSerializer(BaseApprovableSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=Institution.objects.all())

    class Meta:
        model = DocumentType
        fields = '__all__'
        read_only_fields = ["code"]

    def to_representation(self, instance):
        """Override to include institution name in the representation"""
        data = super().to_representation(instance)
        data["institution"] = InstitutionSerializer(instance.institution).data
        return data


class DocumentTemplateSerializer(BaseApprovableSerializer):
    document_type = serializers.PrimaryKeyRelatedField(
        queryset=DocumentType.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = DocumentTemplate
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def _extract_file_content(self, file, template_type):
        """
        Extract formatted content from uploaded PDF or Word file as HTML, preserving styles.
        """
        try:
            if template_type == "pdf":
                doc = fitz.open(stream=file.read(), filetype="pdf")
                html_content = ""
                for page in doc:
                    blocks = page.get_text("dict")["blocks"]
                    for block in blocks:
                        if block["type"] == 0:  # Text block
                            for line in block.get("lines", []):
                                line_html = ""
                                for span in line.get("spans", []):
                                    text = span["text"].strip()
                                    if not text:
                                        continue
                                    font_size = span.get("size", 12)
                                    flags = span.get("flags", 0)
                                    is_bold = flags & 2 != 0
                                    is_italic = flags & 1 != 0
                                    style = f"font-size: {font_size}px;"
                                    if is_bold:
                                        style += "font-weight: bold;"
                                    if is_italic:
                                        style += "font-style: italic;"
                                    line_html += f'<span style="{style}">{text}</span>'
                                bbox = line.get("bbox", [0, 0, page.rect.width, 0])
                                page_width = page.rect.width
                                line_width = bbox[2] - bbox[0]
                                left_margin = bbox[0]
                                right_margin = page_width - bbox[2]
                                # Improved centering detection: symmetric margins AND not full-width
                                if abs(left_margin - right_margin) < page_width * 0.05 and line_width < page_width * 0.9:
                                    line_html = f'<p style="text-align: center;">{line_html}</p>'
                                else:
                                    line_html = f'<p>{line_html}</p>'
                                html_content += line_html + "\n"
                doc.close()
                return self._clean_html(html_content)

            elif template_type == "word":
                # (Unchanged from previous suggestion)
                style_map = """
                    p[style-name='Title'] => h1
                    p[style-name='Heading 1'] => h1
                    p[style-name='Heading 2'] => h2
                    p[style-name='Heading 3'] => h3
                    p[style-name='Heading 4'] => h4
                    p[style-name='Normal'] => p
                    p:matches(alignment=centered) => p.centered:fresh
                    p:matches(alignment=right) => p.right:fresh
                    p:matches(alignment=justified) => p.justify:fresh
                    p:matches(alignment=left) => p.left:fresh
                    r[style-name='Strong'] => strong
                    r[style-name='Emphasis'] => em
                    b => strong
                    i => em
                    u => u
                """
                result = mammoth.convert_to_html(file, style_map=style_map)
                html_content = result.value
                if result.messages:

                    return self._clean_html(html_content)

            else:
                raise serializers.ValidationError({"error": f"Unsupported template type: {template_type}"})

        except Exception as e:
            raise serializers.ValidationError({"error": f"Error reading file: {str(e)}"})

    def _clean_html(self, html_content):
        """
        Clean HTML content for CKEditor compatibility, preserving formatting and styles.
        Updated to handle more alignment classes and keep additional styles like color, margins.
        """
        if not html_content:
            return "<p></p>"

        soup = BeautifulSoup(html_content, "html.parser")

        # Remove unwanted tags (unchanged)
        for tag in soup(["img", "script", "style", "meta", "link"]):
            tag.decompose()

        allowed_tags = [
            "p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "div",
            "strong", "em", "b", "i", "u", "ul", "ol", "li", "br"
        ]
        allowed_attributes = ["style", "class"]

        for tag in soup.find_all(True):
            if tag.name not in allowed_tags:
                tag.unwrap()
            else:
                attrs = dict(tag.attrs)
                tag.attrs.clear()
                for attr in allowed_attributes:
                    if attr in attrs:
                        tag[attr] = attrs[attr]
                if "style" in tag.attrs:
                    styles = tag["style"].split(";")
                    valid_styles = [
                        s for s in styles
                        if s.strip() and any(prop in s for prop in [
                            "font-size", "text-align", "font-weight",
                            "font-style", "text-decoration", "margin", "padding",
                            "color", "background-color", "line-height"  # Added more for preservation
                        ])
                    ]
                    tag["style"] = ";".join(valid_styles) if valid_styles else None

        # Handle alignment classes from mammoth or PDF (expanded for more cases)
        alignment_map = {
            'centered': 'center',
            'center': 'center',
            'text-center': 'center',
            'right': 'right',
            'justify': 'justify',
            'left': 'left'  # Default, but explicit
        }
        for tag in soup.find_all(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"]):
            classes = tag.get("class", [])
            for cls in classes:
                align = alignment_map.get(cls.lower())
                if align:
                    current_style = tag.get("style", "")
                    tag["style"] = f"{current_style};text-align: {align};".strip(";")
                    break  # Apply first matching alignment
            # Remove classes after converting to styles (to avoid redundancy)
            tag.attrs.pop("class", None)

        if not soup.find(["p", "div", "h1", "h2", "h3", "ul", "ol"]):
            soup = BeautifulSoup(f"<p>{soup.get_text()}</p>", "html.parser")

        cleaned_html = str(soup).strip()
        return cleaned_html if cleaned_html else "<p></p>"

    def _clean_html(self, html_content):
        """
        Clean HTML content for CKEditor compatibility, preserving formatting and styles.
        """
        if not html_content:
            return "<p></p>"

        soup = BeautifulSoup(html_content, "html.parser")

        for tag in soup(["img", "script", "style", "meta", "link"]):
            tag.decompose()

        allowed_tags = [
            "p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "div",
            "strong", "em", "b", "i", "u", "ul", "ol", "li", "br"
        ]
        allowed_attributes = ["style", "class"]

        for tag in soup.find_all(True):
            if tag.name not in allowed_tags:
                tag.unwrap()
            else:
                attrs = dict(tag.attrs)
                tag.attrs.clear()
                for attr in allowed_attributes:
                    if attr in attrs:
                        tag[attr] = attrs[attr]
                if "style" in tag.attrs:
                    styles = tag["style"].split(";")
                    valid_styles = [
                        s for s in styles
                        if s.strip() and any(prop in s for prop in [
                            "font-size", "text-align", "font-weight",
                            "font-style", "text-decoration", "margin", "padding"
                        ])
                    ]
                    tag["style"] = ";".join(valid_styles) if valid_styles else None

        if not soup.find(["p", "div", "h1", "h2", "h3", "ul", "ol"]):
            soup = BeautifulSoup(f"<p>{soup.get_text()}</p>", "html.parser")

        for tag in soup.find_all(class_="text-center"):
            tag["style"] = (tag.get("style", "") + ";text-align: center;").lstrip(";")
            tag["class"] = [c for c in tag.get("class", []) if c != "text-center"]

        cleaned_html = str(soup).strip()
        return cleaned_html if cleaned_html else "<p></p>"

    def _extract_placeholders(self, content, template_type="text"):
        """
        Extract placeholders from HTML or LaTeX content in various formats: {}, {{}}, [], [[]], <>, <<>>.
        Handles multiple formats in the same document and normalizes to {{}} format.
        """
        if not content:
            return []

        placeholders = set()

        # Define placeholder patterns
        placeholder_patterns = [
            r"\{\{[\w\s\'-]+\}\}",         # {{variable_name}} or {{Employee's Name}}
            r"\{[\w\s\'-]+\}",            # {variable_name} or {Employee's Name}
            r"\[\[[\w\s\'-]+\]\]",        # [[variable_name]] or [[Employee's Name]]
            r"\[[\w\s\'-]*\w+\]",         # [variable_name] or [Parent]
            r"<<[\w\s\'-]+>>",            # <<variable_name>> or <<Employee's Name>>
            r"<[\w\s\'-]+>",              # <variable_name> or <Employee's Name>
            r"([\w\s\'-]+?)\s*:?\s*_{10,}",  # Phrase: __________
        ]

        if template_type == "text":
            # For LaTeX or plain text, process content directly
            text_content = content
        else:
            # For HTML (from PDF/Word), parse with BeautifulSoup
            soup = BeautifulSoup(content, "html.parser")
            text_content = soup.get_text(separator=" ", strip=True)

        # Extract placeholders from text content
        combined_pattern = "|".join(f"({pattern})" for pattern in placeholder_patterns)
        matches = re.findall(combined_pattern, text_content, re.IGNORECASE)
        matches = [match for group in matches for match in group if match]

        # Process underscore placeholders
        if template_type != "text":
            # Only parse HTML tags for non-text templates
            soup = BeautifulSoup(content, "html.parser")
            for tag in soup.find_all(["p", "div", "li", "span"]):
                line = tag.get_text(separator=" ", strip=True)
                if not line:
                    continue
                match = re.search(r"([\w\s\'-]+)\s*:?\s*_{10,}", line, re.IGNORECASE)
                if match:
                    phrase = match.group(1).strip()
                    placeholder_name = "{{" + re.sub(r"\s+", "_", phrase.replace("'", "")) + "}}"
                    placeholders.add(placeholder_name)
        else:
            # For LaTeX, check for underscore placeholders in raw content
            lines = content.split("\n")
            for line in lines:
                match = re.search(r"([\w\s\'-]+)\s*:?\s*_{10,}", line, re.IGNORECASE)
                if match:
                    phrase = match.group(1).strip()
                    placeholder_name = "{{" + re.sub(r"\s+", "_", phrase.replace("'", "")) + "}}"
                    placeholders.add(placeholder_name)

        # Handle special cases
        special_cases = ["initials", "signature", "days", "state"]
        for special in special_cases:
            if special.lower() in text_content.lower():
                placeholder_name = f"{{{{{special}}}}}"
                placeholders.add(placeholder_name)

        # Process other placeholder formats
        for match in matches:
            if not re.match(r"([\w\s\'-]+?)\s*:?\s*_{10,}", match, re.IGNORECASE):
                cleaned_name = re.sub(r"[\{\}<>\[\]]+", "", match).strip()
                if cleaned_name:
                    normalized_name = "{{" + re.sub(r"\s+", "_", cleaned_name.replace("'", "")) + "}}"
                    placeholders.add(normalized_name)

        return list(placeholders)

    def validate(self, data):
        template_type = data.get("template_type", self.instance.template_type if self.instance else None)
        file = data.get("file")
        content = data.get("content")

        if template_type in ("pdf", "word"):
            if not file and not self.instance:
                raise serializers.ValidationError({"error": f"File is required for PDF or Word Document templates."})
            if file:
                if template_type == "pdf" and not file.name.endswith(".pdf"):
                    raise serializers.ValidationError({"error": f"File must be a PDF."})
                if template_type == "word" and not file.name.endswith((".docx", ".doc")):
                    raise serializers.ValidationError({"error": f"File must be a Word document."})
        elif template_type == "text" and not content and not self.instance:
            raise serializers.ValidationError({"error": f"Content is required for Rich Text templates."})

        return data

    def create(self, validated_data):
        template_type = validated_data.get("template_type")
        file = validated_data.get("file")
        content = validated_data.get("content")

        if template_type in ("pdf", "word") and file:
            validated_data["content"] = self._extract_file_content(file, template_type)
        else:
            validated_data["content"] = content or "<p></p>"

        # Extract placeholders based on template type
        validated_data["placeholders"] = self._extract_placeholders(
            validated_data["content"], template_type
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        template_type = validated_data.get("template_type", instance.template_type)
        file = validated_data.get("file")
        content = validated_data.get("content")

        if template_type in ("pdf", "word") and file:
            validated_data["content"] = self._extract_file_content(file, template_type)
        elif template_type == "text" and content is not None:
            validated_data["content"] = content
        else:
            validated_data["content"] = instance.content

        # Extract placeholders based on template type
        validated_data["placeholders"] = self._extract_placeholders(
            validated_data["content"], template_type
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