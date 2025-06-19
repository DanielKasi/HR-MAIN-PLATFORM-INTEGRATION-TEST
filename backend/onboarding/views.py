

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from .models import OnBoarding
from .serializers import OnBoardingSerializer

class OnBoardingListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=OnBoardingSerializer,
        responses={201: OnBoardingSerializer},
        summary="Create Onboarding Record",
        tags=["Onboarding"]
    )
    def post(self, request):
        serializer = OnBoardingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: OnBoardingSerializer(many=True)},
        summary="List Onboarding Records by Institution",
        tags=["Onboarding"]
    )
    def get(self, request, institution_id):
        onboardings = OnBoarding.objects.filter(
            application__job_position_advert__job_position__department__institution_id=institution_id
        )
        serializer = OnBoardingSerializer(onboardings, many=True)
        return Response(serializer.data, status=200)


class OnBoardingDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: OnBoardingSerializer},
        summary="Get Onboarding Record",
        tags=["Onboarding"]
    )
    def get(self, request, onboarding_id):
        try:
            onboarding = OnBoarding.objects.get(id=onboarding_id)
            serializer = OnBoardingSerializer(onboarding)
            return Response(serializer.data)
        except OnBoarding.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=OnBoardingSerializer,
        responses={200: OnBoardingSerializer},
        summary="Update Onboarding Record",
        tags=["Onboarding"]
    )
    def patch(self, request, onboarding_id):
        try:
            onboarding = OnBoarding.objects.get(id=onboarding_id)
            serializer = OnBoardingSerializer(onboarding, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except OnBoarding.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
