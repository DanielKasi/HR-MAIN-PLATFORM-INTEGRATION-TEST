"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Plus,
  Settings,
  Eye
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
import { CreateTaxDialog } from "@/components/taxes/create-tax-dialog";
import { EditTaxDialog } from "@/components/taxes/edit-tax-dialog";
import { DeleteTaxDialog } from "@/components/taxes/delete-tax-dialog";
import { useRouter } from "next/navigation";
import { taxesAPI } from "@/lib/utils";
import type { ITax, ITaxFormData } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/helpers";

// Use backend types
export type { ITax, ITaxFormData } from "@/types/types.utils";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getStatusColor = (status: string) => {
  return status === "active"
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};



const TaxesComponent = () => {
  const router = useRouter();
  const isMobile = useMobile();
  const [taxes, setTaxes] = useState<ITax[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<ITax | null>(null);
  const [deletingTax, setDeletingTax] = useState<ITax | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Fetch taxes from API
  const fetchTaxes = useCallback(
    async (showRefreshLoader = false) => {
      if (!selectedInstitution?.id) return;

      try {
      
        
        // Use actual API call
        const data = await taxesAPI.getAll();
        console.log("data", data)
        setTaxes(data);
      } catch (error) {
        console.warn("Error fetching taxes:", error);
        toast.error("Failed to load taxes");
        setTaxes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedInstitution],
  );

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleCreateSuccess = (newTax: ITax) => {
    setTaxes([newTax, ...taxes]);
    clearFilters();
  };

  const handleUpdateSuccess = (updatedTax: ITax) => {
    setTaxes(taxes.map(tax => tax.id === updatedTax.id ? updatedTax : tax));
    setIsEditDialogOpen(false);
    setEditingTax(null);
    toast.success("Tax updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setTaxes(taxes.filter(tax => tax.id !== deletedId));
    setIsDeleteDialogOpen(false);
    setDeletingTax(null);
    toast.success("Tax deleted successfully");
  };

  const handleEditTax = (tax: ITax) => {
    setEditingTax(tax);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTax = (tax: ITax) => {
    setDeletingTax(tax);
    setIsDeleteDialogOpen(true);
  };

  const handleViewTaxDetails = (tax: ITax) => {
    router.push(`/admin/taxes/${tax.id}/detail`);
  };

  const handleRefresh = () => {
    fetchTaxes(true);
  };

  // Filtered and paginated data
  const filteredTaxes = useMemo(() => {
    let filtered = taxes;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tax =>
        tax.tax_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(tax => 
        statusFilter === "active" ? tax.tax_status : !tax.tax_status
      );
    }

    return filtered;
  }, [taxes, searchTerm, statusFilter]);

  const paginatedTaxes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTaxes.slice(startIndex, endIndex);
  }, [filteredTaxes, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTaxes.length / pageSize);

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
      

      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Taxes</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search taxes..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CreateTaxDialog
                institutionId={selectedInstitution?.id || 0}
                onSuccess={handleCreateSuccess}
                disabled={!selectedInstitution?.id}
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTaxes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {hasFilters ? "No taxes found matching your filters" : "No taxes found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTaxes.map((tax) => (
                        <TableRow key={tax.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{tax.tax_name}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(tax.tax_status ? "active" : "inactive")}>
                              {tax.tax_status ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(tax.created_at)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewTaxDetails(tax)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditTax(tax)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteTax(tax)}
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
                {paginatedTaxes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {hasFilters ? "No taxes found matching your filters" : "No taxes found"}
                  </div>
                ) : (
                  paginatedTaxes.map((tax) => (
                    <div key={tax.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{tax.tax_name}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(tax.tax_status ? "active" : "inactive")}>
                              {tax.tax_status ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Created: {formatDate(tax.created_at)}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTaxDetails(tax)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTax(tax)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTax(tax)}
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
              {filteredTaxes.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredTaxes.length)} of{" "}
                    {filteredTaxes.length} taxes
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
      {editingTax && (
        <EditTaxDialog
          tax={editingTax}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingTax(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {deletingTax && (
        <DeleteTaxDialog
          tax={deletingTax}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingTax(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default TaxesComponent; 