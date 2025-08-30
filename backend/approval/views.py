from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.http import Http404
from django.db.models import Q

from institution.models import Institution
from .models import (
    Action, ApproverGroup, ApprovalDocument, ApprovalDocumentLevel,
    Approval, ApprovalTask
)
from .serializers import (
    ActionSerializer, ApproverGroupSerializer, ApprovalDocumentSerializer,
    ApprovalDocumentLevelSerializer, ApprovalSerializer, ApprovalTaskSerializer
)
from utilities.pagination import CustomPageNumberPagination


class ActionListAPIView(APIView):
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
        
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        actions = Action.objects.filter(
            institution=institution,
            deleted_at__isnull=True
        )
        
        if search_query:
            actions = actions.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(actions, request)
        serializer = ActionSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

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


class ApproverGroupListAPIView(APIView):
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
        
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(groups, request)
        serializer = ApproverGroupSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=['Approver Groups'])
    def post(self, request):
        serializer = ApproverGroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class ApprovalDocumentListAPIView(APIView):
    @extend_schema(
        tags=['Approval Documents'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search approval documents by name or description'),
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
        
        documents = ApprovalDocument.objects.filter(
            institution=institution,
            deleted_at__isnull=True
        )
        
        if search_query:
            documents = documents.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(document_type__icontains=search_query)
            )
        
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

    @extend_schema(tags=['Approval Documents'])
    def patch(self, request, pk):
        document = self.get_object(pk)
        serializer = ApprovalDocumentSerializer(document, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=['Approval Documents'])
    def delete(self, request, pk):
        document = self.get_object(pk)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApprovalDocumentLevelListAPIView(APIView):
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
            institution=institution,
            deleted_at__isnull=True
        )
        
        if search_query:
            levels = levels.filter(
                Q(level_name__icontains=search_query) |
                Q(level_description__icontains=search_query)
            )
        
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


class ApprovalListAPIView(APIView):
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
            institution=institution,
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


class ApprovalTaskListAPIView(APIView):
    @extend_schema(
        tags=['Approval Tasks'],
        parameters=[
            OpenApiParameter(name='search', type=str, location=OpenApiParameter.QUERY, required=False, description='Search approval tasks by task name or approval name'),
            OpenApiParameter(name='status', type=str, location=OpenApiParameter.QUERY, required=False, description='Filter by task status'),
            OpenApiParameter(name='assigned_to', type=int, location=OpenApiParameter.QUERY, required=False, description='Filter by assigned user ID'),
            OpenApiParameter(name='page', type=int, location=OpenApiParameter.QUERY, required=False, description='Page number'),
            OpenApiParameter(name='page_size', type=int, location=OpenApiParameter.QUERY, required=False, description='Number of results per page'),
        ]
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        status_filter = request.query_params.get('status', None)
        assigned_to = request.query_params.get('assigned_to', None)
        
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        tasks = ApprovalTask.objects.filter(
            institution=institution,
            deleted_at__isnull=True
        )
        
        if search_query:
            tasks = tasks.filter(
                Q(task_name__icontains=search_query) |
                Q(approval__name__icontains=search_query) |
                Q(comments__icontains=search_query)
            )
        
        if status_filter:
            tasks = tasks.filter(status=status_filter)
            
        if assigned_to:
            tasks = tasks.filter(assigned_to_id=assigned_to)
        
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(tasks, request)
        serializer = ApprovalTaskSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

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
            raise Http404

    @extend_schema(tags=['Approval Tasks'])
    def get(self, request, pk):
        task = self.get_object(pk)
        serializer = ApprovalTaskSerializer(task)
        return Response(serializer.data)

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