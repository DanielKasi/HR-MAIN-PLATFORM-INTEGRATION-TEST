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
  Eye,
  Package
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
import { CreateAssetDialog } from "@/components/assets/create-asset-dialog";
import { EditAssetDialog } from "@/components/assets/edit-asset-dialog";
import { DeleteAssetDialog } from "@/components/assets/delete-asset-dialog";
import { useRouter } from "next/navigation";
import { assetsAPI } from "@/lib/utils";
import type { IAsset } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";
import { Icon } from "@iconify/react"

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800 border-green-200";
    case "allocated":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "maintenance":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "decommissioned":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "available":
      return "Available";
    case "allocated":
      return "Allocated";
    case "maintenance":
      return "Under Maintenance";
    case "decommissioned":
      return "Decommissioned";
    default:
      return status;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const AssetsComponent = () => {
  const router = useRouter();
  const isMobile = useMobile();
  const [assets, setAssets] = useState<IAsset[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<IAsset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<IAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Fetch assets from API
  const fetchAssets = useCallback(async () => {
    if (!selectedInstitution?.id) return;

    try {
      setIsLoading(true);
      const data = await assetsAPI.getAll();
      console.log("data", data)
      setAssets(data);
    } catch (error) {
      console.warn("Error fetching assets:", error);
      toast.error("Failed to load assets");
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInstitution?.id]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleCreateSuccess = (newAsset: IAsset) => {
    setAssets([newAsset, ...assets]);
    clearFilters();
    toast.success("Asset created successfully");
  };

  const handleUpdateSuccess = (updatedAsset: IAsset) => {
    setAssets(assets.map(asset => 
      asset.id === updatedAsset.id ? updatedAsset : asset
    ));
    setIsEditDialogOpen(false);
    setEditingAsset(null);
    toast.success("Asset updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setAssets(assets.filter(asset => asset.id !== deletedId));
    setIsDeleteDialogOpen(false);
    setDeletingAsset(null);
    toast.success("Asset deleted successfully");
  };

  const handleEditAsset = (asset: IAsset) => {
    setEditingAsset(asset);
    setIsEditDialogOpen(true);
  };

  const handleDeleteAsset = (asset: IAsset) => {
    setDeletingAsset(asset);
    setIsDeleteDialogOpen(true);
  };

  const handleViewAssetDetails = (asset: IAsset) => {
    router.push(`/assests/assets/${asset.id}`);
  };

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const categories = assets.map(asset => 
      asset.category?.category_name || 'Unknown'
    );
    return [...new Set(categories)].filter(Boolean);
  }, [assets]);

  // Filtered and paginated data
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(asset => 
        asset.category?.category_name === categoryFilter
      );
    }

    return filtered;
  }, [assets, searchTerm, statusFilter, categoryFilter]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAssets.length / pageSize);

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
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  const hasFilters = searchTerm || statusFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Icon icon="hugeicons:search-01" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5" />
                <Input
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              
            </div>
            <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[110px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent> 
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              
            <div className="flex items-center gap-2">
              <CreateAssetDialog
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
                      <TableHead>Batch No</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {hasFilters ? "No assets found matching your filters" : "No assets found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-mono text-sm">{asset.batch_number}</TableCell>
                          <TableCell className="font-medium">{asset.asset_name}</TableCell>
                          <TableCell className="font-mono text-sm">{asset.serial_number}</TableCell>
                          <TableCell>
                            {asset.category?.category_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(asset.status)}>
                              {getStatusDisplay(asset.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Icon icon="hugeicons:more-horizontal-square-01" className="!h-4 !w-4 text-dark" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewAssetDetails(asset)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAsset(asset)}
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
                {paginatedAssets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {hasFilters ? "No assets found matching your filters" : "No assets found"}
                  </div>
                ) : (
                  paginatedAssets.map((asset) => (
                    <div key={asset.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900">{asset.asset_name}</h3>
                          </div>
                          <div className="space-y-1 mb-2">
                            <p className="text-sm text-gray-600 font-mono">
                              Serial: {asset.serial_number}
                            </p>
                            <p className="text-sm text-gray-600">
                              Category: {asset.category?.category_name || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(asset.status)}>
                                {getStatusDisplay(asset.status)}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Created: {formatDate(asset.created_at)}
                              </span>
                            </div>
                            {asset.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {asset.description}
                              </p>
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
                            <DropdownMenuItem onClick={() => handleViewAssetDetails(asset)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteAsset(asset)}
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
              {filteredAssets.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredAssets.length)} of{" "}
                    {filteredAssets.length} assets
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
      {editingAsset && (
        <EditAssetDialog
          asset={editingAsset}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingAsset(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {deletingAsset && (
        <DeleteAssetDialog
          asset={deletingAsset}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingAsset(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default AssetsComponent;

