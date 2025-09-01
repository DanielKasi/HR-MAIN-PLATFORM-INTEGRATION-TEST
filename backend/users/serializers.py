from rest_framework import serializers

from .models import (
    CustomUser,
    Profile,
    PermissionCategory,
    Permission,
    Role,
    RolePermission,
    UserRole,
    Signature,
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from utilities.password_validator import validate_password_strength
from approval.serializers import BaseApprovableSerializer
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions


class PermissionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionCategory
        fields = ["id", "permission_category_name", "permission_category_description", "is_active"]


class PermissionSerializer(serializers.ModelSerializer):
    category = PermissionCategorySerializer()

    class Meta:
        model = Permission
        fields = [
            "id",
            "permission_name",
            "permission_code",
            "permission_description",
            "category",
            "is_active"
        ]


class RoleSerializer(BaseApprovableSerializer):
    permissions_details = serializers.SerializerMethodField()
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "permissions",
            "institution",
            "permissions_details",
            "is_active"
        ]

        extra_kwargs = {"institution": {"required": False}}

    def get_permissions_details(self, obj):
        permissions = Permission.objects.filter(roles__role=obj)
        return PermissionSerializer(permissions, many=True).data

    def create(self, validated_data):
        permissions = validated_data.pop("permissions", [])
        role = Role.objects.create(**validated_data)

        RolePermission.objects.bulk_create(
            [RolePermission(role=role, permission=p) for p in permissions]
        )

        return role

    def update(self, instance, validated_data):
        permissions = validated_data.pop("permissions", [])
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        RolePermission.objects.filter(role=instance).delete()
        RolePermission.objects.bulk_create(
            [RolePermission(role=instance, permission=p) for p in permissions]
        )

        return instance


class CustomUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    roles_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    branches = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = "__all__"
        read_only_fields = [
            "is_active",
            "is_staff",
            "roles",
            "is_email_verified",
            "is_password_verified",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def get_roles(self, obj):
        roles = [ur.role for ur in obj.user_roles.all()]
        return RoleSerializer(roles, many=True).data

    def get_branches(self, obj):
        from institution.serializers import BranchSerializer

        if hasattr(obj, "prefetched_user_branches"):
            branches = [ub.branch for ub in obj.prefetched_user_branches]
        else:
            from institution.models import Branch

            branches = Branch.objects.filter(attached_users__user=obj).select_related(
                "institution"
            )

        return BranchSerializer(branches, many=True, context=self.context).data

    def validate_password(self, value):
        """
        Apply password validation rules
        """
        return validate_password_strength(value)

    def create(self, validated_data):
        roles_ids = validated_data.pop("roles_ids", [])
        user = CustomUser.objects.create_user(**validated_data)
        for role_id in roles_ids:
            try:
                role = Role.objects.get(id=role_id)
                UserRole.objects.create(user=user, role=role)
            except Role.DoesNotExist:
                raise serializers.ValidationError(
                    {"error": f"Role with id {role_id} does not exist."}
                )
        return user

    def update(self, instance, validated_data):
        roles_ids = validated_data.pop("roles_ids", [])
        instance.email = validated_data.get("email", instance.email)
        instance.fullname = validated_data.get("fullname", instance.fullname)
        instance.is_active = validated_data.get("is_active", instance.is_active)
        instance.is_staff = validated_data.get("is_staff", instance.is_staff)
        if "password" in validated_data:
            instance.set_password(validated_data["password"])
        instance.save()

        UserRole.objects.filter(user=instance).delete()
        for role_id in roles_ids:
            try:
                role = Role.objects.get(id=role_id)
                UserRole.objects.create(user=instance, role=role)
            except Role.DoesNotExist:
                raise serializers.ValidationError(
                    {"error": f"Role with id {role_id} does not exist."}
                )

        return instance
    
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    new_password_confirm = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        
        user = self.context['request'].user
        
        # Check old password
        if not user.check_password(data['old_password']):
            raise serializers.ValidationError({"old_password": "Old password is incorrect."})
        
        # Validate new password strength
        try:
            validate_password(data['new_password'], user)
        except exceptions.ValidationError as e:
            errors = dict(e.error_list)
            raise serializers.ValidationError({"new_password": errors})
        
        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user    


class ProfileRequestSerializer(serializers.Serializer):
    from institution.models import Institution

    email = serializers.EmailField()
    fullname = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True)
    institution = serializers.PrimaryKeyRelatedField(
        queryset=Institution.objects.all(), required=False
    )
    bio = serializers.CharField(max_length=255, required=False)


class ProfileSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer()

    class Meta:
        model = Profile
        fields = ["id", "user", "institution", "bio"]

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        user_serializer = CustomUserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        return Profile.objects.create(user=user, **validated_data)


class UserOTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError({"error": "OTP must contain only digits"})
        return value


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class UserPasswordResetSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)


class UserResendOTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class UserSendForgotPasswordTokenSerializer(serializers.Serializer):
    email = serializers.EmailField()
    frontend_url = serializers.CharField()


class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class LoginResponseSerializer(serializers.Serializer):
    tokens = TokenObtainPairSerializer()
    user = CustomUserSerializer()

class LogoutRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)    


class InstitutionUserLoginResponseSerializer(LoginResponseSerializer):
    from institution.serializers import InstitutionSerializer

    institution_attached = InstitutionSerializer(many=True)


class RolePermissionSerializer(BaseApprovableSerializer):
    role = RoleSerializer()
    permission = PermissionSerializer()

    class Meta:
        model = RolePermission
        fields = ["id", "role", "permission"]

class SignatureSerializer(serializers.ModelSerializer):
    signature_image_url = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = Signature
        fields = ["id", "user", "signature", "signature_image_url"]
        read_only_fields = ["id", "signature_image_url"]
