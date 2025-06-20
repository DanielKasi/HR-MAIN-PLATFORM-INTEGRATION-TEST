

from recruitment.models import JobAdvertApplication
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.db import transaction
from rest_framework import serializers

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


class BulkOnBoardingCreateAPI(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        request={
            'type': 'object',
            'properties': {
                'application_ids': {
                    'type': 'array',
                    'items': {'type': 'integer'},
                    'description': 'List of JobAdvertApplication IDs to create onboarding records for'
                }
            },
            'required': ['application_ids']
        },
        responses={
            201: serializers.Serializer( 
                'BulkOnBoardingResponse',
                {
                    'created': OnBoardingSerializer(many=True),
                    'skipped': serializers.ListSerializer(
                        child=serializers.DictField()
                    ),
                    'summary': serializers.DictField()
                }
            ),
            400: serializers.Serializer(
                'ErrorResponse',
                {
                    'error': serializers.CharField()
                }
            )
        },
        summary="Bulk Create Onboarding Records",
        description="Create onboarding records for multiple applications with initial status",
        tags=["Onboarding"]
    )
    def post(self, request):
        application_ids = request.data.get('application_ids', [])
        
        if not application_ids:
            return Response(
                {"error": "application_ids is required and cannot be empty"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(application_ids, list):
            return Response(
                {"error": "application_ids must be a list"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_onboardings = []
        skipped_applications = []
        
        try:
            with transaction.atomic():
                # Get all valid applications
                valid_applications = JobAdvertApplication.objects.filter(
                    id__in=application_ids
                ).select_related('onboarding')
                
                valid_app_ids = set(valid_applications.values_list('id', flat=True))
                invalid_app_ids = set(application_ids) - valid_app_ids
                
                # Track invalid application IDs
                for invalid_id in invalid_app_ids:
                    skipped_applications.append({
                        'application_id': invalid_id,
                        'reason': 'Application not found'
                    })
                
                # Process valid applications
                for application in valid_applications:
                    # Check if onboarding record already exists
                    if hasattr(application, 'onboarding'):
                        skipped_applications.append({
                            'application_id': application.id,
                            'reason': 'Onboarding record already exists'
                        })
                        continue
                    
                    # Create onboarding record
                    onboarding = OnBoarding.objects.create(
                        application=application,
                        status='initial'
                    )
                    created_onboardings.append(onboarding)
        
        except Exception as e:
            return Response(
                {"error": f"Failed to create onboarding records: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Serialize created onboarding records
        serializer = OnBoardingSerializer(created_onboardings, many=True)
        
        response_data = {
            'created': serializer.data,
            'skipped': skipped_applications,
            'summary': {
                'total_requested': len(application_ids),
                'created_count': len(created_onboardings),
                'skipped_count': len(skipped_applications)
            }
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)