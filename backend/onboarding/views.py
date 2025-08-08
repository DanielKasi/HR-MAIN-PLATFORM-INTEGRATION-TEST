from utilities.pagination import CustomPageNumberPagination
from recruitment.models import JobAdvertApplication
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.db import transaction
from rest_framework import serializers
from workflows.serializers import (
    ResignationRequestWorkflowSerializer,
    TerminationInitiationWorkflowSerializer,
    RetirementRequestWorkflowSerializer,
)

from .models import (
    OnBoarding,
    OffboardingStage,
    InstitutionEmployeeSeparationTypes,
    InstitutionSeparationPolicy,
    ResignationRequest,
    TerminationInitiation,
    RetirementRequest,
)
from .serializers import (
    OnBoardingSerializer,
    OffboardingStageSerializer,
    InstitutionEmployeeSeparationTypesSerializer,
    InstitutionSeparationPolicySerializer,
    ResignationRequestSerializer,
    TerminationInitiationSerializer,
    RetirementRequestSerializer,
)
from institution.models import Institution


class OnBoardingListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=OnBoardingSerializer,
        responses={201: OnBoardingSerializer},
        summary="Create Onboarding Record",
        tags=["Onboarding"],
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
        tags=["Onboarding"],
    )
    def get(self, request, institution_id):
        onboardings = OnBoarding.objects.filter(
            application__job_position_advert__job_position__department__institution_id=institution_id
        ).order_by("-created_at")

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(onboardings, request)
        serializer = OnBoardingSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class OnBoardingDetailAPI(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        responses={200: OnBoardingSerializer},
        summary="Get Onboarding Record",
        tags=["Onboarding"],
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
        tags=["Onboarding"],
    )
    def patch(self, request, onboarding_id):
        try:
            onboarding = OnBoarding.objects.get(id=onboarding_id)
            serializer = OnBoardingSerializer(
                onboarding, data=request.data, partial=True
            )
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
            "type": "object",
            "properties": {
                "application_ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "List of JobAdvertApplication IDs to create onboarding records for",
                }
            },
            "required": ["application_ids"],
        },
        responses={
            201: serializers.Serializer(
                "BulkOnBoardingResponse",
                {
                    "created": OnBoardingSerializer(many=True),
                    "skipped": serializers.ListSerializer(
                        child=serializers.DictField()
                    ),
                    "summary": serializers.DictField(),
                },
            ),
            400: serializers.Serializer(
                "ErrorResponse", {"error": serializers.CharField()}
            ),
        },
        summary="Bulk Create Onboarding Records",
        description="Create onboarding records for multiple applications with initial status",
        tags=["Onboarding"],
    )
    def post(self, request):
        application_ids = request.data.get("application_ids", [])

        if not application_ids:
            return Response(
                {"error": "application_ids is required and cannot be empty"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(application_ids, list):
            return Response(
                {"error": "application_ids must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_onboardings = []
        skipped_applications = []

        try:
            with transaction.atomic():
                # Get all valid applications
                valid_applications = JobAdvertApplication.objects.filter(
                    id__in=application_ids
                ).select_related("onboarding")

                valid_app_ids = set(valid_applications.values_list("id", flat=True))
                invalid_app_ids = set(application_ids) - valid_app_ids

                # Track invalid application IDs
                for invalid_id in invalid_app_ids:
                    skipped_applications.append(
                        {
                            "application_id": invalid_id,
                            "reason": "Application not found",
                        }
                    )

                # Process valid applications
                for application in valid_applications:
                    # Check if onboarding record already exists
                    if hasattr(application, "onboarding"):
                        skipped_applications.append(
                            {
                                "application_id": application.id,
                                "reason": "Onboarding record already exists",
                            }
                        )
                        continue

                    # Create onboarding record
                    onboarding = OnBoarding.objects.create(
                        application=application, status="initial"
                    )
                    created_onboardings.append(onboarding)

        except Exception as e:
            return Response(
                {"error": f"Failed to create onboarding records: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Serialize created onboarding records
        serializer = OnBoardingSerializer(created_onboardings, many=True)

        response_data = {
            "created": serializer.data,
            "skipped": skipped_applications,
            "summary": {
                "total_requested": len(application_ids),
                "created_count": len(created_onboardings),
                "skipped_count": len(skipped_applications),
            },
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class OffboardingStageListCreateView(APIView):

    @extend_schema(
        request=OffboardingStageSerializer,
        responses={201: OffboardingStageSerializer},
        summary="Create Offboarding Stage",
        tags=["Offboarding"],
    )
    def post(self, request):
        serializer = OffboardingStageSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: OffboardingStageSerializer(many=True)},
        summary="List Offboarding Stages",
        tags=["Offboarding"],
    )
    def get(self, request):

        user = request.user

        institution = getattr(user.profile, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        stages = OffboardingStage.objects.filter(institution=institution).order_by(
            "-created_at"
        )
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(stages, request)
        serializer = OffboardingStageSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class OffboardingStageDetailView(APIView):

    @extend_schema(
        responses={200: OffboardingStageSerializer},
        summary="Get Offboarding Stage",
        tags=["Offboarding"],
    )
    def get(self, request, stage_id):
        try:
            stage = OffboardingStage.objects.get(id=stage_id)
            serializer = OffboardingStageSerializer(stage)
            return Response(serializer.data)
        except OffboardingStage.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=OffboardingStageSerializer,
        responses={200: OffboardingStageSerializer},
        summary="Update Offboarding Stage",
        tags=["Offboarding"],
    )
    def patch(self, request, stage_id):
        try:
            stage = OffboardingStage.objects.get(id=stage_id)
            serializer = OffboardingStageSerializer(
                stage, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except OffboardingStage.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        responses={204: None},
        summary="Delete Offboarding Stage",
        tags=["Offboarding"],
    )
    def delete(self, request, stage_id):
        try:
            stage = OffboardingStage.objects.get(id=stage_id)
            stage.is_active = False
            stage.save()
            return Response(status=204)
        except OffboardingStage.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


class InstitutionEmployeeSeparationTypesListCreateView(APIView):

    @extend_schema(
        request=InstitutionEmployeeSeparationTypesSerializer,
        responses={201: InstitutionEmployeeSeparationTypesSerializer},
        summary="Create Institution Employee Separation Type",
        tags=["Offboarding"],
    )
    def post(self, request):
        serializer = InstitutionEmployeeSeparationTypesSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: InstitutionEmployeeSeparationTypesSerializer(many=True)},
        summary="List Institution Employee Separation Types",
        tags=["Offboarding"],
    )
    def get(self, request):
        user = request.user
        institution = getattr(user.profile, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)
        separation_types = InstitutionEmployeeSeparationTypes.objects.filter(
            institution=institution
        ).order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(separation_types, request)
        serializer = InstitutionEmployeeSeparationTypesSerializer(
            paginated_qs, many=True
        )
        return paginator.get_paginated_response(serializer.data)


class InstitutionEmployeeSeparationTypesDetailView(APIView):

    @extend_schema(
        responses={200: InstitutionEmployeeSeparationTypesSerializer},
        summary="Get Institution Employee Separation Type",
        tags=["Offboarding"],
    )
    def get(self, request, separation_type_id):
        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                id=separation_type_id
            )
            serializer = InstitutionEmployeeSeparationTypesSerializer(separation_type)
            return Response(serializer.data)
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=InstitutionEmployeeSeparationTypesSerializer,
        responses={200: InstitutionEmployeeSeparationTypesSerializer},
        summary="Update Institution Employee Separation Type",
        tags=["Offboarding"],
    )
    def patch(self, request, separation_type_id):
        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                id=separation_type_id
            )
            serializer = InstitutionEmployeeSeparationTypesSerializer(
                separation_type, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        responses={204: None},
        summary="Delete Institution Employee Separation Type",
        tags=["Offboarding"],
    )
    def delete(self, request, separation_type_id):
        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                id=separation_type_id
            )
            separation_type.is_active = False
            separation_type.save()
            return Response(status=204)
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


class InstitutionSeparationPolicyListCreateView(APIView):

    @extend_schema(
        request=InstitutionSeparationPolicySerializer,
        responses={201: InstitutionSeparationPolicySerializer},
        summary="Create Institution Separation Policy",
        tags=["Offboarding"],
    )
    def post(self, request):
        serializer = InstitutionSeparationPolicySerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: InstitutionSeparationPolicySerializer(many=True)},
        summary="List Institution Separation Policies",
        tags=["Offboarding"],
    )
    def get(self, request):
        user = request.user

        institution = getattr(user.profile, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        policies = InstitutionSeparationPolicy.objects.filter(
            separation_type__institution=institution
        ).order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(policies, request)
        serializer = InstitutionSeparationPolicySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class InstitutionSeparationPolicyDetailView(APIView):

    @extend_schema(
        responses={200: InstitutionSeparationPolicySerializer},
        summary="Get Institution Separation Policy",
        tags=["Offboarding"],
    )
    def get(self, request, policy_id):
        try:
            policy = InstitutionSeparationPolicy.objects.get(id=policy_id)
            serializer = InstitutionSeparationPolicySerializer(policy)
            return Response(serializer.data)
        except InstitutionSeparationPolicy.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=InstitutionSeparationPolicySerializer,
        responses={200: InstitutionSeparationPolicySerializer},
        summary="Update Institution Separation Policy",
        tags=["Offboarding"],
    )
    def patch(self, request, policy_id):
        try:
            policy = InstitutionSeparationPolicy.objects.get(id=policy_id)
            serializer = InstitutionSeparationPolicySerializer(
                policy, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except InstitutionSeparationPolicy.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        responses={204: None},
        summary="Delete Institution Separation Policy",
        tags=["Offboarding"],
    )
    def delete(self, request, policy_id):
        try:
            policy = InstitutionSeparationPolicy.objects.get(id=policy_id)
            policy.save()
            return Response(status=204)
        except InstitutionSeparationPolicy.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


class ResignationRequestListCreateView(APIView):
    @extend_schema(
        request=ResignationRequestSerializer,
        responses={201: ResignationRequestSerializer},
        summary="Create Resignation Request",
        tags=["Offboarding"],
    )
    def post(self, request):
        employee = getattr(request.user, "employee", None)
        if not employee:
            return Response(
                {"detail": "Authenticated user is not linked to an employee."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ResignationRequestSerializer(
            data=request.data, context={"employee": employee}
        )

        if serializer.is_valid():
            instance = serializer.save()
            return Response(
                ResignationRequestSerializer(instance).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: ResignationRequestSerializer(many=True)},
        summary="List Resignation Requests",
        tags=["Offboarding"],
    )
    def get(self, request):
        queryset = ResignationRequest.objects.all().order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = ResignationRequestSerializer(paginated_qs, many=True)

        return paginator.get_paginated_response(serializer.data)


class ResignationRequestDetailView(APIView):
    @extend_schema(
        responses={200: ResignationRequestSerializer},
        summary="Get Resignation Request",
        tags=["Offboarding"],
    )
    def get(self, request, resignation_request_id):
        try:
            resignation_request = ResignationRequest.objects.get(
                id=resignation_request_id
            )
            serializer = ResignationRequestSerializer(resignation_request)
            return Response(serializer.data)
        except ResignationRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=ResignationRequestSerializer,
        responses={200: ResignationRequestSerializer},
        summary="Update Resignation Request",
        tags=["Offboarding"],
    )
    def patch(self, request, resignation_request_id):
        try:
            resignation_request = ResignationRequest.objects.get(
                id=resignation_request_id
            )
            serializer = ResignationRequestSerializer(
                resignation_request, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except ResignationRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        responses={204: None},
        summary="Delete Resignation Request",
        tags=["Offboarding"],
    )
    def delete(self, request, resignation_request_id):
        try:
            resignation_request = ResignationRequest.objects.get(
                id=resignation_request_id
            )
            resignation_request.is_active = False
            resignation_request.save()
            return Response(status=204)
        except ResignationRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


class ResignationRequestByLoggedInUser(APIView):
    @extend_schema(
        responses={200: ResignationRequestSerializer(many=True)},
        summary="List Resignation Requests by Logged In User",
        tags=["Offboarding"],
    )
    def get(self, request):
        employee = getattr(request.user, "employee", None)
        if not employee:
            return Response(
                {"detail": "Authenticated user is not linked to an employee."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = ResignationRequest.objects.filter(
            separation__employee=employee
        ).order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = ResignationRequestSerializer(paginated_qs, many=True)

        return paginator.get_paginated_response(serializer.data)


class TerminationInitiationListCreateView(APIView):
    @extend_schema(
        request=TerminationInitiationSerializer,
        responses={201: TerminationInitiationSerializer},
        summary="Initiate Employee Termination",
        tags=["Offboarding"],
    )
    def post(self, request):

        serializer = TerminationInitiationSerializer(
            data=request.data, context={"request": request}
        )

        if serializer.is_valid():
            instance = serializer.save()
            return Response(
                TerminationInitiationSerializer(instance).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: TerminationInitiationSerializer(many=True)},
        summary="List Termination Initiations",
        tags=["Offboarding"],
    )
    def get(self, request):
        queryset = TerminationInitiation.objects.all().order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(queryset, request)
        serializer = TerminationInitiationSerializer(paginated_qs, many=True)

        return paginator.get_paginated_response(serializer.data)


class TerminationInitiationDetailView(APIView):
    @extend_schema(
        responses={200: TerminationInitiationSerializer},
        summary="Get Termination Initiation",
        tags=["Offboarding"],
    )
    def get(self, request, termination_initiation_id):
        try:
            termination_initiation = TerminationInitiation.objects.get(
                id=termination_initiation_id
            )
            serializer = TerminationInitiationSerializer(termination_initiation)
            return Response(serializer.data)
        except TerminationInitiation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        request=TerminationInitiationSerializer,
        responses={200: TerminationInitiationSerializer},
        summary="Update Termination Initiation",
        tags=["Offboarding"],
    )
    def patch(self, request, termination_initiation_id):
        try:
            termination_initiation = TerminationInitiation.objects.get(
                id=termination_initiation_id
            )
            serializer = TerminationInitiationSerializer(
                termination_initiation, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except TerminationInitiation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        responses={204: None},
        summary="Delete Termination Initiation",
        tags=["Offboarding"],
    )
    def delete(self, request, termination_initiation_id):
        try:
            termination_initiation = TerminationInitiation.objects.get(
                id=termination_initiation_id
            )
            termination_initiation.is_active = False
            termination_initiation.save()
            return Response(status=204)
        except TerminationInitiation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
