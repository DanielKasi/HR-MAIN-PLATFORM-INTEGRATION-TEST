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
        fields = ["id", "institution", "name", "code", "description", "is_active"]
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
        try:
            raw_content = ""
            html_content = ""

            if template_type == "word":
                doc = Document(file)
                raw_content = "\n".join([para.text for para in doc.paragraphs])
                style_map = """
                    p[style-name='Title'] => h1.center:fresh
                    p[style-name='Heading 1'] => h1.center:fresh
                    p[style-name='Heading 2'] => h2:fresh
                    p[style-name='Heading 3'] => h3:fresh
                    p[style-name='Normal'] => p:fresh
                    p[style*='center'] => p.text-center:fresh
                    p[style*='left'] => p.text-left:fresh
                    p[style*='right'] => p.text-right:fresh
                    p[style*='justify'] => p.text-justify:fresh
                    p[style*='List Paragraph'] => li:fresh
                    p[style*='List Number'] => li.numbered:fresh
                    p[style*='List Bullet'] => li.bulleted:fresh
                    b => strong
                    i => em
                    u => u
                    ul => ul:fresh
                    ol => ol:fresh
                    li => li:fresh
                """
                result = mammoth.convert_to_html(file, style_map=style_map)
                html_content = result.value
                if result.messages:
                    print("Mammoth conversion warnings:", result.messages)

            elif template_type == "pdf":
                doc = fitz.open(stream=file.read(), filetype="pdf")
                raw_content = ""
                html_content = ""
                for page in doc:
                    raw_content += page.get_text("text") + "\n"
                    blocks = page.get_text("dict")["blocks"]
                    for block in blocks:
                        if block["type"] == 0:
                            block_html = ""
                            is_list = False
                            list_type = "ul"
                            list_items = []
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
                                    if text.startswith(("•", "◦", "-", "1.", "2.", "a.", "b.")):
                                        is_list = True
                                        if text.startswith(("1.", "2.", "a.", "b.")):
                                            list_type = "ol"
                                        list_items.append(f'<li style="{style}">{text}</li>')
                                        continue
                                    line_html += f'<span style="{style}">{text}</span>'
                                bbox = line.get("bbox", [0, 0, page.rect.width, 0])
                                page_width = page.rect.width
                                if abs(bbox[0] + bbox[2] - page_width) < page_width * 0.1:
                                    line_html = f'<p style="text-align: center;">{line_html}</p>'
                                elif bbox[0] < page_width * 0.1:
                                    line_html = f'<p style="text-align: left;">{line_html}</p>'
                                elif abs(bbox[2] - page_width) < page_width * 0.1:
                                    line_html = f'<p style="text-align: right;">{line_html}</p>'
                                else:
                                    line_html = f'<p>{line_html}</p>'
                                if is_list:
                                    block_html += f'<{list_type}>{"".join(list_items)}</{list_type}>'
                                    is_list = False
                                    list_items = []
                                else:
                                    block_html += line_html
                            html_content += block_html + "\n"
                doc.close()

            else:
                raise serializers.ValidationError({"error": f"Unsupported template type: {template_type}"})

            print("Raw content:", raw_content)
            print("HTML content:", html_content)
            return raw_content, self._clean_html(html_content)

        except Exception as e:
            print("Error reading file:", str(e))
            raise serializers.ValidationError({"error": f"Error reading file: {str(e)}"})

    def _clean_html(self, html_content):
        if not html_content:
            return "<p></p>"

        print("Raw HTML before cleaning:", html_content)
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
                # Apply centering to uppercase headings
                if tag.name in ["h1", "h2", "h3"] and tag.get_text().strip().isupper():
                    tag["style"] = (tag.get("style", "") + ";text-align: center;").lstrip(";")

        if not soup.find(["p", "div", "h1", "h2", "h3", "ul", "ol"]):
            soup = BeautifulSoup(f"<p>{soup.get_text()}</p>", "html.parser")

        for tag in soup.find_all(class_="center"):
            tag["style"] = (tag.get("style", "") + ";text-align: center;").lstrip(";")
            tag["class"] = [c for c in tag.get("class", []) if c != "center"]

        for tag in soup.find_all(class_="text-center"):
            tag["style"] = (tag.get("style", "") + ";text-align: center;").lstrip(";")
            tag["class"] = [c for c in tag.get("class", []) if c != "text-center"]

        # Fix nested list issues
        for ul in soup.find_all("ul"):
            for li in ul.find_all("li", recursive=False):
                ol = li.find("ol", recursive=False)
                if ol:
                    li.unwrap()
                    ul.insert_after(ol)
                    ul.unwrap() if not ul.find_all("li") else None

        cleaned_html = str(soup).strip()
        print("Cleaned HTML content:", cleaned_html)
        return cleaned_html if cleaned_html else "<p></p>"

    def _extract_placeholders(self, content):
        if not content:
            return []

        placeholders = set()
        print("Raw content for placeholder extraction:", content)

        soup = BeautifulSoup(content, "html.parser")
        text_content = soup.get_text(separator=" ", strip=True)

        placeholder_patterns = [
            r"\{\{[\w\s\'-]+\}\}",
            r"\{[\w\s\'-]+\}",
            r"\[\[[\w\s\'-]+\]\]",
            r"\[[\w\s\'-]*\w+\]",
            r"<<[\w\s\'-]+>>",
            r"<[\w\s\'-]+>",
            r"([\w\s\'-]+?)\s*:?\s*_{10,}"
        ]
        combined_pattern = "|".join(f"({pattern})" for pattern in placeholder_patterns)
        matches = re.findall(combined_pattern, text_content, re.IGNORECASE)
        matches = [match for group in matches for match in group if match]
        print("Matched placeholders:", matches)

        for tag in soup.find_all(["p", "div", "li", "span"]):
            line = tag.get_text(separator=" ", strip=True)
            if not line:
                continue
            match = re.search(r"([\w\s\'-]+)\s*:?\s*_{10,}", line, re.IGNORECASE)
            if match:
                phrase = match.group(1).strip()
                placeholder_name = "{{" + re.sub(r"\s+", "_", phrase.replace("'", "")).lower() + "}}"
                placeholders.add(placeholder_name)
                print("Added underscore placeholder:", placeholder_name)

        special_cases = ["initials", "signature", "days", "state", "employee_job_title", "employee_supervisor_name"]
        for special in special_cases:
            if special.lower() in text_content.lower():
                placeholder_name = f"{{{{{special}}}}}"
                placeholders.add(placeholder_name)
                print("Added special case placeholder:", placeholder_name)

        for match in matches:
            if not re.match(r"_{10,}", match):
                cleaned_name = re.sub(r"[\{\}<>\[\]]+", "", match).strip()
                if cleaned_name:
                    normalized_name = "{{" + re.sub(r"\s+", "_", cleaned_name.replace("'", "")).lower() + "}}"
                    placeholders.add(normalized_name)
                    print("Added normalized placeholder:", normalized_name)

        print("Final placeholders:", list(placeholders))
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
            raw_content, html_content = self._extract_file_content(file, template_type)
            validated_data["raw_content"] = raw_content
            validated_data["content"] = html_content
        else:
            validated_data["content"] = content or "<p></p>"
            validated_data["raw_content"] = content or ""

        validated_data["placeholders"] = self._extract_placeholders(validated_data["content"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        template_type = validated_data.get("template_type", instance.template_type)
        file = validated_data.get("file")
        content = validated_data.get("content")

        if template_type in ("pdf", "word") and file:
            raw_content, html_content = self._extract_file_content(file, template_type)
            validated_data["raw_content"] = raw_content
            validated_data["content"] = html_content
        elif template_type == "text" and content is not None:
            validated_data["content"] = content
            validated_data["raw_content"] = content
        else:
            validated_data["content"] = instance.content
            validated_data["raw_content"] = instance.raw_content

        validated_data["placeholders"] = self._extract_placeholders(validated_data["content"])
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
