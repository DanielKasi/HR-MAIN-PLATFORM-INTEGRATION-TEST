from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views import DocumentTypeListCreateAPIView, DocumentTypeRetrieveUpdateDeleteAPIView

urlpatterns = [
    path('institution/<int:institution_id>/types/', DocumentTypeListCreateAPIView.as_view(), name='document-type-list-create'),
    path('types/<int:pk>/', DocumentTypeRetrieveUpdateDeleteAPIView.as_view(), name='document-type-detail'),
]