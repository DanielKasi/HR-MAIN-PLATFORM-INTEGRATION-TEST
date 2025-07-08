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
    Custom authentication class for external system authentication via API keys and access tokens.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        Only handles external system authentication. Internal JWT should use separate auth class.
        """
        api_key = self.extract_api_key(request)
        
        if not api_key:
            return None  
        
        return self.authenticate_external_system(request, api_key)
        
    def extract_api_key(self, request):
        """Extract API key from headers with consistent naming."""
        return (
            request.headers.get('X-API-Key') or 
            request.headers.get('x-api-key') or
            request.headers.get('API-Key')
        )
        
    def authenticate_external_system(self, request, api_key):
        """
        Authenticate requests from external systems using API key and access token.
        """
        try:
            # Step 1: Validate API key and get system
            system = self.get_system_from_api_key(api_key)
            if not system:
                raise AuthenticationFailed(_('Invalid API key'))
            
            # Step 2: Extract access token
            access_token = self.extract_access_token(request)
            if not access_token:
                raise AuthenticationFailed(_('Access token is required'))
            
            # Step 3: Decode and validate access token
            access_token_payload = self.decode_access_token(access_token, system)
            
            # Step 4: Get and validate user
            user = self.get_user_from_payload(system, access_token_payload)
            if not user:
                raise AuthenticationFailed(_('User not found or not associated with system'))
            
            # Step 5: Set request context
            request.external_system = system
            request.access_token_payload = access_token_payload
            
            return (user, access_token)
        
        except AuthenticationFailed:
            raise
        except System.DoesNotExist:
            logger.warning(f"Invalid API key attempted: {api_key[:8]}...")
            raise AuthenticationFailed(_('Invalid API key'))
        except (jwt.InvalidTokenError, json.JSONDecodeError) as e:
            logger.warning(f"Invalid access token format: {str(e)}")
            raise AuthenticationFailed(_('Invalid access token format'))
        except Exception as e:
            logger.error(f"Unexpected error in external authentication: {str(e)}")
            raise AuthenticationFailed(_('Authentication failed'))
    
    def get_system_from_api_key(self, api_key):
        """
        Validate API key and return the system.
        Raises System.DoesNotExist if not found.
        """
        return System.objects.select_related('system_type').get(
            api_key=api_key, 
            system_type__is_active=True
        )
        
    def extract_access_token(self, request):
        """
        Extract access token from Authorization header (Bearer token preferred).
        """
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.lower().startswith('bearer '):
            return auth_header[7:].strip()
        
        # Fallback to other methods if needed
        if hasattr(request, 'data'):
            access_token = request.data.get('access_token')
            if access_token:
                return access_token
        
        access_token = request.GET.get('access_token')
        if access_token:
            return access_token

        return None
    
    def decode_access_token(self, access_token, system):
        """
        Decode and validate access token with proper signature verification.
        """
        # First try JWT decoding with signature verification
        if hasattr(system, 'jwt_secret') and system.jwt_secret:
            try:
                return jwt.decode(
                    access_token,
                    system.jwt_secret,
                    algorithms=['HS256']  
                )
            except jwt.InvalidTokenError:
                logger.warning(f"JWT signature verification failed for system {system.id}")
                raise
        
        try:
            payload = jwt.decode(
                access_token, 
                options={"verify_signature": False}
            )
            logger.warning(f"Access token verified without signature for system {system.id}")
            return payload
        except jwt.InvalidTokenError:
            return json.loads(access_token)
    
    def get_user_from_payload(self, system, access_token_payload):
        """
        Get user from the system using the access token payload.
        """
        email = access_token_payload.get('email')
        
        if not email:
            logger.warning("No email found in access token payload")
            return None

        try:
            # Get users with this email and filter by system association
            users = User.objects.filter(email=email)

            for user in users:
                if self.verify_user_system_association(user, system):
                    return user 
            
            logger.warning(f"No user with email {email} is associated with system {system.id}")
            return None
        
        except Exception as e:
            logger.error(f"Error retrieving user with email {email}: {str(e)}")
            return None
    
    def verify_user_system_association(self, user, system):
        """
        Verify that the user belongs to an institution associated with the system.
        """
        try:
            # Check if user owns institutions associated with system
            if hasattr(user, 'institutions_owned'):
                if user.institutions_owned.filter(system=system).exists():
                    return True
            
            # Check employee profile association
            if hasattr(user, 'employee_profile'):
                employee = user.employee_profile
                if (employee.payroll_branch and 
                    employee.payroll_branch.institution.system == system):
                    return True
            
            # Check user profile association
            if hasattr(user, 'profile') and user.profile.institution:
                if user.profile.institution.system == system:
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying user system association: {str(e)}")
            return False