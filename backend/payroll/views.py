from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from .models import (
    EmployeeAllowance, EmployeeDeduction, AllowanceType,
    DeductionType, PayrollPeriod, Payslip, PayslipItem
)
from .serializers import (
    EmployeeAllowanceSerializer, EmployeeDeductionSerializer,
    AllowanceTypeSerializer, DeductionTypeSerializer,
    PayrollPeriodSerializer, PayslipSerializer, PayslipItemSerializer
)
from employee.models import Employee

class EmployeeAllowanceAPIView(APIView):

    @extend_schema(
        summary="List employee allowances for a specific institution",
        responses=EmployeeAllowanceSerializer(many=True)
    )
    def get(self, request, institution_id):
        allowances = EmployeeAllowance.objects.filter(employee__department__institution_id=institution_id)
        serializer = EmployeeAllowanceSerializer(allowances, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeAllowanceSerializer,
        responses=EmployeeAllowanceSerializer,
        summary="Create a new employee allowance"
    )
    def post(self, request, institution_id):
        serializer = EmployeeAllowanceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeAllowanceDetailAPIView(APIView):

    @extend_schema(
        responses=EmployeeAllowanceSerializer,
        summary="Retrieve an employee allowance by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(EmployeeAllowance, pk=pk)
        serializer = EmployeeAllowanceSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeAllowanceSerializer,
        responses=EmployeeAllowanceSerializer,
        summary="Update an employee allowance (partial)"
    )
    def patch(self, request, pk):
        instance = get_object_or_404(EmployeeAllowance, pk=pk)
        serializer = EmployeeAllowanceSerializer(instance, data=request.data, partial=True)
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
        responses=PayrollPeriodSerializer(many=True)
    )
    def get(self, request, institution_id):
        periods = PayrollPeriod.objects.filter(institution_id=institution_id)
        serializer = PayrollPeriodSerializer(periods, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=PayrollPeriodSerializer,
        responses=PayrollPeriodSerializer,
        summary="Create a new payroll period"
    )
    def post(self, request):
        serializer = PayrollPeriodSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PayrollPeriodDetailAPIView(APIView):

    @extend_schema(
        responses=PayrollPeriodSerializer,
        summary="Retrieve a payroll period by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(PayrollPeriod, pk=pk)
        serializer = PayrollPeriodSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=PayrollPeriodSerializer,
        responses=PayrollPeriodSerializer,
        summary="Update a payroll period (partial)"
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
        responses=EmployeeDeductionSerializer(many=True)
    )
    def get(self, request, institution_id):
        deductions = EmployeeDeduction.objects.filter(employee__department__institution_id=institution_id)
        serializer = EmployeeDeductionSerializer(deductions, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create a new employee deduction",
        request=EmployeeDeductionSerializer,
        responses=EmployeeDeductionSerializer
    )

    @extend_schema(
        request=EmployeeDeductionSerializer,
        responses=EmployeeDeductionSerializer,
        summary="Create a new employee deduction"
    )
    def post(self, request):
        serializer = EmployeeDeductionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeDeductionDetailAPIView(APIView):

    @extend_schema(
        responses=EmployeeDeductionSerializer,
        summary="Retrieve an employee deduction by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(EmployeeDeduction, pk=pk)
        serializer = EmployeeDeductionSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=EmployeeDeductionSerializer,
        responses=EmployeeDeductionSerializer,
        summary="Update an employee deduction (partial)"
    )
    def patch(self, request, pk):
        instance = get_object_or_404(EmployeeDeduction, pk=pk)
        serializer = EmployeeDeductionSerializer(instance, data=request.data, partial=True)
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
        responses=AllowanceTypeSerializer(many=True)
    )
    def get(self, request, institution_id):
        allowance_types = AllowanceType.objects.filter(institution_id=institution_id)
        serializer = AllowanceTypeSerializer(allowance_types, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        request=AllowanceTypeSerializer,
        responses=AllowanceTypeSerializer,
        summary="Create a new allowance type"
    )
    def post(self, request, institution_id): 
        serializer = AllowanceTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(institution_id=institution_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AllowanceTypeDetailAPIView(APIView):

    @extend_schema(
        responses=AllowanceTypeSerializer,
        summary="Retrieve an allowance type by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(AllowanceType, pk=pk)
        serializer = AllowanceTypeSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=AllowanceTypeSerializer,
        responses=AllowanceTypeSerializer,
        summary="Update an allowance type (partial)"
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
        summary="Create allowance types for an institution"
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
        responses=DeductionTypeSerializer(many=True)
    )
    def get(self, request, institution_id):
        deduction_types = DeductionType.objects.filter(institution_id=institution_id)
        serializer = DeductionTypeSerializer(deduction_types, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        request=DeductionTypeSerializer,
        responses=DeductionTypeSerializer,
        summary="Create a new deduction type"
    )
    def post(self, request, institution_id):
        serializer = DeductionTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeductionTypeDetailAPIView(APIView):

    @extend_schema(
        responses=DeductionTypeSerializer,
        summary="Retrieve a deduction type by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(DeductionType, pk=pk)
        serializer = DeductionTypeSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=DeductionTypeSerializer,
        responses=DeductionTypeSerializer,
        summary="Update a deduction type (partial)"
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



class PayslipAPIView(APIView):

    @extend_schema(
        summary="List payslips for a specific institution",
        responses=PayslipSerializer(many=True)
    )
    def get(self, request, institution_id):
        payslips = Payslip.objects.filter(employee__department__institution_id=institution_id)
        serializer = PayslipSerializer(payslips, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=PayslipSerializer,
        responses=PayslipSerializer,
        summary="Create a new payslip"
    )
    def post(self, request):
        serializer = PayslipSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PayslipDetailAPIView(APIView):

    @extend_schema(
        responses=PayslipSerializer,
        summary="Retrieve a payslip by ID"
    )
    def get(self, request, pk):
        instance = get_object_or_404(Payslip, pk=pk)
        serializer = PayslipSerializer(instance)
        return Response(serializer.data)

    @extend_schema(
        request=PayslipSerializer,
        responses=PayslipSerializer,
        summary="Update a payslip (partial)"
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
        serializer = PayslipItemSerializer(items, many=True)
        return Response(serializer.data)





    