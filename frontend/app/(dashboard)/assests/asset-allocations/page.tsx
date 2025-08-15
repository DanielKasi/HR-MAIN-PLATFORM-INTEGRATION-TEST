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
import { CreateAssetAllocationDialog } from "@/components/asset-allocations/create-asset-allocation-dialog";
import { EditAssetAllocationDialog } from "@/components/asset-allocations/edit-asset-allocation-dialog";
import { DeleteAssetAllocationDialog } from "@/components/asset-allocations/delete-asset-allocation-dialog";
import { useRouter } from "next/navigation";
import { assetsAPI } from "@/lib/utils";
import type { IAssetAllocation } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

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
    month: "short",
    day: "numeric",
  });
};

const AssetAllocationsComponent = () => {
  const router = useRouter();
  const isMobile = useMobile();
  const [assetAllocations, setAssetAllocations] = useState<IAssetAllocation[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<IAssetAllocation | null>(null);
  const [deletingAllocation, setDeletingAllocation] = useState<IAssetAllocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);


  console.log("AssetAllocationsComponent rendered", assetAllocations);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Fetch asset allocations from API
  const fetchAssetAllocations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await assetsAPI.getAssetAllocations();
      setAssetAllocations(response || []);
    } catch (error) {
      console.warn("Error fetching asset allocations:", error);
      toast.error("Failed to load asset allocations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssetAllocations();
  }, [fetchAssetAllocations]);

  const handleCreateSuccess = (newAllocation: IAssetAllocation) => {
    setAssetAllocations(prev => [newAllocation, ...prev]);
    setIsCreateDialogOpen(false);
    toast.success("Asset allocation created successfully");
  };

  const handleUpdateSuccess = (updatedAllocation: IAssetAllocation) => {
    setAssetAllocations(prev => 
      prev.map(allocation => 
        allocation.id === updatedAllocation.id ? updatedAllocation : allocation
      )
    );
    setIsEditDialogOpen(false);
    setEditingAllocation(null);
    toast.success("Asset allocation updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setAssetAllocations(prev => prev.filter(allocation => allocation.id !== deletedId));
    setIsDeleteDialogOpen(false);
    setDeletingAllocation(null);
    toast.success("Asset allocation deleted successfully");
  };

  const handleEditAllocation = (allocation: IAssetAllocation) => {
    setEditingAllocation(allocation);
    setIsEditDialogOpen(true);
  };

  const handleDeleteAllocation = (allocation: IAssetAllocation) => {
    setDeletingAllocation(allocation);
    setIsDeleteDialogOpen(true);
  };

  const handleViewAllocationDetails = (allocation: IAssetAllocation) => {
    router.push(`/assests/asset-allocations/${allocation.id}`);
  };

  // Filtered and paginated data
  const filteredAllocations = useMemo(() => {
    let filtered = assetAllocations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(allocation =>
        allocation.asset?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.alloc_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.allocated_to?.user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allocation.allocated_by?.user.fullname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(allocation => allocation.allocation_status === statusFilter);
    }

    return filtered;
  }, [assetAllocations, searchTerm, statusFilter]);

  const paginatedAllocations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAllocations.slice(startIndex, endIndex);
  }, [filteredAllocations, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAllocations.length / pageSize);

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
              <h1 className="text-3xl font-bold text-gray-900">Asset Allocations</h1>
            
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Allocation
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search allocations..."
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
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-full sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            )}
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
                      
                      <TableHead>Allocation Code</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Allocated To</TableHead>
                      <TableHead>Allocated By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAllocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {hasFilters ? "No allocations found matching your filters" : "No asset allocations found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAllocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                         
                          <TableCell className="font-mono text-sm">
                            {allocation.alloc_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {allocation.asset?.asset_name || 'Unknown Asset'}
                          </TableCell>
                          <TableCell>
                            {allocation.allocated_to?.user.fullname || 'Unknown User'}
                          </TableCell>
                          <TableCell>
                            {allocation.allocated_by?.user.fullname || 'Unknown User'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(allocation.allocation_status)}
                              <Badge className={getStatusColor(allocation.allocation_status)}>
                                {getStatusDisplay(allocation.allocation_status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(allocation.created_at)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewAllocationDetails(allocation)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAllocation(allocation)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAllocation(allocation)}
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
                {paginatedAllocations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {hasFilters ? "No allocations found matching your filters" : "No asset allocations found"}
                  </div>
                ) : (
                  paginatedAllocations.map((allocation) => (
                    <div key={allocation.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900">
                              {allocation.asset?.asset_name || 'Unknown Asset'}
                            </h3>
                          </div>
                          <div className="space-y-1 mb-2">
                            <p className="text-sm text-gray-600 font-mono">
                              Code: {allocation.alloc_code}
                            </p>
                            <p className="text-sm text-gray-600">
                              To: {allocation.allocated_to?.user.fullname || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-600">
                              By: {allocation.allocated_by?.user.fullname || 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(allocation.allocation_status)}
                                <Badge className={getStatusColor(allocation.allocation_status)}>
                                  {getStatusDisplay(allocation.allocation_status)}
                                </Badge>
                              </div>
                              <span className="text-sm text-gray-500">
                                Created: {formatDate(allocation.created_at)}
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
                            <DropdownMenuItem onClick={() => handleViewAllocationDetails(allocation)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditAllocation(allocation)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteAllocation(allocation)}
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
              {filteredAllocations.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredAllocations.length)} of{" "}
                    {filteredAllocations.length} allocations
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
      <CreateAssetAllocationDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {editingAllocation && (
        <EditAssetAllocationDialog
          allocation={editingAllocation}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingAllocation(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {deletingAllocation && (
        <DeleteAssetAllocationDialog
          allocation={deletingAllocation}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingAllocation(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default AssetAllocationsComponent;
