"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Package
} from 'lucide-react';
import {PERMISSION_CODES} from "@/constants";
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
import { CreateAssetDialog } from "@/components/assets/create-asset-dialog";
import { EditAssetDialog } from "@/components/assets/edit-asset-dialog";
import { DeleteAssetDialog } from "@/components/assets/delete-asset-dialog";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { useRouter } from "next/navigation";
import { assetsAPI } from "@/lib/utils";
import type { IAsset, IAssetCategory } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";
import { Icon } from "@iconify/react"
import ProtectedPage from "@/components/ProtectedPage";

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<IAsset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<IAsset | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetsCategories, setAssetsCategories] = useState<Array<IAssetCategory>>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const refreshTableRef = useRef<(() => void) | null>(null);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  const handleCreateSuccess = (newAsset: IAsset) => {
    toast.success("Asset created successfully");
    refreshTableRef.current?.();
  };

  const handleUpdateSuccess = (updatedAsset: IAsset) => {
    setIsEditDialogOpen(false);
    setEditingAsset(null);
    toast.success("Asset updated successfully");
    refreshTableRef.current?.();
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setIsDeleteDialogOpen(false);
    setDeletingAsset(null);
    toast.success("Asset deleted successfully");
    refreshTableRef.current?.();
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
    router.push(`/assets/assets/${asset.id}`);
  };


  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm min-h-screen">
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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {
                    assetsCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.category_name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ProtectedPage permissionCode={[
                      PERMISSION_CODES.CAN_CREATE_ASSETS
                    ]}><CreateAssetDialog
                  onSuccess={handleCreateSuccess}
                  disabled={!selectedInstitution?.id}
                /></ProtectedPage>

                
             
            </div>
          </div>
          
         
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<IAsset>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await assetsAPI.getPaginated({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={assetsAPI.getPaginatedFromUrl}
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
                return <TableSkeleton rows={10} columns={6} />;
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No assets found matching your search criteria" : "No assets found"}
                  </div>
                );
              }

              // Apply client-side filters (status and category filters)
              const filteredResults = data.results.filter((asset) => {
                const matchesCategory = categoryFilter === "all" || asset.category?.id === parseInt(categoryFilter);
                
                return matchesCategory;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No assets found matching the selected filters.
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
                          <TableHead>Batch No</TableHead>
                          <TableHead>Asset Name</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((asset) => (
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
                                  
                                  <ProtectedPage permissionCode={[
                                    PERMISSION_CODES.CAN_EDIT_ASSETS
                                  ]}><DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    </ProtectedPage>
                              
                              
                                    <ProtectedPage permissionCode={[
                                      PERMISSION_CODES.CAN_DELETE_ASSETS
                                    ]}><DropdownMenuItem 
                                        onClick={() => handleDeleteAsset(asset)}
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
                    {filteredResults.map((asset) => (
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
                              <ProtectedPage permissionCode={[
                                PERMISSION_CODES.CAN_CREATE_ASSETS
                              ]}><DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                </ProtectedPage>
                              
                              
                              <ProtectedPage permissionCode={[
                                PERMISSION_CODES.CAN_CREATE_ASSETS
                              ]}><DropdownMenuItem 
                                  onClick={() => handleDeleteAsset(asset)}
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
