from rest_framework import serializers
from .models import Asset, AssetCategory, AssetRequest, AssetRequestHistory


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = "__all__"


class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = "__all__"


class AssetRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetRequest
        fields = "__all__"


class AssetRequestHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetRequestHistory
        fields = "__all__"
