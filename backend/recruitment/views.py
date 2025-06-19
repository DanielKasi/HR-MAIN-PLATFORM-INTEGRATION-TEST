from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from .serializers import JobPositionSerializer
from .models import JobPosition


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
            serializer.save(institution_id=institution_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: JobPositionSerializer(many=True)},
        description="List all job positions",
        summary="List Job Positions",
        tags=["Recruitment"],
    )
    def get(self, request, institution_id):
        job_positions = JobPosition.objects.filter(
            department__institution_id=institution_id
        )
        serializer = JobPositionSerializer(job_positions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class JobPositionDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: JobPositionSerializer},
        description="Retrieve a job position by ID",
        summary="Get Job Position",
        tags=["Recruitment"],
    )
    def get(self, request, job_position_id):
        try:
            job_position = JobPosition.objects.get(id=job_position_id)
            serializer = JobPositionSerializer(job_position)
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
