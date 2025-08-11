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

  Activity,
  MessageSquare,

} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { assetsAPI } from "@/lib/utils";
import type { IAssetAllocation, IAssetAllocationWorkflow } from "@/types/types.utils";
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
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "allocated":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "rejected":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "cancelled":
      return <Archive className="h-5 w-5 text-gray-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-500" />;
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

const AssetAllocationDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [allocation, setAllocation] = useState<IAssetAllocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalComments, setApprovalComments] = useState<{ [key: number]: string }>({});
  const [showCommentInput, setShowCommentInput] = useState<{ [key: number]: boolean }>({});

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

  const handleApproval = async (taskId: number, action: 'approve' | 'reject') => {
    if (!allocation) return;
    
    const comment = approvalComments[taskId] || "";
    
    try {
      setIsApproving(true);
      await assetsAPI.approveAssetAllocation(allocation.id, action, comment);
      
      // Refresh the allocation details to get updated workflow status
      await fetchAllocationDetails();
      
      // Clear comment and hide input for this task
      setApprovalComments(prev => ({ ...prev, [taskId]: "" }));
      setShowCommentInput(prev => ({ ...prev, [taskId]: false }));
      
      toast.success(`Asset allocation ${action}d successfully`);
    } catch (error) {
      console.error(`Error ${action}ing asset allocation:`, error);
      toast.error(`Failed to ${action} asset allocation`);
    } finally {
      setIsApproving(false);
    }
  };

  const toggleCommentInput = (taskId: number) => {
    setShowCommentInput(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    if (!showCommentInput[taskId]) {
      setApprovalComments(prev => ({ ...prev, [taskId]: "" }));
    }
  };

  const getWorkflowProgress = () => {
    // @ts-ignore - tasks property may exist at runtime
    if (!allocation?.tasks) return { completed: 0, total: 0, percentage: 0 };
    
    // @ts-ignore - tasks property may exist at runtime
    const completed = allocation.tasks.filter((task: any) => task.status === 'completed').length;
    // @ts-ignore - tasks property may exist at runtime
    const total = allocation.tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  };

  const getCurrentStep = () => {
    // @ts-ignore - tasks property may exist at runtime
    if (!allocation?.tasks) return null;
    // @ts-ignore - tasks property may exist at runtime
    return allocation.tasks.find((task: any) => task.status === 'pending');
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

  const workflowProgress = getWorkflowProgress();
  const currentStep = getCurrentStep();

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
          {/* Enhanced Approval Workflow */}
          

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
                  <label className="text-sm font-medium text-gray-500">Allocated To</label>
                  <p className="text-lg font-medium">{allocation.allocated_to?.fullname}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset</label>
                  <p className="text-lg">{allocation.asset?.asset_name}</p>
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
                <div>
                  <label className="text-sm font-medium text-gray-500">Allocated By</label>
                  <p className="text-lg">{allocation.allocated_by?.fullname}</p>
                </div>
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

          {/* Related Request Information */}
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
                    <label className="text-sm font-medium text-gray-500">Requester</label>
                    <p className="text-lg">{allocation.responding_to_request.requester?.fullname}</p>
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
          {/* Approval Workflow */}
          {/* @ts-ignore - tasks property may exist at runtime */}
          {allocation.tasks && allocation.tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Approval Workflow</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Workflow Progress Overview */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-medium text-gray-600">
                      {Math.round(workflowProgress.percentage)}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${workflowProgress.percentage}%` }}
                    />
                  </div>
                  
                  {/* Current Step Indicator */}
                  {currentStep && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>Waiting for: <strong>{currentStep.step.step_name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-600">{workflowProgress.completed}</div>
                    <div className="text-xs text-green-600">Completed</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-yellow-600">
                      {/* @ts-ignore - tasks property may exist at runtime */}
                      {allocation.tasks.filter((t: any) => t.status === 'pending').length}
                    </div>
                    <div className="text-xs text-yellow-600">Pending</div>
                  </div>
                </div>

                {/* Approval Tasks - Compact View */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Approval Steps</h4>
                  <div className="space-y-2">
                    {/* @ts-ignore - tasks property may exist at runtime */}
                    {allocation.tasks.map((task: any, index: any) => (
                      <div key={task.id} className={`relative border rounded-lg p-2 ${
                        task.status === 'completed' ? 'bg-green-50 border-green-200' :
                        task.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                        task.status === 'rejected' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        {/* Step Number Badge */}
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                          {index + 1}
                        </div>
                        
                        {/* Task Header */}
                        <div className="flex items-center justify-between mb-1 ml-4">
                          <span className="text-sm font-medium text-gray-900">{task.step.step_name}</span>
                          <Badge className={`text-xs ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                            task.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            task.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {/* Approvers */}
                        <div className="ml-4 mb-2">
                          <div className="flex flex-wrap gap-1">
                            {task.step.roles_details?.map((role: any) => (
                              <Badge key={role.id} variant="outline" className="text-xs">
                                {role.name}
                              </Badge>
                            ))}
                            {task.step.approvers_details?.map((approver: any) => (
                              <Badge key={approver.id} variant="outline" className="text-xs">
                                {approver.approver_user.fullname}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Approval Actions */}
                        {task.status === 'pending' && (
                          <div className="ml-4 pt-2 border-t border-gray-200">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApproval(task.id, 'approve')}
                                disabled={isApproving}
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                {isApproving ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleApproval(task.id, 'reject')}
                                disabled={isApproving}
                                size="sm"
                                variant="destructive"
                                className="flex-1 text-xs"
                              >
                                {isApproving ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Comment Toggle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCommentInput(task.id)}
                              className="w-full mt-2 text-blue-600 hover:text-blue-700 text-xs"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {showCommentInput[task.id] ? 'Hide Comment' : 'Add Comment'}
                            </Button>
                            
                            {/* Comment Input */}
                            {showCommentInput[task.id] && (
                              <div className="mt-2">
                                <Textarea
                                  placeholder="Add a comment..."
                                  value={approvalComments[task.id] || ""}
                                  onChange={(e) => setApprovalComments(prev => ({ 
                                    ...prev, 
                                    [task.id]: e.target.value 
                                  }))}
                                  className="text-xs"
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
