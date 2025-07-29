from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views import (
    DocumentTypeListCreateAPIView,
    DocumentTypeRetrieveUpdateDeleteAPIView,
    DocumentTemplateListCreateAPIView,
    DocumentTemplateDetailAPIView,
    GenerateDocumentView,
)

urlpatterns = [
    path(
        "institution/<int:institution_id>/types/",
        DocumentTypeListCreateAPIView.as_view(),
        name="document-type-list-create",
    ),
    path(
        "types/<int:pk>/",
        DocumentTypeRetrieveUpdateDeleteAPIView.as_view(),
        name="document-type-detail",
    ),
    path(
        "institution/<int:institution_id>/templates/",
        DocumentTemplateListCreateAPIView.as_view(),
        name="document-template-list-create",
    ),
    path(
        "templates/<int:pk>/",
        DocumentTemplateDetailAPIView.as_view(),
        name="document-template-detail",
    ),
    path(
        "generate-document/<int:template_id>/",
        GenerateDocumentView.as_view(),
        name="generate-document",
    ),
]
