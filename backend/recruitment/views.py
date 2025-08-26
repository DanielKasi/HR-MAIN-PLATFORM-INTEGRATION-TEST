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
from django.utils import timezone
from rest_framework.permissions import AllowAny




class JobPositionListAPI(APIView):

    @extend_schema(
        request=JobPositionSerializer,
        responses={201: JobPositionSerializer},
        description="Create a new job position",
        summary="Create Job Position",
        tags=["Recruitment"],
    )
    def post(self, request, institution_id):
        serializer = JobPositionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
    def patch(self, request, job_position_id):
        try:
            job_position = JobPosition.objects.get(id=job_position_id)
            serializer = JobPositionSerializer(
                job_position, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
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
    def delete(self, request, job_position_id):
        try:
            job_position = JobPosition.objects.get(id=job_position_id)
            job_position.delete()
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
    def post(self, request, institution_id):
        serializer = JobPositionAdvertSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(adverts, request)
        serializer = JobPositionAdvertWorkflowSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class JobPositionAdvertDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

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
    def patch(self, request, advert_id):
        try:
            advert = JobPositionAdvert.objects.get(id=advert_id)
            serializer = JobPositionAdvertSerializer(
                advert, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
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
    def delete(self, request, advert_id):
        try:
            advert = JobPositionAdvert.objects.get(id=advert_id)
            advert.delete()
            return Response({"detail": "Job advert deleted successfully."}, status=200)
        except JobPositionAdvert.DoesNotExist:
            return Response({"detail": "Job advert not found."}, status=404)



class JobAdvertApplicationListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=JobAdvertApplicationSerializer,
        responses={201: JobAdvertApplicationSerializer},
        summary="Submit Job Application",
        tags=["Recruitment"],
    )
    def post(self, request, institution_id):
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
    def post(self, request, institution_id):
        serializer = InterviewStageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
    def patch(self, request, stage_id):
        try:
            stage = InterviewStage.objects.get(id=stage_id)
            serializer = InterviewStageSerializer(
                stage, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
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
    def post(self, request, institution_id):
        serializer = JobInterviewSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: dict},
        summary="List Job Interviews with Cumulative Rating",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        interviews = (
            JobInterview.objects.filter(
                job_position_application__job_position_advert__job_position__department__institution_id=institution_id,
                deleted_at__isnull=True
            )
            .annotate(
                # Calculate cumulative rating for each application across all their interviews
                cumulative_rating=Coalesce(
                    Sum(
                        "job_position_application__interviews__rating",
                        filter=Q(
                            job_position_application__interviews__rating__isnull=False
                        ),
                    ),
                    0,
                )
            )
            .order_by("-cumulative_rating", "-created_at")
        )  # Default order by cumulative rating desc

        if search_query:
            interviews = interviews.filter(
                Q(job_position_application__applicant_name__icontains=search_query) |
                Q(job_position_application__job_position_advert__job_position__name__icontains=search_query)

            )

        # Serialize interviews and add cumulative rating to response
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
    def patch(self, request, interview_id):
        try:
            interview = JobInterview.objects.get(id=interview_id)
            serializer = JobInterviewSerializer(
                interview, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except JobInterview.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
