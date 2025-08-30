# Document Template Implementation Documentation

## Overview
This document provides a comprehensive overview of the **Document Template implementation** in the Django-based application.  

The system allows for:
- Creation, management, and generation of document templates, types, and instances.
- Support for various formats (**PDF, Word, Text**).
- Automatic placeholder extraction.
- Conversion to HTML for editing.
- Document generation with placeholder replacement.
- Integration with other modules like **Institutions, Onboarding, Employees, and Audit Logging**.

### Primary Goals
- Enable institutions to define document types and templates.  
- Automate placeholder detection and population (e.g., onboarding, employee contracts).  
- Generate previews and final documents (including PDFs).  
- Handle status updates, auditing, and email notifications.  

---

## 📂 DocumentType

### Model
Represents categories of documents (e.g., *Contract*, *Offer Letter*).  

**Fields:**
- `institution`: `ForeignKey` → Institution (CASCADE on delete).  
- `name`: `CharField(max_length=255)`.  
- `code`: `CharField(max_length=50, unique=True, editable=False)` – Auto-generated slug.  
- `description`: `TextField(blank=True, null=True)`.  

**Methods:**
- `save`: Auto-generates `code` via `slugify`. Ensures uniqueness (`_1`, `_2`, ...).  

**Inheritance:**  
- Inherits from `UtilityBaseModel` (timestamps + `is_active`).  

---

### Serializer: `DocumentTypeSerializer`
**Fields:** `id, institution, name, code, description, is_active`.  
**Read-only:** `code`.  

Custom logic:  
- Accepts institution ID but expands to full `InstitutionSerializer` in response.  

---

### Views
#### `DocumentTypeListCreateAPIView`
- **GET /{institution_id}/**: List types by institution (paginated, ordered by `-created_at`).  
- **POST /{institution_id}/**: Create type scoped to institution.  

#### `DocumentTypeRetrieveUpdateDeleteAPIView`
- **GET /{pk}/**: Retrieve by ID.  
- **PATCH /{pk}/**: Update, regenerates `code` if name changes.  
- **DELETE /{pk}/**: Delete type.  

---

## 📂 DocumentTemplate

### Model
Defines reusable templates for generating documents. Supports **PDF/Word upload → HTML conversion**, or direct rich-text input.  

**Fields:**
- `document_type`: FK → DocumentType.  
- `name`: Template name.  
- `template_type`: Choices → `pdf | word | text`.  
- `file`: File upload (`/document_templates/`).  
- `content`: `RichTextUploadingField`.  
- `placeholders`: `JSONField` (auto-extracted).  

---

### Serializer: `DocumentTemplateSerializer`
Handles file processing & placeholder extraction.  

**Key methods:**
- `_extract_file_content(file, type)`:  
  - PDF → `fitz` (convert to styled HTML).  
  - Word → `mammoth`.  
- `_clean_html(html)`: Sanitize via BeautifulSoup.  
- `_extract_placeholders(content)`: Detects placeholders (supports `{{}}`, `{}`, `[[]]`, `<<>>`, `________`).  

Validation rules:  
- PDF/Word requires file, text requires content.  

---

### Views
#### `DocumentTemplateListCreateAPIView`
- **GET /{institution_id}/**: List templates for institution.  
- **POST /{institution_id}/**: Upload/create template, audit log action `"CREATE"`.  

#### `DocumentTemplateDetailAPIView`
- **GET /{pk}/**: Retrieve.  
- **PATCH /{pk}/**: Update, logs `"UPDATE"` with diff.  
- **DELETE /{pk}/**: Deletes, logs `"DELETE"`.  

#### `AuditLogListAPIView`
- **GET /{institution_id}/{template_id}/**: Lists template-specific audit history.  

---

## 📂 Document

### Model
Represents **generated instances** of templates with filled placeholders & status tracking.  

**Fields:**
- `document_template`: FK → DocumentTemplate.  
- `placeholder_values`: JSON of filled values.  
- `status`: Choices → `pending | in_review | reviewed`.  

---

### Serializers
- `GenerateDocumentRequestSerializer` → context, context_id, placeholders.  
- `GenerateDocumentResponseSerializer` → placeholders + template_id.  
- `GenerateDocumentPostResponseSerializer` → document_id, preview, status.  
- `DocumentContentPreviewSerializer` → preview HTML.  
- `DocumentStatusUpdateSerializer` → status, context, context_id.  

---

### Views
#### `BaseDocumentView`
Shared methods:
- `_normalize_placeholder` → Normalize to `{{snake_case}}`.  
- `_replace_placeholders` → Replace multiple placeholder formats in HTML.  

#### `GenerateDocumentView`
- **GET /{template_id}/?context=...** → Prefill placeholders from context (e.g., Employee, Onboarding).  
- **POST /{template_id}/** → Generate `Document` (status = `pending`).  

#### `DocumentContentPreviewView`
- **GET /{document_id}/** → Render preview with placeholder values.  

#### `DocumentStatusUpdateView`
- **PATCH /{document_id}/?context=...** → Updates status.  
  - On `"reviewed"`:  
    - Generate PDF via WeasyPrint.  
    - Create EmployeeContract.  
    - Send email with PDF attached.  

---

## ✅ Summary
This system provides:
- Institution-scoped **document management**.  
- Automated **placeholder extraction & replacement**.  
- Support for **PDF/Word → editable HTML**.  
- Workflow handling (draft → review → final).  
- **Auditing** and **email notifications**.  
