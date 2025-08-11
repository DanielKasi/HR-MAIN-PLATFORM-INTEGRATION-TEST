"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Package,
  User,
  Calendar,
  Clock,
  CheckCircle,
  Wrench,
  Archive,
  History,
  FileText,
  MoreVertical,
  RotateCcw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { assetsAPI } from "@/lib/utils";
import type { IAsset, IAssetHistory } from "@/types/types.utils";
import { EditAssetDialog } from "@/components/assets/edit-asset-dialog";
import { DeleteAssetDialog } from "@/components/assets/delete-asset-dialog";
import { AssetReturnDialog } from "@/components/assets/asset-return-dialog";
import { AssetHistory } from "@/components/assets/asset-history";

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800 border-green-200";
    case "allocated":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "maintenance":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "decommissioned":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "available":
      return "Available";
    case "allocated":
      return "Allocated";
    case "maintenance":
      return "Under Maintenance";
    case "decommissioned":
      return "Decommissioned";
    default:
      return status;
  }
};

const getEventTypeDisplay = (eventType: string) => {
  switch (eventType) {
    case "allocated":
      return "Allocated";
    case "returned":
      return "Returned";
    case "maintenance":
      return "Maintenance";
    case "decommissioned":
      return "Decommissioned";
    case "created":
      return "Created";
    case "reassigned":
      return "Reassigned";
    default:
      return eventType;
  }
};

const getEventTypeIcon = (eventType: string) => {
  switch (eventType) {
    case "allocated":
      return <User className="h-4 w-4 text-blue-500" />;
    case "returned":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "maintenance":
      return <Wrench className="h-4 w-4 text-yellow-500" />;
    case "decommissioned":
      return <Archive className="h-4 w-4 text-red-500" />;
    case "created":
      return <Package className="h-4 w-4 text-purple-500" />;
    case "reassigned":
      return <RefreshCw className="h-4 w-4 text-orange-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AssetDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  
  const [asset, setAsset] = useState<IAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const assetId = params.id as string;

  // Fetch asset details
  const fetchAssetDetails = async () => {
    try {
      setIsLoading(true);
      const response = await assetsAPI.getById(parseInt(assetId));
      setAsset(response);
    } catch (error) {
      console.warn("Error fetching asset details:", error);
      toast.error("Failed to load asset details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails();
    }
  }, [assetId]);

  const handleEditSuccess = (updatedAsset: IAsset) => {
    setAsset(updatedAsset);
    setIsEditDialogOpen(false);
    toast.success("Asset updated successfully");
  };

  const handleDeleteSuccess = () => {
    toast.success("Asset deleted successfully");
    router.push("/assests/assets");
  };

  const handleAssetReturn = () => {
    // Refresh asset details after return
    fetchAssetDetails();
    toast.success("Asset returned successfully");
  };

  const handleEditAsset = () => {
    setIsEditDialogOpen(true);
  };

  const handleDeleteAsset = () => {
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
          <span className="text-lg text-gray-600">Loading asset details...</span>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Asset Not Found</h2>
          <p className="text-gray-600 mb-4">The asset you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/assests/assets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/assests/assets")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assets
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{asset.asset_name}</h1>
                <p className="text-sm text-gray-600">Asset Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Asset Return Button - only show if asset is allocated */}
              {asset.status === "allocated" && (
                <AssetReturnDialog
                  asset={asset}
                  onReturn={handleAssetReturn}
                  trigger={
                    <Button variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Return Asset
                    </Button>
                  }
                />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditAsset}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Asset
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeleteAsset}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Asset
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Asset Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset Name</label>
                  <p className="text-sm text-gray-900 mt-1">{asset.asset_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Serial Number</label>
                  <p className="text-sm font-mono text-gray-900 mt-1">{asset.serial_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Batch Number</label>
                  <p className="text-sm text-gray-900 mt-1">{asset.batch_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {asset.category?.category_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(asset.status)}>
                      {getStatusDisplay(asset.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Active</label>
                  <div className="mt-1">
                    <Badge variant={asset.is_active ? "default" : "secondary"}>
                      {asset.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              {asset.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-900 mt-1">{asset.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Assignment Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asset.current_holder ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">Currently Assigned To:</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900">
                      {asset.current_holder_details?.fullname || `Employee ID: ${asset.current_holder}`}
                    </p>
                    {asset.current_holder_details?.email && (
                      <p className="text-sm text-gray-600 mt-1">{asset.current_holder_details.email}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Not currently assigned to anyone</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset History - Using the new component */}
          <AssetHistory asset={asset} onRefresh={fetchAssetDetails} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleEditAsset}
                className="w-full justify-start"
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Asset
              </Button>
              {asset.status === "allocated" && (
                <AssetReturnDialog
                  asset={asset}
                  onReturn={handleAssetReturn}
                  trigger={
                    <Button 
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Return Asset
                    </Button>
                  }
                />
              )}
              <Button 
                onClick={() => toast.info("Assign asset functionality coming soon")}
                className="w-full justify-start"
                variant="outline"
                disabled={asset.status === "allocated"}
              >
                <User className="h-4 w-4 mr-2" />
                Assign Asset
              </Button>
              <Button 
                onClick={() => toast.info("Maintenance request functionality coming soon")}
                className="w-full justify-start"
                variant="outline"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Request Maintenance
              </Button>
              <Button 
                onClick={() => toast.info("Generate report functionality coming soon")}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-600">{formatDate(asset.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-600">{formatDate(asset.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {asset && (
        <>
          <EditAssetDialog
            asset={asset}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={handleEditSuccess}
          />
          <DeleteAssetDialog
            asset={asset}
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
};

export default AssetDetailPage;
