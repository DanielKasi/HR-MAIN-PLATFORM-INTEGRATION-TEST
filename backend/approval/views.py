from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
import re
from communication.views import add_notification
from utilities.sortable_api import SortableAPIMixin
from institution.models import Institution
from .models import (
    Action, ApproverGroup, ApprovalDocument, ApprovalDocumentLevel,
    Approval, ApprovalTask, BaseApprovableModel
)
from .serializers import (
    ActionSerializer, ApproverGroupSerializer, ApprovalDocumentSerializer,
    ApprovalDocumentLevelSerializer, ApprovalSerializer, ApprovalTaskSerializer
)
from django.urls import reverse, NoReverseMatch
from utilities.pagination import CustomPageNumberPagination
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse,OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_view
from users.models import Role
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from django.apps import apps
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import NotFound


class ActionListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['name', 'created_at', 'code', 'is_active']
    default_ordering = ['name']
    @extend_schema(
        tags=['Actions'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search actions by name or description'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, required=False, description='Page number'),
            OpenApiParameter(name='page_size', type=int, location=OpenApiParameter.QUERY, required=False, description='Number of results per page'),
        ]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get('search', None)

        
        actions = Action.objects.filter(
            deleted_at__isnull=True
        )
        
        if search_query:
            actions = actions.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )

        try:
            actions = self.apply_sorting(actions, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)        
        
        serializer = ActionSerializer(actions, many=True)
        return Response(serializer.data)

    @extend_schema(tags=['Actions'])
    def post(self, request):
        serializer = ActionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActionDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return Action.objects.get(pk=pk)
        except Action.DoesNotExist:
            raise Http404

    @extend_schema(tags=['Actions'])
    def get(self, request, pk):
        action = self.get_object(pk)
        serializer = ActionSerializer(action)
        return Response(serializer.data)

    @extend_schema(tags=['Actions'])
    def patch(self, request, pk):
        action = self.get_object(pk)
        serializer = ActionSerializer(action, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=['Actions'])
    def delete(self, request, pk):
        action = self.get_object(pk)
        action.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApproverGroupListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['name', 'created_at', 'roles', 'users', 'is_active']
    default_ordering = ['name']
    @extend_schema(
        tags=['Approver Groups'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search approver groups by name or description'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, required=False, description='Page number'),
            OpenApiParameter(name='page_size', type=int, location=OpenApiParameter.QUERY, required=False, description='Number of results per page'),
        ]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        groups = ApproverGroup.objects.filter(
            institution=institution,
            deleted_at__isnull=True
        )
        
        if search_query:
            groups = groups.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )

        try:
            groups = self.apply_sorting(groups, request)
        except ValueError as e:
            return Response({"detail":str(e)}, status=status.HTTP_400_BAD_REQUEST)        
        
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(groups, request)
        serializer = ApproverGroupSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=['Approver Groups'])
    def post(self, request):
        serializer = ApproverGroupSerializer(data=request.data)
        if serializer.is_valid():
            if not request.user.is_authenticated:
                return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
            try:
                # Save the ApproverGroup to get the object ID
                approver_group = serializer.save()
                add_notification(
                    user_id=request.user.id,
                    message="New approver group created successfully.",
                    model_name="ApproverGroup",
                    object_id=str(approver_group.id)  # Pass the ID of the created object
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": f"Failed to queue notification or save: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"error": "Invalid data", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class ApproverGroupDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return ApproverGroup.objects.get(pk=pk)
        except ApproverGroup.DoesNotExist:
            raise Http404

    @extend_schema(tags=['Approver Groups'])
    def get(self, request, pk):
        group = self.get_object(pk)
        serializer = ApproverGroupSerializer(group)
        return Response(serializer.data)

    @extend_schema(tags=['Approver Groups'])
    def patch(self, request, pk):
        group = self.get_object(pk)
        serializer = ApproverGroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=['Approver Groups'])
    def delete(self, request, pk):
        group = self.get_object(pk)
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApprovalDocumentListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['content_type', 'actions', 'is_active']
    default_ordering = ['content_type']
    @extend_schema(
        tags=['Approval Documents'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search approval documents by name or description'),
            OpenApiParameter(name='content_type_id', type=int, location=OpenApiParameter.QUERY, required=False, description='Filter by ContentType ID'),
            OpenApiParameter(name='app_label', type=str, location=OpenApiParameter.QUERY, required=False, description='Filter by ContentType app_label (must be used with model)'),
            OpenApiParameter(name='model', type=str, location=OpenApiParameter.QUERY, required=False, description='Filter by ContentType model (must be used with app_label)'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, required=False, description='Page number'),
            OpenApiParameter(name='page_size', type=int, location=OpenApiParameter.QUERY, required=False, description='Number of results per page'),
        ]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        content_type_id = request.query_params.get('content_type_id', None)
        app_label = request.query_params.get('app_label', None)
        model = request.query_params.get('model', None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        documents = ApprovalDocument.objects.filter(
            institution=institution,
            deleted_at__isnull=True
        )

        # Filter by ContentType ID if provided
        if content_type_id:
            try:
                documents = documents.filter(content_type__id=content_type_id)
            except ValueError:
                return Response(
                    {"detail": "Invalid content_type_id provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Filter by app_label and model if both are provided
        if app_label and model:
            try:
                content_type = ContentType.objects.get(app_label=app_label, model=model)
                documents = documents.filter(content_type=content_type)
            except ContentType.DoesNotExist:
                return Response(
                    {"detail": "ContentType with provided app_label and model not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif app_label or model:
            return Response(
                {"detail": "Both app_label and model must be provided together."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Apply search query if provided
        if search_query:
            documents = documents.filter(
                Q(description__icontains=search_query) |
                Q(content_type__model__icontains=search_query) |
                Q(content_type__app_label__icontains=search_query)
            )

        try:
            documents = self.apply_sorting(documents, request)
        except ValueError as e:
            return Response({"detail":str(e)}, status=status.HTTP_400_BAD_REQUEST)        

        # Paginate and serialize the results
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(documents, request)
        serializer = ApprovalDocumentSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=['Approval Documents'])
    def post(self, request):
        serializer = ApprovalDocumentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApprovalDocumentDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return ApprovalDocument.objects.get(pk=pk)
        except ApprovalDocument.DoesNotExist:
            raise Http404

    @extend_schema(tags=['Approval Documents'])
    def get(self, request, pk):
        document = self.get_object(pk)
        serializer = ApprovalDocumentSerializer(document)
        return Response(serializer.data)

    @extend_schema(
        operation_id='approval_document_partial_update',
        summary='Partially update an Approval Document',
        description='Update specific fields of an approval document. Only provided fields will be updated.',
        tags=['Approval Documents']
    )
    def patch(self, request, pk):
        """
        Partially update an approval document.
        
        Args:
            request: HTTP request object
            id: ID of the approval document to update
            
        Returns:
            Response with updated approval document data
        """
        # Get the approval document instance
        approval_document = get_object_or_404(ApprovalDocument, pk=pk)
        
        # Extract data from request
        data = request.data
        
        try:
            with transaction.atomic():
                # Update basic fields if provided
                if 'description' in data:
                    approval_document.description = data['description']
                
                # Handle actions update if provided
                if 'actions' in data:
                    action_ids = data['actions']
                    
                    # Validate action IDs exist
                    if action_ids:  # Only validate if actions list is not empty
                        existing_actions = Action.objects.filter(id__in=action_ids)
                        existing_action_ids = set(existing_actions.values_list('id', flat=True))
                        provided_action_ids = set(action_ids)
                        
                        invalid_ids = provided_action_ids - existing_action_ids
                        if invalid_ids:
                            return Response(
                                {'actions': [f'Invalid action ID(s): {", ".join(map(str, invalid_ids))}']},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    
                    # Update actions relationship
                    approval_document.actions.set(action_ids)
                
                # Save the instance
                approval_document.save()
                
                # Serialize and return updated instance
                serializer = ApprovalDocumentSerializer(approval_document)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response(
                {'detail': f'An error occurred while updating: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(tags=['Approval Documents'])
    def delete(self, request, pk):
        document = self.get_object(pk)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApprovalDocumentLevelListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['level', 'created_at', 'approval_document', 'is_active', 'name', 'approvers', 'overriders']
    default_ordering = ['name']
    @extend_schema(
        tags=['Approval Document Levels'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search approval document levels by name'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, required=False, description='Page number'),
            OpenApiParameter(name='page_size', type=int, location=OpenApiParameter.QUERY, required=False, description='Number of results per page'),
        ]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        levels = ApprovalDocumentLevel.objects.filter(
            approval_document__institution=institution,
            deleted_at__isnull=True
        )
        
        if search_query:
            levels = levels.filter(
                Q(level_name__icontains=search_query) |
                Q(level_description__icontains=search_query)
            )

        try:
            levels = self.apply_sorting(levels, request)
        except ValueError as e:
            return Response({"detail":str(e)}, status=status.HTTP_400_BAD_REQUEST)       
        
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(levels, request)
        serializer = ApprovalDocumentLevelSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=['Approval Document Levels'])
    def post(self, request):
        serializer = ApprovalDocumentLevelSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApprovalDocumentLevelDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return ApprovalDocumentLevel.objects.get(pk=pk)
        except ApprovalDocumentLevel.DoesNotExist:
            raise Http404

    @extend_schema(tags=['Approval Document Levels'])
    def get(self, request, pk):
        level = self.get_object(pk)
        serializer = ApprovalDocumentLevelSerializer(level)
        return Response(serializer.data)

    @extend_schema(tags=['Approval Document Levels'])
    def patch(self, request, pk):
        level = self.get_object(pk)
        serializer = ApprovalDocumentLevelSerializer(level, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=['Approval Document Levels'])
    def delete(self, request, pk):
        level = self.get_object(pk)
        level.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApprovalListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['status', 'document', 'status', 'action', 'is_active', 'created_at', 'content_type']
    default_ordering = ['status']
    @extend_schema(
        tags=['Approvals'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search approvals by name or status'),
            OpenApiParameter(name='status', type=str, location=OpenApiParameter.QUERY, required=False, description='Filter by approval status'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, required=False, description='Page number'),
            OpenApiParameter(name='page_size', type=int, location=OpenApiParameter.QUERY, required=False, description='Number of results per page'),
        ]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        status_filter = request.query_params.get('status', None)
        
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        approvals = Approval.objects.filter(
            document__institution=institution,
            deleted_at__isnull=True
        )
        
        if search_query:
            approvals = approvals.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(document__name__icontains=search_query)
            )
        
        if status_filter:
            approvals = approvals.filter(status=status_filter)

        try:
            approvals = self.apply_sorting(approvals, request)
        except ValueError as e:
            return Response({"detail":str(e)}, status=status.HTTP_400_BAD_REQUEST)        
        
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(approvals, request)
        serializer = ApprovalSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=['Approvals'])
    def post(self, request):
        serializer = ApprovalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApprovalDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return Approval.objects.get(pk=pk)
        except Approval.DoesNotExist:
            raise Http404

    @extend_schema(tags=['Approvals'])
    def get(self, request, pk):
        approval = self.get_object(pk)
        serializer = ApprovalSerializer(approval)
        return Response(serializer.data)

    @extend_schema(tags=['Approvals'])
    def patch(self, request, pk):
        approval = self.get_object(pk)
        serializer = ApprovalSerializer(approval, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=['Approvals'])
    def delete(self, request, pk):
        approval = self.get_object(pk)
        approval.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApprovalTaskListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['approval', 'level', 'status', 'is_active', 'comment']
    default_ordering = ['approval']

    @extend_schema(
        tags=['Approval Tasks'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search approval tasks by task name, approval name, or comment'),
            OpenApiParameter(name='status', type=str, location=OpenApiParameter.QUERY, required=False, description='Filter by task status'),
            OpenApiParameter(name='assigned_to', type=int, location=OpenApiParameter.QUERY, required=False, description='Filter by assigned user ID'),
            OpenApiParameter(name='type', type=str, location=OpenApiParameter.QUERY, required=False, description='Filter by task type: incoming, open, critical, expired, outgoing'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, required=False, description='Page number'),
            OpenApiParameter(name='page_size', type=int, location=OpenApiParameter.QUERY, required=False, description='Number of results per page'),
        ]
    )
    def get(self, request):
        user = request.user
        profile = user.profile
        search_query = request.query_params.get('search', None)
        status_filter = request.query_params.get('status', None)
        assigned_to = request.query_params.get('assigned_to', None)
        type_filter = request.query_params.get('type', None)

        try:
            institution = Institution.objects.get(id=profile.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get user's roles
        user_roles = Role.objects.filter(user_roles__user=user)

        # Get groups the user belongs to, filtered by institution
        user_groups = ApproverGroup.objects.filter(
            Q(users=profile) | Q(roles__in=user_roles),
            institution=institution
        ).distinct()

        # Get levels where user's groups are approvers
        levels = ApprovalDocumentLevel.objects.filter(
            approvers__in=user_groups
        ).distinct()

        # Base tasks query
        tasks = ApprovalTask.objects.filter(
            approval__document__institution=institution,
            deleted_at__isnull=True
        )

        # Apply type filter
        if type_filter:
            current_time = timezone.now()
            critical_threshold = timedelta(days=5)
            expired_threshold = timedelta(days=7)

            if type_filter == 'incoming':
                tasks = tasks.filter(
                    level__in=levels,
                    approval__status='ongoing',
                    status='not_started'
                )
            elif type_filter == 'open':
                tasks = tasks.filter(
                    level__in=levels,
                    approval__status='ongoing',
                    status='pending'
                )
            elif type_filter == 'critical':
                tasks = tasks.filter(
                    level__in=levels,
                    approval__status='ongoing',
                    status='pending',
                    updated_at__lt=current_time - critical_threshold
                )
            elif type_filter == 'expired':
                tasks = tasks.filter(
                    level__in=levels,
                    approval__status='ongoing',
                    status='pending',
                    updated_at__lt=current_time - expired_threshold
                )
            elif type_filter == 'outgoing':
                tasks = tasks.filter(
                    approved_by=user,
                    status__in=('approved', 'rejected'),
                    updated_at__gte=current_time - timedelta(days=7)
                )
            else:
                return Response(
                    {"detail": "Invalid type filter. Use: incoming, open, critical, expired, outgoing."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Apply other filters
        if search_query:
            tasks = tasks.filter(
                Q(task_name__icontains=search_query) |
                Q(approval__name__icontains=search_query) |
                Q(comment__icontains=search_query)
            )

        if status_filter:
            tasks = tasks.filter(status=status_filter)

        if assigned_to:
            tasks = tasks.filter(
                Q(level__approvers__users__user__id=assigned_to) |
                Q(level__overriders__users__user__id=assigned_to) |
                Q(level__approvers__roles__user_roles__user__id=assigned_to) |
                Q(level__overriders__roles__user_roles__user__id=assigned_to)
            ).distinct()

        try:
            tasks = self.apply_sorting(tasks, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(tasks, request)
        serializer = ApprovalTaskSerializer(paginated_qs, many=True)

        # Enhance serialized data with content object information
        data = serializer.data
        for task_data, task in zip(data, paginated_qs):
            approval = task.approval
            content_type = approval.content_type
            object_id = approval.object_id

            content_info = {
                'content_type': {
                    'app_label': content_type.app_label,
                    'model': content_type.model,
                },
                'object_id': object_id,
            }

            # Attempt to generate a URL for the content object
            try:
                view_name = f"{content_type.app_label}-{content_type.model}-detail"
                content_info['url'] = reverse(view_name, kwargs={'pk': object_id})
            except NoReverseMatch:
                content_info['url'] = None

            task_data['content_object'] = content_info

        return paginator.get_paginated_response(data)

    @extend_schema(tags=['Approval Tasks'])
    def post(self, request):
        serializer = ApprovalTaskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApprovalTaskDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return ApprovalTask.objects.get(pk=pk)
        except ApprovalTask.DoesNotExist:
            raise NotFound("Approval task not found.")

    @extend_schema(tags=['Approval Tasks'])
    def get(self, request, pk):
        task = self.get_object(pk)
        serializer = ApprovalTaskSerializer(task)
        data = serializer.data

        # Get the related content object details
        approval = task.approval
        content_type = approval.content_type
        object_id = approval.object_id
        content_object = approval.content_object

        # Prepare content object information
        content_info = {
            'content_type': {
                'app_label': content_type.app_label,
                'model': content_type.model,
            },
            'object_id': object_id,
        }

        # Attempt to generate a URL for the content object
        try:
            # Assume the detail view follows Django's default naming convention: <app_label>-<model_name>-detail
            view_name = f"{content_type.app_label}-{content_type.model}-detail"
            content_info['url'] = reverse(view_name, kwargs={'pk': object_id})
        except NoReverseMatch:
            # If no detail view exists, URL will not be included
            content_info['url'] = None

        # Add content object details to the response
        data['content_object'] = content_info

        return Response(data)

    @extend_schema(tags=['Approval Tasks'])
    def patch(self, request, pk):
        task = self.get_object(pk)
        serializer = ApprovalTaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=['Approval Tasks'])
    def delete(self, request, pk):
        task = self.get_object(pk)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApprovalTaskApproveAPIView(APIView):
    def get_object(self, pk):
        try:
            return ApprovalTask.objects.get(pk=pk)
        except ApprovalTask.DoesNotExist:
            raise Http404

    @extend_schema(
        tags=['Approval Tasks'],
        parameters=[
            OpenApiParameter(name='comment', type=str, location=OpenApiParameter.QUERY, required=False)
        ]
    )
    def patch(self, request, pk):
        task = self.get_object(pk)
        comment = request.query_params.get('comment')
        try:
            task.mark_completed(request.user, comment)
            return Response({'status': 'approved'}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ApprovalTaskRejectAPIView(APIView):
    def get_object(self, pk):
        try:
            return ApprovalTask.objects.get(pk=pk)
        except ApprovalTask.DoesNotExist:
            raise Http404

    @extend_schema(
        tags=['Approval Tasks'],
        parameters=[
            OpenApiParameter(name='comment', type=str, location=OpenApiParameter.QUERY, required=False)
        ]
    )
    def patch(self, request, pk):
        task = self.get_object(pk)
        comment = request.query_params.get('comment')
        try:
            task.mark_rejected(request.user, comment)
            return Response({'status': 'rejected'}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PendingApprovalTasksListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=ApprovalTaskSerializer(many=True),
                description="List of pending approval tasks for the user.",
            ),
        },
        tags=["Approval Workflow"],
    )
    def get(self, request):
        user = request.user
        profile = user.profile

        # Get roles of the user
        user_roles = Role.objects.filter(user_roles__user=user)

        # Get groups the user belongs to directly or via roles
        user_groups = ApproverGroup.objects.filter(
            Q(users=profile) | Q(roles__in=user_roles)
        ).distinct()

        # Find levels where these groups are approvers
        levels = ApprovalDocumentLevel.objects.filter(
            approvers__in=user_groups
        ).distinct()

        # Find pending tasks in those levels
        tasks = ApprovalTask.objects.filter(
            level__in=levels,
            status='pending',
            approval__status='ongoing'
        ).order_by('updated_at')

        serializer = ApprovalTaskSerializer(tasks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApprovalTasksDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: OpenApiTypes.OBJECT},
        description="Retrieve counts of incoming tasks (not started yet for the user), open tasks (pending for the user), critical tasks (pending and approaching expiration threshold), expired tasks (pending and past expiration threshold), and outgoing tasks (recently approved or rejected by the user). Expiration is calculated based on time since the task became pending (critical: >5 days, expired: >7 days).",
        tags=["Approval Workflow"],
    )
    def get(self, request):
        user = request.user
        profile = user.profile

        # Get user's roles
        user_roles = Role.objects.filter(user_roles__user=user)

        # Get user's institution
        try:
            institution = profile.institution
        except AttributeError:
            return Response({"detail": "User profile does not have an associated institution."}, status=status.HTTP_400_BAD_REQUEST)

        # Get groups the user belongs to, filtered by institution
        user_groups = ApproverGroup.objects.filter(
            Q(users=profile) | Q(roles__in=user_roles),
            institution=institution
        ).distinct()

        # Get levels where user's groups are approvers
        levels = ApprovalDocumentLevel.objects.filter(
            approvers__in=user_groups
        ).distinct()

        # Base tasks for ongoing approvals in these levels
        base_tasks = ApprovalTask.objects.filter(
            level__in=levels,
            approval__status='ongoing',
            approval__document__institution=institution
        )

        # Incoming tasks: not started
        incoming_tasks_qs = base_tasks.filter(status='not_started')

        # Open tasks: pending for the user
        open_tasks_qs = base_tasks.filter(status='pending')

        # Define thresholds
        current_time = timezone.now()
        critical_threshold = timedelta(days=5)
        expired_threshold = timedelta(days=7)

        # Critical tasks: pending > 5 days
        critical_tasks_qs = open_tasks_qs.filter(updated_at__lt=current_time - critical_threshold)

        # Expired tasks: pending > 7 days
        expired_tasks_qs = open_tasks_qs.filter(updated_at__lt=current_time - expired_threshold)

        # Outgoing tasks: recently approved or rejected by this user
        outgoing_tasks_qs = ApprovalTask.objects.filter(
            approved_by=user,
            status__in=('approved', 'rejected'),
            updated_at__gte=current_time - timedelta(days=7),
            approval__document__institution=institution
        )

        # Prepare response data with counts only
        data = {
            'incoming': {'count': incoming_tasks_qs.count()},
            'open': {'count': open_tasks_qs.count()},
            'critical': {'count': critical_tasks_qs.count()},
            'expired': {'count': expired_tasks_qs.count()},
            'outgoing': {'count': outgoing_tasks_qs.count()},
        }

        return Response(data, status=status.HTTP_200_OK)
    

class ApprovableContentTypesListAPIView(APIView):
    @extend_schema(
        tags=['Approval Documents'],
        description='List all available content types for models that inherit from BaseApprovableModel. These can be assigned to approval documents. The list is dynamically generated, so new inheriting models are automatically included.',
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        all_models = apps.get_models()
        approvable_models = [
            m for m in all_models 
            if issubclass(m, BaseApprovableModel) and not m._meta.abstract
        ]
        
        def humanize_model_name(name):
            # Insert spaces before capital letters and title case
            name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
            return name.title()
        
        content_types = []
        for model in sorted(approvable_models, key=lambda m: m.__name__):
            ct = ContentType.objects.get_for_model(model)
            humanized_name = humanize_model_name(model.__name__)
            humanized_plural = humanized_name + 's' if not humanized_name.endswith('s') else humanized_name + 'es'
            
            content_types.append({
                'id': ct.id,
                'app_label': ct.app_label,
                'model': ct.model,
                'name': humanized_name,
                'plural_name': humanized_plural,
            })
        
        return Response(content_types, status=status.HTTP_200_OK)    
    

class ApprovableContentTypeDetailAPIView(APIView):
    @extend_schema(
        tags=['Approval Documents'],
        description='Retrieve details for a specific content type corresponding to a model that inherits from BaseApprovableModel. The details include the humanized name and other metadata. The content type must be valid and linked to an approvable model.',
        responses={200: OpenApiTypes.OBJECT},       
    )    
    def get(self, request, pk):
        try:
            ct = ContentType.objects.get(pk=pk)
        except ContentType.DoesNotExist:
            return Response({'error': 'Content type not found'}, status=status.HTTP_404_NOT_FOUND)

        model = ct.model_class()
        if not (model and issubclass(model, BaseApprovableModel) and not model._meta.abstract):
            return Response({"error": "This Model doest not correspond to an approvable model"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add the success response
        return Response({
            'id': ct.id,
            'name': ct.name,
            'model': ct.model,
            'app_label': ct.app_label,
            'humanized_name': model._meta.verbose_name.title(),
            # Add any other metadata you want to return
        }, status=status.HTTP_200_OK)


class ApprovalTaskOverrideAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return ApprovalTask.objects.get(pk=pk)
        except ApprovalTask.DoesNotExist:
            raise Http404

    @extend_schema(
        tags=['Approval Tasks'],
        parameters=[
            OpenApiParameter(name='comment', type=str, location=OpenApiParameter.QUERY, required=False, description='Optional comment for the override action')
        ],
        description='Allows an authorized overrider to override the approval task, marking the entire approval process as completed and terminating all remaining tasks.'
    )
    def patch(self, request, pk):
        task = self.get_object(pk)
        comment = request.query_params.get('comment')
        try:
            task.mark_overridden(request.user, comment)
            return Response({'status': 'overridden'}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)        
