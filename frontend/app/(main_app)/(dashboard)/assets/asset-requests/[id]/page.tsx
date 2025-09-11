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
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { assetsAPI } from "@/lib/utils";
import type { IAssetRequest } from "@/types/types.utils";
import { EditAssetRequestDialog } from "@/components/asset-requests/edit-asset-request-dialog";
import { DeleteAssetRequestDialog } from "@/components/asset-requests/delete-asset-request-dialog";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "approved":
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
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
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

const AssetRequestDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<IAssetRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalComments, setApprovalComments] = useState<{ [key: number]: string }>({});
  const [showCommentInput, setShowCommentInput] = useState<{ [key: number]: boolean }>({});

// console.log("requests", request);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const requestId = params.id as string;

  const fetchRequestDetails = async () => {
    try {
      setIsLoading(true);
      const response = await assetsAPI.getAssetRequestById(parseInt(requestId));
      setRequest(response);
    } catch (error) {
      console.error("Error fetching request details:", error);
      toast.error("Failed to load request details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
    }
  }, [requestId]);

  const handleEditSuccess = (updatedRequest: IAssetRequest) => {
    setRequest(updatedRequest);
    setIsEditDialogOpen(false);
    toast.success("Request updated successfully");
  };

  const handleDeleteSuccess = () => {
    toast.success("Request deleted successfully");
    router.push("/assets/asset-requests");
  };

  const handleApproval = async (taskId: number, action: 'completed' | 'rejected') => {
    if (!request) return;
    
    const comment = approvalComments[taskId] || "";
    
    try {
      setIsApproving(true);
      await assetsAPI.approveAssetRequest(taskId, action, comment);
      
      // Refresh the request details to get updated workflow status
      await fetchRequestDetails();
      
      // Clear comment and hide input for this task
      setApprovalComments(prev => ({ ...prev, [taskId]: "" }));
      setShowCommentInput(prev => ({ ...prev, [taskId]: false }));
      
      toast.success(`Asset request ${action}d successfully`);
    } catch (error) {
      console.error(`Error ${action}ing asset request:`, error);
      toast.error(`Failed to ${action} asset request`);
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
          <span className="text-lg text-gray-600">Loading request details...</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Request Not Found</h2>
          <p className="text-gray-600 mb-4">The request you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/assets/asset-requests")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
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
              onClick={() => router.push("/assets/asset-requests")}
              className="p-2 hover:bg-gray-100 rounded-full border"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="text-gray-800 text-lg md:text-[24px] break-all">{request.request_reference_code}</p>
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
                  <p className="text-sm font-medium text-gray-900">{request.asset?.asset_name}</p>
                  <Badge className={getStatusColor(request.asset_request_status)}>
                    {getStatusDisplay(request.asset_request_status)}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-500">{request.asset?.serial_number}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div>
                  <p className="text-sm text-gray-500">Batch No</p>
                  <p className="text-base font-mono break-all">{request.asset?.batch_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-base font-mono break-all">{request.asset?.category?.category_name || "Unknown"}</p>
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

          {/* Requested By Card */}
          <div className="border rounded-[20px] p-4 my-2 lg:my-4">
            <h3 className="text-lg font-semibold text-gray-900">Requested By</h3>
            <div className="">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div className="flex items-center gap-2 ">
                  <User className="h-5 w-5 text-gray-600" />
                  <div className="flex flex-col"> 
                    <p className="font-medium text-gray-900">{request.requester?.user.fullname}</p>
                    <p className="text-sm text-gray-500">EMP-{request.requester?.user.id}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Position</p>
                    <p className="text-sm text-gray-500">{request.requester?.user.roles?.[0]?.name || "Not specified"}</p>
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
          {request.notes && (
            <div className="rounded-[20px] p-4 my-2 lg:my-4">
              <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              <div className="">
                <div>
                  <p className="text-sm text-gray-600">{request.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Vertical Separator Line - Hidden on mobile, visible on larger screens */}
        <div className="hidden lg:block w-px bg-gray-200"></div>

        {/* Sidebar */}
        <div className="w-full lg:flex-[0.2]">
          {/* Approval Workflow */}
          {/* @ts-ignore - tasks property may exist at runtime */}
          {request.tasks && request.tasks.length > 0 && (
            <div className="border-gray-200 p-4 ">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approvals</h3>
              
              {/* Approval Steps */}
              <div className="space-y-4 lg:space-y-6">
                {/* @ts-ignore - tasks property may exist at runtime */}
                {request.tasks && request.tasks.map((task: any, index: any) => (
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
                    {index < request.tasks.length - 1 && (
                      <div className="absolute left-3 lg:left-4 top-6 lg:top-8 w-0.5 h-6 lg:h-8 ml-1" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {request && (
        <>
          <EditAssetRequestDialog
            request={request}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={handleEditSuccess}
          />

          <DeleteAssetRequestDialog
            request={request}
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
};

export default AssetRequestDetailPage;
