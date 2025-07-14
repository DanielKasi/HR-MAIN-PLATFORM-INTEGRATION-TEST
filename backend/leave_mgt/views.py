from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from datetime import datetime
from decimal import Decimal

from .models import LeaveApplication, LeaveBalance, LeavePolicy, LeaveType
from .serializers import LeaveApplicationSerializer, LeaveBalanceSerializer, LeavePolicySerializer, LeaveTypeSerializer
from .utils import LeaveCalculator, LeaveBalanceManager
from employee.models import Employee
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser


@extend_schema(tags=["Leave Types"])
class LeaveTypeListCreateAPIView(APIView):
    @extend_schema(
        summary="List all leave types",
        responses={200: LeaveTypeSerializer(many=True)}
    )
    def get(self, request, institution_id):
        queryset = LeaveType.objects.filter(is_active=True, institution_id=institution_id)
        serializer = LeaveTypeSerializer(queryset, many=True)
        return Response(serializer.data)


    @extend_schema(
        summary="Create a new leave type",
        request=LeaveTypeSerializer,
        responses={201: LeaveTypeSerializer}
    )
    def post(self, request, institution_id):
        serializer = LeaveTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Leave Types"])
class LeaveTypeDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave type by ID",
        responses={200: LeaveTypeSerializer}
    )
    def get(self, request, pk):
        leave_type = get_object_or_404(LeaveType, pk=pk)
        serializer = LeaveTypeSerializer(leave_type)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave type",
        request=LeaveTypeSerializer,
        responses={200: LeaveTypeSerializer}
    )
    def patch(self, request, pk):
        leave_type = get_object_or_404(LeaveType, pk=pk)
        serializer = LeaveTypeSerializer(leave_type, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete a leave type",
        responses={204: None}
    )
    def delete(self, request, pk):
        leave_type = get_object_or_404(LeaveType, pk=pk)
        leave_type.is_active = False
        leave_type.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Leave Balances"])
class LeaveBalanceListCreateAPIView(APIView):
    @extend_schema(
        summary="List all leave balances",
        parameters=[
            OpenApiParameter(name='employee_id', type=int, location=OpenApiParameter.QUERY),
            OpenApiParameter(name='year', type=int, location=OpenApiParameter.QUERY),
        ],
        responses={200: LeaveBalanceSerializer(many=True)}
    )
    def get(self, request, institution_id):
        queryset = LeaveBalance.objects.select_related('employee', 'leave_type').filter(institution_id=institution_id)
        
        employee_id = request.query_params.get('employee_id')
        year = request.query_params.get('year')
        
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if year:
            queryset = queryset.filter(year=year)
            
        serializer = LeaveBalanceSerializer(queryset, many=True)
        return Response(serializer.data)


    @extend_schema(
        summary="Create a new leave balance record",
        request=LeaveBalanceSerializer,
        responses={201: LeaveBalanceSerializer}
    )
    def post(self, request, institution_id):
        serializer = LeaveBalanceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Leave Balances"])
class LeaveBalanceDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave balance by ID",
        responses={200: LeaveBalanceSerializer}
    )
    def get(self, request, pk):
        balance = get_object_or_404(LeaveBalance, pk=pk)
        serializer = LeaveBalanceSerializer(balance)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave balance",
        request=LeaveBalanceSerializer,
        responses={200: LeaveBalanceSerializer}
    )
    def patch(self, request, pk):
        balance = get_object_or_404(LeaveBalance, pk=pk)
        serializer = LeaveBalanceSerializer(balance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete a leave balance",
        responses={204: None}
    )
    def delete(self, request, pk):
        balance = get_object_or_404(LeaveBalance, pk=pk)
        balance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Leave Applications"])
class LeaveApplicationListCreateAPIView(APIView):
    # Support both JSON and FormData for file uploads
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    @extend_schema(
        summary="List all leave applications",
        parameters=[
            OpenApiParameter(name='employee_id', type=int, location=OpenApiParameter.QUERY),
            OpenApiParameter(name='status', type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(name='leave_type_id', type=int, location=OpenApiParameter.QUERY),
            OpenApiParameter(name='institutionId', type=int, location=OpenApiParameter.QUERY),
        ],
        responses={200: LeaveApplicationSerializer(many=True)}
    )
    def get(self, request, institution_id):
        queryset = LeaveApplication.objects.select_related('employee', 'leave_type', 'approved_by').filter(institution_id=institution_id)
        
        # Optional query parameters
        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')
        leave_type_id = request.query_params.get('leave_type_id')
        
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if leave_type_id:
            queryset = queryset.filter(leave_type_id=leave_type_id)
            
        serializer = LeaveApplicationSerializer(queryset, many=True)
        return Response(serializer.data)


    @extend_schema(
        summary="Create a new leave application",
        request=LeaveApplicationSerializer,
        responses={
            201: LeaveApplicationSerializer,
            400: OpenApiExample(
                "Validation Error",
                value={"error": "Insufficient leave balance"}
            )
        }
    )
    def post(self, request, institution_id):
        def extract_value(data, key):
            """Extract single value from QueryDict list format"""
            value = data.get(key)
            return value[0] if isinstance(value, list) and value else value
        
        # Process FormData if multipart, otherwise use data as-is
        if request.content_type and 'multipart' in request.content_type:
            final_data = {}
            for key, value in request.data.items():
                if key not in ['supporting_document']:  # Handle file separately
                    final_data[key] = extract_value(request.data, key)
            
            # Handle file upload
            if 'supporting_document' in request.FILES:
                final_data['supporting_document'] = request.FILES['supporting_document']
            
            # Convert data types
            for field in ['employee', 'leave_type', 'institutionId']:
                if field in final_data:
                    try:
                        final_data[field] = int(final_data[field]) if final_data[field] else None
                    except (ValueError, TypeError):
                        final_data[field] = None
            
            data_to_serialize = final_data
        else:
            data_to_serialize = request.data
        
        serializer = LeaveApplicationSerializer(data=data_to_serialize)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Calculate total days
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            duration_type = serializer.validated_data.get('duration_type', 'full_day')
            
            total_days = LeaveCalculator.calculate_leave_days(
                start_date, end_date, duration_type
            )
            
            # Check eligibility
            employee = serializer.validated_data['employee']
            leave_type = serializer.validated_data['leave_type']
            
            is_eligible, message = LeaveCalculator.check_leave_eligibility(
                employee, leave_type, start_date, total_days
            )
            
            if not is_eligible:
                return Response(
                    {'error': message}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save application with calculated days
            application = serializer.save(total_days=total_days)
            
            # Update pending balance
            try:
                balance = LeaveBalance.objects.get(
                    employee=employee,
                    leave_type=leave_type,
                    year=start_date.year
                )
                balance.pending_days += total_days
                balance.save()
            except LeaveBalance.DoesNotExist:
                return Response(
                    {'error': 'No leave balance found for this year'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(
                LeaveApplicationSerializer(application).data, 
                status=status.HTTP_201_CREATED
            )


@extend_schema(tags=["Leave Applications"])
class LeaveApplicationDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave application by ID",
        responses={200: LeaveApplicationSerializer}
    )
    def get(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)
        serializer = LeaveApplicationSerializer(application)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave application",
        request=LeaveApplicationSerializer,
        responses={200: LeaveApplicationSerializer}
    )
    def patch(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)
        
        # Prevent updating approved/rejected applications
        if application.status in ['approved', 'rejected']:
            return Response(
                {'error': 'Cannot modify approved or rejected applications'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LeaveApplicationSerializer(application, data=request.data, partial=True)
        if serializer.is_valid():
            with transaction.atomic():
                # If dates are being updated, recalculate days
                if 'start_date' in request.data or 'end_date' in request.data:
                    start_date = serializer.validated_data.get('start_date', application.start_date)
                    end_date = serializer.validated_data.get('end_date', application.end_date)
                    duration_type = serializer.validated_data.get('duration_type', application.duration_type)
                    
                    new_total_days = LeaveCalculator.calculate_leave_days(
                        start_date, end_date, duration_type
                    )
                    
                    # Update balance
                    try:
                        balance = LeaveBalance.objects.get(
                            employee=application.employee,
                            leave_type=application.leave_type,
                            year=application.start_date.year
                        )
                        # Adjust pending days
                        balance.pending_days -= application.total_days
                        balance.pending_days += new_total_days
                        balance.save()
                    except LeaveBalance.DoesNotExist:
                        pass
                    
                    serializer.validated_data['total_days'] = new_total_days
                
                serializer.save()
                return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete a leave application",
        responses={204: None}
    )
    def delete(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)
        
        if application.status != 'pending':
            return Response(
                {'error': 'Can only delete pending applications'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Update balance
            try:
                balance = LeaveBalance.objects.get(
                    employee=application.employee,
                    leave_type=application.leave_type,
                    year=application.start_date.year
                )
                balance.pending_days -= application.total_days
                balance.save()
            except LeaveBalance.DoesNotExist:
                pass
            
            application.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Leave Applications"])
class LeaveApplicationApprovalAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    @extend_schema(
        summary="Approve or reject a leave application",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'action': {'type': 'string', 'enum': ['approve', 'reject']},
                    'rejection_reason': {'type': 'string', 'required': False}
                },
                'required': ['action']
            }
        },
        responses={200: LeaveApplicationSerializer}
    )
    def post(self, request, pk):
        application = get_object_or_404(LeaveApplication, pk=pk)
        action = request.data.get('action')
        
        if application.status != 'pending':
            return Response(
                {'error': 'Application is not pending'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Invalid action'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            if action == 'approve':
                application.status = 'approved'
                application.approved_by = request.user
                application.approved_at = timezone.now()
                
                # Update balance
                LeaveBalanceManager.update_balance_on_approval(application)
                
            else:  # reject
                application.status = 'rejected'
                application.rejection_reason = request.data.get('rejection_reason', '')
                
                # Update balance
                LeaveBalanceManager.update_balance_on_rejection(application)
            
            application.save()
            
            serializer = LeaveApplicationSerializer(application)
            return Response(serializer.data)


@extend_schema(tags=["Leave Policies"])
class LeavePolicyListCreateAPIView(APIView):
    @extend_schema(
        summary="List all leave policies",
        responses={200: LeavePolicySerializer(many=True)}
    )
    def get(self, request, institution_id):
        queryset = LeavePolicy.objects.select_related('leave_type').filter(is_active=True, institution_id=institution_id)
        serializer = LeavePolicySerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create a new leave policy",
        request=LeavePolicySerializer,
        responses={201: LeavePolicySerializer}
    )
    def post(self, request, institution_id):
        serializer = LeavePolicySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Leave Policies"])
class LeavePolicyDetailAPIView(APIView):
    @extend_schema(
        summary="Retrieve a leave policy by ID",
        responses={200: LeavePolicySerializer}
    )
    def get(self, request, pk):
        policy = get_object_or_404(LeavePolicy, pk=pk)
        serializer = LeavePolicySerializer(policy)
        return Response(serializer.data)

    @extend_schema(
        summary="Partially update a leave policy",
        request=LeavePolicySerializer,
        responses={200: LeavePolicySerializer}
    )
    def patch(self, request, pk):
        policy = get_object_or_404(LeavePolicy, pk=pk)
        serializer = LeavePolicySerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Delete a leave policy",
        responses={204: None}
    )
    def delete(self, request, pk):
        policy = get_object_or_404(LeavePolicy, pk=pk)
        policy.is_active = False
        policy.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Utility endpoints
@extend_schema(tags=["Leave Management"])
@api_view(['POST'])
def initialize_yearly_balances(request, institution_id):
    """Initialize leave balances for all employees in an institution for a given year"""
    try:
        # Get year from request data, default to current year
        year_param = request.data.get('year', timezone.now().year)
        
        # Ensure year is an integer
        try:
            year = int(year_param)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Year must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Call the manager method
        result = LeaveBalanceManager.initialize_yearly_balances(institution_id, year)
        
        return Response({
            'message': f'Successfully processed leave balances for year {year}',
            'details': {
                'created_count': result['created_count'],
                'updated_count': result['updated_count'],
                'total_processed': result['total_processed']
            }
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(tags=["Leave Management"])
@api_view(['POST'])
def carry_forward_leaves(request, institution_id):
    """Carry forward unused leaves from one year to another for a given institution"""
    try:
        from_year = request.data.get('from_year')
        to_year = request.data.get('to_year')
        
        if not from_year or not to_year:
            return Response(
                {'error': 'Both from_year and to_year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure years are integers
        try:
            from_year = int(from_year)
            to_year = int(to_year)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Both from_year and to_year must be valid integers'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate year logic
        if from_year >= to_year:
            return Response(
                {'error': 'from_year must be less than to_year'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Call the manager method
        carried_count = LeaveBalanceManager.carry_forward_leaves(
            institution_id, from_year, to_year
        )
        
        return Response({
            'message': f'Successfully carried forward {carried_count} leave balances from {from_year} to {to_year}',
            'details': {
                'carried_forward_count': carried_count,
                'from_year': from_year,
                'to_year': to_year
            }
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(tags=["Leave Management"])
@api_view(['GET'])
def employee_leave_summary(request, employee_id):
    """Get leave summary for a specific employee"""
    try:
        employee = get_object_or_404(Employee, pk=employee_id)
        
        # Get year from query parameters, default to current year
        year_param = request.query_params.get('year', timezone.now().year)
        
        # Ensure year is an integer
        try:
            year = int(year_param)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Year must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get balances for the employee
        balances = LeaveBalance.objects.filter(
            employee=employee,
            year=year
        ).select_related('leave_type')
        
        # Get applications for the employee
        applications = LeaveApplication.objects.filter(
            employee=employee,
            start_date__year=year
        ).select_related('leave_type')
        
        # Use the manager method for better balance summary
        balance_summary = LeaveBalanceManager.get_employee_balance_summary(employee, year)
        
        summary = {
            'employee': {
                'id': employee.id,
                'name': employee.user.fullname,
            },
            'year': year,
            'balance_summary': balance_summary,
            'balances': LeaveBalanceSerializer(balances, many=True).data,
            'applications': LeaveApplicationSerializer(applications, many=True).data,
            'statistics': {
                'total_applications': applications.count(),
                'pending_applications': applications.filter(status='pending').count(),
                'approved_applications': applications.filter(status='approved').count(),
                'rejected_applications': applications.filter(status='rejected').count(),
            }
        }
        
        return Response(summary, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(tags=["Leave Management"])
@api_view(['GET'])
def institution_leave_summary(request, institution_id):
    """Get leave summary for all employees in an institution"""
    try:
        # Get year from query parameters, default to current year
        year_param = request.query_params.get('year', timezone.now().year)
        
        # Ensure year is an integer
        try:
            year = int(year_param)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Year must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use the manager method to get institution summary
        summary = LeaveBalanceManager.get_institution_balance_summary(institution_id, year)
        
        return Response({
            'institution_id': institution_id,
            'year': year,
            'summary': summary
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )