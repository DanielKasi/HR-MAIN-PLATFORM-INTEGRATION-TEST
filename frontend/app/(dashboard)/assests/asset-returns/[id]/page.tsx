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
    router.push("/assests/asset-returns");
  };

  const handleApproval = async (taskId: number, action: 'completed' | 'rejected') => {
    if (!assetReturn) return;
    
    const comment = approvalComments[taskId] || "";
    
    try {
      setIsApproving(true);
      // Note: You may need to implement this API call for asset returns
      // await assetsAPI.approveAssetReturn(taskId, action, comment);
      
      // Refresh the return details to get updated workflow status
      await fetchReturnDetails();
      
      // Clear comment and hide input for this task
      setApprovalComments(prev => ({ ...prev, [taskId]: "" }));
      setShowCommentInput(prev => ({ ...prev, [taskId]: false }));
      
      toast.success(`Asset return ${action}d successfully`);
    } catch (error) {
      console.error(`Error ${action}ing asset return:`, error);
      toast.error(`Failed to ${action} asset return`);
    } finally {
      setIsApproving(false);
    }
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
          <Button onClick={() => router.push("/assests/asset-returns")}>
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
              onClick={() => router.push("/assests/asset-returns")}
              className="p-2 hover:bg-gray-100 rounded-full border"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="text-[#162032] text-lg md:text-[24px] break-all">Return ID: {assetReturn.id}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between gap-6">
        {/* Main Content */}
        <div className="flex flex-col w-full lg:flex-[0.7] space-y-4 lg:space-y-6">
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

        {/* Vertical Separator Line - Hidden on mobile, visible on larger screens */}
        <div className="hidden lg:block w-px bg-gray-200"></div>

        {/* Sidebar */}
        <div className="w-full lg:flex-[0.2]">
          {/* Approval Workflow */}
          {/* @ts-ignore - tasks property may exist at runtime */}
          {assetReturn.tasks && assetReturn.tasks.length > 0 && (
            <div className="border-gray-200 p-4 ">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approvals</h3>
              
              {/* Approval Steps */}
              <div className="space-y-4 lg:space-y-6">
                {/* @ts-ignore - tasks property may exist at runtime */}
                {assetReturn.tasks && assetReturn.tasks.map((task: any, index: any) => (
                  <div key={task.id} className="relative">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        task.status === 'completed' 
                          ? 'bg-green-100 border-green-500' 
                          : 'bg-blue-100 border-blue-400'
                      }`}>
                        <span className={`text-xs lg:text-sm font-semibold ${
                          task.status === 'completed' ? 'text-green-700' : 'text-blue-700'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex flex-col bg-gray-50 rounded-lg p-3 lg:p-4 flex-1">

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{task.step.step_name}</h4>
                          
                          <Badge className={`text-xs mt-1 ${
                          task.status === 'completed' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                            {task.status === 'completed' ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1">
                            {task.status === 'completed' 
                              ? `Approved - ${formatDate(task.updated_at)}`
                              : 'Pending Approval'
                            }
                          </p>
                        {task.status === 'completed' && task.comments && (
                          <p className="text-xs text-gray-500 mt-1">
                            {task.comments}
                          </p>
                        )}
                        {task.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2 mt-3">
                            <Button 
                              className="bg-green-600 hover:bg-green-700 text-white w-full text-xs !w-[100px] !h-[20px] !rounded-full"
                              onClick={() => handleApproval(task.id, 'completed')}
                              disabled={isApproving}
                            >
                              {isApproving ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                'Approve'
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              className="text-red-600 border-red-300 text-xs !w-[100px] !h-[20px] !rounded-full"
                              onClick={() => handleApproval(task.id, 'rejected')}
                              disabled={isApproving}
                            >
                              {isApproving ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                'Reject'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Connection Line - Dotted (show only if not the last step) */}
                    {/* @ts-ignore - tasks property may exist at runtime */}
                    {index < assetReturn.tasks.length - 1 && (
                      <div className="absolute left-3 lg:left-4 top-6 lg:top-8 w-0.5 h-6 lg:h-8 ml-1" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Return Status (fallback if no tasks) */}
          
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
  );
};

export default AssetReturnDetailPage;
