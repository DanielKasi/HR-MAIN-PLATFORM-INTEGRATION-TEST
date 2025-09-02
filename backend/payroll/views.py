from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema

from utilities.pagination import CustomPageNumberPagination
from .models import (
    EmployeeAllowance,
    EmployeeDeduction,
    AllowanceType,
    DeductionType,
    PayrollPeriod,
    Payslip,
    PayslipItem,
    EmployeeTax,
    EmployeePenalty
)
from .serializers import (
    EmployeeAllowanceSerializer,
    EmployeeDeductionSerializer,
    AllowanceTypeSerializer,
    DeductionTypeSerializer,
    PayrollPeriodSerializer,
    PayslipSerializer,
    PayslipItemSerializer,
    PayslipGenerationInputSerializer,
    EmployeeTaxSerializer,
    AttendanceReportSerializer,
    PayslipsExcelReportSerializer,
    EmployeePenaltySerializer,
    
)
from employee.models import Employee, EmployeeAttendance
from .utils import PayrollProcessor, generate_eft_excel, generate_allpayslips_excel
from django.http import HttpResponse
from django.utils.encoding import escape_uri_path
from drf_spectacular.utils import extend_schema, OpenApiParameter
from institution.models import Institution, PENALTY_TYPES
from payroll.utils import generate_payslip_pdf
from django.utils import timezone
from django.db.models import Q, Sum, Q, Avg
from django.db.models.functions import TruncMonth
from django.db.models import Count, Sum, Avg, F, ExpressionWrapper, FloatField
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer
from rest_framework import serializers
from datetime import timedelta
from .models import Payslip, PayrollPeriod
from employee.models import Employee




class ExportEFTExcelView(APIView):
    """
    API endpoint to generate and download an EFT Excel file for a given payroll period.
    Access this endpoint with a GET request, providing `payroll_period_id` as a query parameter.
    Example: /api/payroll/export-eft/?payroll_period_id=1
    """

    @extend_schema(
        tags=["export2excel"],
        parameters=[
            OpenApiParameter(
                name="payroll_period_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="ID of the payroll period to generate the EFT Excel for",
                required=True,
            ),
            OpenApiParameter(
                name="paying_account_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="ID of the paying account to generate the EFT Excel for",
                required=True,
            ),
        ],
        responses={
            200: None,
            400: None,
            404: None,
            500: None,
        },
    )
    def get(self, request, *args, **kwargs):
        payroll_period_id = request.query_params.get("payroll_period_id")
        paying_account_id = request.query_params.get("paying_account_id")

        if not payroll_period_id:
            return Response(
                {"error": "payroll_period_id is required as a query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not paying_account_id:
            return Response(
                {"error": "paying_account_id is required as a query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payroll_period_id = int(payroll_period_id)
            paying_account_id = int(paying_account_id)
        except ValueError:
            return Response(
                {"error": "payroll_period_id and paying_account_id must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            excel_file = generate_eft_excel(payroll_period_id, paying_account_id)
            payroll_period = PayrollPeriod.objects.get(id=payroll_period_id)

            # Generate a dynamic filename
            filename = f"BULK_EFT_UPLOAD_TEMPLATE_{payroll_period.name.replace(' ', '_')}_{timezone.now().strftime('%Y%m%d')}.xlsx"

            response = HttpResponse(
                excel_file.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{escape_uri_path(filename)}"'
            )
            return response
        except PayrollPeriod.DoesNotExist:
            return Response(
                {"error": f"Payroll period with ID {payroll_period_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {
                    "error": "An internal server error occurred while generating the Excel file."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmployeeAllowanceAPIView(APIView):

    @extend_schema(
        summary="List employee allowances for a specific institution",
        responses=EmployeeAllowanceSerializer(many=True),
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        employee_id = request.query_params.get("employee_id")
        allowances = EmployeeAllowance.objects.filter(
            employee__department__institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if employee_id:
            allowances = allowances.filter(employee_id=employee_id)

        if search_query:
            allowances = allowances.filter(
                Q(employee__user__fullname__icontains=search_query) |
                Q(allowance_type__name__icontains=search_query)
            )
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(allowances, request)
        serializer = EmployeeAllowanceSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=EmployeeAllowanceSerializer,
        responses=EmployeeAllowanceSerializer,
        summary="Create a new employee allowance",
    )
    def post(self, request, institution_id):
        serializer = EmployeeAllowanceSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeAllowanceDetailAPIView(APIView):

    @extend_schema(
        responses=EmployeeAllowanceSerializer,
        summary="Retrieve an employee allowance by ID",
    )
    def get(self, request, pk):
        instance = get_object_or_404(EmployeeAllowance, pk=pk)
        serializer = EmployeeAllowanceSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeAllowanceSerializer,
        responses=EmployeeAllowanceSerializer,
        summary="Update an employee allowance (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(EmployeeAllowance, pk=pk)
        instance.approval_status = 'under_update'
        serializer = EmployeeAllowanceSerializer(
            instance, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete an employee allowance")
    def delete(self, request, pk):
        instance = get_object_or_404(EmployeeAllowance, pk=pk)
        instance.approval_status = 'under_deletion'
        instance.delete()
        instance.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayrollPeriodAPIView(APIView):

    @extend_schema(
        summary="List payroll periods for a given institution",
        responses=PayrollPeriodSerializer(many=True),
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        periods = PayrollPeriod.objects.filter(institution_id=institution_id, deleted_at__isnull=True).order_by(
            "-created_at"
        )

        if search_query:
            periods = periods.filter(
                Q(name__icontains=search_query)
            )

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(periods, request)
        serializer = PayrollPeriodSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=PayrollPeriodSerializer,
        responses=PayrollPeriodSerializer,
        summary="Create a new payroll period",
    )
    def post(self, request, institution_id):
        serializer = PayrollPeriodSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PayrollPeriodDetailAPIView(APIView):

    @extend_schema(
        responses=PayrollPeriodSerializer, summary="Retrieve a payroll period by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(PayrollPeriod, pk=pk)
        serializer = PayrollPeriodSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=PayrollPeriodSerializer,
        responses=PayrollPeriodSerializer,
        summary="Update a payroll period (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(PayrollPeriod, pk=pk)
        instance.approval_status = 'under_update'
        serializer = PayrollPeriodSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a payroll period")
    def delete(self, request, pk):
        instance = get_object_or_404(PayrollPeriod, pk=pk)
        instance.approval_status = 'under_deletion'
        instance.delete()
        instance.confirm_update()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeDeductionAPIView(APIView):

    @extend_schema(
        summary="List employee deductions for a specific institution",
        responses=EmployeeDeductionSerializer(many=True),
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        employee_id = request.query_params.get("employee_id")
        deductions = EmployeeDeduction.objects.filter(
            employee__department__institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if employee_id:
            deductions = deductions.filter(employee_id=employee_id)

        if search_query:
            deductions = deductions.filter(
                Q(employee__user__fullname__icontains=search_query)
            )    

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(deductions, request)
        serializer = EmployeeDeductionSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create a new employee deduction",
        request=EmployeeDeductionSerializer,
        responses=EmployeeDeductionSerializer,
    )
    @extend_schema(
        request=EmployeeDeductionSerializer,
        responses=EmployeeDeductionSerializer,
        summary="Create a new employee deduction",
    )
    def post(self, request, institution_id):
        serializer = EmployeeDeductionSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeDeductionDetailAPIView(APIView):

    @extend_schema(
        responses=EmployeeDeductionSerializer,
        summary="Retrieve an employee deduction by ID",
    )
    def get(self, request, pk):
        instance = get_object_or_404(EmployeeDeduction, pk=pk)
        serializer = EmployeeDeductionSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeDeductionSerializer,
        responses=EmployeeDeductionSerializer,
        summary="Update an employee deduction (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(EmployeeDeduction, pk=pk)
        instance.approval_status = 'under_update'
        serializer = EmployeeDeductionSerializer(
            instance, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete an employee deduction")
    def delete(self, request, pk):
        instance = get_object_or_404(EmployeeDeduction, pk=pk)
        instance.approval_status = 'under_deletion'
        instance.delete()
        instance.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AllowanceTypeAPIView(APIView):

    @extend_schema(
        summary="List allowance types for an institution",
        responses=AllowanceTypeSerializer(many=True),
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        allowance_types = AllowanceType.objects.filter(
            institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            allowance_types = allowance_types.filter(
                Q(name__icontains=search_query)
            )

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(allowance_types, request)
        serializer = AllowanceTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=AllowanceTypeSerializer,
        responses=AllowanceTypeSerializer,
        summary="Create a new allowance type",
    )
    def post(self, request, institution_id):
        serializer = AllowanceTypeSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save(institution_id=institution_id)
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AllowanceTypeDetailAPIView(APIView):

    @extend_schema(
        responses=AllowanceTypeSerializer, summary="Retrieve an allowance type by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(AllowanceType, pk=pk)
        serializer = AllowanceTypeSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=AllowanceTypeSerializer,
        responses=AllowanceTypeSerializer,
        summary="Update an allowance type (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(AllowanceType, pk=pk)
        instance.approval_status = 'under_update'
        serializer = AllowanceTypeSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete an allowance type")
    def delete(self, request, pk):
        instance = get_object_or_404(AllowanceType, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        request=AllowanceTypeSerializer,
        responses=AllowanceTypeSerializer,
        summary="Create allowance types for an institution",
    )
    def post(self, request):
        serializer = AllowanceTypeSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeductionTypeAPIView(APIView):

    @extend_schema(
        summary="List deduction types for an institution",
        responses=DeductionTypeSerializer(many=True),
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        deduction_types = DeductionType.objects.filter(
            institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if search_query:
            deduction_types = deduction_types.filter(
                Q(name__icontains=search_query)
            )
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(deduction_types, request)
        serializer = DeductionTypeSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=DeductionTypeSerializer,
        responses=DeductionTypeSerializer,
        summary="Create a new deduction type",
    )
    def post(self, request, institution_id):
        serializer = DeductionTypeSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeductionTypeDetailAPIView(APIView):

    @extend_schema(
        responses=DeductionTypeSerializer, summary="Retrieve a deduction type by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(DeductionType, pk=pk)
        serializer = DeductionTypeSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=DeductionTypeSerializer,
        responses=DeductionTypeSerializer,
        summary="Update a deduction type (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(DeductionType, pk=pk)
        instance.approval_status = 'under_update'
        serializer = DeductionTypeSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a deduction type")
    def delete(self, request, pk):
        instance = get_object_or_404(DeductionType, pk=pk)
        instance.approval_status = 'under_deletion'
        instance.delete()
        instance.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeTaxListAPIView(APIView):

    @extend_schema(
        summary="List employee taxes for a specific institution",
        responses=EmployeeTaxSerializer(many=True),
        tags=["Employee Taxes MGT"],
    )
    def get(self, request):
        search_query = request.query_params.get('search', None)
        user = request.user.profile
        employee_id = request.query_params.get("employee_id")

        if not user:
            return Response(
                {"error": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        institution_id = user.institution_id

        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return Response(
                {"error": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        employee_taxes = EmployeeTax.objects.filter(
            employee__department__institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if employee_id:
            employee_taxes = employee_taxes.filter(employee_id=employee_id)

        if search_query:
            employee_taxes = employee_taxes.filter(
                Q(employee__user__fullname__icontains=search_query)
            )    
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(employee_taxes, request)
        serializer = EmployeeTaxSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=EmployeeTaxSerializer,
        responses=EmployeeTaxSerializer,
        summary="Create a new employee tax",
        tags=["Employee Taxes MGT"],
    )
    def post(self, request):
        serializer = EmployeeTaxSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeTaxDetailAPIView(APIView):

    @extend_schema(
        responses=EmployeeTaxSerializer,
        summary="Retrieve an employee tax by ID",
        tags=["Employee Taxes MGT"],
    )
    def get(self, request, pk):
        instance = get_object_or_404(EmployeeTax, pk=pk)
        serializer = EmployeeTaxSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeTaxSerializer,
        responses=EmployeeTaxSerializer,
        summary="Update an employee tax (partial)",
        tags=["Employee Taxes MGT"],
    )
    def patch(self, request, pk):
        instance = get_object_or_404(EmployeeTax, pk=pk)
        instance.approval_status = 'under_update'
        serializer = EmployeeTaxSerializer(
            instance, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete an employee tax")
    def delete(self, request, pk):
        instance = get_object_or_404(EmployeeTax, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayslipAPIView(APIView):

    @extend_schema(
        summary="List payslips for a specific institution",
        responses=PayslipSerializer(many=True),
    )
    def get(self, request, institution_id):
        search_query = request.query_params.get('search', None)
        employee_id = request.query_params.get("employee_id")
        payslips = Payslip.objects.filter(
            employee__department__institution_id=institution_id,
            deleted_at__isnull=True
        ).order_by("-created_at")

        if employee_id:
            payslips = payslips.filter(employee_id=employee_id)

        if search_query:
            payslips = payslips.filter(
                Q(employee__user__fullname_icontains=search_query) |
                                Q(employee__user__email_icontains=search_query)

            )    

        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(payslips, request)
        serializer = PayslipSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=PayslipGenerationInputSerializer,
        responses=PayslipSerializer(many=True),
        summary="Generate payslips for a payroll period",
    )
    def post(self, request, institution_id):
        input_serializer = PayslipGenerationInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payroll_period = input_serializer.validated_data["payroll_period"]

        employees = Employee.objects.filter(
            department__institution__id=institution_id,
            date_of_joining__lte=payroll_period.end_date,
        )

        if not employees.exists():
            return Response(
                {"detail": "No employees found for the given payroll period."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee_ids = list(employees.values_list("id", flat=True))

        created_payslips = PayrollProcessor.generate_payslips_for_period(
            payroll_period, employee_ids
        )

        output_serializer = PayslipSerializer(created_payslips, many=True)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class PayslipDetailAPIView(APIView):

    @extend_schema(responses=PayslipSerializer, summary="Retrieve a payslip by ID")
    def get(self, request, pk):
        instance = get_object_or_404(Payslip, pk=pk)
        serializer = PayslipSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=PayslipSerializer,
        responses=PayslipSerializer,
        summary="Update a payslip (partial)",
    )
    def patch(self, request, pk):
        instance = get_object_or_404(Payslip, pk=pk)
        instance.approval_status = 'under_update'
        serializer = PayslipSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            instance.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a payslip")
    def delete(self, request, pk):
        instance = get_object_or_404(Payslip, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayslipItemAPIView(APIView):

    @extend_schema(
        summary="List payslip items for a given payslip",
        responses=PayslipItemSerializer(many=True),
    )
    def get(self, request, payslip_id):
        items = PayslipItem.objects.filter(payslip_id=payslip_id)
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(items, request)
        serializer = PayslipItemSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class PayslipsByPayrollAPIView(APIView):
    """
    API view to list all payslips associated with a given payroll (payroll_id).
    """

    @extend_schema(
        summary="List payslips by payroll",
        responses=PayslipSerializer(many=True),
    )
    def get(self, request, payroll_id):
        payslips = Payslip.objects.filter(payroll_period__id=payroll_id)
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(payslips, request)
        serializer = PayslipSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)


class PayrollPeriodAttendanceReportAPIView(APIView):
    """
    Generate an attendance report for all employees in a given payroll period.
    """

    @extend_schema(
        summary="Attendance report for a payroll period",
        responses=AttendanceReportSerializer(many=True),
    )
    def get(self, request, pk):
        payroll_period = get_object_or_404(PayrollPeriod, pk=pk)
        report_data = AttendanceReportSerializer().to_representation(payroll_period)

        employees_list = report_data["employees"]

        paginator = CustomPageNumberPagination()
        paginated_employees = paginator.paginate_queryset(employees_list, request)

        paginated_response = {
            "payroll_period": report_data["payroll_period"],
            "employees": paginated_employees,
        }

        return paginator.get_paginated_response(paginated_response)


class PayrollPeriodPayslipsExcelReportAPIView(APIView):
    @extend_schema(
        tags=["export-all-payslips2excel"],
        request=PayslipsExcelReportSerializer,
        responses={
            200: None,
            400: None,
            404: None,
            500: None,
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = PayslipsExcelReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payroll_period_id = serializer.validated_data["payroll_period_id"]

        try:
            excel_file = generate_allpayslips_excel(payroll_period_id)

            filename = f"PAYROLL-PERIOD-PASSLIPS_REPORT_{timezone.now().strftime('%Y%m%d')}.xlsx"
            response = HttpResponse(
                excel_file.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{escape_uri_path(filename)}"'
            )
            return response

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response(
                {
                    "error": "An internal server error occurred while generating the Excel."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DownloadPayslipPDFView(APIView):
    """
    API endpoint to generate and download a single payslip as a PDF using WeasyPrint.
    """
    @extend_schema(
        summary="Download a single payslip as a PDF",
        responses={
            200: {'description': 'PDF file of the payslip'},
            404: {'description': 'Payslip not found'},
            500: {'description': 'Internal server error'},
        },
        parameters=[
            OpenApiParameter(
                name="payslip_id",
                type=str,
                location=OpenApiParameter.PATH,
                description="ID of the payslip to download",
                required=True,
            ),
        ],
        tags=["Payslip Operations"],
    )
    def get(self, request, payslip_id):
        try:
            payslip = get_object_or_404(Payslip.objects.select_related(
                'employee__user',
                'employee__department__institution',
                'employee__position',
                'payroll_period'
            ), id=payslip_id)
        except ValueError:
            return Response(
                {"error": "Invalid payslip ID format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            pdf_buffer = generate_payslip_pdf(payslip)

            # Create the HTTP response with the PDF data
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            
            # Set the file name for the download
            filename = f"Payslip_{payslip.employee.user.fullname}_{payslip.payroll_period.name}.pdf".replace(" ", "_")
            response['Content-Disposition'] = f'attachment; filename="{escape_uri_path(filename)}"'

            return response

        except Exception as e:
            return Response(
                {"error": "An internal server error occurred while generating the PDF."},
              
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class EmployeePenaltyListAPIView(APIView):
    @extend_schema(
        tags=['Employee Penalties'],
    )
    def get(self, request):
        user = request.user.profile
        search_query = request.query_params.get('search', None)
        employee_id = request.query_params.get('employee_id', None)
        penalty_type = request.query_params.get('penalty_type', None)
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        
        try:
            institution = Institution.objects.get(id=user.institution.id)
        except Institution.DoesNotExist:
            return Response(
                {"detail": "Institution not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        penalties = EmployeePenalty.objects.filter(
            employee__payroll_branch__institution=institution,
            deleted_at__isnull=True

        )
        
        if employee_id:
            penalties = penalties.filter(employee__id=employee_id)
        
        if penalty_type:
            penalties = penalties.filter(penalty_type=penalty_type)
        
        if date_from:
            penalties = penalties.filter(date__gte=date_from)
        
        if date_to:
            penalties = penalties.filter(date__lte=date_to)
        
        if search_query:
            penalties = penalties.filter(
                Q(penalty_type__icontains=search_query) |
                Q(notes__icontains=search_query)
            )
        
        paginator = CustomPageNumberPagination()
        paginated_qs = paginator.paginate_queryset(penalties, request)
        serializer = EmployeePenaltySerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(tags=['Employee Penalties'])
    def post(self, request):
        serializer = EmployeePenaltySerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            instance.confirm_create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeePenaltyDetailAPIView(APIView):
    @extend_schema(tags=["Employee Penalties"])
    def get(self, request, pk):
        try:
            penalty = EmployeePenalty.objects.get(pk=pk)
        except EmployeePenalty.DoesNotExist:
            return Response({"detail": "Penalty not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployeePenaltySerializer(penalty)
        return Response(serializer.data)

    @extend_schema(tags=["Employee Penalties"])
    def patch(self, request, pk):
        try:
            penalty = EmployeePenalty.objects.get(pk=pk)
        except EmployeePenalty.DoesNotExist:
            return Response({"detail": "Penalty not found."}, status=status.HTTP_404_NOT_FOUND)

        penalty.approval_status = 'under_update'
        serializer = EmployeePenaltySerializer(penalty, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            penalty.confirm_update()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(tags=["Employee Penalties"])
    def delete(self, request, pk):
        try:
            penalty = EmployeePenalty.objects.get(pk=pk)
        except EmployeePenalty.DoesNotExist:
            return Response({"detail": "Penalty not found."}, status=status.HTTP_404_NOT_FOUND)

        penalty.approval_status = 'under_deletion'
        penalty.delete()
        penalty.confirm_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayrollAnalyticsAPI(APIView):
    """
    A dedicated API view for overall payroll analytics.
    """
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='payroll_period_id',
                type=serializers.UUIDField,  # Use the serializer field as the type
                # help_text="UUID of the specific payroll period to analyze. If not provided, the latest period will be used.",
                required=False,
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="Overall payroll summary for the specified period.",
                response=inline_serializer(
                    name='PayrollSummaryResponse',
                    fields={
                        'payroll_period': serializers.UUIDField(), # Corrected this line to match the field type
                        'overall_financials': serializers.DictField(
                            help_text="Total financial amounts for the period.",
                            child=serializers.FloatField(),
                        ),
                        'cost_breakdown_percentages': serializers.DictField(
                            help_text="Percentage breakdown of gross salary components.",
                            child=serializers.FloatField(),
                        ),
                        'average_metrics': serializers.DictField(
                            help_text="Average gross and net salary per employee.",
                            child=serializers.FloatField(),
                        ),
                    }
                ),
            ),
            404: OpenApiResponse(description="Payroll period not found."),
        },
        summary="Get Overall Payroll Summary",
        description=(
            "Provides a high-level financial overview of the institution's payroll for a specific period. "
            "Includes total amounts, cost breakdowns, and average salaries."
        ),
        tags=["Payroll Analytics"],
    )
    def get(self, request, institution_id, payroll_period_id=None):
        """
        Calculates and returns key payroll summary metrics for an institution.
        """
        try:
            if payroll_period_id:
                payroll_period = PayrollPeriod.objects.get(id=payroll_period_id)
            else:
                # Get the most recent payroll period for the institution
                payroll_period = PayrollPeriod.objects.filter(
                    institution_id=institution_id,
                    is_processed=True
                ).order_by('-start_date').first()
                if not payroll_period:
                    return Response({"detail": "No processed payroll periods found for this institution."}, status=status.HTTP_404_NOT_FOUND)
        except PayrollPeriod.DoesNotExist:
            return Response({"detail": "Payroll period not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Filter payslips for the specified payroll period
        payslips = Payslip.objects.filter(
            payroll_period=payroll_period,
            employee__is_active=True,
            deleted_at__isnull=True
        )

        if not payslips.exists():
            return Response({"detail": "No payslips found for this period."}, status=status.HTTP_404_NOT_FOUND)
        
        # 1. Overall Financials
        overall_financials = payslips.aggregate(
            total_gross_salary=Sum('gross_salary', default=0.00),
            total_net_salary=Sum('net_salary', default=0.00),
            total_allowances=Sum('total_allowances', default=0.00),
            total_deductions=Sum('total_deductions', default=0.00),
            total_penalties=Sum('total_penalties', default=0.00),
        )
        
        total_gross_salary = overall_financials.get('total_gross_salary', 0)
        
        # 2. Cost Breakdown Percentages
        cost_breakdown_percentages = {}
        if total_gross_salary > 0:
            cost_breakdown_percentages = {
                'total_allowances_percent': round((overall_financials['total_allowances'] / total_gross_salary) * 100, 2),
                'total_deductions_percent': round((overall_financials['total_deductions'] / total_gross_salary) * 100, 2),
                'total_penalties_percent': round((overall_financials['total_penalties'] / total_gross_salary) * 100, 2),
                'basic_salary_percent': round((overall_financials['total_gross_salary'] - overall_financials['total_allowances']) / total_gross_salary * 100, 2),
            }

        # 3. Average Metrics
        average_metrics = payslips.aggregate(
            avg_gross_salary=Avg('gross_salary', default=0.00),
            avg_net_salary=Avg('net_salary', default=0.00),
        )

        response_data = {
            "payroll_period": serializers.UUIDField().to_representation(payroll_period.id),
            "overall_financials": {k: round(v, 2) for k, v in overall_financials.items()},
            "cost_breakdown_percentages": cost_breakdown_percentages,
            "average_metrics": {k: round(v, 2) for k, v in average_metrics.items()},
        }

        return Response(response_data, status=status.HTTP_200_OK)
    
    
class PayrollDashboardAPIView(APIView):
    """
    API endpoint for payroll dashboard analytics.
    Provides aggregated metrics on actual payroll data from Payslip model,
    filtered by the authenticated user's institution.
    """

    @extend_schema(
        tags=['Payroll Dashboard'],
        description=(
            'Retrieves key analytics for the payroll module dashboard, filtered by the authenticated user\'s institution. '
            'Metrics include total payroll amount from actual payslips, payroll by department, '
            'average net salary per employee, total penalties applied, penalty breakdown by type, '
            'allowances vs deductions comparison, and payroll trends over the last 6 months.'
        ),
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'total_payroll_amount': {'type': 'number', 'description': 'Total net salary paid (current year)'},
                    'total_gross_payroll': {'type': 'number', 'description': 'Total gross salary (current year)'},
                    'payroll_by_department': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'department': {'type': 'string'},
                                'total_net': {'type': 'number'},
                                'total_gross': {'type': 'number'},
                                'employee_count': {'type': 'integer'}
                            }
                        },
                        'description': 'Payroll amounts by department (current year)'
                    },
                    'average_net_salary': {'type': 'number', 'description': 'Average net salary per payslip (current year)'},
                    'average_gross_salary': {'type': 'number', 'description': 'Average gross salary per payslip (current year)'},
                    'total_penalties_amount': {'type': 'number', 'description': 'Total penalty amount applied (current year)'},
                    'total_penalties_count': {'type': 'integer', 'description': 'Total penalty instances (current year)'},
                    'penalty_breakdown': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'penalty_type': {'type': 'string'},
                                'count': {'type': 'integer'},
                                'total_amount': {'type': 'number'}
                            }
                        },
                        'description': 'Penalties by type (current year)'
                    },
                    'allowances_vs_deductions': {
                        'type': 'object',
                        'properties': {
                            'total_allowances': {'type': 'number'},
                            'total_deductions': {'type': 'number'},
                            'net_difference': {'type': 'number'}
                        },
                        'description': 'Total allowances vs deductions comparison (current year)'
                    },
                    'payroll_over_time': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'month': {'type': 'string'},
                                'total_net': {'type': 'number'},
                                'total_gross': {'type': 'number'},
                                'payslips_count': {'type': 'integer'}
                            }
                        },
                        'description': 'Payroll amounts by month (last 6 months)'
                    },
                    'payroll_periods_summary': {
                        'type': 'object',
                        'properties': {
                            'total_periods': {'type': 'integer'},
                            'processed_periods': {'type': 'integer'},
                            'pending_periods': {'type': 'integer'},
                            'latest_period': {'type': 'string'}
                        },
                        'description': 'Summary of payroll periods (current year)'
                    }
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
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

        current_year = timezone.now().year

        # Get all payslips for the institution in current year
        payslips = Payslip.objects.filter(
            employee__department__institution=institution,
            employee__deleted_at__isnull=True,
            payroll_period__start_date__year=current_year,
            deleted_at__isnull=True
        ).select_related('employee', 'employee__department', 'payroll_period')

        # Total payroll amounts
        payroll_totals = payslips.aggregate(
            total_net=Sum('net_salary'),
            total_gross=Sum('gross_salary'),
            avg_net=Avg('net_salary'),
            avg_gross=Avg('gross_salary')
        )
        
        total_payroll_amount = float(payroll_totals['total_net'] or 0)
        total_gross_payroll = float(payroll_totals['total_gross'] or 0)
        average_net_salary = round(float(payroll_totals['avg_net'] or 0), 2)
        average_gross_salary = round(float(payroll_totals['avg_gross'] or 0), 2)

        # Payroll by department
        payroll_by_department = list(
            payslips.values('employee__department__name')
            .annotate(
                total_net=Sum('net_salary'),
                total_gross=Sum('gross_salary'),
                employee_count=Count('employee', distinct=True)
            )
            .order_by('employee__department__name')
        )
        payroll_by_department = [
            {
                'department': item['employee__department__name'],
                'total_net': float(item['total_net'] or 0),
                'total_gross': float(item['total_gross'] or 0),
                'employee_count': item['employee_count']
            }
            for item in payroll_by_department if item['employee__department__name']
        ]

        # Penalty metrics
        penalties = EmployeePenalty.objects.filter(
            employee__department__institution=institution,
            employee__deleted_at__isnull=True,
            date__year=current_year,
            status='applied',
            deleted_at__isnull=True
        )
        
        penalty_totals = penalties.aggregate(
            total_amount=Sum('amount'),
            total_count=Count('id')
        )
        
        total_penalties_amount = float(penalty_totals['total_amount'] or 0)
        total_penalties_count = penalty_totals['total_count'] or 0

        # Penalty breakdown by type
        penalty_breakdown = list(
            penalties.values('penalty_type')
            .annotate(
                count=Count('id'),
                total_amount=Sum('amount')
            )
            .order_by('-total_amount')
        )
        penalty_breakdown = [
            {
                'penalty_type': dict(PENALTY_TYPES).get(item['penalty_type'], item['penalty_type']),
                'count': item['count'],
                'total_amount': float(item['total_amount'] or 0)
            }
            for item in penalty_breakdown
        ]

        # Allowances vs Deductions
        allowances_deductions = payslips.aggregate(
            total_allowances=Sum('total_allowances'),
            total_deductions=Sum('total_deductions')
        )
        
        total_allowances = float(allowances_deductions['total_allowances'] or 0)
        total_deductions = float(allowances_deductions['total_deductions'] or 0)
        
        allowances_vs_deductions = {
            'total_allowances': total_allowances,
            'total_deductions': total_deductions,
            'net_difference': total_allowances - total_deductions
        }

        # Payroll over time (last 6 months)
        payroll_over_time = []
        for i in range(5, -1, -1):  # Last 6 months, including current
            month_date = (timezone.now() - timedelta(days=30 * i)).replace(day=1)
            month_payslips = payslips.filter(
                payroll_period__start_date__year=month_date.year,
                payroll_period__start_date__month=month_date.month
            ).aggregate(
                total_net=Sum('net_salary'),
                total_gross=Sum('gross_salary'),
                count=Count('id')
            )
            
            payroll_over_time.append({
                'month': month_date.strftime('%b %Y'),
                'total_net': float(month_payslips['total_net'] or 0),
                'total_gross': float(month_payslips['total_gross'] or 0),
                'payslips_count': month_payslips['count'] or 0
            })

        # Payroll periods summary
        payroll_periods = PayrollPeriod.objects.filter(
            institution=institution,
            start_date__year=current_year,
            deleted_at__isnull=True
        )
        
        periods_summary = payroll_periods.aggregate(
            total_periods=Count('id'),
            processed_periods=Count('id', filter=Q(is_processed=True))
        )
        
        latest_period = payroll_periods.order_by('-start_date').first()
        
        payroll_periods_summary = {
            'total_periods': periods_summary['total_periods'] or 0,
            'processed_periods': periods_summary['processed_periods'] or 0,
            'pending_periods': (periods_summary['total_periods'] or 0) - (periods_summary['processed_periods'] or 0),
            'latest_period': latest_period.name if latest_period else 'No periods found'
        }

        data = {
            'total_payroll_amount': total_payroll_amount,
            'total_gross_payroll': total_gross_payroll,
            'payroll_by_department': payroll_by_department,
            'average_net_salary': average_net_salary,
            'average_gross_salary': average_gross_salary,
            'total_penalties_amount': total_penalties_amount,
            'total_penalties_count': total_penalties_count,
            'penalty_breakdown': penalty_breakdown,
            'allowances_vs_deductions': allowances_vs_deductions,
            'payroll_over_time': payroll_over_time,
            'payroll_periods_summary': payroll_periods_summary,
        }

        return Response(data)