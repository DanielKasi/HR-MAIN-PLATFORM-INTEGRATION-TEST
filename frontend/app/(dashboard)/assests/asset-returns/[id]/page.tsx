"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { assetsAPI } from "@/lib/utils";
import type { IAssetReturn } from "@/types/types.utils";
import { 
  ChevronLeft, 
  Package, 
  User, 
  Calendar, 
  FileText, 
  RotateCcw,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { EditAssetReturnDialog } from "@/components/asset-returns/edit-asset-return-dialog";
import { DeleteAssetReturnDialog } from "@/components/asset-returns/delete-asset-return-dialog";
import { Label } from "@/components/ui/label";

export default function AssetReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetReturnId = Number(params.id);

  const [assetReturn, setAssetReturn] = useState<IAssetReturn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch asset return details
  useEffect(() => {
    if (assetReturnId) {
      fetchAssetReturn();
    }
  }, [assetReturnId]);

  const fetchAssetReturn = async () => {
    try {
      setIsLoading(true);
      const data = await assetsAPI.getAssetReturnById(assetReturnId);
      setAssetReturn(data);
    } catch (error) {
      console.error("Error fetching asset return:", error);
      toast.error("Failed to fetch asset return details");
      router.push("/assests/asset-returns");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSuccess = () => {
    fetchAssetReturn();
    toast.success("Asset return updated successfully");
  };

  const handleDeleteSuccess = () => {
    toast.success("Asset return deleted successfully");
    router.push("/assests/asset-returns");
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "good":
        return "bg-green-100 text-green-800 border-green-200";
      case "damaged":
        return "bg-red-100 text-red-800 border-red-200";
      case "lost":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "damaged":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "lost":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!assetReturn) {
    return (
      <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Asset Return Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The asset return you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push("/assests/asset-returns")}>
            Back to Asset Returns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 overflow-x-hidden w-full max-w-full">
      <div className="mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="shadow-sm bg-transparent rounded-full w-8 h-8 sm:w-9 sm:h-9 p-0 flex items-center justify-center"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Asset Return Details</h1>
              <p className="text-muted-foreground">
                Return ID: {assetReturn.id} • Created {formatDate(assetReturn.created_at)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Asset Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Asset Information
            </CardTitle>
            <CardDescription>
              Details about the returned asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Asset Name</Label>
                <p className="text-lg font-medium">{assetReturn.asset?.asset_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                <p className="font-mono text-lg">{assetReturn.asset?.serial_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Batch Number</Label>
                <p className="font-mono text-lg">{assetReturn.asset?.batch_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                <p className="text-lg">{assetReturn.asset?.category?.category_name || "N/A"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-lg">{assetReturn.asset?.description || "No description available"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Current Status</Label>
                <Badge className="text-sm">
                  {assetReturn.asset?.status || "Unknown"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Return Details
            </CardTitle>
            <CardDescription>
              Information about the return process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Return Date</Label>
                <p className="text-lg">{formatDate(assetReturn.created_at)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Asset Condition</Label>
                <Badge className={`${getConditionColor(assetReturn.condition)} flex items-center gap-1 w-fit`}>
                  {getConditionIcon(assetReturn.condition)}
                  {assetReturn.condition}
                </Badge>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                <p className="text-lg mt-1">
                  {assetReturn.notes || "No notes provided"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allocation Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Allocation Information
            </CardTitle>
            <CardDescription>
              Details about the original asset allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Allocated To</Label>
                <p className="text-lg font-medium">
                  {assetReturn.allocation?.allocated_to?.user?.fullname || "Unknown"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Allocated By</Label>
                <p className="text-lg">
                  {assetReturn.allocation?.allocated_by?.user?.fullname || "Unknown"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Allocation Date</Label>
                <p className="text-lg">
                  {assetReturn.allocation?.created_at ? formatDate(assetReturn.allocation.created_at) : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Allocation Status</Label>
                <p className="text-lg">
                  {assetReturn.allocation?.allocation_status || "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timestamps
            </CardTitle>
            <CardDescription>
              Record creation and modification times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                <p className="text-lg">{formatDate(assetReturn.created_at)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                <p className="text-lg">{formatDate(assetReturn.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <EditAssetReturnDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          assetReturn={assetReturn}
          onSuccess={handleEditSuccess}
        />

        <DeleteAssetReturnDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          assetReturn={assetReturn}
          onSuccess={handleDeleteSuccess}
        />
      </div>
    </div>
  );
}
