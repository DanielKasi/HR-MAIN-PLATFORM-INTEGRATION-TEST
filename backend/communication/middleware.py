from django.http import JsonResponse
from django.urls import reverse
from .models import EmployeeAnnouncementAcknowledgment
from employee.models import Employee
from institution.models import Institution

class AcknowledgmentMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            exempt_paths = [
                reverse('employee-announcement-acknowledgment-list'),
                reverse('acknowledge'),
                '/admin/',
                '/logout/',
                '/login/'
            ]
            if any(request.path.startswith(path) for path in exempt_paths):
                return self.get_response(request)

            try:
                employee = Employee.objects.get(user=request.user)
                institution = employee.get_institution()
                pending = EmployeeAnnouncementAcknowledgment.objects.filter(
                    employee=employee,
                    acknowledged=False,
                    announcement__requires_acknowledgment=True,
                    announcement__deleted_at__isnull=True,
                    announcement__target_employees__department__institution=institution
                ).exists()

                if pending:
                    if request.path.startswith('/api/'):
                        return JsonResponse({"detail": "Pending acknowledgments required"}, status=403)
                    return JsonResponse({"redirect": "/acknowledgments"}, status=403)
            except (Employee.DoesNotExist, Institution.DoesNotExist):
                pass

        return self.get_response(request)