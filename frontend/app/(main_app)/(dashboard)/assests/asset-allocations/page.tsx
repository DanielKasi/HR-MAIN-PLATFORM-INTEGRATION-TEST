"use client";

import { useState, useRef, useEffect } from "react";
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
  Users
} from 'lucide-react';
import { PERMISSION_CODES } from "@/types/types.utils";
import { hasPermission } from "@/lib/helpers";
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
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { useRouter } from "next/navigation";
import { assetsAPI } from "@/lib/utils";
import type { IAssetAllocation } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";
import { Icon } from "@iconify/react";
import ProtectedPage from "@/components/ProtectedPage";



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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<IAssetAllocation | null>(null);
  const [deletingAllocation, setDeletingAllocation] = useState<IAssetAllocation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const refreshTableRef = useRef<(() => void) | null>(null);





  const selectedInstitution = useSelector(selectSelectedInstitution);

  const handleCreateSuccess = (newAllocation: IAssetAllocation) => {
    setIsCreateDialogOpen(false);
    toast.success("Asset allocation created successfully");
    refreshTableRef.current?.();
  };

  const handleUpdateSuccess = (updatedAllocation: IAssetAllocation) => {
    setIsEditDialogOpen(false);
    setEditingAllocation(null);
    toast.success("Asset allocation updated successfully");
    refreshTableRef.current?.();
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setIsDeleteDialogOpen(false);
    setDeletingAllocation(null);
    toast.success("Asset allocation deleted successfully");
    refreshTableRef.current?.();
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
    router.push(`/assets/asset-allocations/${allocation.id}`);
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
        <div className="p-6 ">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asset Allocations</h1>
            
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
                  placeholder="Search allocations..."
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
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
             
              <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_ALLOCATE_ASSETS]}>
                 <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-primary text-white rounded-[11px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Allocation
                </Button>
              </ProtectedPage>
              
            </div>
            
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <PaginatedTableWrapper<IAssetAllocation>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await assetsAPI.getPaginatedAssetAllocations({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={assetsAPI.getPaginatedAssetAllocationsFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              useEffect(() => {
                refreshTableRef.current = refresh;
              }, [refresh]);
              if (loading) {
                return <TableSkeleton rows={10} columns={6} />;
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No allocations found matching your search criteria" : "No asset allocations found"}
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data.results.filter((allocation) => {
                const matchesStatus = statusFilter === "all" || allocation.allocation_status === statusFilter;
                return matchesStatus;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No allocations found matching the selected status filter.
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
                          <TableHead>Allocation Code</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead>Allocated To</TableHead>
                          <TableHead>Allocated By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((allocation) => (
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
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Icon icon="hugeicons:more-horizontal-circle-01" className="!h-4 !w-4 text-dark" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewAllocationDetails(allocation)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                               
                                  <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_EDIT_ASSET_ALLOCATIONS]}>
                                    <DropdownMenuItem onClick={() => handleEditAllocation(allocation)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </ProtectedPage>
                              
                                  <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_DELETE_ASSET_ALLOCATIONS]}>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteAllocation(allocation)}
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
                    {filteredResults.map((allocation) => (
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
                              <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_EDIT_ASSET_ALLOCATIONS]}>
                                    <DropdownMenuItem onClick={() => handleEditAllocation(allocation)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </ProtectedPage>
                              
                                <ProtectedPage permissionCode={[PERMISSION_CODES.CAN_DELETE_ASSET_ALLOCATIONS]}>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteAllocation(allocation)}
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