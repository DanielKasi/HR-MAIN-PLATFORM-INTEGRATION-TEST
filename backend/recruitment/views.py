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
    ContractTemplateSerializer,
)
from .models import (
    InterviewStage,
    JobAdvertApplication,
    JobInterview,
    JobPosition,
    JobPositionAdvert,
    ContractTemplate,
)


class JobPositionListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

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
        job_positions = JobPosition.objects.filter(
            department__institution_id=institution_id
        ).order_by("-created_at")
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

class ContractTemplateListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=ContractTemplateSerializer,
        responses={201: ContractTemplateSerializer},
        description="Create a new contract template for an institution",
        summary="Create Contract Template",
        tags=["Contract Templates"],
    )
    def post(self, request, institution_id):
        serializer = ContractTemplateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(institution_id=institution_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: ContractTemplateSerializer(many=True)},
        description="List all contract templates for an institution",
        summary="List Contract Templates",
        tags=["Contract Templates"],
    )
    def get(self, request, institution_id):
        templates = ContractTemplate.objects.filter(
            institution_id=institution_id
        ).order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(templates, request)
        serializer = ContractTemplateSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

class ContractTemplateDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: ContractTemplateSerializer},
        description="Retrieve a contract template by ID",
        summary="Get Contract Template",
        tags=["Contract Templates"],
    )
    def get(self, request, template_id):
        try:
            template = ContractTemplate.objects.get(id=template_id)
            serializer = ContractTemplateSerializer(template)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ContractTemplate.DoesNotExist:
            return Response(
                {"detail": "Contract template not found."},
                status=status.HTTP_404_NOT_FOUND
            )

    @extend_schema(
        request=ContractTemplateSerializer,
        responses={200: ContractTemplateSerializer},
        description="Update a contract template by ID",
        summary="Update Contract Template",
        tags=["Contract Templates"],
    )
    def patch(self, request, template_id):
        try:
            template = ContractTemplate.objects.get(id=template_id)
            serializer = ContractTemplateSerializer(
                template, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except ContractTemplate.DoesNotExist:
            return Response(
                {"detail": "Contract template not found."},
                status=status.HTTP_404_NOT_FOUND
            ) 

    def delete(self, request, template_id):
        try:
            template = ContractTemplate.objects.get(id=template_id)
            template.delete()
            return Response(
                {"detail": "Contract template deleted successfully."},
                status=status.HTTP_204_NO_CONTENT
            )
        except ContractTemplate.DoesNotExist:
            return Response(
                {"detail": "Contract template not found."},
                status=status.HTTP_404_NOT_FOUND
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

    @extend_schema(
        responses={200: JobPositionAdvertWorkflowSerializer(many=True)},
        summary="List Job Position Adverts",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id):
        adverts = JobPositionAdvert.objects.filter(
            job_position__department__institution_id=institution_id
        ).order_by("-published_date")

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
        applications = JobAdvertApplication.objects.filter(
            job_position_advert__job_position__department__institution_id=institution_id
        ).order_by("created_at")
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
        interviews = (
            JobInterview.objects.filter(
                job_position_application__job_position_advert__job_position__department__institution_id=institution_id
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
