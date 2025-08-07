from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
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
)
from employee.models import Employee
from .utils import PayrollProcessor, generate_eft_excel
from datetime import datetime
from django.http import HttpResponse
from django.utils.encoding import escape_uri_path
from drf_spectacular.utils import extend_schema, OpenApiParameter
from institution.models import Institution


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
            filename = f"BULK_EFT_UPLOAD_TEMPLATE_{payroll_period.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"

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
            print(f"An unexpected error occurred: {e}")
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
        allowances = EmployeeAllowance.objects.filter(
            employee__department__institution_id=institution_id
        ).order_by("-created_at")

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
            serializer.save()
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
        serializer = EmployeeAllowanceSerializer(
            instance, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete an employee allowance")
    def delete(self, request, pk):
        instance = get_object_or_404(EmployeeAllowance, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayrollPeriodAPIView(APIView):

    @extend_schema(
        summary="List payroll periods for a given institution",
        responses=PayrollPeriodSerializer(many=True),
    )
    def get(self, request, institution_id):
        periods = PayrollPeriod.objects.filter(institution_id=institution_id).order_by(
            "-created_at"
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
            serializer.save()
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
        serializer = PayrollPeriodSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a payroll period")
    def delete(self, request, pk):
        instance = get_object_or_404(PayrollPeriod, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeDeductionAPIView(APIView):

    @extend_schema(
        summary="List employee deductions for a specific institution",
        responses=EmployeeDeductionSerializer(many=True),
    )
    def get(self, request, institution_id):
        deductions = EmployeeDeduction.objects.filter(
            employee__department__institution_id=institution_id
        ).order_by("-created_at")
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
            serializer.save()
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
        serializer = EmployeeDeductionSerializer(
            instance, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete an employee deduction")
    def delete(self, request, pk):
        instance = get_object_or_404(EmployeeDeduction, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AllowanceTypeAPIView(APIView):

    @extend_schema(
        summary="List allowance types for an institution",
        responses=AllowanceTypeSerializer(many=True),
    )
    def get(self, request, institution_id):
        allowance_types = AllowanceType.objects.filter(
            institution_id=institution_id
        ).order_by("-created_at")

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
            serializer.save(institution_id=institution_id)
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
        serializer = AllowanceTypeSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
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
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeductionTypeAPIView(APIView):

    @extend_schema(
        summary="List deduction types for an institution",
        responses=DeductionTypeSerializer(many=True),
    )
    def get(self, request, institution_id):
        deduction_types = DeductionType.objects.filter(
            institution_id=institution_id
        ).order_by("-created_at")

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
            serializer.save()
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
        serializer = DeductionTypeSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Delete a deduction type")
    def delete(self, request, pk):
        instance = get_object_or_404(DeductionType, pk=pk)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeTaxListAPIView(APIView):

    @extend_schema(
        summary="List employee taxes for a specific institution",
        responses=EmployeeTaxSerializer(many=True),
        tags=["Employee Taxes MGT"],
    )
    def get(self, request):
        user = request.user.profile

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
            employee__department__institution_id=institution_id
        ).order_by("-created_at")
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
            serializer.save()
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
        serializer = EmployeeTaxSerializer(
            instance, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
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
        payslips = Payslip.objects.filter(
            employee__department__institution_id=institution_id
        ).order_by("-created_at")

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
            department__institution=institution_id,
            date_of_joining__range=[payroll_period.start_date, payroll_period.end_date],
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
        serializer = PayslipSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
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
