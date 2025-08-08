"use client";

import { useState, useEffect, useMemo } from "react";
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
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Wrench, 
  Archive, 
  History, 
  FileText, 
  MapPin, 
  Tag,
  Users,
  Code,
  Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { assetsAPI } from "@/lib/utils";
import type { IAssetAllocation } from "@/types/types.utils";
import { EditAssetAllocationDialog } from "@/components/asset-allocations/edit-asset-allocation-dialog";
import { DeleteAssetAllocationDialog } from "@/components/asset-allocations/delete-asset-allocation-dialog";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "allocated":
      return "bg-green-100 text-green-800 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "cancelled":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "allocated":
      return "Allocated";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "allocated":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AssetAllocationDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [allocation, setAllocation] = useState<IAssetAllocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const allocationId = params.id as string;

  const fetchAllocationDetails = async () => {
    try {
      setIsLoading(true);
      const response = await assetsAPI.getAssetAllocationById(parseInt(allocationId));
      setAllocation(response);
    } catch (error) {
      console.error("Error fetching allocation details:", error);
      toast.error("Failed to load allocation details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (allocationId) {
      fetchAllocationDetails();
    }
  }, [allocationId]);

  const handleEditSuccess = (updatedAllocation: IAssetAllocation) => {
    setAllocation(updatedAllocation);
    setIsEditDialogOpen(false);
    toast.success("Allocation updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    toast.success("Allocation deleted successfully");
    router.push("/assests/asset-allocations");
  };

  const handleEditAllocation = () => {
    setIsEditDialogOpen(true);
  };

  const handleDeleteAllocation = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleViewAssetDetails = () => {
    if (allocation?.asset?.id) {
      router.push(`/assets/${allocation.asset.id}`);
    }
  };

  const handleViewRequestDetails = () => {
    if (allocation?.responding_to_request?.id) {
      router.push(`/assests/asset-requests/${allocation.responding_to_request.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
          <span className="text-lg text-gray-600">Loading allocation details...</span>
        </div>
      </div>
    );
  }

  if (!allocation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Allocation Not Found</h2>
          <p className="text-gray-600 mb-4">The allocation you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/assests/asset-allocations")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Allocations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/assests/asset-allocations")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Allocations</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Allocation Details</h1>
            <p className="text-gray-600">Allocation Code: {allocation.alloc_code}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleEditAllocation}
            className="flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Allocation</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteAllocation}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-orange-500" />
                <span>Allocation Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Allocation Code</label>
                  <p className="text-lg font-mono">{allocation.alloc_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(allocation.allocation_status)}
                    <Badge className={getStatusColor(allocation.allocation_status)}>
                      {getStatusDisplay(allocation.allocation_status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Active</label>
                  <p className="text-lg">{allocation.is_active ? "Yes" : "No"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-lg">{formatDate(allocation.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-500" />
                <span>Asset Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset Name</label>
                  <p className="text-lg font-medium">{allocation.asset?.asset_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Serial Number</label>
                  <p className="text-lg font-mono">{allocation.asset?.serial_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-lg">{allocation.asset?.category?.category_name || "Unknown"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset Status</label>
                  <p className="text-lg">{allocation.asset?.status}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-lg">{allocation.asset?.description || "No description available"}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleViewAssetDetails}
                className="flex items-center space-x-2"
              >
                <Package className="h-4 w-4" />
                <span>View Asset Details</span>
              </Button>
            </CardContent>
          </Card>

          {/* Employee Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-500" />
                <span>Employee Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Allocated To</label>
                  <p className="text-lg font-medium">{allocation.allocated_to?.fullname}</p>
                  <p className="text-sm text-gray-500">{allocation.allocated_to?.employee_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Allocated By</label>
                  <p className="text-lg font-medium">{allocation.allocated_by?.fullname}</p>
                  <p className="text-sm text-gray-500">{allocation.allocated_by?.employee_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Information (if exists) */}
          {allocation.responding_to_request && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <span>Related Request</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Code</label>
                    <p className="text-lg font-mono">{allocation.responding_to_request.request_reference_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Status</label>
                    <p className="text-lg">{allocation.responding_to_request.asset_request_status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Requester</label>
                    <p className="text-lg">{allocation.responding_to_request.requester?.fullname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Date</label>
                    <p className="text-lg">{formatDate(allocation.responding_to_request.created_at)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleViewRequestDetails}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>View Request Details</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleEditAllocation}
                className="w-full justify-start"
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Allocation
              </Button>
              <Button
                onClick={handleViewAssetDetails}
                className="w-full justify-start"
                variant="outline"
              >
                <Package className="h-4 w-4 mr-2" />
                View Asset Details
              </Button>
              {allocation.responding_to_request && (
                <Button
                  onClick={handleViewRequestDetails}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Request Details
                </Button>
              )}
              <Button
                onClick={handleDeleteAllocation}
                className="w-full justify-start text-red-600 hover:text-red-700"
                variant="outline"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Allocation
              </Button>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span>Timestamps</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm">{formatDate(allocation.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm">{formatDate(allocation.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          
        </div>
      </div>

      {/* Dialogs */}
      {allocation && (
        <>
          <EditAssetAllocationDialog
            allocation={allocation}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={handleEditSuccess}
          />

          <DeleteAssetAllocationDialog
            allocation={allocation}
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
};

export default AssetAllocationDetailPage;
