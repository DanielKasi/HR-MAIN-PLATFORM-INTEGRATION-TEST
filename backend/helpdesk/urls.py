from django.urls import path
from .views import (
    FAQCategoryListCreateView, FAQCategoryDetailView,
    FAQListCreateView, FAQDetailView,
    TicketCategoryListCreateView, TicketCategoryDetailView,
    TicketListCreateView, TicketDetailView,
    TicketCommentListCreateView, TicketCommentDetailView,
    TicketAttachmentListCreateView, TicketAttachmentDetailView
)

urlpatterns = [
    path('faq-categories/', FAQCategoryListCreateView.as_view(), name='faq-category-list-create'),
    path('faq-categories/<int:pk>/', FAQCategoryDetailView.as_view(), name='faq-category-detail'),
    path('faqs/', FAQListCreateView.as_view(), name='faq-list-create'),
    path('faqs/<int:pk>/', FAQDetailView.as_view(), name='faq-detail'),
    path('ticket-categories/', TicketCategoryListCreateView.as_view(), name='ticket-category-list-create'),
    path('ticket-categories/<int:pk>/', TicketCategoryDetailView.as_view(), name='ticket-category-detail'),
    path('tickets/', TicketListCreateView.as_view(), name='ticket-list-create'),
    path('tickets/<int:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
    path('ticket-comments/', TicketCommentListCreateView.as_view(), name='ticket-comment-list-create'),
    path('ticket-comments/<int:pk>/', TicketCommentDetailView.as_view(), name='ticket-comment-detail'),
    path('ticket-attachments/', TicketAttachmentListCreateView.as_view(), name='ticket-attachment-list-create'),
    path('ticket-attachments/<int:pk>/', TicketAttachmentDetailView.as_view(), name='ticket-attachment-detail'),
]