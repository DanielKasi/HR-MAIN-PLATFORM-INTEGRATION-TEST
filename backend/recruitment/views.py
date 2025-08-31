from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.db.models import Sum, Q
from django.db.models.functions import Coalesce
from workflows.serializers import (
    JobPositionWorkflowSerializer,
    JobPositionAdvertWorkflowSerializer,
)
from utilities.pagination import CustomPageNumberPagination

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


from django.db.models import Count, Avg, F
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers

from .models import JobInterview, JobAdvertApplication

from django.utils import timezone
from rest_framework.permissions import AllowAny
from datetime import timedelta
from django.db import transaction





class JobPositionListAPI(APIView):

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




class JobPositionAdvertListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

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



class JobAdvertApplicationListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

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


class InterviewStageListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

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


class JobInterviewListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

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
        status_filter = request.query_params.get('status', None)  # <-- renamed
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


class RecruitmentFunnelAnalyticsAPI(APIView):
    """
    A dedicated API view for recruitment funnel and pipeline analytics.
    """

    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Recruitment funnel and pipeline summary.",
                response=inline_serializer(
                    name='RecruitmentFunnelResponse',
                    fields={
                        'total_applications': serializers.IntegerField(
                            help_text="Total number of applications for the institution."
                        ),
                        'application_status_breakdown': serializers.DictField(
                            help_text="Count of applications by status.",
                            child=serializers.IntegerField(),
                        ),
                        'applications_per_advert': serializers.DictField(
                            help_text="Number of applications received for each active job advert.",
                            child=serializers.IntegerField(),
                        ),
                        'active_adverts_count': serializers.IntegerField(
                            help_text="Total number of currently active job advertisements."
                        ),
                    }
                ),
            ),
            404: OpenApiResponse(description="No applications or adverts found."),
        },
        summary="Get Recruitment Funnel Analytics",
        description=(
            "Provides a high-level overview of the recruitment pipeline, including total applications, "
            "status breakdown, and advert performance."
        ),
        tags=["Recruitment Analytics"],
    )
    def get(self, request, institution_id):
        """
        Calculates and returns key recruitment funnel metrics for an institution.
        """
        # Ensure we are only looking at applications for the specified institution
        applications = JobAdvertApplication.objects.filter(
            job_position_advert__job_position__department__institution_id=institution_id,
            deleted_at__isnull=True
        )
        
        if not applications.exists():
            return Response({"detail": "No applications found for this institution."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Total Applications Received
        total_applications = applications.count()
        
        # 2. Application Status Breakdown
        status_breakdown = applications.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        status_breakdown_dict = {
            item['status']: item['count'] for item in status_breakdown
        }

        # 3. Applications per Active Advert
        applications_per_advert = applications.values(
            'job_position_advert__job_position__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        applications_per_advert_dict = {
            item['job_position_advert__job_position__name']: item['count']
            for item in applications_per_advert if item['job_position_advert__job_position__name']
        }
        
        # 4. Count of Active Adverts
        active_adverts_count = JobPositionAdvert.objects.filter(
            job_position_advert_status='active',
            job_position__department__institution_id=institution_id
        ).count()
        
        response_data = {
            "total_applications": total_applications,
            "application_status_breakdown": status_breakdown_dict,
            "applications_per_advert": applications_per_advert_dict,
            "active_adverts_count": active_adverts_count,
        }

        return Response(response_data, status=status.HTTP_200_OK)



class JobAdvertSourcingAnalyticsAPI(APIView):
    """
    A dedicated API view for job advert and sourcing analytics.
    """
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Job advert and sourcing summary.",
                response=inline_serializer(
                    name='JobAdvertSourcingResponse',
                    fields={
                        'applications_by_source': serializers.DictField(
                            help_text="Count of applications by recruitment source.",
                            child=serializers.IntegerField(),
                        ),
                        'applications_per_advert': serializers.FloatField(
                            help_text="Average number of applications per active job advert."
                        ),
                        'average_time_to_fill_days': serializers.FloatField(
                            help_text="Average time (in days) from advert publication to a candidate's status being 'passed'."
                        ),
                        'advert_performance_list': serializers.ListField(
                            help_text="Detailed performance for each active advert.",
                            child=serializers.DictField(),
                        ),
                    }
                ),
            ),
            404: OpenApiResponse(description="No applications or adverts found."),
        },
        summary="Get Job Advert & Sourcing Analytics",
        description=(
            "Analyzes the effectiveness of recruitment channels and provides metrics on "
            "advert performance and time-to-fill."
        ),
        tags=["Recruitment Analytics"],
    )
    def get(self, request, institution_id):
        """
        Calculates and returns key job advert and sourcing metrics for an institution.
        """
        adverts = JobPositionAdvert.objects.filter(
            job_position__department__institution_id=institution_id,
            deleted_at__isnull=True
        )

        if not adverts.exists():
            return Response({"detail": "No job adverts found for this institution."}, status=status.HTTP_404_NOT_FOUND)

        applications = JobAdvertApplication.objects.filter(
            job_position_advert__in=adverts,
            deleted_at__isnull=True
        )
        
        if not applications.exists():
            return Response({"detail": "No applications found for this institution."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Applications by Source
        applications_by_source_data = applications.values('source').annotate(count=Count('id')).order_by('-count')
        applications_by_source = {
            item['source']: item['count'] for item in applications_by_source_data
        }

        # 2. Average Applications per Advert
        applications_per_advert_data = applications.values('job_position_advert').annotate(
            count=Count('id')
        )
        total_adverts_with_applications = applications_per_advert_data.count()
        total_applications = applications.count()
        
        avg_applications_per_advert = (
            total_applications / total_adverts_with_applications
        ) if total_adverts_with_applications > 0 else 0

        # 3. Average Time-to-Fill (using 'passed' as a proxy for successful application)
        # Note: 'updated_at' is used as a proxy for status change time.
        # A more robust solution would track status change dates explicitly.
        successful_applications = applications.filter(status='passed').annotate(
            time_to_fill=F('updated_at') - F('job_position_advert__published_date')
        )
        
        avg_time_to_fill_days = None
        if successful_applications.exists():
            total_time_to_fill = sum(
                [app.time_to_fill for app in successful_applications],
                timedelta()
            )
            avg_time_to_fill = total_time_to_fill / successful_applications.count()
            avg_time_to_fill_days = avg_time_to_fill.total_seconds() / (60 * 60 * 24)

        # 4. Detailed Advert Performance List
        advert_performance_list = []
        for advert in adverts.annotate(num_applications=Count('applications')):
            advert_performance_list.append({
                "advert_id": advert.id,
                "job_title": advert.job_position.name,
                "published_date": advert.published_date,
                "status": advert.job_position_advert_status,
                "number_of_applications": advert.num_applications,
            })

        response_data = {
            "applications_by_source": applications_by_source,
            "applications_per_advert": round(avg_applications_per_advert, 2),
            "average_time_to_fill_days": round(avg_time_to_fill_days, 2) if avg_time_to_fill_days is not None else None,
            "advert_performance_list": advert_performance_list,
        }

        return Response(response_data, status=status.HTTP_200_OK)
    


class InterviewCandidateAnalyticsAPI(APIView):
    """
    A dedicated API view for interview and candidate quality analytics.
    """
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Interview and candidate quality summary.",
                response=inline_serializer(
                    name='InterviewCandidateResponse',
                    fields={
                        'overall_avg_interview_rating': serializers.FloatField(
                            help_text="Overall average rating from all completed interviews."
                        ),
                        'avg_rating_by_stage': serializers.DictField(
                            help_text="Average interview rating for each interview stage.",
                            child=serializers.FloatField(),
                        ),
                        'interview_to_passed_ratio': serializers.FloatField(
                            help_text="Ratio of completed interviews to applications with 'passed' status."
                        ),
                        'interview_completion_rate': serializers.FloatField(
                            help_text="Percentage of scheduled interviews that were completed."
                        ),
                    }
                ),
            ),
            404: OpenApiResponse(description="No interview data found."),
        },
        summary="Get Interview & Candidate Quality Analytics",
        description=(
            "Provides insights into the efficiency of the interview process and the quality of candidates, "
            "including average ratings and completion rates."
        ),
        tags=["Recruitment Analytics"],
    )
    def get(self, request, institution_id):
        """
        Calculates and returns key interview and candidate quality metrics.
        """
        # Filter all interviews for the specified institution
        interviews = JobInterview.objects.filter(
            job_position_application__job_position_advert__job_position__department__institution_id=institution_id,
            deleted_at__isnull=True
        )

        if not interviews.exists():
            return Response({"detail": "No interview data found for this institution."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Overall Average Interview Rating
        completed_interviews = interviews.filter(status='completed', rating__isnull=False)
        overall_avg_rating = completed_interviews.aggregate(avg_rating=Avg('rating'))['avg_rating']

        # 2. Average Rating by Stage
        avg_rating_by_stage_data = completed_interviews.values('interview_stage__name').annotate(
            avg_rating=Avg('rating')
        ).order_by('interview_stage__name')
        
        avg_rating_by_stage = {
            item['interview_stage__name']: round(item['avg_rating'], 2)
            for item in avg_rating_by_stage_data
        }

        # 3. Interview-to-Passed Ratio
        total_completed_interviews = completed_interviews.count()
        total_passed_applications = JobAdvertApplication.objects.filter(
            job_position_advert__job_position__department__institution_id=institution_id,
            status='passed'
        ).count()
        
        interview_to_passed_ratio = (
            total_completed_interviews / total_passed_applications
        ) if total_passed_applications > 0 else 0
        
        # 4. Interview Completion Rate
        total_interviews = interviews.count()
        interview_completion_rate = (
            total_completed_interviews / total_interviews
        ) if total_interviews > 0 else 0

        response_data = {
            "overall_avg_interview_rating": round(overall_avg_rating, 2) if overall_avg_rating is not None else None,
            "avg_rating_by_stage": avg_rating_by_stage,
            "interview_to_passed_ratio": round(interview_to_passed_ratio, 2),
            "interview_completion_rate": round(interview_completion_rate * 100, 2),
        }

        return Response(response_data, status=status.HTTP_200_OK)