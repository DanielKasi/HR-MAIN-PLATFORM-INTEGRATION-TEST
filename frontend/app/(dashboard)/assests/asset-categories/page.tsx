"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Search, 
  Plus,
  Eye,
  X
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
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { useRouter } from "next/navigation";
import { assetCategoriesAPI, assetsAPI } from "@/lib/utils";
import type { IAssetCategory, IAsset } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";

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
  const [assets, setAssets] = useState<IAsset[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAssetCategory, setEditingAssetCategory] = useState<IAssetCategory | null>(null);
  const [deletingAssetCategory, setDeletingAssetCategory] = useState<IAssetCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Fetch assets from API for counting
  const fetchAssets = useCallback(async () => {
    if (!selectedInstitution?.id) return;

    try {
      const data = await assetsAPI.getAll();
      setAssets(data);
    } catch (error) {
      console.warn("Error fetching assets:", error);
      setAssets([]);
    }
  }, [selectedInstitution?.id]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Calculate asset count for each category
  const getAssetCount = useCallback((categoryId: number) => {
    return assets.filter(asset => asset.category?.id === categoryId).length;
  }, [assets]);

  const handleCreateSuccess = (newAssetCategory: IAssetCategory) => {
    toast.success("Asset category created successfully");
  };

  const handleUpdateSuccess = (updatedAssetCategory: IAssetCategory) => {
    setIsEditDialogOpen(false);
    setEditingAssetCategory(null);
    toast.success("Asset category updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setIsDeleteDialogOpen(false);
    setDeletingAssetCategory(null);
    toast.success("Asset category deleted successfully");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
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
            <div className="flex sm:flex-row sm:items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search asset categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
           
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] border-none shadow-none">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            <div className="flex items-center gap-2">
              <CreateAssetCategoryDialog
                onSuccess={handleCreateSuccess}
                disabled={!selectedInstitution?.id}
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<IAssetCategory>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await assetCategoriesAPI.getPaginated({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={assetCategoriesAPI.getPaginatedFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              if (loading) {
                return <TableSkeleton rows={10} columns={5} />;
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No asset categories found matching your search criteria" : "No asset categories found"}
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data.results.filter((category) => {
                const matchesStatus = statusFilter === "all" || 
                  (statusFilter === "active" && category.is_active) ||
                  (statusFilter === "inactive" && !category.is_active);
                
                return matchesStatus;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No asset categories found matching the selected status filter.
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category Name</TableHead>
                          <TableHead className="text-center">Asset Count</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.category_name}</TableCell>
                            <TableCell className="text-center">
                              <span className="font-medium text-gray-900">
                                {getAssetCount(category.id)} Asset{getAssetCount(category.id) !== 1 ? '(s)' : ''}
                              </span>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-3">
                    {filteredResults.map((category) => (
                      <div key={category.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">{category.category_name}</h3>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-900 bg-white px-3 py-1 rounded-full border">
                                {getAssetCount(category.id)} Asset{getAssetCount(category.id) !== 1 ? '(s)' : ''}
                              </span>
                              <Badge className={getStatusColor(category.is_active)}>
                                {category.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Created: {formatDate(category.created_at)}
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
                    ))}
                  </div>
                </>
              );
            }}
          </PaginatedTableWrapper>
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
