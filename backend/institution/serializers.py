from rest_framework import serializers
from users.models import CustomUser
from users.serializers import CustomUserSerializer
from .models import Institution, Branch, UserBranch, InstitutionDocument
import os

class InstitutionDocumentSerializer(serializers.ModelSerializer):

    class Meta:
        model = InstitutionDocument
        fields = [
            "id",
            "shop",
            "document_title",
            "document_file",
            "document_type",
            "document_size",
            "created_at",
            "updated_at",
        ]

    def validate_file(self, value):
        if value:
            # Check file size (10MB limit)
            if value.document_size > 10 * 1024 * 1024:
                raise serializers.ValidationError("File size cannot exceed 10MB.")

            # Check file extension
            allowed_extensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]
            ext = os.path.splitext(value.document_title)[1].lower()
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f"File type {ext} not allowed. Allowed types: {', '.join(allowed_extensions)}"
                )
        return value

class InstitutionSerializer(serializers.ModelSerializer):
    institution_owner_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all()
    )
    institution_logo = serializers.ImageField(required=False, allow_null=True)
    documents = InstitutionDocumentSerializer(many=True, read_only=True)

    approval_status_display = serializers.CharField(
        source="get_approval_status_display", read_only=True
    )

    document_files = serializers.ListField(
        child=serializers.FileField(), write_only=True, required=False, allow_empty=True
    )
    document_titles = serializers.ListField(
        child=serializers.CharField(max_length=255),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Institution
        fields = [
            "id",
            "institution_email",
            "institution_name",
            "first_phone_number",
            "second_phone_number",
            "institution_logo",
            "institution_owner_id",
            "theme_color",
            "institution_logo",
            "location",
            "latitude",
            "longitude",
            # "location_geodjango",
            "approval_status",
            "approval_status_display",
            "approval_date",
            "documents",
            "document_files",
            "document_titles",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "User must be authenticated to create an Institution."
            )

        institution_name = validated_data.get("institution_name")
        Institution_owner = validated_data.pop("institution_owner_id")

        return Institution.objects.create(
            institution_owner=Institution_owner, created_by=request.user, **validated_data
        )


class BranchSerializer(serializers.ModelSerializer):
    institution_name = serializers.SerializerMethodField()
    institution_logo = serializers.ImageField(source="Institution.Institution_logo", read_only=True)

    class Meta:
        model = Branch
        fields = [
            "id",
            "institution",
            "institution_name",
            "institution_logo",
            "branch_name",
            "branch_phone_number",
            "branch_location",
            "branch_latitude",
            "branch_longitude",
            "branch_email",
            "branch_opening_time",
            "branch_closing_time",
        ]
    def get_institution_logo(self, obj):
        if hasattr(obj, "institution") and obj.institution and obj.institution.institution_logo:
            return obj.institution.institution_logo.url
        return None

    def get_institution_name(self, obj):
        if hasattr(obj, "institution") and obj.institution:
            return obj.institution.institution_name
        return None


    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "User must be authenticated to create a branch."
            )
        validated_data["created_by"] = request.user
        return super().create(validated_data)


class InstitutionWithBranchesSerializer(InstitutionSerializer):
    branches = serializers.SerializerMethodField()

    class Meta(InstitutionSerializer.Meta):
        model = Institution
        fields = InstitutionSerializer.Meta.fields + ["branches"]

    def get_branches(self, institution):
        user = self.context.get("user")

        if user and institution.institution_owner == user:
            branches = institution.branches.all()
        else:
            user_branches = UserBranch.objects.filter(user=user).values_list(
                "branch_id", flat=True
            )
            branches = institution.branches.filter(id__in=user_branches)

        return BranchSerializer(branches, many=True).data


class UserBranchSerializer(serializers.ModelSerializer):
    user_details = CustomUserSerializer(source="user", read_only=True)
    branch_details = BranchSerializer(source="branch", read_only=True)

    class Meta:
        model = UserBranch
        fields = [
            "id",
            "user",
            "branch",
            "is_default",
            "user_details",
            "branch_details",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "User must be authenticated to create a user branch."
            )
        return UserBranch.objects.create(created_by=request.user, **validated_data)
