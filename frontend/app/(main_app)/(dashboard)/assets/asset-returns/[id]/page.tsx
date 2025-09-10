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
  ArrowDown,
  Activity,
  MessageSquare,
  RotateCcw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { assetsAPI } from "@/lib/utils";
import type { IAssetReturn } from "@/types/types.utils";
import { EditAssetReturnDialog } from "@/components/asset-returns/edit-asset-return-dialog";
import { DeleteAssetReturnDialog } from "@/components/asset-returns/delete-asset-return-dialog";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

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

const getConditionDisplay = (condition: string) => {
  switch (condition) {
    case "good":
      return "Good";
    case "damaged":
      return "Damaged";
    case "lost":
      return "Lost";
    default:
      return condition;
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

const AssetReturnDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [assetReturn, setAssetReturn] = useState<IAssetReturn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalComments, setApprovalComments] = useState<{ [key: number]: string }>({});
  const [showCommentInput, setShowCommentInput] = useState<{ [key: number]: boolean }>({});

  console.log("returns", assetReturn);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const returnId = params.id as string;

  const fetchReturnDetails = async () => {
    try {
      setIsLoading(true);
      const response = await assetsAPI.getAssetReturnById(parseInt(returnId));
      setAssetReturn(response);
    } catch (error) {
      console.error("Error fetching return details:", error);
      toast.error("Failed to load return details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (returnId) {
      fetchReturnDetails();
    }
  }, [returnId]);

  const handleEditSuccess = () => {
    fetchReturnDetails();
    setIsEditDialogOpen(false);
    toast.success("Return updated successfully");
  };

  const handleDeleteSuccess = () => {
    toast.success("Return deleted successfully");
    router.push("/assets/asset-returns");
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
          <span className="text-lg text-gray-600">Loading return details...</span>
        </div>
      </div>
    );
  }

  if (!assetReturn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Return Not Found</h2>
          <p className="text-gray-600 mb-4">The return you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/assets/asset-returns")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Returns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 bg-white rounded-lg">
      {/* Header */}
      <div className="">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/assets/asset-returns")}
              className="p-2 hover:bg-gray-100 rounded-full border"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="text-gray-800 text-lg md:text-[24px] break-all">Return ID: {assetReturn.id}</p>
          </div>
        </div>
      </div>


      <div className={` gap-6 ${(assetReturn?.approval_status !== "active" && assetReturn?.approvals?.length) ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}>
        {assetReturn?.approvals && assetReturn.approvals.length > 0 &&
          <div className="order-1 lg:order-2">
            <ApprovalWorkflow
              approvals={assetReturn.approvals}
              instance_approval_status={assetReturn.approval_status}
              onRefresh={fetchReturnDetails}
            />
          </div>
        }

        <div className={`${(assetReturn?.approval_status !== "active" && assetReturn?.approvals?.length) ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}>


          <div className="flex flex-col w-full space-y-4 lg:space-y-6">
            {/* Asset Card */}
            <div className="border rounded-[20px] p-4 my-2 lg:my-4">
              <div className="">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Asset</h3>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <p className="text-sm font-medium text-gray-900">{assetReturn.asset?.asset_name}</p>
                    <Badge className={getConditionColor(assetReturn.condition)}>
                      {getConditionDisplay(assetReturn.condition)}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-500">{assetReturn.asset?.serial_number}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Batch No</p>
                    <p className="text-base font-mono break-all">{assetReturn.asset?.batch_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="text-base font-mono break-all">{assetReturn.asset?.category?.category_name || "Unknown"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Line - Dotted with Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-8 bg-gray-300 relative" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}>
                <ArrowDown className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Returned By Card */}
            <div className="border rounded-[20px] p-4 my-2 lg:my-4">
              <h3 className="text-lg font-semibold text-gray-900">Returned By</h3>
              <div className="">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                  <div className="flex items-center gap-2 ">
                    <User className="h-5 w-5 text-gray-600" />
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900">{assetReturn.allocation?.allocated_to?.user?.fullname || 'Unknown User'}</p>
                      <p className="text-sm text-gray-500">EMP-{assetReturn.allocation?.allocated_to?.user?.id || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Position</p>
                      <p className="text-sm text-gray-500">{assetReturn.allocation?.allocated_to?.user?.roles?.[0]?.name || "Not specified"}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="text-sm text-gray-500">Not specified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Card (if exists) */}
            {assetReturn.notes && (
              <div className="rounded-[20px] p-4 my-2 lg:my-4">
                <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                <div className="">
                  <div>
                    <p className="text-sm text-gray-600">{assetReturn.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Return Details Card */}
            <div className="rounded-[20px] p-4 my-2 lg:my-4">
              <h3 className="text-lg font-semibold text-gray-900">Return Details</h3>
              <div className="">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                  <div className="flex items-center gap-2 ">
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900">Return Date</p>
                      <p className="text-sm text-gray-500">{formatDate(assetReturn.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Allocated By</p>
                      <p className="text-sm text-gray-500">{assetReturn.allocation?.allocated_by?.user?.fullname || "Not specified"}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm text-gray-500">Allocation Date</p>
                      <p className="text-sm text-gray-500">
                        {assetReturn.allocation?.created_at ? formatDate(assetReturn.allocation.created_at) : "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Dialogs */}
        {assetReturn && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default AssetReturnDetailPage;
