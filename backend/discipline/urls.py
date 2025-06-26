from django.urls import path
from .views import DisciplinaryActionAPIView, DisciplinaryActionDetailAPIView, DisciplineTypeAPIView, DisciplineTypeDetailAPIView

urlpatterns = [
    path('disciplinary-actions/', DisciplinaryActionAPIView.as_view(), name='disciplinary-action-list-create'),
    path('disciplinary-actions/<int:pk>/', DisciplinaryActionDetailAPIView.as_view(), name='disciplinary-action-detail'),
    path('discipline-types/', DisciplineTypeAPIView.as_view(), name='discipline-type-list-create'),
    path('discipline-types/<int:pk>/', DisciplineTypeDetailAPIView.as_view(), name='discipline-type-detail'),
]
