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
  Users,
  RotateCcw
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
import { CreateAssetReturnDialog } from "@/components/asset-returns/create-asset-return-dialog";
import { EditAssetReturnDialog } from "@/components/asset-returns/edit-asset-return-dialog";
import { DeleteAssetReturnDialog } from "@/components/asset-returns/delete-asset-return-dialog";
import { useRouter } from "next/navigation";
import { assetsAPI } from "@/lib/utils";
import type { IAssetReturn } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getConditionColor = (condition: string) => {
  switch (condition) {
    case "good":
      return "bg-green-100 text-green-800 border-green-200";
    case "damaged":
      return "bg-red-100 text-red-800 border-red-200";
    case "lost":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getConditionDisplay = (condition: string) => {
  switch (condition) {
    case "good":
      return "Good";
    case "damaged":
      return "Damaged";
    case "lost":
      return "Lost";
    default:
      return condition;
  }
};

const getConditionIcon = (condition: string) => {
  switch (condition) {
    case "good":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "damaged":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "lost":
      return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const AssetReturnsComponent = () => {
  const router = useRouter();
  const isMobile = useMobile();
  const [assetReturns, setAssetReturns] = useState<IAssetReturn[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAssetReturn, setEditingAssetReturn] = useState<IAssetReturn | null>(null);
  const [deletingAssetReturn, setDeletingAssetReturn] = useState<IAssetReturn | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  console.log("Asset Returns Component Rendered", assetReturns);

  // Fetch asset returns from API
  const fetchAssetReturns = useCallback(async () => {
    if (!selectedInstitution) return;
    
    setIsLoading(true);
    try {
      const data = await assetsAPI.getAssetReturns();
      setAssetReturns(data);
    } catch (error) {
      console.warn("Error fetching asset returns:", error);
      toast.error("Failed to fetch asset returns");
    } finally {
      setIsLoading(false);
    }
  }, [selectedInstitution]);

  useEffect(() => {
    fetchAssetReturns();
  }, [fetchAssetReturns]);

  // Filter and search asset returns
  const filteredAssetReturns = useMemo(() => {
    let filtered = assetReturns;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (assetReturn) =>
          assetReturn.asset?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assetReturn.asset?.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assetReturn.asset?.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assetReturn.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply condition filter
    if (conditionFilter !== "all") {
      filtered = filtered.filter((assetReturn) => assetReturn.condition === conditionFilter);
    }

    return filtered;
  }, [assetReturns, searchTerm, conditionFilter]);

  // Pagination
  const totalItems = filteredAssetReturns.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssetReturns = filteredAssetReturns.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleEdit = (assetReturn: IAssetReturn) => {
    setEditingAssetReturn(assetReturn);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (assetReturn: IAssetReturn) => {
    setDeletingAssetReturn(assetReturn);
    setIsDeleteDialogOpen(true);
  };

  const handleView = (assetReturn: IAssetReturn) => {
    router.push(`/assests/asset-returns/${assetReturn.id}`);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingAssetReturn(null);
    fetchAssetReturns();
    toast.success("Asset return updated successfully");
  };

  const handleDeleteSuccess = () => {
    setIsDeleteDialogOpen(false);
    setDeletingAssetReturn(null);
    fetchAssetReturns();
    toast.success("Asset return deleted successfully");
  };

  const handleCreateSuccess = () => {
    fetchAssetReturns();
    toast.success("Asset return created successfully");
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 overflow-x-hidden w-full max-w-full">
      <div className="mx-auto space-y-4 lg:space-y-6 w-full">
        {/* Header */}
        <div className="space-y-3 lg:space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-4 w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="shadow-sm bg-transparent rounded-full w-8 h-8 sm:w-9 sm:h-9 p-0 flex items-center justify-center flex-shrink-0"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Asset Returns</h1>
            </div>

            {/* Create Asset Return Button */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center min-w-0">
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Return Asset
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search asset returns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-w-0">
                <SelectValue placeholder="Filter by condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Asset Returns Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Asset</TableHead>
                  <TableHead className="min-w-[100px]">Serial Number</TableHead>
                  <TableHead className="min-w-[100px]">Batch Number</TableHead>
                  <TableHead className="min-w-[100px]">Condition</TableHead>
                  <TableHead className="min-w-[120px]">Return Date</TableHead>
                  <TableHead className="min-w-[100px]">Notes</TableHead>
                  <TableHead className="min-w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssetReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <RotateCcw className="h-8 w-8 opacity-50" />
                        <p>No asset returns found</p>
                        {searchTerm || conditionFilter !== "all" ? (
                          <p className="text-sm">Try adjusting your search or filters</p>
                        ) : (
                          <p className="text-sm">Create your first asset return</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAssetReturns.map((assetReturn) => (
                    <TableRow key={assetReturn.id}>
                      <TableCell className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{assetReturn.asset?.asset_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {assetReturn.asset?.category?.category_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <span className="font-mono text-sm">{assetReturn.asset?.serial_number}</span>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <span className="font-mono text-sm">{assetReturn.asset?.batch_number}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getConditionColor(assetReturn.condition)} flex items-center gap-1`}>
                          {getConditionIcon(assetReturn.condition)}
                          {getConditionDisplay(assetReturn.condition)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(assetReturn.created_at)}</span>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {assetReturn.notes || "No notes"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(assetReturn)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(assetReturn)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(assetReturn)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} results
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(value: string) => handlePageSizeChange(Number(value))}>
                <SelectTrigger className="w-[80px]">
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
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dialogs */}
        {editingAssetReturn && (
          <EditAssetReturnDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            assetReturn={editingAssetReturn}
            onSuccess={handleEditSuccess}
          />
        )}

        {deletingAssetReturn && (
          <DeleteAssetReturnDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            assetReturn={deletingAssetReturn}
            onSuccess={handleDeleteSuccess}
          />
        )}

        <CreateAssetReturnDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </div>
  );
};

export default AssetReturnsComponent;
