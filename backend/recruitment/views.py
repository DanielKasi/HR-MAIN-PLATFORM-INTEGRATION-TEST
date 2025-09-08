from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.db.models import Sum, Q
from django.db.models.functions import Coalesce
from onboarding.models import OnBoarding
from workflows.serializers import (
    JobPositionWorkflowSerializer,
    JobPositionAdvertWorkflowSerializer,
)
from utilities.pagination import CustomPageNumberPagination
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    InterviewStageSerializer,
    JobAdvertApplicationSerializer,
    JobInterviewSerializer,
    JobPositionAdvertSerializer,
    JobPositionSerializer,
)
from .models import (
    InterviewStage,
    JobAdvertApplication,
    JobInterview,
    JobPosition,
    JobPositionAdvert,
    RequiredDocument,
)

from utilities.sortable_api import SortableAPIMixin
from django.db.models import Count, Avg, F
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers
from django.db.models.functions import TruncMonth

from .models import JobInterview, JobAdvertApplication

from django.utils import timezone
from rest_framework.permissions import AllowAny
from datetime import timedelta
from django.db import transaction





class JobPositionListAPI(APIView, SortableAPIMixin):
    allowed_ordering_fields = ['name', 'created_at', 'department', 'salary_min', 'salary_max', 'job_position_status', 'reports_to']
    default_ordering = ['name']

    @extend_schema(
        request=JobPositionSerializer,
        responses={201: JobPositionSerializer},
        description="Create a new job position",
        summary="Create Job Position",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def post(self, request, institution_id):
        serializer = JobPositionSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: JobPositionWorkflowSerializer(many=True)},
        description="List all job positions",
        summary="List Job Positions",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        job_positions = JobPosition.objects.filter(
            department__institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            job_positions = job_positions.filter(
                Q(name__icontains=search_query)
            )

        try:
            job_positions = self.apply_sorting(job_positions, request)
        except ValueError as e:
            return Response ({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)     
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(job_positions, request)
        serializer = JobPositionWorkflowSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class JobPositionDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: JobPositionWorkflowSerializer},
        description="Retrieve a job position by ID",
        summary="Get Job Position",
        tags=["Recruitment"],
    )
    def get(self, request, job_position_id):
        try:
            job_position = JobPosition.objects.get(id=job_position_id)
            serializer = JobPositionWorkflowSerializer(job_position)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except JobPosition.DoesNotExist:
            return Response(
                {"detail": "Job position not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        request=JobPositionSerializer,
        responses={200: JobPositionSerializer},
        description="Update a job position by ID",
        summary="Update Job Position",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def patch(self, request, job_position_id):
        try:
            job_position = JobPosition.objects.get(id=job_position_id)
            job_position.approval_status = 'under_update'
            serializer = JobPositionSerializer(
                job_position, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                job_position.confirm_update()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except JobPosition.DoesNotExist:
            return Response(
                {"detail": "Job position not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        responses={204: None},
        description="Delete a job position by ID",
        summary="Delete Job Position",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def delete(self, request, job_position_id):
        try:
            job_position = JobPosition.objects.get(id=job_position_id)
            job_position.approval_status = 'under_deletion'
            job_position.save(update_fields=['approval_status'])
            job_position.confirm_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except JobPosition.DoesNotExist:
            return Response(
                {"detail": "Job position not found."}, status=status.HTTP_404_NOT_FOUND
            )        




class JobPositionAdvertListAPI(APIView, SortableAPIMixin):
    parser_classes = [MultiPartParser, FormParser]
    allowed_ordering_fields = ['job_position', 'created_at', 'advert_type', 'work_type', 'employee_type', 'job_position_advert_status']
    default_ordering = ['job_position']

    @extend_schema(
        request=JobPositionAdvertSerializer,
        responses={201: JobPositionAdvertSerializer},
        summary="Create Job Position Advert",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def post(self, request, institution_id):
        serializer = JobPositionAdvertSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    permission_classes = [AllowAny]
    @extend_schema(
        responses={200: JobPositionAdvertWorkflowSerializer(many=True)},
        summary="List Job Position Adverts",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id=None):
        search_query = request.query_params.get('search', None)
        status = request.query_params.get('status', None)
        adverts = JobPositionAdvert.objects.filter(
            deleted_at__isnull=True
        ).order_by("-published_date")

        if institution_id:
            adverts = adverts.filter(job_position__department__institution_id=institution_id)
        else:
            adverts = adverts.filter(
                job_position_advert_status='active',
                advert_type__in=['external', 'both'],
                published_date__lte=timezone.now(),
                expiry_date__gt=timezone.now()
            )  

        if search_query:
            adverts = adverts.filter(
                Q(job_position__name__icontains=search_query)
            )

        if status:
            adverts = adverts.filter(status=status)    

        try:
            adverts = self.apply_sorting(adverts, request)
        except ValueError as e:
            return Response ({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST) 

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(adverts, request)
        serializer = JobPositionAdvertWorkflowSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class JobPositionAdvertDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    permission_classes = [AllowAny]
    @extend_schema(
        responses={200: JobPositionAdvertWorkflowSerializer},
        summary="Get Job Position Advert",
        tags=["Recruitment"],
    )
    def get(self, request, advert_id):
        try:
            advert = JobPositionAdvert.objects.get(id=advert_id)
            serializer = JobPositionAdvertWorkflowSerializer(advert)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except JobPositionAdvert.DoesNotExist:
            return Response(
                {"detail": "Job advert not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        request=JobPositionAdvertSerializer,
        responses={200: JobPositionAdvertSerializer},
        summary="Update Job Position Advert",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def patch(self, request, advert_id):
        try:
            advert = JobPositionAdvert.objects.get(id=advert_id)
            advert.approval_status = 'under_update'
            serializer = JobPositionAdvertSerializer(
                advert, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                advert.confirm_update()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except JobPositionAdvert.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=JobPositionAdvertSerializer,
        responses={200: JobPositionAdvertSerializer},
        summary="Delete Job Position Advert",
        tags=["Recruitment"],
    )   
    @transaction.atomic()
    def delete(self, request, advert_id):
        try:
            advert = JobPositionAdvert.objects.get(id=advert_id)
            advert.approval_status = 'under_deletion'
            advert.save(update_fields=['approval_status'])
            advert.confirm_delete()
            return Response({"detail": "Job advert deleted successfully."}, status=200)
        except JobPositionAdvert.DoesNotExist:
            return Response({"detail": "Job advert not found."}, status=404)



class JobAdvertApplicationListAPI(APIView, SortableAPIMixin):
    parser_classes = [MultiPartParser, FormParser]
    allowed_ordering_fields = ['job_position_advert', 'created_at', 'applicant_name', 'applicant_email', 'applicant_phone', 'status']
    default_ordering = ['job_position_advert']

    permission_classes = [AllowAny]
    @extend_schema(
        request=JobAdvertApplicationSerializer,
        responses={201: JobAdvertApplicationSerializer},
        summary="Submit Job Application",
        tags=["Recruitment"],
    )
    def post(self, request, institution_id):
        print("Request body", request.data)
        serializer = JobAdvertApplicationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: JobAdvertApplicationSerializer(many=True)},
        summary="List Job Applications",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        applications = JobAdvertApplication.objects.filter(
            job_position_advert__job_position__department__institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("created_at")

        if search_query:
            applications = applications.filter(
                Q(applicant_name__icontains=search_query) |
                Q(applicant_email__icontains=search_query) |
                Q(applicant_phone__icontains=search_query)
            )

        try:
            applications = self.apply_sorting(applications, request)
        except ValueError as e:
            return Response ({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)      
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(applications, request)
        serializer = JobAdvertApplicationSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class JobAdvertApplicationDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: JobAdvertApplicationSerializer},
        summary="Get Job Application",
        tags=["Recruitment"],
    )
    def get(self, request, application_id):
        try:
            application = JobAdvertApplication.objects.get(id=application_id)
            serializer = JobAdvertApplicationSerializer(application)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except JobAdvertApplication.DoesNotExist:
            return Response(
                {"detail": "Application not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        request=JobAdvertApplicationSerializer,
        responses={200: JobAdvertApplicationSerializer},
        summary="Update Job Application",
        tags=["Recruitment"],
    )
    def patch(self, request, application_id):
        try:
            application = JobAdvertApplication.objects.get(id=application_id)
            serializer = JobAdvertApplicationSerializer(
                application, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except JobAdvertApplication.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


class InterviewStageListAPI(APIView, SortableAPIMixin):
    parser_classes = [MultiPartParser, FormParser]
    allowed_ordering_fields = ['job_position_advert', 'created_at', 'name', 'level', 'interviewers']
    default_ordering = ['job_position_advert']

    @extend_schema(
        request=InterviewStageSerializer,
        responses={201: InterviewStageSerializer},
        summary="Create Interview Stage",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def post(self, request, institution_id):
        serializer = InterviewStageSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: InterviewStageSerializer(many=True)},
        summary="List Interview Stages",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id):
        stages = InterviewStage.objects.filter(
            job_position_advert__job_position__department__institution_id=institution_id
        ).order_by("level")

        try:
            stages = self.apply_sorting(stages, request)
        except ValueError as e:
            return Response ({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)  
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(stages, request)
        serializer = InterviewStageSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class InterviewStageDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: InterviewStageSerializer},
        summary="Get Interview Stage",
        tags=["Recruitment"],
    )
    def get(self, request, stage_id):
        try:
            stage = InterviewStage.objects.get(id=stage_id)
            serializer = InterviewStageSerializer(stage)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except InterviewStage.DoesNotExist:
            return Response(
                {"detail": "Interview stage not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @extend_schema(
        request=InterviewStageSerializer,
        responses={200: InterviewStageSerializer},
        summary="Update Interview Stage",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def patch(self, request, stage_id):
        try:
            stage = InterviewStage.objects.get(id=stage_id)
            stage.approval_stage = 'under_update'
            serializer = InterviewStageSerializer(
                stage, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                stage.confirm_update()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except InterviewStage.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


class JobInterviewListAPI(APIView, SortableAPIMixin):
    parser_classes = [MultiPartParser, FormParser]
    allowed_ordering_fields = ['job_position_application', 'created_at', 'interview_stage', 'interview_type', 'interview_date', 'satus']
    default_ordering = ['job_position_application']

    @extend_schema(
        request=JobInterviewSerializer,
        responses={201: JobInterviewSerializer},
        summary="Schedule Job Interview",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def post(self, request, institution_id):
        serializer = JobInterviewSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: dict},
        summary="List Job Interviews with Cumulative Rating",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        status_filter = request.query_params.get('status', None)  
        date = request.query_params.get('date', None)

        interviews = (
            JobInterview.objects.filter(
                job_position_application__job_position_advert__job_position__department__institution_id=institution_id,
                deleted_at__isnull=True
            )
            .annotate(
                cumulative_rating=Coalesce(
                    Sum(
                        "job_position_application__interviews__rating",
                        filter=Q(job_position_application__interviews__rating__isnull=False),
                    ),
                    0,
                )
            )
            .order_by("-cumulative_rating", "-created_at")
        )

        if search_query:
            interviews = interviews.filter(
                Q(job_position_application__applicant_name__icontains=search_query) |
                Q(job_position_application__job_position_advert__job_position__name__icontains=search_query)
            )

        if status_filter:
            interviews = interviews.filter(status=status_filter)

        if date:
            interviews = interviews.filter(interview_date=date)

        interview_data = []
        for interview in interviews:
            serializer = JobInterviewSerializer(interview)
            interview_dict = serializer.data
            interview_dict["cumulative_rating"] = interview.cumulative_rating
            interview_data.append(interview_dict)

        try:
            interviews = self.apply_sorting(interviews, request)
        except ValueError as e:
            return Response ({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)      

        return Response(interview_data, status=status.HTTP_200_OK)


class JobInterviewDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: JobInterviewSerializer},
        summary="Get Job Interview",
        tags=["Recruitment"],
    )
    def get(self, request, interview_id):
        try:
            interview = JobInterview.objects.get(id=interview_id)
            serializer = JobInterviewSerializer(interview)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except JobInterview.DoesNotExist:
            return Response(
                {"detail": "Job interview not found."}, status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        request=JobInterviewSerializer,
        responses={200: JobInterviewSerializer},
        summary="Update Job Interview",
        tags=["Recruitment"],
    )
    @transaction.atomic()
    def patch(self, request, interview_id):
        try:
            interview = JobInterview.objects.get(id=interview_id)
            interview.approval_status = 'under_update'
            serializer = JobInterviewSerializer(
                interview, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                interview.confirm_update()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except JobInterview.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    
class RecruitmentDashboardAPIView(APIView):
    """
    API endpoint for recruitment dashboard analytics.
    Provides aggregated metrics on job positions, adverts, applications, interviews, and onboarding
    filtered by the authenticated user's institution.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Recruitment Dashboard'],
        description=(
            'Retrieves key analytics for the recruitment module dashboard, filtered by the authenticated user\'s institution. '
            'Metrics include counts of job positions, adverts, applications by status, '
            'interviews, upcoming interviews, onboarding statuses, average time to hire, application sources, '
            'and applications over time (last 6 months).'
        ),
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'total_job_positions': {'type': 'integer'},
                    'active_job_positions': {'type': 'integer'},
                    'total_adverts': {'type': 'integer'},
                    'active_adverts': {'type': 'integer'},
                    'total_applications': {'type': 'integer'},
                    'applications_by_status': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'status': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        }
                    },
                    'total_interviews': {'type': 'integer'},
                    'interviews_by_status': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'status': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        }
                    },
                    'upcoming_interviews': {'type': 'integer'},
                    'total_onboardings': {'type': 'integer'},
                    'onboardings_by_status': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'status': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        }
                    },
                    'average_time_to_hire_days': {'type': 'integer'},
                    'applications_sources': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'source': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        }
                    },
                    'applications_over_time': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'date': {'type': 'string'},
                                'count': {'type': 'integer'}
                            }
                        }
                    },
                }
            }
        }
    )
    def get(self, request):
        user = request.user
        institution = getattr(user.profile, "institution", None)

        if not institution:
            return Response(
                {"error": "User is not associated with any institution"},
                status=400
            )

        # Filter querysets by institution
        job_positions = JobPosition.objects.filter(department__institution=institution)
        adverts = JobPositionAdvert.objects.filter(job_position__department__institution=institution)
        applications = JobAdvertApplication.objects.filter(
            job_position_advert__job_position__department__institution=institution
        )
        interviews = JobInterview.objects.filter(
            job_position_application__job_position_advert__job_position__department__institution=institution
        )
        onboardings = OnBoarding.objects.filter(
            application__job_position_advert__job_position__department__institution=institution
        )

        # Job Positions
        total_job_positions = job_positions.count()
        active_job_positions = job_positions.filter(job_position_status='active').count()

        # Adverts
        total_adverts = adverts.count()
        active_adverts = adverts.filter(job_position_advert_status='active').count()

        # Applications
        total_applications = applications.count()
        applications_by_status = list(
            applications.values('status').annotate(count=Count('id')).order_by('status')
        )

        # Interviews
        total_interviews = interviews.count()
        interviews_by_status = list(
            interviews.values('status').annotate(count=Count('id')).order_by('status')
        )
        upcoming_interviews = interviews.filter(
            interview_date__gte=timezone.now(),
            interview_date__lte=timezone.now() + timedelta(days=7),
            status='scheduled'
        ).count()

        # Onboarding
        total_onboardings = onboardings.count()
        onboardings_by_status = list(
            onboardings.values('status').annotate(count=Count('id')).order_by('status')
        )

        # Average time to hire (for accepted offers)
        accepted_onboardings = onboardings.filter(status='accepted_offer').select_related('application')
        if accepted_onboardings.exists():
            time_diffs = [
                (timezone.now() - ob.application.application_date).days
                for ob in accepted_onboardings if ob.application
            ]
            average_time_to_hire = sum(time_diffs) // len(time_diffs) if time_diffs else 0
        else:
            average_time_to_hire = 0

        # Application sources
        applications_sources = list(
            applications.values('source').annotate(count=Count('id')).order_by('source')
        )

        # Applications over time (last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        applications_over_time = list(
            applications.filter(application_date__gte=six_months_ago)
            .annotate(date=TruncMonth('application_date'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
            .values('date', 'count')
        )
        # Format dates as strings (e.g., "Jan 2025")
        applications_over_time = [
            {
                'date': item['date'].strftime('%b %Y'),
                'count': item['count']
            }
            for item in applications_over_time
        ]

        data = {
            'total_job_positions': total_job_positions,
            'active_job_positions': active_job_positions,
            'total_adverts': total_adverts,
            'active_adverts': active_adverts,
            'total_applications': total_applications,
            'applications_by_status': applications_by_status,
            'total_interviews': total_interviews,
            'interviews_by_status': interviews_by_status,
            'upcoming_interviews': upcoming_interviews,
            'total_onboardings': total_onboardings,
            'onboardings_by_status': onboardings_by_status,
            'average_time_to_hire_days': average_time_to_hire,
            'applications_sources': applications_sources,
            'applications_over_time': applications_over_time,
        }

        return Response(data)    