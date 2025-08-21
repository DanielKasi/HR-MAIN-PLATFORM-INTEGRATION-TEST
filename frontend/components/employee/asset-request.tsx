"use client";

import React, {useState, useCallback, useMemo, useRef} from "react";
import {useSelector} from "react-redux";
import {
  MoreVertical,
  Edit,
  Trash2,
  Search,
  Plus,
  Eye,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
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

interface AssetRequestsProps {
  employeeId?: string;
  isEmployeeView?: boolean;
  showHeader?: boolean;
  showCreateButton?: boolean;
  showStats?: boolean;
  compact?: boolean;
  className?: string;
}

// Memoized utility functions to prevent recreation on every render
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
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

const AssetRequests: React.FC<AssetRequestsProps> = ({
  employeeId,
  isEmployeeView = false,
  showHeader = true,
  showCreateButton = true,
  showStats = true,
  compact = false,
  className = "",
}) => {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<IAssetRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<IAssetRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Use useRef instead of useState to avoid setState during render
  const refreshFunctionRef = useRef<(() => void) | null>(null);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Memoized event handlers to prevent recreation
  const handleCreateSuccess = useCallback((newRequest: IAssetRequest) => {
    setIsCreateDialogOpen(false);
    toast.success("Asset request created successfully");
    if (refreshFunctionRef.current) {
      refreshFunctionRef.current();
    }
  }, []);

  const handleUpdateSuccess = useCallback((updatedRequest: IAssetRequest) => {
    setIsEditDialogOpen(false);
    setEditingRequest(null);
    toast.success("Asset request updated successfully");
    if (refreshFunctionRef.current) {
      refreshFunctionRef.current();
    }
  }, []);

  const handleDeleteSuccess = useCallback((deletedId: number) => {
    setIsDeleteDialogOpen(false);
    setDeletingRequest(null);
    toast.success("Asset request deleted successfully");
    if (refreshFunctionRef.current) {
      refreshFunctionRef.current();
    }
  }, []);

  const handleEditRequest = useCallback((request: IAssetRequest) => {
    setEditingRequest(request);
    setIsEditDialogOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((request: IAssetRequest) => {
    setDeletingRequest(request);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleViewRequestDetails = useCallback((request: IAssetRequest) => {
    router.push(`/assests/asset-requests/${request.id}`);
  }, [router]);

  // Memoized fetch function for the API call
  const fetchFirstPage = useCallback(async () => {
    if (!selectedInstitution) throw new Error("No institution selected");

    try {
      return await assetsAPI.getPaginatedAssetRequests({
        institutionId: selectedInstitution.id,
        page: 1,
        search: isEmployeeView ? undefined : searchTerm || undefined,
        employeeId: employeeId,
        status: isEmployeeView
          ? undefined
          : statusFilter !== "all"
            ? statusFilter
            : undefined,
      });
    } catch (error: any) {
      if (
        error?.detail?.includes("has no profile") ||
        error?.message?.includes("has no profile") ||
        error?.response?.data?.detail?.includes("has no profile")
      ) {
        toast.error(
          "This employee's profile is incomplete. Please contact an administrator to complete the profile setup.",
        );
        return {
          results: [],
          count: 0,
          next: null,
          previous: null,
        };
      }
      throw error;
    }
  }, [selectedInstitution, isEmployeeView, searchTerm, employeeId, statusFilter]);

  // Memoized dependencies array
  const dependencies = useMemo(() => [
    selectedInstitution?.id,
    employeeId,
    isEmployeeView ? undefined : searchTerm,
    isEmployeeView ? undefined : statusFilter,
  ], [selectedInstitution?.id, employeeId, isEmployeeView, searchTerm, statusFilter]);

  // Memoized status badge component
  const StatusBadge = useCallback(({ status, isEmployeeView }: { status: string, isEmployeeView: boolean }) => (
    <div className="flex items-center space-x-2">
      {getStatusIcon(status)}
      <Badge
        className={`${getStatusColor(status)} ${isEmployeeView ? "text-xs px-2 py-0.5" : ""}`}
        variant={isEmployeeView ? "outline" : "default"}
      >
        {getStatusDisplay(status)}
      </Badge>
    </div>
  ), []);

  // Memoized stats calculation
  const calculateStats = useCallback((filteredResults: IAssetRequest[]) => {
    if (!Array.isArray(filteredResults)) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    
    return {
      total: filteredResults.length,
      pending: filteredResults.filter((r) => r.asset_request_status === "pending").length,
      approved: filteredResults.filter((r) => r.asset_request_status === "approved").length,
      rejected: filteredResults.filter((r) => r.asset_request_status === "rejected").length,
    };
  }, []);

  // Memoized filtering function
  const getFilteredResults = useCallback((results: IAssetRequest[]) => {
    if (isEmployeeView) return results;
    
    return results.filter((request) => {
      const matchesStatus =
        statusFilter === "all" || request.asset_request_status === statusFilter;
      return matchesStatus;
    });
  }, [isEmployeeView, statusFilter]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header - Employee View */}
      {showHeader && isEmployeeView && (
        <div className="flex justify-between items-center w-full mb-4">
          <h3 className="text-lg font-semibold text-[#162032]">Asset Requests</h3>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      )}

      {/* Header - Admin View */}
      {showHeader && !isEmployeeView && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Asset Requests</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage and track asset requests from employees
                </p>
              </div>
              {showCreateButton && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              )}
            </div>
          </div>

          {/* Filters - ONLY for Admin View */}
          <div className="p-6 border-b border-gray-200">
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
        </div>
      )}

      {/* Content */}
      <div className={isEmployeeView ? "" : "p-6 bg-white"}>
        <PaginatedTableWrapper<IAssetRequest>
          fetchFirstPage={fetchFirstPage}
          fetchFromUrl={assetsAPI.getPaginatedAssetRequestsFromUrl}
          deps={dependencies}
          className="space-y-4"
          footerClassName="pt-4"
        >
          {({data, loading, refresh}) => {
            // Store the refresh function in ref to avoid setState during render
            refreshFunctionRef.current = refresh;

            if (loading) {
              return <TableSkeleton rows={compact ? 5 : 10} columns={isEmployeeView ? 5 : 7} />;
            }

            if (!data || !Array.isArray(data.results) || data.results.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  {isEmployeeView
                    ? "No asset requests found for this employee"
                    : searchTerm
                      ? "No requests found matching your search criteria"
                      : "No asset requests found"}
                </div>
              );
            }

            // Apply filtering using the memoized function
            const filteredResults = getFilteredResults(data.results);

            if (filteredResults.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  No requests found matching the selected filters.
                </div>
              );
            }

            // Calculate stats using the memoized function
            const stats = calculateStats(filteredResults);

            return (
              <>
                {/* Summary Stats */}
                {showStats && (
                  <div
                    className={`grid gap-3 mb-4 ${isEmployeeView ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-4"}`}
                  >
                    <div
                      className={
                        isEmployeeView
                          ? "bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3"
                          : "bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                      }
                    >
                      <div
                        className={`mb-1 ${isEmployeeView ? "text-xs text-[#848496]" : "text-sm font-medium text-gray-600"}`}
                      >
                        Total
                      </div>
                      <div
                        className={`font-bold ${isEmployeeView ? "text-lg text-[#162032]" : "text-2xl text-gray-900"}`}
                      >
                        {stats.total}
                      </div>
                    </div>
                    <div
                      className={
                        isEmployeeView
                          ? "bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3"
                          : "bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                      }
                    >
                      <div
                        className={`mb-1 ${isEmployeeView ? "text-xs text-[#848496]" : "text-sm font-medium text-gray-600"}`}
                      >
                        Pending
                      </div>
                      <div
                        className={`font-bold ${isEmployeeView ? "text-lg text-yellow-600" : "text-2xl text-yellow-600"}`}
                      >
                        {stats.pending}
                      </div>
                    </div>
                    <div
                      className={
                        isEmployeeView
                          ? "bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3"
                          : "bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                      }
                    >
                      <div
                        className={`mb-1 ${isEmployeeView ? "text-xs text-[#848496]" : "text-sm font-medium text-gray-600"}`}
                      >
                        Approved
                      </div>
                      <div
                        className={`font-bold ${isEmployeeView ? "text-lg text-[#3cb371]" : "text-2xl text-green-600"}`}
                      >
                        {stats.approved}
                      </div>
                    </div>
                    <div
                      className={
                        isEmployeeView
                          ? "bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3"
                          : "bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                      }
                    >
                      <div
                        className={`mb-1 ${isEmployeeView ? "text-xs text-[#848496]" : "text-sm font-medium text-gray-600"}`}
                      >
                        Rejected
                      </div>
                      <div
                        className={`font-bold ${isEmployeeView ? "text-lg text-[#9ca3af]" : "text-2xl text-red-600"}`}
                      >
                        {stats.rejected}
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop Table */}
                <div className="hidden sm:block">
                  <div
                    className={
                      isEmployeeView
                        ? "bg-white rounded-lg overflow-hidden border border-[#e8e8f2]"
                        : ""
                    }
                  >
                    <Table className={isEmployeeView ? "[&_th]:border-0 [&_td]:border-0" : ""}>
                      <TableHeader>
                        <TableRow
                          className={isEmployeeView ? "bg-[#f7f7fb] hover:bg-[#f7f7fb]" : ""}
                        >
                          {!isEmployeeView && (
                            <TableHead className="w-12">
                              <input type="checkbox" className="rounded border-gray-300" />
                            </TableHead>
                          )}
                          <TableHead
                            className={
                              isEmployeeView ? "font-semibold text-[#162032] py-3 px-4 text-xs" : ""
                            }
                          >
                            Reference
                          </TableHead>
                          <TableHead
                            className={
                              isEmployeeView ? "font-semibold text-[#162032] py-3 px-4 text-xs" : ""
                            }
                          >
                            Asset
                          </TableHead>
                          {!isEmployeeView && <TableHead>Requester</TableHead>}
                          <TableHead
                            className={
                              isEmployeeView ? "font-semibold text-[#162032] py-3 px-4 text-xs" : ""
                            }
                          >
                            Status
                          </TableHead>
                          <TableHead
                            className={
                              isEmployeeView ? "font-semibold text-[#162032] py-3 px-4 text-xs" : ""
                            }
                          >
                            Created
                          </TableHead>
                          {!isEmployeeView && <TableHead className="w-12">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((request) => (
                          <TableRow
                            key={request.id}
                            className={isEmployeeView ? "hover:bg-[#f7f7fb]/50" : ""}
                          >
                            {!isEmployeeView && (
                              <TableCell>
                                <input type="checkbox" className="rounded border-gray-300" />
                              </TableCell>
                            )}
                            <TableCell
                              className={isEmployeeView ? "py-3 px-4" : "font-mono text-sm"}
                            >
                              <span
                                className={isEmployeeView ? "font-mono text-xs text-[#162032]" : ""}
                              >
                                {request.request_reference_code || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className={isEmployeeView ? "py-3 px-4" : "font-medium"}>
                              <span
                                className={
                                  isEmployeeView ? "font-medium text-[#162032] text-xs" : ""
                                }
                              >
                                {request.asset?.asset_name || "Unknown Asset"}
                              </span>
                            </TableCell>
                            {!isEmployeeView && (
                              <TableCell>
                                {request.requester?.user?.fullname || "Unknown User"}
                              </TableCell>
                            )}
                            <TableCell className={isEmployeeView ? "py-3 px-4" : ""}>
                              <StatusBadge status={request.asset_request_status} isEmployeeView={isEmployeeView} />
                            </TableCell>
                            <TableCell className={isEmployeeView ? "py-3 px-4" : ""}>
                              <span className={isEmployeeView ? "text-xs text-[#162032]" : ""}>
                                {formatDate(request.created_at)}
                              </span>
                            </TableCell>
                            {!isEmployeeView && (
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
                                    <DropdownMenuItem onClick={() => handleEditRequest(request)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteRequest(request)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-3">
                  {filteredResults.map((request) => (
                    <div
                      key={request.id}
                      className={
                        isEmployeeView
                          ? "bg-white rounded-lg p-4 border border-[#e8e8f2]"
                          : "bg-gray-50 rounded-lg p-4 border"
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <h3
                              className={`font-semibold ${isEmployeeView ? "text-[#162032] text-sm" : "text-gray-900"}`}
                            >
                              {request.asset?.asset_name || "Unknown Asset"}
                            </h3>
                          </div>
                          <div className="space-y-1 mb-2">
                            <p
                              className={`font-mono ${isEmployeeView ? "text-xs text-[#848496]" : "text-sm text-gray-600"}`}
                            >
                              Ref: {request.request_reference_code || 'N/A'}
                            </p>
                            {!isEmployeeView && (
                              <p className="text-sm text-gray-600">
                                Requester: {request.requester?.user?.fullname || "Unknown User"}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <StatusBadge status={request.asset_request_status} isEmployeeView={isEmployeeView} />
                              <span
                                className={`${isEmployeeView ? "text-xs text-[#848496]" : "text-sm text-gray-500"}`}
                              >
                                {isEmployeeView
                                  ? formatDate(request.created_at)
                                  : `Created: ${formatDate(request.created_at)}`}
                              </span>
                            </div>
                            {request.notes && (
                              <p
                                className={`mt-1 ${isEmployeeView ? "text-xs text-[#848496]" : "text-sm text-gray-600"}`}
                              >
                                {request.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        {!isEmployeeView && (
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
                              <DropdownMenuItem onClick={() => handleEditRequest(request)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteRequest(request)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          }}
        </PaginatedTableWrapper>
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

export default AssetRequests;