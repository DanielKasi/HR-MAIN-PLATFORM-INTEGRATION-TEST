from rest_framework import serializers

from .models import (
    CustomUser,
    Profile,
    PermissionCategory,
    Permission,
    Role,
    RolePermission,
    UserPermission,
    UserRole,
    Signature,
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from utilities.password_validator import validate_password_strength
from general.serializers import BaseApprovableSerializer
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions
from utilities.helpers import get_all_dependencies
from django.utils import timezone   
from django.db.models import Q


class PermissionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionCategory
        fields = [
            "id",
            "permission_category_name",
            "permission_category_description",
            "is_active",
        ]


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
            "is_active",
        ]


class RoleSerializer(serializers.ModelSerializer):
    permissions_details = serializers.SerializerMethodField()
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = Role
        fields = '__all__'

        extra_kwargs = {"shop": {"required": False}}

    def get_permissions_details(self, obj):
        permissions = Permission.objects.filter(roles__role=obj)
        return PermissionSerializer(permissions, many=True).data

    def create(self, validated_data):
        permissions = validated_data.pop("permissions", [])

        dependencies = get_all_dependencies(permissions)

        all_permissions = list(set(permissions) | dependencies)

        role = Role.objects.create(**validated_data)

        RolePermission.objects.bulk_create(
            [RolePermission(role=role, permission=p) for p in all_permissions]
        )

        return role

    def update(self, instance, validated_data):
        from django.db import transaction

        permissions = validated_data.pop("permissions", [])

        dependencies = get_all_dependencies(permissions)

        all_permissions = list(set(permissions) | dependencies)

        with transaction.atomic():
            old_permissions = Permission.objects.filter(roles__role=instance)
            old_permission_ids = set(old_permissions.values_list("id", flat=True))

            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            RolePermission.objects.filter(role=instance).delete()
            RolePermission.objects.bulk_create(
                [RolePermission(role=instance, permission=p) for p in all_permissions]
            )

            new_permission_ids = set([p.id for p in all_permissions])

            permissions_to_remove = old_permission_ids - new_permission_ids
            permissions_to_add = new_permission_ids - old_permission_ids

            users_with_role = UserRole.objects.filter(role=instance).select_related(
                "user"
            )
            user_ids = [user_role.user.id for user_role in users_with_role]

            if user_ids:
                if permissions_to_remove:
                    deleted_count = UserPermission.objects.filter(
                        user__id__in=user_ids,
                        permission__id__in=permissions_to_remove,
                    ).delete()[0]

                # Add new permissions to users
                if permissions_to_add:
                    user_permissions_to_create = []

                    for user_role in users_with_role:
                        for permission_id in permissions_to_add:
                            if not UserPermission.objects.filter(
                                user=user_role.user, permission__id=permission_id
                            ).exists():
                                user_permissions_to_create.append(
                                    UserPermission(
                                        user=user_role.user,
                                        permission_id=permission_id,
                                    )
                                )

                    if user_permissions_to_create:
                        UserPermission.objects.bulk_create(user_permissions_to_create)

        return instance


class CustomUserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    roles_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    branches = serializers.SerializerMethodField()
    user_permissions = serializers.SerializerMethodField()
    email = serializers.EmailField(required=True, validators=[])
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

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

    def get_user_permissions(self, obj):
        from users.models import UserPermission

        user_permissions = (
            UserPermission.objects.filter(user=obj)
            .filter(
                Q(is_temporary=False)
                | Q(is_temporary=True, valid_until__gt=timezone.now())
            )
            .select_related("permission")
        )
        return PermissionSerializer(
            [up.permission for up in user_permissions], many=True
        ).data    

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
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError(
                {"error": "New passwords do not match."}
            )

        user = self.context["request"].user

        # Check old password
        if not user.check_password(data["old_password"]):
            raise serializers.ValidationError(
                {"error": "Old password is incorrect."}
            )

        # Validate new password strength
        try:
            validate_password(data["new_password"], user)
        except exceptions.ValidationError as e:
            errors = dict(e.error_list)
            raise serializers.ValidationError({"error": errors})

        return data

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class UserPermissionSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)

    permission = PermissionSerializer(read_only=True)
    permission_id = serializers.UUIDField(write_only=True)

    permission_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = UserPermission
        fields = '__all__'
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_permission_ids(self, value):
        from .models import Permission

        value = [str(v) for v in value]

        existing_ids = set(str(p.id) for p in Permission.objects.filter(id__in=value))

        invalid_ids = set(value) - existing_ids

        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid permission IDs: {list(invalid_ids)}"
            )

        return value

    def validate(self, attrs):
        has_single = "permission_id" in attrs
        has_bulk = "permission_ids" in attrs

        if has_single and has_bulk:
            raise serializers.ValidationError(
                "Provide either permission_id or permission_ids, not both"
            )

        if not has_single and not has_bulk:
            raise serializers.ValidationError(
                "Either permission_id or permission_ids is required"
            )

        return attrs

    def update(self, instance, validated_data):
        """Handle both single and bulk updates"""
        if "permission_ids" in validated_data:
            return self._update_bulk(instance, validated_data)
        else:
            return super().update(instance, validated_data)

    def _update_bulk(self, instance, validated_data):
        print(f"Validated data: {validated_data}")
        user = instance.user if hasattr(instance, "user") else instance
        permission_ids = validated_data["permission_ids"]

        base_permissions = list(Permission.objects.filter(id__in=permission_ids))

        dependencies = get_all_dependencies(base_permissions)

        all_permissions = set(base_permissions) | dependencies

        UserPermission.objects.filter(user=user).delete()

        user_permissions = [
            UserPermission(
                user=user,
                permission=perm,
            )
            for perm in all_permissions
        ]

        UserPermission.objects.bulk_create(user_permissions)

        return user_permissions

    def to_representation(self, instance):
        if isinstance(instance, list):
            return [super().to_representation(item) for item in instance]
        return super().to_representation(instance)

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
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class LoginResponseSerializer(serializers.Serializer):
    tokens = TokenObtainPairSerializer()
    user = CustomUserSerializer()


class LogoutRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)


class InstitutionUserLoginResponseSerializer(LoginResponseSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        from institution.serializers import InstitutionSerializer

        self.fields["institution_attached"] = InstitutionSerializer(many=True)


class RolePermissionSerializer(BaseApprovableSerializer):
    role = RoleSerializer()
    permission = PermissionSerializer()

    class Meta:
        model = RolePermission
        fields = '__all__'




class SignatureSerializer(BaseApprovableSerializer):

    class Meta:
        model = Signature
        fields = '__all__'
        read_only_fields = ["id"]

        

    def to_representation(self, instance):
        repr =  super().to_representation(instance)
        repr['user'] = {
            'id': instance.user.id,
            'fullname': instance.user.fullname,
            'email': instance.user.email
        }
        return repr
