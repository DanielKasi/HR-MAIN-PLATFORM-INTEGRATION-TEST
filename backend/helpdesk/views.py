from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from institution.models import Institution
from utilities.sortable_api import SortableAPIMixin
from .serializers import (
    FAQCategorySerializer, FAQSerializer, TicketCategorySerializer,
    TicketSerializer, TicketCommentSerializer, TicketAttachmentSerializer
)
from .models import FAQCategory, FAQ, TicketCategory, Ticket, TicketComment, TicketAttachment
from utilities.pagination import CustomPageNumberPagination


class FAQCategoryListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['name', 'created_at', 'is_active']
    default_ordering = ['name']

    @extend_schema(
        request=FAQCategorySerializer,
        responses={
            201: OpenApiResponse(
                response=FAQCategorySerializer,
                description="FAQ category created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = FAQCategorySerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by name or description"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "status", "type": "str", "description": "Filter by status (active/inactive)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'name,-is_active,created_at')"},
        ],
        responses={
            200: OpenApiResponse(
                response=FAQCategorySerializer(many=True),
                description="List of FAQ categories.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Helpdesk"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        categories = FAQCategory.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if search_query:
            categories = categories.filter(
                Q(name__icontains=search_query)
                | Q(description__icontains=search_query)
            )

        if created_at:
            categories = categories.filter(created_at=created_at)

        if status_filter == "active":
            categories = categories.filter(is_active=True)
        elif status_filter == "inactive":
            categories = categories.filter(is_active=False)

        try:
            categories = self.apply_sorting(categories, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(categories, request)
        serializer = FAQCategorySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class FAQCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=FAQCategorySerializer,
                description="FAQ category details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ category not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    def get(self, request, pk):
        category = get_object_or_404(FAQCategory, pk=pk)
        serializer = FAQCategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ category marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ category not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        category = get_object_or_404(FAQCategory, pk=pk)
        category.approval_status = 'under_deletion'
        category.save(update_fields=['approval_status'])
        category.confirm_delete()
        return Response(
            {"message": "FAQ category submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=FAQCategorySerializer,
                description="FAQ category updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ category not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        category = get_object_or_404(FAQCategory, pk=pk)
        category.approval_status = 'under_update'
        serializer = FAQCategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            category.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FAQListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['question', 'created_at', 'is_active']
    default_ordering = ['question']

    @extend_schema(
        request=FAQSerializer,
        responses={
            201: OpenApiResponse(
                response=FAQSerializer,
                description="FAQ created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = FAQSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by question or answer"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "status", "type": "str", "description": "Filter by status (active/inactive)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'question,-is_active,created_at')"},
        ],
        responses={
            200: OpenApiResponse(
                response=FAQSerializer(many=True),
                description="List of FAQs.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Helpdesk"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        faqs = FAQ.objects.filter(
            category__institution=institution, deleted_at__isnull=True
        )

        if search_query:
            faqs = faqs.filter(
                Q(question__icontains=search_query)
                | Q(answer__icontains=search_query)
            )

        if created_at:
            faqs = faqs.filter(created_at=created_at)

        if status_filter == "active":
            faqs = faqs.filter(is_active=True)
        elif status_filter == "inactive":
            faqs = faqs.filter(is_active=False)

        try:
            faqs = self.apply_sorting(faqs, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(faqs, request)
        serializer = FAQSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class FAQDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=FAQSerializer,
                description="FAQ details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    def get(self, request, pk):
        faq = get_object_or_404(FAQ, pk=pk)
        serializer = FAQSerializer(faq)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        faq = get_object_or_404(FAQ, pk=pk)
        faq.approval_status = 'under_deletion'
        faq.save(update_fields=['approval_status'])
        faq.confirm_delete()
        return Response(
            {"message": "FAQ submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=FAQSerializer,
                description="FAQ updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="FAQ not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        faq = get_object_or_404(FAQ, pk=pk)
        faq.approval_status = 'under_update'
        serializer = FAQSerializer(faq, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            faq.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TicketCategoryListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['name', 'created_at', 'is_active']
    default_ordering = ['name']

    @extend_schema(
        request=TicketCategorySerializer,
        responses={
            201: OpenApiResponse(
                response=TicketCategorySerializer,
                description="Ticket category created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = TicketCategorySerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by name or description"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "status", "type": "str", "description": "Filter by status (active/inactive)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'name,-is_active,created_at')"},
        ],
        responses={
            200: OpenApiResponse(
                response=TicketCategorySerializer(many=True),
                description="List of ticket categories.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Helpdesk"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        categories = TicketCategory.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if search_query:
            categories = categories.filter(
                Q(name__icontains=search_query)
                | Q(description__icontains=search_query)
            )

        if created_at:
            categories = categories.filter(created_at=created_at)

        if status_filter == "active":
            categories = categories.filter(is_active=True)
        elif status_filter == "inactive":
            categories = categories.filter(is_active=False)

        try:
            categories = self.apply_sorting(categories, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(categories, request)
        serializer = TicketCategorySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class TicketCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketCategorySerializer,
                description="Ticket category details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket category not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    def get(self, request, pk):
        category = get_object_or_404(TicketCategory, pk=pk)
        serializer = TicketCategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket category marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket category not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        category = get_object_or_404(TicketCategory, pk=pk)
        category.approval_status = 'under_deletion'
        category.save(update_fields=['approval_status'])
        category.confirm_delete()
        return Response(
            {"message": "Ticket category submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketCategorySerializer,
                description="Ticket category updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket category not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        category = get_object_or_404(TicketCategory, pk=pk)
        category.approval_status = 'under_update'
        serializer = TicketCategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            category.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TicketListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['title', 'status', 'priority', 'created_at', 'is_active']
    default_ordering = ['-created_at']

    @extend_schema(
        request=TicketSerializer,
        responses={
            201: OpenApiResponse(
                response=TicketSerializer,
                description="Ticket created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def post(self, request):
        print(request.data)
        serializer = TicketSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "search", "type": "str", "description": "Search by title"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "status", "type": "str", "description": "Filter by status (OPEN, IN_PROGRESS, CLOSED)"},
            {"name": "priority", "type": "str", "description": "Filter by priority (LOW, MEDIUM, HIGH)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., 'title,-status,created_at')"},
        ],
        responses={
            200: OpenApiResponse(
                response=TicketSerializer(many=True),
                description="List of tickets.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution not found."),
        },
        tags=["Helpdesk"],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)
        priority_filter = request.query_params.get("priority", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tickets = Ticket.objects.filter(
            category__institution=institution, deleted_at__isnull=True
        )

        if search_query:
            tickets = tickets.filter(
                Q(title__icontains=search_query)
            )

        if created_at:
            tickets = tickets.filter(created_at=created_at)

        if status_filter:
            tickets = tickets.filter(status=status_filter)

        if priority_filter:
            tickets = tickets.filter(priority=priority_filter)

        try:
            tickets = self.apply_sorting(tickets, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(tickets, request)
        serializer = TicketSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class TicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketSerializer,
                description="Ticket details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    def get(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        serializer = TicketSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket marked for deletion and sent for approval.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        ticket.approval_status = 'under_deletion'
        ticket.save(update_fields=['approval_status'])
        ticket.confirm_delete()
        return Response(
            {"message": "Ticket submitted for deletion approval."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketSerializer,
                description="Ticket updated successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        print(request.data)
        ticket = get_object_or_404(Ticket, pk=pk)
        ticket.approval_status = 'under_update'
        serializer = TicketSerializer(ticket, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            ticket.confirm_update()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TicketCommentListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['created_at', 'is_active']
    default_ordering = ['-created_at']

    @extend_schema(
        request=TicketCommentSerializer,
        responses={
            201: OpenApiResponse(
                response=TicketCommentSerializer,
                description="Ticket comment created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = TicketCommentSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "ticket_id", "type": "int", "description": "Filter by ticket ID"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "status", "type": "str", "description": "Filter by status (active/inactive)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., '-created_at,is_active')"},
        ],
        responses={
            200: OpenApiResponse(
                response=TicketCommentSerializer(many=True),
                description="List of ticket comments.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution or ticket not found."),
        },
        tags=["Helpdesk"],
    )
    def get(self, request):
        user = request.user.profile
        ticket_id = request.query_params.get("ticket_id", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        comments = TicketComment.objects.filter(
            ticket__category__institution=institution, deleted_at__isnull=True
        )

        if ticket_id:
            comments = comments.filter(ticket_id=ticket_id)

        if created_at:
            comments = comments.filter(created_at=created_at)

        if status_filter == "active":
            comments = comments.filter(is_active=True)
        elif status_filter == "inactive":
            comments = comments.filter(is_active=False)

        try:
            comments = self.apply_sorting(comments, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(comments, request)
        serializer = TicketCommentSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class TicketCommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketCommentSerializer,
                description="Ticket comment details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket comment not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    def get(self, request, pk):
        comment = get_object_or_404(TicketComment, pk=pk)
        serializer = TicketCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket comment soft-deleted successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket comment not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        comment = get_object_or_404(TicketComment, pk=pk)
        if comment.ticket.assigned_to != request.user.employee:
            return Response(
                {"error": "Only the assigned employee can delete comments."},
                status=status.HTTP_403_FORBIDDEN
            )
        comment.delete()
        return Response(
            {"message": "Ticket comment soft-deleted successfully."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketCommentSerializer,
                description="Ticket comment updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket comment not found.",
            ),
            403: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Only the assigned employee can update comments.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        comment = get_object_or_404(TicketComment, pk=pk)
        if comment.ticket.assigned_to != request.user.employee:
            return Response(
                {"error": "Only the assigned employee can update comments."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = TicketCommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TicketAttachmentListCreateView(APIView, SortableAPIMixin):
    permission_classes = [IsAuthenticated]
    allowed_ordering_fields = ['created_at', 'is_active']
    default_ordering = ['-created_at']

    @extend_schema(
        request=TicketAttachmentSerializer,
        responses={
            201: OpenApiResponse(
                response=TicketAttachmentSerializer,
                description="Ticket attachment created successfully.",
            ),
            400: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Bad request, validation errors.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = TicketAttachmentSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            {"name": "ticket_id", "type": "int", "description": "Filter by ticket ID"},
            {"name": "created_at", "type": "date", "description": "Filter by creation date"},
            {"name": "status", "type": "str", "description": "Filter by status (active/inactive)"},
            {"name": "ordering", "type": "str", "description": "Sort by fields (e.g., '-created_at,is_active')"},
        ],
        responses={
            200: OpenApiResponse(
                response=TicketAttachmentSerializer(many=True),
                description="List of ticket attachments.",
            ),
            400: OpenApiResponse(description="Invalid ordering field."),
            404: OpenApiResponse(description="Institution or ticket not found."),
        },
        tags=["Helpdesk"],
    )
    def get(self, request):
        user = request.user.profile
        ticket_id = request.query_params.get("ticket_id", None)
        created_at = request.query_params.get("created_at", None)
        status_filter = request.query_params.get("status", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        attachments = TicketAttachment.objects.filter(
            ticket__category__institution=institution, deleted_at__isnull=True
        )

        if ticket_id:
            attachments = attachments.filter(ticket_id=ticket_id)

        if created_at:
            attachments = attachments.filter(created_at=created_at)

        if status_filter == "active":
            attachments = attachments.filter(is_active=True)
        elif status_filter == "inactive":
            attachments = attachments.filter(is_active=False)

        try:
            attachments = self.apply_sorting(attachments, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(attachments, request)
        serializer = TicketAttachmentSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class TicketAttachmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketAttachmentSerializer,
                description="Ticket attachment details.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket attachment not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    def get(self, request, pk):
        attachment = get_object_or_404(TicketAttachment, pk=pk)
        serializer = TicketAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket attachment soft-deleted successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket attachment not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def delete(self, request, pk):
        attachment = get_object_or_404(TicketAttachment, pk=pk)
        attachment.delete()
        return Response(
            {"message": "Ticket attachment soft-deleted successfully."},
            status=status.HTTP_200_OK
        )

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=TicketAttachmentSerializer,
                description="Ticket attachment updated successfully.",
            ),
            404: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="Ticket attachment not found.",
            ),
        },
        tags=["Helpdesk"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        attachment = get_object_or_404(TicketAttachment, pk=pk)
        serializer = TicketAttachmentSerializer(attachment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)