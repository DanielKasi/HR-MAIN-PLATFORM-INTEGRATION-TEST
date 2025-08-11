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
  Archive,
  History,
  FileText,
  MoreVertical,
  CheckSquare,
  XSquare,
  MessageSquare,
  Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case "approved":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "rejected":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "cancelled":
      return <Archive className="h-5 w-5 text-gray-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
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
  const selectedInstitution = useSelector(selectSelectedInstitution);
  
  const [request, setRequest] = useState<IAssetRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalComments, setApprovalComments] = useState<{ [key: number]: string }>({});
  const [showCommentInput, setShowCommentInput] = useState<{ [key: number]: boolean }>({});


  console.log("requests", request)

  const requestId = params.id as string;

  // Fetch request details
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
    router.push("/assests/asset-requests");
  };

  const handleEditRequest = () => {
    setIsEditDialogOpen(true);
  };

  const handleDeleteRequest = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleApproveRequest = async () => {
    if (!request) return;
    
    try {
      await assetsAPI.approveAssetRequest(request.id, "completed");
      await fetchRequestDetails();
      toast.success("Request approved successfully");
    } catch (error: any) {
      console.error("Error approving request:", error);
      const errorMessage = error.response?.data?.message || "Failed to approve request";
      toast.error(errorMessage);
    }
  };

  const handleRejectRequest = async () => {
    if (!request) return;
    
    try {
      await assetsAPI.approveAssetRequest(request.id, "rejected");
      await fetchRequestDetails(); // Refresh to get updated status
      toast.success("Request rejected successfully");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      const errorMessage = error.response?.data?.message || "Failed to reject request";
      toast.error(errorMessage);
    }
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

  const toggleCommentInput = (taskId: number) => {
    setShowCommentInput(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    if (!showCommentInput[taskId]) {
      setApprovalComments(prev => ({ ...prev, [taskId]: "" }));
    }
  };

  const getWorkflowProgress = () => {
    // @ts-ignore - tasks property may exist at runtime
    if (!request?.tasks) return { completed: 0, total: 0, percentage: 0 };
    
    // @ts-ignore - tasks property may exist at runtime
    const completed = request.tasks.filter((task: any) => task.status === 'completed').length;
    // @ts-ignore - tasks property may exist at runtime
    const total = request.tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  };

  const getCurrentStep = () => {
    // @ts-ignore - tasks property may exist at runtime
    if (!request?.tasks) return null;
    // @ts-ignore - tasks property may exist at runtime
    return request.tasks.find((task: any) => task.status === 'pending');
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
          <Button onClick={() => router.push("/assests/asset-requests")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
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
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/assests/asset-requests")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Requests
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Asset Request</h1>
                <p className="text-sm text-gray-600">Reference: {request.request_reference_code}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditRequest}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Request
                  </DropdownMenuItem>
                  {request.asset_request_status === "pending" && (
                    <>
                      <DropdownMenuItem onClick={handleApproveRequest}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Approve Request
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRejectRequest}>
                        <XSquare className="h-4 w-4 mr-2" />
                        Reject Request
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem 
                    onClick={handleDeleteRequest}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Request
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Request Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Request Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference Code</label>
                  <p className="text-sm font-mono text-gray-900 mt-1">{request.request_reference_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(request.asset_request_status)}>
                      {getStatusDisplay(request.asset_request_status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset</label>
                  <p className="text-sm text-gray-900 mt-1">{request.asset.asset_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset Serial</label>
                  <p className="text-sm font-mono text-gray-900 mt-1">{request.asset.serial_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset Category</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {request.asset.category?.category_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset Status</label>
                  <div className="mt-1">
                    <Badge variant={request.asset.status === "available" ? "default" : "secondary"}>
                      {request.asset.status.charAt(0).toUpperCase() + request.asset.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              {request.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requester Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Requester Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">Requested By:</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-900">
                    {request.requester?.user.fullname || 'Unknown User'}
                  </p>
                  {request.requester?.email && (
                    <p className="text-sm text-gray-600 mt-1">{request.requester.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval Workflow */}
          {/* @ts-ignore - tasks property may exist at runtime */}
          {request.tasks && request.tasks.length > 0 && (
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
                      {request.tasks.filter((t: any) => t.status === 'pending').length}
                    </div>
                    <div className="text-xs text-yellow-600">Pending</div>
                  </div>
                </div>

                {/* Approval Tasks - Compact View */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Approval Steps</h4>
                  <div className="space-y-2">
                    {/* @ts-ignore - tasks property may exist at runtime */}
                    {request.tasks.map((task: any, index: any) => (
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
                                onClick={() => handleApproval(task.id, 'completed')}
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
                                onClick={() => handleApproval(task.id, 'rejected')}
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
                onClick={handleEditRequest}
                className="w-full justify-start"
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Request
              </Button>
              {request.asset_request_status === "pending" && (
                <>
                  <Button 
                    onClick={handleApproveRequest}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Approve Request
                  </Button>
                  <Button 
                    onClick={handleRejectRequest}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <XSquare className="h-4 w-4 mr-2" />
                    Reject Request
                  </Button>
                </>
              )}
              <Button 
                onClick={() => router.push(`/assests/assets/${request.asset.id}`)}
                className="w-full justify-start"
                variant="outline"
              >
                <Package className="h-4 w-4 mr-2" />
                View Asset Details
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
                  <p className="text-xs text-gray-600">{formatDate(request.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-600">{formatDate(request.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          
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
