from django.contrib import admin
from .models import (
    AssetCategory,
    Asset,
    AssetRequest,
    AssetAllocation,
    AssetReturn,
    AssetHistory,
)

admin.site.register(AssetCategory)
admin.site.register(Asset)
admin.site.register(AssetRequest)
admin.site.register(AssetAllocation)
admin.site.register(AssetReturn)
admin.site.register(AssetHistory)
