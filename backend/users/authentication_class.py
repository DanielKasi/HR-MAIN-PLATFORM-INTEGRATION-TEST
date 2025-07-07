access_token_payload = {
    "email": "jmi.gmail.com",}
x_api_key = "hr_4b3c5f8d-2c1e-4f9a-8b3c-5f8d2c1e4b3c"

if x_api_key is None:
    # use the normal JWT authentication class meaning this request is not from our identified systems.
    pass
else:
    # 1 check if the x_api_key is valid
    # 2 Get the system using the x_api_key
    # 3 get the user using the system using the access_token_payload
    # 4 if the user is not found, raise an exception
    # 5 if the user is found, set the user in the request and continue
    pass



# THERE IS A POSSIBILITY THAT A PERSON WILL HAVE THE SAME CREDENTIALS IN DIFFERENT SYSTEMS AND THEY WANT TO USE THE NON SYSTEM LOGIN


# authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import jwt
import json
from .models import System, SystemType
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class CrossSystemAuthentication(BaseAuthentication):
    """
    Custom authentication class that handles both internal JWT tokens
    and external system authentication via API keys and access tokens.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        # Check for X-API-Key header for external system authentication
        api_key = request.headers.get('X-API-Key') or request.headers.get('x-api-key')
        
        if api_key:
            return self.authenticate_external_system(request, api_key)
        else:
            # Fall back to normal JWT authentication
            return self.authenticate_internal_jwt(request)
    
    def authenticate_external_system(self, request, api_key):
        """
        Authenticate requests from external systems using API key and access token.
        """
        try:
            # Clean API key (remove Bearer prefix if present)
            if api_key.startswith('Bearer '):
                api_key = api_key[7:]
            
            # Step 1: Validate API key and get system
            system = self.get_system_from_api_key(api_key)
            if not system:
                raise AuthenticationFailed(_('Invalid API key'))
            
            # Step 2: Get access token from Authorization header or body
            access_token = self.extract_access_token(request)
            if not access_token:
                raise AuthenticationFailed(_('Access token is required for external system authentication'))
            
            # Step 3: Decode and validate access token payload
            try:
                access_token_payload = jwt.decode(
                    access_token, 
                    options={"verify_signature": False}  # We trust the external system
                )
            except jwt.InvalidTokenError:
                # If JWT decode fails, try to parse as JSON
                try:
                    access_token_payload = json.loads(access_token)
                except json.JSONDecodeError:
                    raise AuthenticationFailed(_('Invalid access token format'))
            
            # Step 4: Get user from the system using the access token payload
            user = self.get_user_from_payload(system, access_token_payload)
            if not user:
                raise AuthenticationFailed(_('User not found in HR system'))
            
            # Step 5: Verify user belongs to the system's institution
            if not self.verify_user_system_association(user, system):
                raise AuthenticationFailed(_('User not associated with the requesting system'))
            
            # Set system information in request for later use
            request.external_system = system
            request.access_token_payload = access_token_payload
            
            return (user, access_token)
            
        except Exception as e:
            logger.error(f"External system authentication failed: {str(e)}")
            raise AuthenticationFailed(_('External system authentication failed'))
    
    def authenticate_internal_jwt(self, request):
        """
        Handle internal JWT authentication (fallback to default behavior).
        This should integrate with your existing JWT authentication.
        """
        # Return None to let the next authentication class handle it
        # or implement your existing JWT logic here
        return None
    
    def get_system_from_api_key(self, api_key):
        """
        Validate API key and return the system.
        """
        try:
            return System.objects.select_related('system_type').get(
                api_key=api_key, 
                system_type__is_active=True
            )
        except System.DoesNotExist:
            return None
    
    def extract_access_token(self, request):
        """
        Extract access token from Authorization header or request body.
        """
        # Try Authorization header first (without Bearer prefix since we already checked for API key)
        auth_header = request.headers.get('Authorization')
        if auth_header and not auth_header.startswith('Bearer '):
            return auth_header
        
        # Try request body
        if hasattr(request, 'data'):
            access_token = request.data.get('access_token')
            if access_token:
                return access_token
        
        # Try query parameters
        access_token = request.GET.get('access_token')
        if access_token:
            return access_token
        
        return None
    
    def get_user_from_payload(self, system, access_token_payload):
        """
        Get user from the system using the access token payload.
        """
        email = access_token_payload.get('email')
        
        # Try to find user by email first (most reliable)
        if email:
            try:
                user = User.objects.get(email=email)
                return user
            except User.DoesNotExist:
                pass
        
        return None
    
    def verify_user_system_association(self, user, system):
        """
        Verify that the user belongs to an institution associated with the system.
        """
        try:
            # Check if user owns any institution associated with this system
            if hasattr(user, 'institutions_owned'):
                if user.institutions_owned.filter(system=system).exists():
                    return True
            
            # Check if user is an employee in any institution associated with this system
            if hasattr(user, 'employee_profile'):
                employee = user.employee_profile
                if employee.payroll_branch and employee.payroll_branch.institution.system == system:
                    return True
            
            # Check if user has a profile linked to an institution with this system
            if hasattr(user, 'profile') and user.profile.institution:
                if user.profile.institution.system == system:
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying user system association: {str(e)}")
            return False

# permissions.py
from rest_framework.permissions import BasePermission

class IsSystemUserOrAuthenticated(BasePermission):
    """
    Permission class that allows access to authenticated users
    and users from external systems.
    """
    
    def has_permission(self, request, view):
        # Allow if user is authenticated through any means
        if request.user and request.user.is_authenticated:
            return True
        
        # Allow if this is an external system request
        if hasattr(request, 'external_system') and request.external_system:
            return True
        
        return False

# views.py - Enhanced login view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication

class EnhancedLoginView(APIView):
    """
    Enhanced login view that handles both internal and external system authentication.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = [CrossSystemAuthentication, JWTAuthentication, SessionAuthentication]
    
    def post(self, request):
        # Check if this is an external system request
        if hasattr(request, 'external_system') and request.external_system:
            return self.handle_external_system_login(request)
        else:
            return self.handle_internal_login(request)
    
    def handle_external_system_login(self, request):
        """
        Handle login for external system users.
        """
        try:
            user = request.user
            system = request.external_system
            access_token_payload = request.access_token_payload
            
            # Get user's institution context
            institution_attached = self.get_user_institutions(user, system)
            
            # Prepare response similar to internal login
            response_data = {
                "success": True,
                "message": "External system authentication successful",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "fullname": getattr(user, 'fullname', ''),
                    "user_type": getattr(user, 'user_type', ''),
                    "is_external_user": True,
                    "source_system": system.code,
                    "source_system_type": system.system_type.name
                },
                "institution_attached": institution_attached,
                "external_system_info": {
                    "system_code": system.code,
                    "system_type": system.system_type.name,
                    "original_payload": access_token_payload
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"External system login failed: {str(e)}")
            return Response({
                "error": "External system authentication failed",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_internal_login(self, request):
        """
        Handle normal internal login (your existing logic).
        """
        # Your existing login logic here
        serializer = LoginRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            password = serializer.validated_data["password"]
            
            # ... rest of your existing login logic
            
        return Response(
            {"detail": serializer.errors}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def get_user_institutions(self, user, system):
        """
        Get institutions associated with the user for the specific system.
        """
        institutions = []
        
        # Check owned institutions
        if hasattr(user, 'institutions_owned'):
            owned_institutions = user.institutions_owned.filter(system=system)
            institutions.extend(owned_institutions)
        
        # Check employee associations
        if hasattr(user, 'employee_profile'):
            employee = user.employee_profile
            if (employee.payroll_branch and 
                employee.payroll_branch.institution.system == system):
                institutions.append(employee.payroll_branch.institution)
        
        # Check profile associations
        if hasattr(user, 'profile') and user.profile.institution:
            if user.profile.institution.system == system:
                institutions.append(user.profile.institution)
        
        # Remove duplicates and serialize
        unique_institutions = list(set(institutions))
        
        # You'll need to import your serializer
        # return InstitutionWithBranchesSerializer(
        #     unique_institutions, 
        #     many=True, 
        #     context={"user": user}
        # ).data
        
        return [{"id": inst.id, "name": inst.institution_name} for inst in unique_institutions]

# settings.py - Add to your REST_FRAMEWORK settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'your_app.authentication.CrossSystemAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'your_app.permissions.IsSystemUserOrAuthenticated',
    ],
    # ... other settings
}

# Usage example in a view
class SomeProtectedView(APIView):
    authentication_classes = [CrossSystemAuthentication, JWTAuthentication]
    permission_classes = [IsSystemUserOrAuthenticated]
    
    def get(self, request):
        # Check if this is an external system request
        if hasattr(request, 'external_system'):
            # Handle external system logic
            system = request.external_system
            original_payload = request.access_token_payload
            
            return Response({
                "message": f"Hello from {system.system_type.name} system!",
                "user": request.user.email,
                "system_code": system.code
            })
        else:
            # Handle internal user logic
            return Response({
                "message": "Hello internal user!",
                "user": request.user.email
            })
        
#needs review        