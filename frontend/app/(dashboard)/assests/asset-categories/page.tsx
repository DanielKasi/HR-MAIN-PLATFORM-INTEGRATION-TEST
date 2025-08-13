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
import { CreateAssetCategoryDialog } from "@/components/asset-categories/create-asset-category-dialog";
import { EditAssetCategoryDialog } from "@/components/asset-categories/edit-asset-category-dialog";
import { DeleteAssetCategoryDialog } from "@/components/asset-categories/delete-asset-category-dialog";
import { useRouter } from "next/navigation";
import { assetCategoriesAPI } from "@/lib/utils";
import type { IAssetCategory } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getStatusColor = (status: boolean) => {
  return status
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

const AssetCategoriesComponent = () => {
  const router = useRouter();
  const isMobile = useMobile();
  const [assetCategories, setAssetCategories] = useState<IAssetCategory[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAssetCategory, setEditingAssetCategory] = useState<IAssetCategory | null>(null);
  const [deletingAssetCategory, setDeletingAssetCategory] = useState<IAssetCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Fetch asset categories from API
  const fetchAssetCategories = useCallback(async () => {
    if (!selectedInstitution?.id) return;

    try {
      setIsLoading(true);
      const data = await assetCategoriesAPI.getAll();
      setAssetCategories(data);
    } catch (error) {
      console.warn("Error fetching asset categories:", error);
      toast.error("Failed to load asset categories");
      setAssetCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInstitution?.id]);

  useEffect(() => {
    fetchAssetCategories();
  }, [fetchAssetCategories]);

  const handleCreateSuccess = (newAssetCategory: IAssetCategory) => {
    setAssetCategories([newAssetCategory, ...assetCategories]);
    clearFilters();
    toast.success("Asset category created successfully");
  };

  const handleUpdateSuccess = (updatedAssetCategory: IAssetCategory) => {
    setAssetCategories(assetCategories.map(category => 
      category.id === updatedAssetCategory.id ? updatedAssetCategory : category
    ));
    setIsEditDialogOpen(false);
    setEditingAssetCategory(null);
    toast.success("Asset category updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setAssetCategories(assetCategories.filter(category => category.id !== deletedId));
    setIsDeleteDialogOpen(false);
    setDeletingAssetCategory(null);
    toast.success("Asset category deleted successfully");
  };

  const handleEditAssetCategory = (assetCategory: IAssetCategory) => {
    setEditingAssetCategory(assetCategory);
    setIsEditDialogOpen(true);
  };

  const handleDeleteAssetCategory = (assetCategory: IAssetCategory) => {
    setDeletingAssetCategory(assetCategory);
    setIsDeleteDialogOpen(true);
  };

  const handleViewAssetCategoryDetails = (assetCategory: IAssetCategory) => {
    // Navigate to asset category detail page (if needed)
    // router.push(`/assests/asset-categories/${assetCategory.id}/detail`);
    toast.info("Asset category detail view not implemented yet");
  };

  // Filtered and paginated data
  const filteredAssetCategories = useMemo(() => {
    let filtered = assetCategories;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.category_description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(category => 
        statusFilter === "active" ? category.is_active : !category.is_active
      );
    }

    return filtered;
  }, [assetCategories, searchTerm, statusFilter]);

  const paginatedAssetCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAssetCategories.slice(startIndex, endIndex);
  }, [filteredAssetCategories, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAssetCategories.length / pageSize);

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
      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asset Categories</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search asset categories..."
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
              <CreateAssetCategoryDialog
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
                      
                      <TableHead>Category Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssetCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {hasFilters ? "No asset categories found matching your filters" : "No asset categories found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssetCategories.map((category) => (
                        <TableRow key={category.id}>
                          
                          <TableCell className="font-medium">{category.category_name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {category.category_description || "No description"}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(category.is_active)}>
                              {category.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(category.created_at)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewAssetCategoryDetails(category)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAssetCategory(category)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAssetCategory(category)}
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
                {paginatedAssetCategories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {hasFilters ? "No asset categories found matching your filters" : "No asset categories found"}
                  </div>
                ) : (
                  paginatedAssetCategories.map((category) => (
                    <div key={category.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{category.category_name}</h3>
                          <div className="space-y-1 mb-2">
                            <p className="text-sm text-gray-600">
                              {category.category_description || "No description"}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(category.is_active)}>
                                {category.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Created: {formatDate(category.created_at)}
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
                            <DropdownMenuItem onClick={() => handleViewAssetCategoryDetails(category)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditAssetCategory(category)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteAssetCategory(category)}
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
              {filteredAssetCategories.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredAssetCategories.length)} of{" "}
                    {filteredAssetCategories.length} asset categories
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
      {editingAssetCategory && (
        <EditAssetCategoryDialog
          assetCategory={editingAssetCategory}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingAssetCategory(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {deletingAssetCategory && (
        <DeleteAssetCategoryDialog
          assetCategory={deletingAssetCategory}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingAssetCategory(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default AssetCategoriesComponent;
