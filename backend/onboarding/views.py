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
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import (
    EmployeeSeparation,
    OnBoarding,
    OffboardingStage,
    InstitutionEmployeeSeparationTypes,
    InstitutionSeparationPolicy,
    ResignationRequest,
    TerminationInitiation,
    RetirementRequest,
)
from .serializers import (
    EmployeeSeparationSerializer,
    OnBoardingSerializer,
    OffboardingStageSerializer,
    InstitutionEmployeeSeparationTypesSerializer,
    InstitutionSeparationPolicySerializer,
    ResignationRequestSerializer,
    TerminationInitiationSerializer,
    RetirementRequestSerializer,
)
from institution.models import Institution
from django.db.models import Q, Count
from django.db import transaction



class OnBoardingListAPI(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=OnBoardingSerializer,
        responses={201: OnBoardingSerializer},
        summary="Create Onboarding Record",
        tags=["Onboarding"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = OnBoardingSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: OnBoardingSerializer(many=True)},
        summary="List Onboarding Records by Institution",
        tags=["Onboarding"],
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        status = request.query_params.get('status', None)
        onboardings = OnBoarding.objects.filter(
            application__job_position_advert__job_position__department__institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            onboardings= onboardings.filter(
                Q(application__applicant_name__icontains=search_query) |
                Q(application__applicant_email__icontains=search_query) |
                Q(application__job_position_advert__job_position__name__icontains=search_query)
            )
            
        if status:
            onboardings = onboardings.filter(status=status)    

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
    @transaction.atomic()
    def patch(self, request, onboarding_id):
        try:
            onboarding = OnBoarding.objects.get(id=onboarding_id)
            onboarding.approval_status = 'under_update'
            serializer = OnBoardingSerializer(
                onboarding, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                onboarding.confirm_update()
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
        # responses={
        #     201: {
        #         "type": "object",
        #         "properties": {
        #             "created": OnBoardingSerializer(many=True),
        #             "skipped": {
        #                 "type": "array",
        #                 "items": {"type": "object", "properties": {"application_id": {"type": "integer"}, "reason": {"type": "string"}}},
        #             },
        #             "summary": {
        #                 "type": "object",
        #                 "properties": {
        #                     "total_requested": {"type": "integer"},
        #                     "created_count": {"type": "integer"},
        #                     "skipped_count": {"type": "integer"},
        #                 },
        #             },
        #         },
        #     },
        #     400: {
        #         "type": "object",
        #         "properties": {"error": {"type": "string"}},
        #     },
        # },
        summary="Bulk Create Onboarding Records",
        description="Create onboarding records for multiple applications with initial status",
        tags=["Onboarding"],
    )
    @transaction.atomic()
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

        # Validate that all application_ids are integers
        if not all(isinstance(app_id, int) for app_id in application_ids):
            return Response(
                {"error": "All application_ids must be integers"},
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
                    if hasattr(application, "onboarding") and application.onboarding:
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
                    # Trigger approval workflow for the created onboarding
                    onboarding.confirm_create()
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
    @transaction.atomic()
    def post(self, request):
        serializer = OffboardingStageSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: OffboardingStageSerializer(many=True)},
        summary="List Offboarding Stages",
        tags=["Offboarding"],
    )
    def get(self, request):
        search_query = request.query_params.get('search', None)
        user = request.user

        institution = getattr(user.profile, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        stages = OffboardingStage.objects.filter(institution=institution, deleted_at__isnull=True).order_by(
            "-created_at"
        )

        if search_query:
            stages = stages.filter(
                Q(stage_name__icontains=search_query)
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
    @transaction.atomic()
    def patch(self, request, stage_id):
        try:
            stage = OffboardingStage.objects.get(id=stage_id)
            stage.approval_status = 'under_update'
            serializer = OffboardingStageSerializer(
                stage, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                stage.confirm_update()
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
            stage.approval_status = 'under_deletion'
            stage.save(update_fields=['approval_status'])
            stage.confirm_delete()
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
    @transaction.atomic()
    def post(self, request):
        serializer = InstitutionEmployeeSeparationTypesSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: InstitutionEmployeeSeparationTypesSerializer(many=True)},
        summary="List Institution Employee Separation Types",
        tags=["Offboarding"],
    )
    def get(self, request):
        search_query = request.query_params.get('search', None)
        user = request.user
        institution = getattr(user.profile, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)
        separation_types = InstitutionEmployeeSeparationTypes.objects.filter(
            institution=institution,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            separation_types = separation_types.filter(
                Q(separation_type__icontains=search_query)
            )
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
    @transaction.atomic()
    def patch(self, request, separation_type_id):
        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                id=separation_type_id
            )
            separation_type.approval_status = 'under_update'
            serializer = InstitutionEmployeeSeparationTypesSerializer(
                separation_type, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                separation_type.confirm_update()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except InstitutionEmployeeSeparationTypes.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        responses={204: None},
        summary="Delete Institution Employee Separation Type",
        tags=["Offboarding"],
    )
    @transaction.atomic()
    def delete(self, request, separation_type_id):
        try:
            separation_type = InstitutionEmployeeSeparationTypes.objects.get(
                id=separation_type_id
            )
            separation_type.approval_status = 'under_deletion'
            separation_type.save(update_fields=['approval_status'])
            separation_type.confirm_delete()
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
    @transaction.atomic()
    def post(self, request):
        serializer = InstitutionSeparationPolicySerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @extend_schema(
        responses={200: InstitutionSeparationPolicySerializer(many=True)},
        summary="List Institution Separation Policies",
        tags=["Offboarding"],
    )
    def get(self, request):
        search_query = request.query_params.get('search', None)
        user = request.user

        institution = getattr(user.profile, "institution", None)

        try:
            institution = Institution.objects.get(id=institution.id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        policies = InstitutionSeparationPolicy.objects.filter(
            separation_type__institution=institution,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            policies = policies.filter(
                Q(separation_type__separation_type__icontains=search_query) |
                Q(policy_name__icontains=search_query)
            )
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
    @transaction.atomic()
    def patch(self, request, policy_id):
        try:
            policy = InstitutionSeparationPolicy.objects.get(id=policy_id)
            policy.approval_status = 'under_update'
            serializer = InstitutionSeparationPolicySerializer(
                policy, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                policy.confirm_update()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except InstitutionSeparationPolicy.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    @extend_schema(
        responses={204: None},
        summary="Delete Institution Separation Policy",
        tags=["Offboarding"],
    )
    @transaction.atomic()
    def delete(self, request, policy_id):
        try:
            policy = InstitutionSeparationPolicy.objects.get(id=policy_id)
            policy.approval_status = 'under_deletion'
            policy.save(update_fields=['approval_status'])
            policy.confirm_delete()
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
    @transaction.atomic()
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
            instance.confirm_create()
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
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        queryset = ResignationRequest.objects.filter(separation__employee__department__institution=institution, deleted_at__isnull=True).order_by("-created_at")

        if search_query:
            queryset = queryset.filter(
                Q(separation__employee__user__fullname__icontains=search_query)
            )

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
    @transaction.atomic()
    def patch(self, request, resignation_request_id):
        try:
            resignation_request = ResignationRequest.objects.get(
                id=resignation_request_id
            )
            resignation_request.approval_status = 'under_update'
            serializer = ResignationRequestSerializer(
                resignation_request, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                resignation_request.confirm_update()
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
            resignation_request.approval_status = 'under_deletion'
            resignation_request.save(update_fields=['approbal_status'])
            resignation_request.confirm_delete()
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
    @transaction.atomic()
    def post(self, request):

        serializer = TerminationInitiationSerializer(
            data=request.data, context={"request": request}
        )

        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
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
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        queryset = TerminationInitiation.objects.filter(separation__employee__department__institution=institution).order_by("-created_at")

        if search_query:
            queryset = queryset.filter(
                Q(separation__employee__user__fullname__icontains=search_query)
            )
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
            termination_initiation.approval_status = 'under_update'
            serializer = TerminationInitiationSerializer(
                termination_initiation, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                termination_initiation.confirm_update()
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
            termination_initiation.approval_status = 'under_deletion'
            termination_initiation.save(update_fields=['approval_status'])
            termination_initiation.confirm_delete()
            return Response(status=204)
        except TerminationInitiation.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)


@extend_schema(
    tags=['Offboarding'],
    summary='Retrieve offboarding dashboard data',
    description=(
        'This endpoint provides aggregated data for the offboarding dashboard, including: '
        '- Separation counts by status (planned, completed, cancelled, total). '
        '- Category counts (resignation, termination, retirement, etc.). '
        '- Pending requests counts for resignations, terminations, and retirements. '
        '- List of recent separations (last 10, with details). '
        'Data is filtered by the institution associated with the authenticated user.'
    ),
    responses={
        200: OpenApiResponse(
            description='Successful response with dashboard data',
            response={
                'type': 'object',
                'properties': {
                    'separation_counts': {
                        'type': 'object',
                        'properties': {
                            'planned': {'type': 'integer'},
                            'completed': {'type': 'integer'},
                            'cancelled': {'type': 'integer'},
                            'total': {'type': 'integer'},
                        }
                    },
                    'category_counts': {
                        'type': 'object',
                        'additionalProperties': {'type': 'integer'},
                        'description': 'Counts by separation category (e.g., "resignation": 5)'
                    },
                    'pending_requests': {
                        'type': 'object',
                        'properties': {
                            'resignations': {'type': 'integer'},
                            'terminations': {'type': 'integer'},
                            'retirements': {'type': 'integer'},
                            'total': {'type': 'integer'},
                        }
                    },
                    'recent_separations': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'employee_name': {'type': 'string'},
                                'separation_type': {'type': 'string'},
                                'category': {'type': 'string'},
                                'effective_date': {'type': 'string', 'format': 'date'},
                                'separation_status': {'type': 'string'},
                                'additional_notes': {'type': 'string', 'nullable': True},
                            }
                        }
                    }
                }
            }
        ),
        400: OpenApiResponse(description='Bad request (e.g., user institution not found)')
    }
)
class OffboardingDashboardView(APIView):
    """
    Endpoint to retrieve data for the offboarding dashboard.
    Assumes the request.user has a profile with an associated institution.
    If not, adjust the institution retrieval logic as needed (e.g., via query params).
    GET /api/offboarding/dashboard/
    """

    def get(self, request):
        # Retrieve the institution from the authenticated user (adjust if needed)
        try:
            institution = request.user.profile.institution  # Assuming Profile has institution field
        except AttributeError:
            return Response({"error": "User institution not found."}, status=400)

        # Filter separations for the institution
        separations = EmployeeSeparation.objects.filter(
            employee__department__institution=institution  # Assuming Employee has department with institution
        )

        # Separation counts by status
        separation_counts = separations.aggregate(
            planned=Count('id', filter=Q(separation_status='planned')),
            completed=Count('id', filter=Q(separation_status='completed')),
            cancelled=Count('id', filter=Q(separation_status='cancelled')),
            total=Count('id')
        )

        # Category counts
        category_counts = dict(
            separations.values('employee_separation_type__category')
            .annotate(count=Count('id'))
            .values_list('employee_separation_type__category', 'count')
        )

        # Pending requests counts
        pending_resignations = ResignationRequest.objects.filter(
            separation__employee__department__institution=institution,
            request_status='submitted'
        ).count()

        pending_terminations = TerminationInitiation.objects.filter(
            separation__employee__department__institution=institution,
            initiation_status='submitted'
        ).count()

        pending_retirements = RetirementRequest.objects.filter(
            separation__employee__department__institution=institution,
            request_status='submitted'
        ).count()

        pending_requests = {
            'resignations': pending_resignations,
            'terminations': pending_terminations,
            'retirements': pending_retirements,
            'total': pending_resignations + pending_terminations + pending_retirements
        }

        # Recent separations (last 10, ordered by effective_date descending)
        recent_separations = separations.order_by('-effective_date')[:10]
        recent_separations_data = EmployeeSeparationSerializer(recent_separations, many=True).data

        # Compile dashboard data
        dashboard_data = {
            'separation_counts': separation_counts,
            'category_counts': category_counts,
            'pending_requests': pending_requests,
            'recent_separations': recent_separations_data
        }

        return Response(dashboard_data)