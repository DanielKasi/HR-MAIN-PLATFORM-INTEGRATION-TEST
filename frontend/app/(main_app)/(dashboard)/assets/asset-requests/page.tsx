"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Search, 
  Plus,
  Eye,
  Package,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import {PERMISSION_CODES} from "@/constants";
import { hasPermission } from "@/lib/helpers";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {toast} from "sonner";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {CreateAssetRequestDialog} from "@/components/asset-requests/create-asset-request-dialog";
import {EditAssetRequestDialog} from "@/components/asset-requests/edit-asset-request-dialog";
import {DeleteAssetRequestDialog} from "@/components/asset-requests/delete-asset-request-dialog";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {useRouter} from "next/navigation";
import {assetsAPI} from "@/lib/utils";
import type {IAssetRequest} from "@/types/types.utils";
import {useMobile} from "@/hooks/use-mobile";
import ProtectedPage from "@/components/ProtectedPage";

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
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "approved":
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
    month: "short",
    day: "numeric",
  });
};

const AssetRequestsComponent = () => {
  const router = useRouter();
  const isMobile = useMobile();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<IAssetRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<IAssetRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const refreshTableRef = useRef<(() => void) | null>(null);

  const handleCreateSuccess = (newRequest: IAssetRequest) => {
    setIsCreateDialogOpen(false);
    toast.success("Asset request created successfully");
    refreshTableRef.current?.();
  };

  const handleUpdateSuccess = (updatedRequest: IAssetRequest) => {
    setIsEditDialogOpen(false);
    setEditingRequest(null);
    toast.success("Asset request updated successfully");
    refreshTableRef.current?.();
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setIsDeleteDialogOpen(false);
    setDeletingRequest(null);
    toast.success("Asset request deleted successfully");
    refreshTableRef.current?.();
  };

  const handleEditRequest = (request: IAssetRequest) => {
    setEditingRequest(request);
    setIsEditDialogOpen(true);
  };

  const handleDeleteRequest = (request: IAssetRequest) => {
    setDeletingRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const handleViewRequestDetails = (request: IAssetRequest) => {
    router.push(`/assets/asset-requests/${request.id}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasFilters = searchTerm || statusFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border shadow-sm min-h-screen">
        <div className="px-6 py-3 ">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asset Requests</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage and track asset requests from employees
              </p>
            </div>

            <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_REQUEST_ASSETS]}>
                <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className=""
              >
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
              </ProtectedPage>
            
                                                
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 ">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <PaginatedTableWrapper<IAssetRequest>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await assetsAPI.getPaginatedAssetRequests({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={assetsAPI.getPaginatedAssetRequestsFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              // Store refresh function in ref when component mounts/updates
              useEffect(() => {
                refreshTableRef.current = refresh;
              }, [refresh]);

              if (loading) {
                return <TableSkeleton rows={10} columns={7} />;
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? "No requests found matching your search criteria"
                      : "No asset requests found"}
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data.results.filter((request) => {
                const matchesStatus =
                  statusFilter === "all" || request.asset_request_status === statusFilter;
                return matchesStatus;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No requests found matching the selected status filter.
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>

                          <TableHead>Reference</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((request) => (
                          <TableRow key={request.id}>

                            <TableCell className="font-mono text-sm">
                              {request.request_reference_code}
                            </TableCell>
                            <TableCell className="font-medium">
                              {request.asset?.asset_name || "Unknown Asset"}
                            </TableCell>
                            <TableCell>
                              {request.requester?.user?.fullname || "Unknown User"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(request.asset_request_status)}
                                <Badge className={getStatusColor(request.asset_request_status)}>
                                  {getStatusDisplay(request.asset_request_status)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(request.created_at)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleViewRequestDetails(request)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                
                                  <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_EDIT_ASSET_REQUESTS]}>
                                    <DropdownMenuItem onClick={() => handleEditRequest(request)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </ProtectedPage>
                                 

                                  <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_DELETE_ASSET_REQUESTS]}>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteRequest(request)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </ProtectedPage>
                                  
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-3">
                    {filteredResults.map((request) => (
                      <div key={request.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-gray-500" />
                              <h3 className="font-semibold text-gray-900">
                                {request.asset?.asset_name || "Unknown Asset"}
                              </h3>
                            </div>
                            <div className="space-y-1 mb-2">
                              <p className="text-sm text-gray-600 font-mono">
                                Ref: {request.request_reference_code}
                              </p>
                              <p className="text-sm text-gray-600">
                                Requester: {request.requester?.user?.fullname || "Unknown User"}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(request.asset_request_status)}
                                  <Badge className={getStatusColor(request.asset_request_status)}>
                                    {getStatusDisplay(request.asset_request_status)}
                                  </Badge>
                                </div>
                                <span className="text-sm text-gray-500">
                                  Created: {formatDate(request.created_at)}
                                </span>
                              </div>
                              {request.notes && (
                                <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewRequestDetails(request)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>

                              <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_EDIT_ASSET_REQUESTS]}>
                                    <DropdownMenuItem onClick={() => handleEditRequest(request)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </ProtectedPage>

                              <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_DELETE_ASSET_REQUESTS]}>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteRequest(request)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </ProtectedPage>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>

      {/* Dialogs */}
      <CreateAssetRequestDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {editingRequest && (
        <EditAssetRequestDialog
          request={editingRequest}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingRequest(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {deletingRequest && (
        <DeleteAssetRequestDialog
          request={deletingRequest}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingRequest(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default AssetRequestsComponent;