from asset.models import AssetHistory


def create_asset_history(
    asset, event_type, performed_by=None, affected_user=None, notes=None
):
    AssetHistory.objects.create(
        asset=asset,
        event_type=event_type,
        performed_by=performed_by,
        affected_user=affected_user,
        notes=notes,
    )
