from .models import (
    AssetCategory,
    Asset,
    AssetRequest,
    AssetAllocation,
    AssetReturn,
    AssetHistory,
)

REPORT_CONFIG = {
    'asset categories': AssetCategory,
    'assets': Asset,
    'asset requests': AssetRequest,
    'asset allocations': AssetAllocation,
    'asset returns': AssetReturn,
    'asset history': AssetHistory,
}

