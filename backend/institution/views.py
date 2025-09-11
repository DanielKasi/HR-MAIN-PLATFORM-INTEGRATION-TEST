from django.http import Http404
from employee.service import create_owner_employee
from employee.models import Employee, WorkType, EmployeeType
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.permissions import AllowAny
from utilities.helpers import (
    build_password_link,
    send_password_link_to_user,
    create_and_institution_token,
    send_activation_confirmation_email,
)
from users.models import Profile, System

from .models import (
    Department,
    Institution,
    Branch,
    UserBranch,
    InstitutionBankAccount,
    InstitutionBankType,
    InstitutionWorkingDays,
    InstitutionTax,
    InstitutionTaxRule,
    InstitutionKYCDocument,
    InstitutionPenaltyConfig,
    BranchPenaltyConfig,
    BranchLocationComparisonConfig,
    BranchWorkingDays,
    BranchShift,
)
from users.serializers import ProfileSerializer
from .serializers import (
    DepartmentSerializer,
    ErrorResponseSerializer,
    InstitutionActivationSerializer,
    InstitutionSerializer,
    BranchSerializer,
    SuccessResponseSerializer,
    UserBranchSerializer,
    InstitutionBankTypeSerializer,
    InstitutionBankAccountSerializer,
    InstitutionWorkingDaysSerializer,
    InstitutionTaxSerializer,
    InstitutionTaxRuleSerializer,
    InstitutionKYCDocumentSerializer,
    InstitutionKYCDocumentBulkCreateSerializer,
    InstitutionPenaltyConfigSerializer,
    BranchPenaltyConfigSerializer,
    BranchWorkingDaysSerializer,
    BranchShiftSerializer,
    BranchLocationComparisonConfigSerializer,
    AIQuerySerializer,
    UserChatsSerializer,
)
from django.shortcuts import get_object_or_404
from .utils import add_message, generate_compliant_password, get_messages
from utilities.pagination import CustomPageNumberPagination
from django.db.models import Count, Sum, Q, F
from django.contrib.auth import get_user_model
import logging
from django.db import transaction
from utilities.default_data import default_data
import json
import uuid
import json
import os
from decimal import Decimal
from django.utils import timezone
from leave_mgt.models import LeaveApplication
from payroll.models import Payslip
from django.db.models.functions import ExtractMonth
from django.db.models import Value, IntegerField
from rest_framework import parsers
from utilities.sortable_api import SortableAPIMixin
from ai_assistant.schema_export import get_database_schema_for_ai
from ai_assistant.query_runner import run_sql_with_retry
from ai_assistant.query_generator import generate_sql_from_question
from ai_assistant.result_interpreter import interpret_sql_results_with_groq
from ai_assistant.utils import (
    classify_intent_groq,
    map_permission_based_on_question,
    user_has_permission,
)
from .utils import _load_user_file, load_db_rules

User = get_user_model()
logger = logging.getLogger(__name__)


class UserChatsView(APIView):

    @extend_schema(
        responses={
            200: UserChatsSerializer,
            400: {"description": "Bad Request"},
            403: {"description": "Forbidden"},
            404: {"description": "Not Found"},
            500: {"description": "Internal Server Error"},
        },
        summary="AI USER CHATS",
        tags=["Complete AI Assistant"],
    )
    def get(self, request):
        user_id = request.user.id

        try:
            user_data = _load_user_file(user_id)

            serializer = UserChatsSerializer(user_data)
            return Response(serializer.data, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class AIAssistantView(APIView):
    """
    AI Assistant for natural language HR queries.
    Accepts a question from an authenticated user,
    generates SQL, executes it, and returns a human-readable interpretation.
    """

    @extend_schema(
        request=AIQuerySerializer,
        responses={
            200: AIQuerySerializer,
            400: {"description": "Bad Request"},
            403: {"description": "Forbidden"},
            404: {"description": "Not Found"},
            500: {"description": "Internal Server Error"},
        },
        description="Ask a HR question and get an AI-generated answer.",
        summary="AI HR Query Assistant",
        tags=["AI Assistant"],
    )
    def post(self, request, *args, **kwargs):
        serializer = AIQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question = serializer.validated_data["question"]
        chat_id = serializer.validated_data.get("chat_id")
        user = request.user

        try:
            profile = Profile.objects.select_related("institution").get(user=user)
            institution = profile.institution
        except Profile.DoesNotExist:
            return Response(
                {"detail": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        print("chat_id", chat_id)

        if not chat_id:
            chat_id = str(uuid.uuid4())

        try:
            intent = classify_intent_groq(question)
        except Exception as e:
            return Response(
                {
                    "detail": "Intent classification failed.",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        record = add_message(user.id, "user", question, chat_id)

        recent_chats = get_messages(user.id, chat_id, limit=10)

        if intent == "GREETING":
            greeting_response = (
                "Hello! 👋 I'm here to help with HR questions. "
                "You can ask me things like:\n"
                "- What were the total employee headcount last month?\n"
                "- Which departments are low on staff?\n"
                "- Show top-performing employees this quarter.\n"
                "- How many leave applications did we get last week?\n"
                "- What's the salary distribution by department?"
            )

            add_message(user.id, "assistant", greeting_response, record)

            return Response(
                {
                    "answer": greeting_response,
                    "chat_id": chat_id,
                },
                status=status.HTTP_200_OK,
            )

        elif intent == "FEATURE_INQUIRY":
            feature_response = "This feature is currently under development. Please stay tuned for upcoming updates!"

            add_message(user.id, "assistant", feature_response, record)

            return Response(
                {
                    "answer": feature_response,
                    "chat_id": chat_id,
                },
                status=status.HTTP_200_OK,
            )

        elif intent == "HR_QUERY":
            mapped_permission = map_permission_based_on_question(question)

            if mapped_permission and mapped_permission != "none":
                user_has_access = user_has_permission(
                    user, mapped_permission, institution.id
                )

                if user_has_access:

                    if not institution:
                        return Response(
                            {"detail": "You are not assigned to any institution."},
                            status=status.HTTP_403_FORBIDDEN,
                        )

                    institution_id = institution.id

                    try:
                        schema = load_db_rules("db_schema.txt")

                        initial_sql = generate_sql_from_question(
                            schema, question, institution_id, recent_chats
                        )

                        sql_result = run_sql_with_retry(
                            schema=schema,
                            question=question,
                            institution_id=institution_id,
                            initial_sql=initial_sql,
                            recent_chats=recent_chats,
                        )

                        interpretation, links = interpret_sql_results_with_groq(
                            question=question,
                            columns=sql_result["columns"],
                            rows=sql_result["results"],
                            recent_chats=recent_chats,
                            sql=sql_result["sql"],
                        )

                        add_message(user.id, "assistant", interpretation, record)

                        return Response(
                            {
                                "answer": interpretation,
                                "chat_id": chat_id,
                                "link": links,
                            },
                            status=status.HTTP_200_OK,
                        )

                    except Exception as e:
                        error_message = f"Something went wrong: {str(e)}"

                        add_message(user.id, "assistant", error_message, chat_id)

                        return Response(
                            {
                                "detail": "Something went wrong.",
                                "error": str(e),
                                "answer": error_message,
                                "chat_id": chat_id,
                            },
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )

                else:
                    error_message = "You don't have access to this resource."

                    add_message(user.id, "assistant", error_message, chat_id)

                    return Response(
                        {
                            "answer": error_message,
                            "chat_id": chat_id,
                        },
                        status=status.HTTP_200_OK,
                    )
            else:
                error_message = "No Permission Found or Mapped"

                add_message(user.id, "assistant", error_message, chat_id)

                return Response(
                    {
                        "detail": "Something went wrong.",
                        "answer": error_message,
                        "chat_id": chat_id,
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        else:
            fallback_msg = (
                "Sorry, I can only help with Human Resource based questions. "
                "Please ask about employee management, attendance, payroll, or benefits."
            )

            add_message(user.id, "assistant", fallback_msg, record)

            return Response(
                {
                    "answer": fallback_msg,
                    "chat_id": chat_id,
                },
                status=status.HTTP_200_OK,
            )


class DefaultDataAPIView(APIView):
    @extend_schema(
        responses={200: list},
        description="Retrieve default departments and their job positions. Supports searching by department or job position.",
        summary="Get default departments and job positions",
        tags=["Institution Management"],
    )
    def get(self, request):
        search_query = request.query_params.get("search")

        modified_data = [
            {
                "id": str(uuid.uuid4()),
                "name": dept["name"],
                "description": dept["description"],
                "job_positions": [
                    {
                        "id": str(uuid.uuid4()),
                        "name": job["name"],
                        "description": job["description"],
                        "salary_min": job["salary_min"],
                        "salary_max": job["salary_max"],
                    }
                    for job in dept["job_positions"]
                ],
            }
            for dept in default_data
        ]

        if search_query:
            search_query = search_query.lower()
            filtered_data = []
            for dept in modified_data:
                # check department name/description
                if (
                    search_query in dept["name"].lower()
                    or search_query in dept["description"].lower()
                ):
                    filtered_data.append(dept)
                    continue  # no need to check jobs if dept matches fully

                # check job positions
                matching_jobs = [
                    job
                    for job in dept["job_positions"]
                    if search_query in job["name"].lower()
                    or search_query in job["description"].lower()
                ]
                if matching_jobs:
                    dept_copy = dept.copy()
                    dept_copy["job_positions"] = matching_jobs
                    filtered_data.append(dept_copy)

            modified_data = filtered_data

        return Response(modified_data, status=status.HTTP_200_OK)


class BranchWorkingDaysListAPIView(APIView):

    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=BranchWorkingDaysSerializer,
                description="Working days for the specified branch.",
            ),
            400: OpenApiResponse(
                description="Branch ID required or working days not found."
            ),
            404: OpenApiResponse(description="Branch not found."),
        },
        description="Retrieve working days for a branch.",
        summary="Get working days for a branch",
        tags=["Branch Working Days Management"],
    )
    def get(self, request):
        branch_id = request.query_params.get("branch_id")

        if not branch_id:
            return Response(
                {"detail": "Branch ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            branch = Branch.objects.get(id=int(branch_id))
        except Branch.DoesNotExist:
            return Response(
                {"detail": "Branch with ID not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            working_days = BranchWorkingDays.objects.get(branch=branch)
            serializer = BranchWorkingDaysSerializer(working_days)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except BranchWorkingDays.DoesNotExist:
            return Response(
                {
                    "detail": "Working days for the given branch not found. Try creating them."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @extend_schema(
        request=BranchWorkingDaysSerializer,
        responses={201: BranchWorkingDaysSerializer},
        description="Create a new working days configuration for a branch.",
        summary="Create working days on a branch level",
        tags=["Branch Working Days Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = BranchWorkingDaysSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            working_days = serializer.save()
            working_days.confirm_create()
            return Response(
                BranchWorkingDaysSerializer(working_days).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class BranchWorkingDaysDetailView(APIView):
    @extend_schema(
        request=BranchWorkingDaysSerializer,
        responses={200: BranchWorkingDaysSerializer},
        description="Update the existing Branch Working Days.",
        summary="Update branch working days",
        tags=["Branch Working Days Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        try:
            branch_working_days = BranchWorkingDays.objects.get(id=pk)
        except BranchWorkingDays.DoesNotExist:
            return Response(
                {"detail": "Working days configuration not found."}, status=404
            )

        branch_working_days.approval_status = "under_update"

        serializer = BranchWorkingDaysSerializer(
            branch_working_days, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            branch_working_days.confirm_update()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionKYCDocumentListCreateView(APIView, SortableAPIMixin):
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    allowed_ordering_fields = ["document_title", "created_at", "is_active"]
    default_ordering = ["document_title"]

    @extend_schema(
        request=InstitutionKYCDocumentBulkCreateSerializer,
        responses=InstitutionKYCDocumentBulkCreateSerializer,
        description="Create a new KYC document for an institution",
        summary="Create KYC Document",
        tags=["KYC Documents Management"],
    )
    def post(self, request):
        serializer = InstitutionKYCDocumentBulkCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            documents = serializer.save()
            return Response(
                InstitutionKYCDocumentSerializer(documents, many=True).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        responses={200: InstitutionKYCDocumentSerializer},
        description="Retrieve all KYC documents for an institution",
        summary="Get KYC Documents",
        tags=["KYC Documents Management"],
    )
    def get(self, request):
        user = request.user.profile if request.user.is_authenticated else None

        institution = user.institution

        kyc_documents = InstitutionKYCDocument.objects.filter(institution=institution)

        try:
            kyc_documents = self.apply_sorting(kyc_documents, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(kyc_documents, request)
        serializer = InstitutionKYCDocumentSerializer(paginator_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class InstitutionKYCDocumentDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionKYCDocumentSerializer},
        tags=["KYC Documents Management"],
        summary="Get KYC Document Detail",
    )
    def get(self, request, document_id):
        document = get_object_or_404(InstitutionKYCDocument, id=document_id)
        serializer = InstitutionKYCDocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=InstitutionKYCDocumentSerializer,
        responses={200: InstitutionKYCDocumentSerializer},
        tags=["KYC Documents Management"],
        summary="Update KYC Document",
    )
    def patch(self, request, document_id):
        document = get_object_or_404(InstitutionKYCDocument, id=document_id)
        serializer = InstitutionKYCDocumentSerializer(
            document, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=InstitutionKYCDocumentSerializer,
        responses={200: InstitutionKYCDocumentSerializer},
        tags=["KYC Documents Management"],
        summary="Delete KYC Document",
    )
    def delete(self, request, document_id):
        document = get_object_or_404(InstitutionKYCDocument, id=document_id)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InstitutionListAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=InstitutionSerializer,
        responses={201: InstitutionSerializer},
        description="Create a new institution with name, address, owner, and optional departments",
        summary="Create a new institution",
        tags=["Institution Management"],
    )
    @transaction.atomic()
    def post(self, request):
        if Institution.objects.filter(
            institution_owner__id=request.data.get("institution_owner_id"),
            institution_name=request.data.get("institution_name"),
        ).exists():
            return Response(
                {"detail": "User already has an institution with the same name."},
                status=status.HTTP_409_CONFLICT,
            )

        # Parse departments JSON string if present
        departments_data = request.data.get("departments", [])
        if isinstance(departments_data, str):
            try:
                departments_data = json.loads(departments_data)
            except json.JSONDecodeError:
                return Response(
                    {"detail": "Invalid departments data format. Expected valid JSON."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = InstitutionSerializer(
            data=request.data,
            context={
                "request": request,
                "user": request.user,
                "departments": departments_data,
            },
        )

        if serializer.is_valid():
            try:
                institution = serializer.save()
                logger.info(
                    f"Institution created: {institution.institution_name}, Country: {institution.country_code}"
                )

                employee = create_owner_employee(institution)

                # Load defaults from JSON file
                current_dir = os.path.dirname(__file__)  # institution folder
                backend_dir = os.path.dirname(current_dir)  # backend folder
                defaults_path = os.path.join(backend_dir, "utilities", "tax_rules.json")
                defaults = {}

                try:
                    with open(defaults_path, "r") as f:
                        defaults = json.load(f)
                    logger.info(f"Successfully loaded defaults from {defaults_path}")
                except FileNotFoundError:
                    logger.error(f"Tax rules file not found at: {defaults_path}")
                    return Response(
                        {
                            "detail": f"Tax rules configuration file not found at {defaults_path}"
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in tax rules file: {str(e)}")
                    return Response(
                        {"detail": "Invalid tax rules configuration file format"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Create global defaults (employee types and work types)
                global_data = defaults.get("global", {})
                logger.info(f"Global data found: {bool(global_data)}")

                # Create Employee Types
                employee_types_data = global_data.get("employee_types", [])
                logger.info(f"Creating {len(employee_types_data)} employee types")

                for et_data in employee_types_data:
                    try:
                        employee_type = EmployeeType.objects.create(
                            institution=institution, **et_data
                        )
                        logger.info(f"Created employee type: {employee_type.name}")
                    except Exception as e:
                        logger.error(
                            f"Error creating employee type {et_data.get('name', 'Unknown')}: {str(e)}"
                        )

                # Create Work Types
                work_types_data = global_data.get("work_types", [])
                logger.info(f"Creating {len(work_types_data)} work types")

                for wt_data in work_types_data:
                    try:
                        work_type = WorkType.objects.create(
                            institution=institution, **wt_data
                        )
                        logger.info(f"Created work type: {work_type.name}")
                    except Exception as e:
                        logger.error(
                            f"Error creating work type {wt_data.get('name', 'Unknown')}: {str(e)}"
                        )

                # Create country-specific taxes if available
                country = institution.country_code
                logger.info(f"Institution country code: {country}")

                if country and country in defaults:
                    country_data = defaults[country]
                    taxes_data = country_data.get("taxes", [])
                    logger.info(
                        f"Creating {len(taxes_data)} taxes for country {country}"
                    )

                    for tax_data in taxes_data:
                        try:
                            tax = InstitutionTax.objects.create(
                                institution=institution,
                                tax_name=tax_data["tax_name"],
                                tax_status=tax_data["tax_status"],
                                created_by=request.user,  # Add created_by
                            )
                            logger.info(f"Created tax: {tax.tax_name}")

                            # Create tax rules
                            rules_data = tax_data.get("rules", [])

                            for rule_data in rules_data:
                                try:
                                    # Create a copy to avoid modifying the original data
                                    rule_data_copy = rule_data.copy()

                                    # Convert string values to Decimal where applicable
                                    decimal_fields = [
                                        "tax_rule_percentage",
                                        "tax_rule_fixed_amount",
                                        "salary_from",
                                        "salary_to",
                                    ]
                                    for field in decimal_fields:
                                        if (
                                            field in rule_data_copy
                                            and rule_data_copy[field] is not None
                                        ):
                                            try:
                                                rule_data_copy[field] = Decimal(
                                                    str(rule_data_copy[field])
                                                )
                                            except (ValueError, TypeError) as e:
                                                logger.error(
                                                    f"Error converting {field} to Decimal: {str(e)}"
                                                )
                                                rule_data_copy[field] = None

                                    tax_rule = InstitutionTaxRule.objects.create(
                                        institution_tax=tax,
                                        created_by=request.user,  # Add created_by
                                        **rule_data_copy,
                                    )

                                except Exception as e:
                                    logger.error(
                                        f"Error creating tax rule {rule_data.get('tax_rule_name', 'Unknown')}: {str(e)}"
                                    )

                        except Exception as e:
                            logger.error(
                                f"Error creating tax {tax_data.get('tax_name', 'Unknown')}: {str(e)}"
                            )
                else:
                    if not country:
                        logger.warning(
                            f"No country code determined for institution {institution.institution_name}"
                        )
                    else:
                        logger.warning(
                            f"No tax defaults found for country '{country}'. Available countries: {list(defaults.keys())}"
                        )

                return Response(
                    InstitutionSerializer(
                        institution, context={"user": request.user}
                    ).data,
                    status=status.HTTP_201_CREATED,
                )

            except Exception as e:
                logger.error(f"Error creating institution: {str(e)}")
                import traceback

                logger.error(f"Full traceback: {traceback.format_exc()}")
                return Response(
                    {
                        "detail": "An error occurred while creating the institution. Please try again."
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: InstitutionSerializer(many=True)},
        description="Retrieve all institutions.",
        summary="Get all institutions",
        tags=["Institution Management"],
    )
    def get(self, request, institution_id=None):

        if request.user.is_staff:
            institutions = Institution.objects.all()
        else:
            institutions = Institution.objects.filter(institution_owner=request.user)

        institutions = institutions.order_by("-created_at")
        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(institutions, request)
        serializer = InstitutionSerializer(paginator_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class InstitutionDetailAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        responses={200: InstitutionSerializer},
        description="Retrieve an institution.",
        summary="Get an institution",
        tags=["Institution Management"],
    )
    def get(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
            if institution.institution_owner != request.user:
                return Response({"detail": "Access denied."}, status=403)
            serializer = InstitutionSerializer(institution)
            return Response(serializer.data)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

    @extend_schema(
        request=InstitutionSerializer,
        responses={200: InstitutionSerializer},
        description="Update an existing institution.",
        summary="Update an institution",
        tags=["Institution Management"],
    )
    def patch(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
            if institution.institution_owner != request.user:
                return Response({"detail": "Access denied."}, status=403)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        serializer = InstitutionSerializer(institution, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing institution.",
        summary="Delete as institution",
        tags=["Institution Management"],
    )
    def delete(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
            if institution.institution_owner != request.user:
                return Response({"detail": "Access denied."}, status=403)
            institution.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)


class InstitutionBankTypeListAPIView(APIView):
    allowed_ordering_fields = ["bank_fullname", "created_at", "bank_code", "is_active"]
    default_ordering = ["bank_fullname"]

    @extend_schema(
        responses={200: InstitutionBankTypeSerializer(many=True)},
        description="Retrieve all attached banks .",
        summary="Get all attached banks ",
        tags=["Bank Type Management"],
    )
    def get(self, request):
        search_query = request.query_params.get("search", None)
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        bank_types = InstitutionBankType.objects.filter(
            institution=institution, deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            bank_types = bank_types.filter(
                Q(bank_fullname__icontains=search_query)
                | Q(bank_code__icontains=search_query)
                | Q(br_code__icontains=search_query)
            )

        try:
            bank_types = self.apply_sorting(bank_types, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(bank_types, request)

        serializer = InstitutionBankTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=InstitutionBankTypeSerializer,
        responses={201: InstitutionBankTypeSerializer},
        description="Create a new bank type.",
        summary="Create a new bank type",
        tags=["Bank Type Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = InstitutionBankTypeSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            bank_type = serializer.save()
            bank_type.confirm_create()
            return Response(
                InstitutionBankTypeSerializer(bank_type).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionBankTypeDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionBankTypeSerializer},
        description="Retrieve a bank type.",
        summary="Get a bank type",
        tags=["Bank Type Management"],
    )
    def get(self, request, bank_type_id):
        try:
            bank_type = InstitutionBankType.objects.get(id=bank_type_id)
            serializer = InstitutionBankTypeSerializer(bank_type)
            return Response(serializer.data)
        except InstitutionBankType.DoesNotExist:
            return Response({"detail": "Bank type not found."}, status=404)

    @extend_schema(
        request=InstitutionBankTypeSerializer,
        responses={200: InstitutionBankTypeSerializer},
        description="Update an existing bank type.",
        summary="Update a bank type",
        tags=["Bank Type Management"],
    )
    @transaction.atomic()
    def patch(self, request, bank_type_id):
        try:
            bank_type = InstitutionBankType.objects.get(id=bank_type_id)
        except InstitutionBankType.DoesNotExist:
            return Response({"detail": "Bank type not found."}, status=404)

        bank_type.approval_status = "under_updatw"

        serializer = InstitutionBankTypeSerializer(
            bank_type, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            bank_type.confirm_update()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing bank type.",
        summary="Delete a bank type",
        tags=["Bank Type Management"],
    )
    @transaction.atomic()
    def delete(self, request, bank_type_id):
        try:
            bank_type = InstitutionBankType.objects.get(id=bank_type_id)
            bank_type.approval_status = "under_deletion"
            bank_type.save(update_fields=["approval_status"])
            bank_type.confirm_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except InstitutionBankType.DoesNotExist:
            return Response({"detail": "Bank type not found."}, status=404)


class InstitutionBankAccountListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "account_name",
        "created_at",
        "institution_bank",
        "is_active",
    ]
    default_ordering = ["account_name"]

    @extend_schema(
        responses={200: InstitutionBankAccountSerializer(many=True)},
        description="Retrieve all bank accounts.",
        summary="Get all bank accounts",
        tags=["Bank Account Management"],
    )
    def get(self, request):
        search_query = request.query_params.get("search", None)
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        bank_accounts = InstitutionBankAccount.objects.filter(
            institution_bank__institution=institution, deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            bank_accounts = bank_accounts.filter(
                Q(account_name__icontains=search_query)
                | Q(account_number__icontains=search_query)
                | Q(institution_bank__bank_fullname__icontains=search_query)
            )

        try:
            bank_accounts = self.apply_sorting(bank_accounts, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(bank_accounts, request)

        serializer = InstitutionBankAccountSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=InstitutionBankAccountSerializer,
        responses={201: InstitutionBankAccountSerializer},
        description="Create a new bank account.",
        summary="Create a new bank account",
        tags=["Bank Account Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = InstitutionBankAccountSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            bank_account = serializer.save()
            bank_account.confirm_create()
            return Response(
                InstitutionBankAccountSerializer(bank_account).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionBankAccountDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionBankAccountSerializer},
        description="Retrieve a bank account.",
        summary="Get a bank account",
        tags=["Bank Account Management"],
    )
    def get(self, request, bank_account_id):
        try:
            bank_account = InstitutionBankAccount.objects.get(id=bank_account_id)
            serializer = InstitutionBankAccountSerializer(bank_account)
            return Response(serializer.data)
        except InstitutionBankAccount.DoesNotExist:
            return Response({"detail": "Bank account not found."}, status=404)

    @extend_schema(
        request=InstitutionBankAccountSerializer,
        responses={200: InstitutionBankAccountSerializer},
        description="Update an existing bank account.",
        summary="Update a bank account",
        tags=["Bank Account Management"],
    )
    @transaction.atomic()
    def patch(self, request, bank_account_id):
        try:
            bank_account = InstitutionBankAccount.objects.get(id=bank_account_id)
        except InstitutionBankAccount.DoesNotExist:
            return Response({"detail": "Bank account not found."}, status=404)

        bank_account.approval_status = "under_update"

        serializer = InstitutionBankAccountSerializer(
            bank_account, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            bank_account.confirm_update()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing bank account.",
        summary="Delete a bank account",
        tags=["Bank Account Management"],
    )
    def delete(self, request, bank_account_id):
        try:
            bank_account = InstitutionBankAccount.objects.get(id=bank_account_id)
            bank_account.approval_status = "under_deletion"
            bank_account.save(update_fields=["approval_status"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        except InstitutionBankAccount.DoesNotExist:
            return Response({"detail": "Bank account not found."}, status=404)


class InstitutionWorkingDaysListAPIView(APIView):
    @extend_schema(
        responses={200: InstitutionWorkingDaysSerializer(many=True)},
        description="Retrieve all working days for an institution.",
        summary="Get all working days",
        tags=["Working Days Management"],
    )
    def get(self, request):
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        working_days = InstitutionWorkingDays.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        serializer = InstitutionWorkingDaysSerializer(working_days, many=True)

        return Response(serializer.data)

    @extend_schema(
        request=InstitutionWorkingDaysSerializer,
        responses={201: InstitutionWorkingDaysSerializer},
        description="Create a new working days configuration for an institution.",
        summary="Create working days",
        tags=["Working Days Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = InstitutionWorkingDaysSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            working_days = serializer.save()
            working_days.confirm_create()
            return Response(
                InstitutionWorkingDaysSerializer(working_days).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionWorkingDaysDetailView(APIView):
    @extend_schema(
        request=InstitutionWorkingDaysSerializer,
        responses={200: InstitutionWorkingDaysSerializer},
        description="Update existing working days configuration for an institution.",
        summary="Update working days",
        tags=["Working Days Management"],
    )
    @transaction.atomic()
    def patch(self, request, pk):
        try:
            working_days = InstitutionWorkingDays.objects.get(id=pk)
        except InstitutionWorkingDays.DoesNotExist:
            return Response(
                {"detail": "Working days configuration not found."}, status=404
            )

        working_days.approval_status = "under_update"

        serializer = InstitutionWorkingDaysSerializer(
            working_days, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            working_days.confirm_update()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionTaxListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ["tax_name", "created_at", "tax_status", "is_active"]
    default_ordering = ["tax_name"]

    @extend_schema(
        responses={200: InstitutionTaxSerializer(many=True)},
        description="Retrieve all tax configurations for an institution.",
        summary="Get all tax configurations",
        tags=["Tax Management"],
    )
    def get(self, request):
        search_query = request.query_params.get("search", None)
        status = request.query_params.get("status", None)  # active, inactive, all
        user = request.user.profile if request.user.is_authenticated else None

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        taxes = InstitutionTax.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if search_query:
            taxes = taxes.filter(Q(tax_name__icontains=search_query))

        # ✅ Status filter
        if status:
            status = status.lower()
            if status == "active":
                taxes = taxes.filter(is_active=True)
            elif status == "inactive":
                taxes = taxes.filter(is_active=False)
            elif status == "all":
                pass

        try:
            taxes = self.apply_sorting(taxes, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(taxes, request)
        serializer = InstitutionTaxSerializer(paginated_qs, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=InstitutionTaxSerializer,
        responses={201: InstitutionTaxSerializer},
        description="Create a new tax configuration for an institution.",
        summary="Create tax configuration",
        tags=["Tax Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = InstitutionTaxSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            tax = serializer.save()
            tax.confirm_create()
            return Response(
                InstitutionTaxSerializer(tax).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionTaxDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionTaxSerializer},
        description="Retrieve a tax configuration for an institution.",
        summary="Get a tax configuration",
        tags=["Tax Management"],
    )
    def get(self, request, tax_id):
        try:
            tax = InstitutionTax.objects.get(id=tax_id)
            serializer = InstitutionTaxSerializer(tax)
            return Response(serializer.data)
        except InstitutionTax.DoesNotExist:
            return Response({"detail": "Tax configuration not found."}, status=404)

    @extend_schema(
        request=InstitutionTaxSerializer,
        responses={200: InstitutionTaxSerializer},
        description="Update an existing tax configuration for an institution.",
        summary="Update tax configuration",
        tags=["Tax Management"],
    )
    @transaction.atomic()
    def patch(self, request, tax_id):
        try:
            tax = InstitutionTax.objects.get(id=tax_id)
        except InstitutionTax.DoesNotExist:
            return Response({"detail": "Tax configuration not found."}, status=404)

        tax.approval_status = "under_update"

        serializer = InstitutionTaxSerializer(
            tax, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            tax.confirm_update()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing tax configuration for an institution.",
        summary="Delete a tax configuration",
        tags=["Tax Management"],
    )
    @transaction.atomic()
    def delete(self, request, tax_id):
        try:
            tax = InstitutionTax.objects.get(id=tax_id)
            tax.approval_status = "under_deletion"
            tax.save(update_fields=["approval_status"])
            tax.confirm_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except InstitutionTax.DoesNotExist:
            return Response({"detail": "Tax configuration not found."}, status=404)


class InstitutionTaxRuleListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "tax_rule_name",
        "created_at",
        "tax_rule_fixed_amount",
        "is_active",
        "salary_from",
        "salary_to",
    ]
    default_ordering = ["tax_rule_name"]

    @extend_schema(
        responses={200: InstitutionTaxRuleSerializer(many=True)},
        description="Retrieve all tax rules for an institution.",
        summary="Get all tax rules",
        tags=["Tax Rule Management"],
    )
    def get(self, request):
        search_query = request.query_params.get("search", None)
        user = request.user.profile if request.user.is_authenticated else None
        status = request.query_params.get("status", None)

        try:
            institution = Institution.objects.get(id=user.institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        tax_rules = InstitutionTaxRule.objects.filter(
            institution_tax__institution=institution, deleted_at__isnull=True
        )

        if search_query:
            tax_rules = tax_rules.filter(
                Q(tax_rule_name__icontains=search_query)
                | Q(institution_tax__name__icontains=search_query)
                | Q(institution_tax__tax_name__icontains=search_query)
            )

        if status:
            status = status.lower()
            if status == "active":
                tax_rules = tax_rules.filter(is_active=True)
            elif status == "inactive":
                tax_rules = tax_rules.filter(is_active=False)
            elif status == "all":
                pass

        try:
            tax_rules = self.apply_sorting(tax_rules, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(tax_rules, request)
        serializer = InstitutionTaxRuleSerializer(paginated_qs, many=True)

        return Response(serializer.data)

    @extend_schema(
        request=InstitutionTaxRuleSerializer,
        responses={201: InstitutionTaxRuleSerializer},
        description="Create a new tax rule for an institution.",
        summary="Create tax rule",
        tags=["Tax Rule Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = InstitutionTaxRuleSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            tax_rule = serializer.save()
            tax_rule.confirm_create()
            return Response(
                InstitutionTaxRuleSerializer(tax_rule).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class InstitutionTaxRuleDetailView(APIView):
    @extend_schema(
        responses={200: InstitutionTaxRuleSerializer},
        description="Retrieve a tax rule for an institution.",
        summary="Get a tax rule",
        tags=["Tax Rule Management"],
    )
    def get(self, request, tax_rule_id):
        try:
            tax_rule = InstitutionTaxRule.objects.get(id=tax_rule_id)
            serializer = InstitutionTaxRuleSerializer(tax_rule)
            return Response(serializer.data)
        except InstitutionTaxRule.DoesNotExist:
            return Response({"detail": "Tax rule not found."}, status=404)

    @extend_schema(
        request=InstitutionTaxRuleSerializer,
        responses={200: InstitutionTaxRuleSerializer},
        description="Update an existing tax rule for an institution.",
        summary="Update tax rule",
        tags=["Tax Rule Management"],
    )
    @transaction.atomic()
    def patch(self, request, tax_rule_id):
        try:
            tax_rule = InstitutionTaxRule.objects.get(id=tax_rule_id)
        except InstitutionTaxRule.DoesNotExist:
            return Response({"detail": "Tax rule not found."}, status=404)
        tax_rule.approval_status = "under_update"

        serializer = InstitutionTaxRuleSerializer(
            tax_rule, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            tax_rule.confirm_update()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing tax rule for an institution.",
        summary="Delete a tax rule",
        tags=["Tax Rule Management"],
    )
    @transaction.atomic()
    def delete(self, request, tax_rule_id):
        try:
            tax_rule = InstitutionTaxRule.objects.get(id=tax_rule_id)
            tax_rule.approval_status = "under_deletion"
            tax_rule.save(update_fields=["approval_status"])
            tax_rule.confirm_delete()
            return Response(status=204)
        except InstitutionTaxRule.DoesNotExist:
            return Response({"detail": "Tax rule not found."}, status=404)


class BranchListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "branch_name",
        "created_at",
        "branch_location",
        "is_active",
        "branch_phone_number",
        "branch_email",
        "branch_opening_time",
        "branch_closing_time",
    ]
    default_ordering = ["branch_name"]

    @extend_schema(
        request=BranchSerializer,
        responses={201: BranchSerializer},
        description="Create a new branch.",
        summary="Create a new branch",
        tags=["Branch Management"],
    )
    @transaction.atomic()
    def post(self, request):
        serializer = BranchSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            branch = serializer.save()
            branch.confirm_create()
            return Response(
                BranchSerializer(branch).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: BranchSerializer(many=True)},
        description="Retrieve all branches.",
        summary="Get all branches",
        tags=["Branch Management"],
    )
    def get(self, request):
        search_query = request.query_params.get("search", None)

        branches = Branch.objects.filter(deleted_at__isnull=True).order_by(
            "-created_at"
        )

        if not request.user.is_staff:
            branches = branches.filter(institution__institution_owner=request.user)

        if search_query:
            branches = branches.filter(
                Q(branch_name__icontains=search_query)
                | Q(branch_location__icontains=search_query)
            )

        try:
            branches = self.apply_sorting(branches, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(branches, request)

        serializer = BranchSerializer(paginator_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class BranchDetailAPIView(APIView):
    @extend_schema(
        responses={200: BranchSerializer},
        description="Retrieve a branch.",
        summary="Get a branch",
        tags=["Branch Management"],
    )
    def get(self, request, branch_id):
        try:
            branch = Branch.objects.get(id=branch_id)
            if (
                not request.user.is_staff
                and branch.institution.institution_owner != request.user
            ):
                return Response({"detail": "Access denied."}, status=403)
            serializer = BranchSerializer(branch)
            return Response(serializer.data)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found."}, status=404)

    @extend_schema(
        request=BranchSerializer,
        responses={200: BranchSerializer},
        description="Update an existing branch.",
        summary="Update a branch",
        tags=["Branch Management"],
    )
    @transaction.atomic()
    def patch(self, request, branch_id):

        try:
            branch = Branch.objects.get(id=branch_id)
            if (
                not request.user.is_staff
                and branch.institution.institution_owner != request.user
            ):
                return Response({"detail": "Access denied."}, status=403)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found."}, status=404)

        branch.approval_status = "under_update"

        serializer = BranchSerializer(branch, data=request.data, partial=True)
        if serializer.is_valid():

            serializer.save()
            branch.confirm_update()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={204: None},
        description="Delete an existing branch.",
        summary="Delete a branch",
        tags=["Branch Management"],
    )
    @transaction.atomic()
    def delete(self, request, branch_id):
        try:
            branch = Branch.objects.get(id=branch_id)
            if (
                not request.user.is_staff
                and branch.institution.institution_owner != request.user
            ):
                return Response({"detail": "Access denied."}, status=403)
            branch.approval_status = "under_deletion"
            branch.save(update_fields=["approval_status"])
            branch.confirm_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found."}, status=404)


class InstitutionBranchAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "branch_name",
        "created_at",
        "branch_location",
        "is_active",
        "branch_phone_number",
        "branch_email",
        "branch_opening_time",
        "branch_closing_time",
    ]
    default_ordering = ["branch_name"]

    @extend_schema(
        responses={200: BranchSerializer(many=True)},
        description="Retrieve all branches associated to a institution whose ID is given",
        summary="Get branches by Institution ID",
        tags=["Branch Management"],
    )
    def get(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if request.user == institution.institution_owner:
            branches = Branch.objects.filter(institution_id=institution_id)
        else:
            branches = Branch.objects.filter(
                institution_id=institution_id,
                id__in=UserBranch.objects.filter(user=request.user).values_list(
                    "branch_id", flat=True
                ),
            )

        branches = branches.order_by("-created_at")

        try:
            branches = self.apply_sorting(branches, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(branches, request)
        serializer = BranchSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class UserProfileListAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=ProfileSerializer,
        responses={201: ProfileSerializer},
        description="Create a new user with profile.",
        summary="Create a new user profile",
        tags=["User Management"],
    )
    def post(self, request):
        random_password = generate_compliant_password()
        mutable_data = request.data.copy()
        user_data = mutable_data.get("user", {})
        user_data["password"] = random_password
        mutable_data["user"] = user_data

        serializer = ProfileSerializer(data=mutable_data)
        if serializer.is_valid():
            profile = serializer.save()
            profile.user.is_password_verified = False
            profile.user.save()

            token = create_and_institution_token(
                user=profile.user, purpose="registration", expiry_minutes=15
            )
            password_link = build_password_link(request=request, token=token)
            send_password_link_to_user(user=profile.user, link=password_link)

            return Response(
                ProfileSerializer(profile).data, status=status.HTTP_201_CREATED
            )

        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class UserProfileDetailAPIView(APIView):
    @extend_schema(
        responses={200: ProfileSerializer(many=True)},
        description="Retrieve the user profile of all users attached to the institution.",
        summary="Get all user profiles",
        tags=["User Management"],
    )
    def get(self, request, institution_id):
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return Response({"detail": "Institution not found."}, status=404)

        user = request.user

        if not user.is_staff and institution.institution_owner != user:
            try:
                profile = user.profile
                if profile.institution_id != institution.id:
                    return Response({"detail": "Access denied."}, status=403)
            except Profile.DoesNotExist:
                return Response({"detail": "Access denied."}, status=403)

        profiles = Profile.objects.filter(institution=institution_id)
        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(profiles, request)
        serializer = ProfileSerializer(
            paginator_qs, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)


class InstitutionUserProfileAPIView(APIView):
    @extend_schema(
        request=ProfileSerializer(partial=True),
        responses={200: ProfileSerializer},
        description="Update a institution user's profile (partial update).",
        summary="Update institution user details",
        tags=["User Management"],
    )
    def patch(self, request, user_id):
        if user_id:
            try:
                user = Profile.objects.get(user_id=user_id)
                serializer = Profile(user, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(
                        {
                            "message": "Institution User updated successfully",
                            "user": serializer.data,
                        },
                        status=status.HTTP_200_OK,
                    )
                return Response(
                    {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )
            except Profile.DoesNotExist:
                return Response(
                    {"detail": "Institution User not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        return Response(
            {"detail": "User ID is required for updating."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class UserBranchListCreateView(APIView):
    @extend_schema(
        request=UserBranchSerializer,
        responses={201: UserBranchSerializer},
        description="Create a new user-branch relationship.",
        summary="Create a new user-branch relationship",
        tags=["User Management"],
    )
    def post(self, request):
        serializer = UserBranchSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            user_branch = serializer.save()

            try:
                employee = Employee.objects.get(user=user_branch.user)
                if user_branch.is_default:
                    employee.payroll_branch = user_branch.branch
                    employee.save(update_fields=["payroll_branch"])
            except Employee.DoesNotExist:
                pass

            return Response(
                UserBranchSerializer(user_branch).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    def get(self, request):
        user_branches = UserBranch.objects.all().order_by("-created_at")
        serializer = UserBranchSerializer(user_branches, many=True)
        return Response(serializer.data)


class UserBranchDetailAPIView(APIView):
    @extend_schema(
        responses={200: UserBranchSerializer},
        description="Retrieve a user-branch relationship.",
        summary="Get a user-branch relationship",
        tags=["User Management"],
    )
    def get(self, request, user_branch_id):
        try:
            user_branch = UserBranch.objects.get(id=user_branch_id)
            serializer = UserBranchSerializer(user_branch)
            return Response(serializer.data)
        except UserBranch.DoesNotExist:
            return Response(
                {"detail": "User-branch relationship not found."}, status=404
            )

    @extend_schema(
        request=UserBranchSerializer,
        responses={200: UserBranchSerializer},
        description="Update an existing user-branch relationship.",
        summary="Update a user-branch relationship",
        tags=["User Management"],
    )
    def patch(self, request, user_branch_id):
        user_branch = get_object_or_404(UserBranch, id=user_branch_id)
        serializer = UserBranchSerializer(user_branch, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class DepartmentListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ["name", "created_at", "description", "is_active"]
    default_ordering = ["name"]

    @extend_schema(
        request=DepartmentSerializer,
        responses={201: DepartmentSerializer},
        description="Create a new department.",
        summary="Create a new department",
        tags=["Department Management"],
    )
    @transaction.atomic()
    def post(self, request, institution_id=None):
        if not institution_id:
            return Response(
                {"detail": "Institution ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            department = serializer.save()
            department.confirm_create()
            return Response(
                DepartmentSerializer(department).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        responses={200: DepartmentSerializer(many=True)},
        description="Retrieve all departments.",
        summary="Get all departments",
        tags=["Department Management"],
    )
    def get(self, request, institution_id=None):
        search_query = request.query_params.get("search", None)
        departments = Department.objects.filter(
            institution_id=institution_id, deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            departments = departments.filter(Q(name__icontains=search_query))

        try:
            departments = self.apply_sorting(departments, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginator_qs = paginator.paginate_queryset(departments, request)
        serializer = DepartmentSerializer(paginator_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class DepartmentDetailAPIView(APIView):
    @extend_schema(
        responses={200: DepartmentSerializer},
        description="Retrieve a department.",
        summary="Get a department",
        tags=["Department Management"],
    )
    def get(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
            serializer = DepartmentSerializer(department)
            return Response(serializer.data)
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=404)

    @extend_schema(
        request=DepartmentSerializer,
        responses={200: DepartmentSerializer},
        description="Update an existing department.",
        summary="Update a department",
        tags=["Department Management"],
    )
    @transaction.atomic()
    def patch(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
            department.approval_status = "under_update"
            serializer = DepartmentSerializer(
                department, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                department.confirm_update()
                return Response(serializer.data)
            return Response(
                {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=404)

    @extend_schema(
        responses={204: None},
        description="Delete an existing department.",
        summary="Delete a department",
        tags=["Department Management"],
    )
    def delete(self, request, department_id):
        try:
            department = Department.objects.get(id=department_id)
            department.approval_status = "under_deletion"
            department.save(update_fields=["approval_status"])
            department.confirm_delete()
            return Response(status=204)
        except Department.DoesNotExist:
            return Response({"detail": "Department not found."}, status=404)


# TODO: Make sure a user who does this has permissions to do so
@extend_schema(
    responses={204: None},
    description="Delete an existing user-branch relationship by user and branch IDs.",
    summary="Delete a user-branch relationship by user and branch",
    tags=["User Management"],
)
@api_view(["DELETE"])
def delete_user_branch_by_ids(request, user_id, branch_id):
    try:
        user_branch = UserBranch.objects.get(user_id=user_id, branch_id=branch_id)
        user_branch.is_active = False
        user_branch.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except UserBranch.DoesNotExist:
        return Response(
            {"detail": "User-branch relationship not found."},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    summary="Activate HR System",
    description="Accepts validated institution, branches, and employee data...",
    request=InstitutionActivationSerializer,
    responses={
        201: OpenApiResponse(
            response=SuccessResponseSerializer,  # if you define one
            description="Successful Activation",
        ),
        400: OpenApiResponse(
            response=ErrorResponseSerializer, description="Validation Error"
        ),
        401: OpenApiResponse(
            response=ErrorResponseSerializer, description="Unauthorized"
        ),
        500: OpenApiResponse(
            response=ErrorResponseSerializer, description="Internal Server Error"
        ),
    },
    parameters=[
        OpenApiParameter(
            name="X-API-Key",
            location=OpenApiParameter.HEADER,
            required=True,
            description="API key for authenticating the external system",
            type=str,
        )
    ],
    tags=["System Activation"],
)
class SystemActivationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    """
    For activating HR system from the external systems.
    """

    def get_system_from_api_key(self, api_key):
        """Validate API key and return the system."""
        try:
            system = System.objects.get(api_key=api_key, system_type__is_active=True)
            return system
        except System.DoesNotExist:
            return None

    def create_or_get_user(self, employee_data):
        """Create or get user for employee."""
        email = employee_data.get("email")
        full_name = employee_data.get("full_name")
        phone_number = employee_data.get("phone_number")
        gender = employee_data.get("gender")

        if email:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "fullname": full_name,
                    "is_active": True,
                    "gender": gender,
                },
            )

            return user

        return None

    def create_departments(self, institution, departments_data, owner_user):
        """Create departments for the institution."""
        created_departments = []

        for dept_data in departments_data:
            try:
                department = Department.objects.create(
                    institution=institution,
                    name=dept_data.get("name"),
                    description=dept_data.get("description", ""),
                    created_by=owner_user,
                )
                created_departments.append(department)
            except Exception as e:
                logger.error(f"Error creating department: {str(e)}")
                continue

        return created_departments

    def create_institution_and_branches(self, validated_data, owner_user):
        """Create institution and its branches."""

        try:
            branches_data = validated_data.pop("branches", [])
            employees_data = validated_data.pop("employees", [])
            departments_data = validated_data.pop("departments", [])
            owner_data = validated_data.pop("owner", {})

            institution = Institution.objects.create(
                institution_owner=owner_user, created_by=owner_user, **validated_data
            )

            created_branches = []
            for branch_data in branches_data:
                branch = Branch.objects.create(
                    institution=institution, created_by=owner_user, **branch_data
                )
                created_branches.append(branch)

            created_departments = self.create_departments(
                institution, departments_data, owner_user
            )

            return (
                institution,
                created_branches,
                created_departments,
                employees_data,
                owner_data,
            )

        except Exception as e:
            logger.error(f"Error creating institution and branches: {str(e)}")
            raise

    def create_employees(self, institution, branches, departments, employees_data):
        """Create employees for the institution."""
        created_employees = []

        branch_map = {branch.branch_location: branch for branch in branches}
        department_map = {dept.name: dept for dept in departments}

        for employee_data in employees_data:
            try:
                branch_location = employee_data.get("branch_location")
                branch = (
                    branch_map.get(branch_location)
                    if branch_location
                    else (branches[0] if branches else None)
                )

                if not branch:
                    continue

                department_name = employee_data.get("department")
                department = (
                    department_map.get(department_name) if department_name else None
                )

                employee_user = self.create_or_get_user(employee_data)
                if not employee_user:
                    continue

                employee = Employee.objects.create(
                    user=employee_user,
                    email=employee_data.get("email"),
                    phone_number=employee_data.get("phone_number"),
                    gender=employee_data.get("gender"),
                    date_of_birth=employee_data.get("date_of_birth"),
                    address=employee_data.get("address"),
                    payroll_branch=branch,
                    department=department,
                    date_of_joining=employee_data.get(
                        "date_of_joining", timezone.now().date()
                    ),
                )
                created_employees.append(employee)

            except Exception as e:
                logger.error(f"Error creating employee: {str(e)}")
                continue

        return created_employees

    def post(self, request):
        """Handle HR system activation."""

        api_key = request.headers.get("X-API-Key") or request.headers.get(
            "Authorization"
        )

        if not api_key:
            return Response(
                {"error": "API key is required in X-API-Key header"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if api_key.startswith("Bearer "):
            api_key = api_key[7:]

        system = self.get_system_from_api_key(api_key)
        if not system:
            return Response(
                {"error": "Invalid API key"}, status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = InstitutionActivationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Data does not conform to HR system requirements",
                    "details": serializer.errors,
                    "message": "Please ensure your data matches the HR system contract",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                validated_data = serializer.validated_data.copy()

                owner_data = validated_data.get("owner", {})
                owner_user = self.create_or_get_user(owner_data)

                if not owner_user:
                    return Response(
                        {"error": "Could not create owner user"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                owner_email = owner_data.get("email")

                institution, branches, departments, employees_data, owner_data = (
                    self.create_institution_and_branches(validated_data, owner_user)
                )

                institution.system = system
                institution.save()

                employees = self.create_employees(
                    institution, branches, departments, employees_data
                )

                owner_employee = None
                if owner_email:
                    for employee in employees:
                        if employee.email == owner_email:
                            owner_employee = employee
                            break

                response_data = {
                    "success": True,
                    "message": "HR system activated successfully",
                    "data": {
                        "institution": {
                            "id": institution.id,
                            "institution_name": institution.institution_name,
                            "location": institution.location,
                            "institution_email": institution.institution_email,
                        },
                        "owner": {
                            "id": owner_user.id,
                            "email": owner_user.email,
                            "fullname": owner_user.fullname,
                            "employee_created": owner_employee is not None,
                        },
                        "branches_created": len(branches),
                        "departments_created": len(departments),
                        "employees_created": len(employees),
                        "system_type": system.system_type.name,
                        "system_code": system.code,
                    },
                }

                send_activation_confirmation_email(
                    owner_fullname=owner_user.fullname,
                    owner_email=owner_user.email,
                    institution_name=institution.institution_name,
                    branches=branches,
                    departments=departments,
                    employees=employees,
                )

                return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error during system activation: {str(e)}")
            return Response(
                {"error": "Failed to activate HR system", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DashboardView(APIView):
    def get(self, request, institution_id):
        year = request.query_params.get("year", timezone.now().year)
        try:
            year = int(year)
        except ValueError:
            return Response(
                {"error": "Invalid year"}, status=status.HTTP_400_BAD_REQUEST
            )

        prev_year = year - 1
        today = timezone.now().date()

        employee_count = Employee.objects.filter(
            is_active=True, department__institution_id=institution_id
        ).count()

        dep_count = Department.objects.filter(
            is_active=True, institution_id=institution_id
        ).count()

        on_leave_count = (
            LeaveApplication.objects.filter(
                status="approved",
                start_date__lte=today,
                end_date__gte=today,
                employee__department__institution_id=institution_id,
            )
            .values("employee")
            .distinct()
            .count()
        )

        basic_counts = {
            "employee_count": employee_count,
            "department_count": dep_count,
            "on_leave_count": on_leave_count,
        }

        current_year_payslips = (
            Payslip.objects.filter(
                payroll_period__start_date__year=year,
                employee__department__institution_id=institution_id,
            )
            .annotate(month=ExtractMonth("payroll_period__start_date"))
            .values("month")
            .annotate(payroll=Sum("net_salary"))
            .order_by("month")
        )

        current_monthly = [
            {"month": f"{item['month']:02d}", "payroll": item["payroll"] or 0}
            for item in current_year_payslips
        ]

        for m in range(1, 13):
            if not any(x["month"] == f"{m:02d}" for x in current_monthly):
                current_monthly.append({"month": f"{m:02d}", "payroll": 0})
        current_monthly.sort(key=lambda x: x["month"])

        past_total = (
            Payslip.objects.filter(
                payroll_period__start_date__year=prev_year,
                employee__department__institution_id=institution_id,
            ).aggregate(total=Sum("net_salary"))["total"]
            or 0
        )

        payroll_data = {"current": current_monthly, "past": {"total": past_total}}

        employees_per_dept = (
            Employee.objects.filter(
                date_of_joining__year=year,
                is_active=True,
                department__institution_id=institution_id,
            )
            .values("department__name")
            .annotate(
                count=Count("id"),
                dept_name=F("department__name"),
                year=Value(year, output_field=IntegerField()),
            )
            .values("dept_name", "count", "year")
        )

        employees_per_dept_list = list(employees_per_dept)

        gender_data = Employee.objects.filter(
            is_active=True,
            department__institution_id=institution_id,
            date_of_joining__year=year,
        ).aggregate(
            employees_count=Count("id"),
            male=Count("id", filter=Q(gender="male")),
            female=Count("id", filter=Q(gender="female")),
            other=Count("id", filter=Q(gender="other")),
        )

        payroll_by_dept = (
            Payslip.objects.filter(
                employee__department__institution_id=institution_id,
                payroll_period__start_date__year=year,
            )
            .values("employee__department__name")
            .annotate(payroll=Sum("net_salary"), dept=F("employee__department__name"))
            .values("dept", "payroll")
        )

        payroll_by_dept_list = list(payroll_by_dept)

        data = {
            "basic_counts": basic_counts,
            "payroll_summary": payroll_data,
            "employees_per_department": employees_per_dept_list,
            "gender_distribution": gender_data,
            "payroll_by_department": payroll_by_dept_list,
        }

        return Response(data, status=status.HTTP_200_OK)


class InstitutionPenaltyConfigListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "penalty_type",
        "created_at",
        "penalty_vale",
        "is_active",
        "penalty_value_type",
        "percentage",
    ]
    default_ordering = ["penalty_type"]

    @extend_schema(
        tags=["Penalty Configurations"],
        parameters=[
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Search by penalty type or value type",
            ),
            OpenApiParameter(
                name="penalty_type",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filter by penalty type (e.g., late_coming)",
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Page number",
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Number of results per page",
            ),
        ],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        penalty_type = request.query_params.get("penalty_type", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        configs = InstitutionPenaltyConfig.objects.filter(
            institution=institution, deleted_at__isnull=True
        )

        if penalty_type:
            configs = configs.filter(penalty_type=penalty_type)

        if search_query:
            configs = configs.filter(
                Q(penalty_type__icontains=search_query)
                | Q(penalty_value_type__icontains=search_query)
            )

        try:
            configs = self.apply_sorting(configs, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(configs, request)
        serializer = InstitutionPenaltyConfigSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=["Penalty Configurations"])
    @transaction.atomic()
    def post(self, request):

        serializer = InstitutionPenaltyConfigSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InstitutionPenaltyConfigDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return InstitutionPenaltyConfig.objects.get(pk=pk)
        except InstitutionPenaltyConfig.DoesNotExist:
            raise Http404

    @extend_schema(tags=["Penalty Configurations"])
    def get(self, request, pk):
        config = self.get_object(pk)
        serializer = InstitutionPenaltyConfigSerializer(config)
        return Response(serializer.data)

    @extend_schema(tags=["Penalty Configurations"])
    @transaction.atomic()
    def patch(self, request, pk):
        config = self.get_object(pk)
        config.approval_status = "under_update"
        serializer = InstitutionPenaltyConfigSerializer(
            config, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            config.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=["Penalty Configurations"])
    def delete(self, request, pk):
        config = self.get_object(pk)
        config.approval_status = "under_deletion"
        config.save(update_fields=["approval_status"])
        config.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BranchPenaltyConfigListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "penalty_type",
        "created_at",
        "penalty_vale",
        "is_active",
        "penalty_value_type",
        "percentage",
    ]
    default_ordering = ["penalty_type"]

    @extend_schema(
        tags=["Penalty Configurations"],
        parameters=[
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Search by penalty type or value type",
            ),
            OpenApiParameter(
                name="branch_id",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filter by branch ID",
            ),
            OpenApiParameter(
                name="penalty_type",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filter by penalty type (e.g., late_coming)",
            ),
            OpenApiParameter(
                name="page",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Page number",
            ),
            OpenApiParameter(
                name="page_size",
                type=int,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Number of results per page",
            ),
        ],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get("search", None)
        branch_id = request.query_params.get("branch_id", None)
        penalty_type = request.query_params.get("penalty_type", None)

        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        configs = BranchPenaltyConfig.objects.filter(
            branch__institution=institution, deleted_at__isnull=True
        )

        if branch_id:
            configs = configs.filter(branch__id=branch_id)

        if penalty_type:
            configs = configs.filter(penalty_type=penalty_type)

        if search_query:
            configs = configs.filter(
                Q(penalty_type__icontains=search_query)
                | Q(penalty_value_type__icontains=search_query)
            )

        try:
            configs = self.apply_sorting(configs, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(configs, request)
        serializer = BranchPenaltyConfigSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=["Penalty Configurations"])
    @transaction.atomic()
    def post(self, request):
        serializer = BranchPenaltyConfigSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BranchPenaltyConfigDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return BranchPenaltyConfig.objects.get(pk=pk)
        except BranchPenaltyConfig.DoesNotExist:
            raise Http404

    @extend_schema(tags=["Penalty Configurations"])
    def get(self, request, pk):
        config = self.get_object(pk)
        serializer = BranchPenaltyConfigSerializer(config)
        return Response(serializer.data)

    @extend_schema(tags=["Penalty Configurations"])
    @transaction.atomic()
    def patch(self, request, pk):
        config = self.get_object(pk)
        config.approval_status = "under_update"
        serializer = BranchPenaltyConfigSerializer(
            config, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            config.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=["Penalty Configurations"])
    def delete(self, request, pk):
        config = self.get_object(pk)
        config.approval_status = "under_deletion"
        config.save(update_fields=["approval_status"])
        config.confirm_dlete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BranchLocationComparisonConfigListAPIView(APIView, SortableAPIMixin):
    allowed_ordering_fields = ["created_at", "is_active", "branch", "radius_in_meters"]
    default_ordering = ["branch"]

    def get(self, request):
        search_query = request.query_params.get("search", None)
        user = request.user.profile
        branch_id = request.query_params.get("branch_id", None)

        try:
            institution = user.institution
        except AttributeError:
            return Response({"detail": "User has no institution assigned."}, status=400)

        configs = BranchLocationComparisonConfig.objects.filter(
            branch__institution=institution, deleted_at__isnull=True
        )

        if branch_id:
            configs = configs.filter(branch__id=branch_id)

        if search_query:
            configs = configs.filter(branch__branch_name__icontains=search_query)

        try:
            configs = self.apply_sorting(configs, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(configs, request)
        serializer = BranchLocationComparisonConfigSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @transaction.atomic()
    def post(self, request):
        serializer = BranchLocationComparisonConfigSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BranchLocationComparisonConfigDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return BranchLocationComparisonConfig.objects.get(pk=pk)
        except BranchLocationComparisonConfig.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        config = self.get_object(pk)
        serializer = BranchLocationComparisonConfigSerializer(config)
        return Response(serializer.data)

    @transaction.atomic()
    def patch(self, request, pk):
        config = self.get_object(pk)
        config.approval_status = "under_update"
        serializer = BranchLocationComparisonConfigSerializer(
            config, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            config.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        config = self.get_object(pk)
        config.approval_status = "under_deletion"
        config.save(update_fields=["approval_status"])
        config.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BranchShiftListCreateView(APIView, SortableAPIMixin):
    allowed_ordering_fields = [
        "name",
        "branch",
        "start_time",
        "end_time",
        "shift_day",
        "created_at",
        "is_active",
    ]
    default_ordering = ["name"]

    @extend_schema(
        tags=["Branch Shifts"], responses={200, BranchShiftSerializer(many=True)}
    )
    def get(self, request, branch_id):
        search = request.query_params.get("search", None)

        try:
            branch = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            return Response(
                {"detail": "Branch not found"}, status=status.HTTP_404_NOT_FOUND
            )

        branch_shifts = BranchShift.objects.filter(branch=branch, is_active=True)

        if search:
            branch_shifts = branch_shifts.filter(Q(name__icontains=search))

        try:
            branch_shifts = self.apply_sorting(branch_shifts, request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        branch_shifts = branch_shifts.order_by("name")
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(branch_shifts, request)
        serializer = BranchShiftSerializer(paginated_qs, many=True)

        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        tags=["Branch Shifts"],
        responses={201, BranchShiftSerializer(many=True)},
        request=BranchShiftSerializer,
    )
    @transaction.atomic()
    def post(self, request, branch_id):
        serializer = BranchShiftSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BranchShiftDetailView(APIView):
    def get_object(self, pk):
        try:
            return BranchShift.objects.get(pk=pk)
        except BranchShift.DoesNotExist:
            raise Http404

    @extend_schema(tags=["Branch Shifts"], responses={200, BranchShiftSerializer})
    def get(self, request, shift_id):
        branch_shift = self.get_object(shift_id)
        serializer = BranchShiftSerializer(branch_shift)
        return Response(serializer.data)

    @extend_schema(
        tags=["Branch Shifts"],
        responses={200, BranchShiftSerializer},
        request=BranchShiftSerializer,
    )
    @transaction.atomic()
    def patch(self, request, shift_id):
        branch_shift = self.get_object(shift_id)
        branch_shift.approval_status = "under_update"
        serializer = BranchShiftSerializer(
            branch_shift, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            branch_shift.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=["Branch Shifts"], responses={204: None})
    def delete(self, request, shift_id):
        branch_shift = self.get_object(shift_id)
        branch_shift.approval_status = "under_deletion"
        branch_shift.save(update_fields=["approval_status"])
        branch_shift.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
