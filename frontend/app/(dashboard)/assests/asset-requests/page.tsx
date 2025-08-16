"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Plus,
  Eye,
  Package,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CreateAssetRequestDialog } from "@/components/asset-requests/create-asset-request-dialog";
import { EditAssetRequestDialog } from "@/components/asset-requests/edit-asset-request-dialog";
import { DeleteAssetRequestDialog } from "@/components/asset-requests/delete-asset-request-dialog";
import { useRouter } from "next/navigation";
import { assetsAPI } from "@/lib/utils";
import type { IAssetRequest } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";
import { Icon } from "@iconify/react";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

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
  const [assetRequests, setAssetRequests] = useState<IAssetRequest[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<IAssetRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<IAssetRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const selectedInstitution = useSelector(selectSelectedInstitution);

 
  // Fetch asset requests from API
  const fetchAssetRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await assetsAPI.getAssetRequests();
      setAssetRequests(response || []);
    } catch (error) {
      console.warn("Error fetching asset requests:", error);
      toast.error("Failed to load asset requests");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssetRequests();
  }, [fetchAssetRequests]);

  const handleCreateSuccess = (newRequest: IAssetRequest) => {
    setAssetRequests(prev => [newRequest, ...prev]);
    setIsCreateDialogOpen(false);
    toast.success("Asset request created successfully");
  };

  const handleUpdateSuccess = (updatedRequest: IAssetRequest) => {
    setAssetRequests(prev => 
      prev.map(request => 
        request.id === updatedRequest.id ? updatedRequest : request
      )
    );
    setIsEditDialogOpen(false);
    setEditingRequest(null);
    toast.success("Asset request updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setAssetRequests(prev => prev.filter(request => request.id !== deletedId));
    setIsDeleteDialogOpen(false);
    setDeletingRequest(null);
    toast.success("Asset request deleted successfully");
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
    router.push(`/assests/asset-requests/${request.id}`);
  };

  // Filtered and paginated data
  const filteredRequests = useMemo(() => {
    let filtered = assetRequests;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.asset?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.request_reference_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requester?.user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(request => request.asset_request_status === statusFilter);
    }

    return filtered;
  }, [assetRequests, searchTerm, statusFilter]);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const hasFilters = searchTerm || statusFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 ">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asset Requests</h1>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6">
          <div className="">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex justify-between">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] border-none shadow-none">
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
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary text-white rounded-[11px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Code</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          {hasFilters ? "No requests found matching your filters" : "No asset requests found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">
                            {request.request_reference_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {request.asset?.asset_name || 'Unknown Asset'}
                          </TableCell>
                          <TableCell>
                            {request.requester?.user.fullname || 'Unknown User'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(request.asset_request_status)}
                              <Badge className={getStatusColor(request.asset_request_status)}>
                                {getStatusDisplay(request.asset_request_status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Icon icon="hugeicons:more-horizontal-circle-01" className="!h-4 !w-4 text-dark" />
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
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {paginatedRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {hasFilters ? "No requests found matching your filters" : "No asset requests found"}
                  </div>
                ) : (
                  paginatedRequests.map((request) => (
                    <div key={request.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900">
                              {request.asset?.asset_name || 'Unknown Asset'}
                            </h3>
                          </div>
                          <div className="space-y-1 mb-2">
                            <p className="text-sm text-gray-600 font-mono">
                              Code: {request.request_reference_code}
                            </p>
                            <p className="text-sm text-gray-600">
                              Requester: {request.requester?.user.fullname || 'Unknown User'}
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
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredRequests.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredRequests.length)} of{" "}
                    {filteredRequests.length} requests
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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
