"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
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
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { IAllowanceTypeFormData, IAllowanceType, IInstitution } from "@/app/types/types.utils";
import { createAllowanceType, getAllowanceTypes, updateAllowanceType, deleteAllowanceType } from "@/lib/utils";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getStatusColor = (status: boolean) => {
  return status
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const getTaxableColor = (isTaxable: boolean) => {
  return isTaxable
    ? "bg-red-100 text-red-800 border-red-200"
    : "bg-blue-100 text-blue-800 border-blue-200";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const AllowanceTypesComponent = () => {
  const [allowanceTypes, setAllowanceTypes] = useState<IAllowanceType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAllowanceType, setEditingAllowanceType] = useState<IAllowanceType | null>(null);
  const [deletingAllowanceType, setDeletingAllowanceType] = useState<IAllowanceType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_taxable: true,
    is_active: true,
  });

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      is_taxable: true,
      is_active: true,
    });
  };

  // Fetch allowance types
  const fetchAllowanceTypes = useCallback(
    async (showRefreshLoader = false) => {
      if (!selectedInstitution?.id) return;

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        const types = await getAllowanceTypes(selectedInstitution.id);
        setAllowanceTypes(types || []);
        if (!types || types.length === 0) {
          console.log("No allowance types found for this institution");
        }
      } catch (error) {
        console.error("Error fetching allowance types:", error);
        toast.error("Failed to load allowance types");
        setAllowanceTypes([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedInstitution?.id]
  );

  useEffect(() => {
    fetchAllowanceTypes();
  }, [fetchAllowanceTypes]);

  const handleAddAllowanceType = async () => {
    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedInstitution) {
      toast.error("Institution ID is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const allowanceTypeData: IAllowanceTypeFormData = {
        name: formData.name,
        description: formData.description,
        is_taxable: formData.is_taxable,
        is_active: formData.is_active,
      };

      const newAllowanceType = await createAllowanceType({
        institutionId: selectedInstitution.id,
        allowanceTypeData,
      });

      if (newAllowanceType) {
        setAllowanceTypes([newAllowanceType, ...allowanceTypes]);
        clearFilters()
        toast.success("Allowance type created successfully");
        resetFormData();
        setIsAddDialogOpen(false);
      } else {
        toast.error("Failed to create allowance type");
      }
    } catch (error: any) {
      console.error("Error creating allowance type:", error);
      toast.error(error.message || "An error occurred while creating the allowance type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAllowanceType = async () => {
    if (!editingAllowanceType) return;

    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const allowanceTypeData: Partial<IAllowanceTypeFormData> = {
        name: formData.name,
        description: formData.description,
        is_taxable: formData.is_taxable,
        is_active: formData.is_active,
      };

      const updatedAllowanceType = await updateAllowanceType({
        id: editingAllowanceType.id,
        allowanceTypeData,
      });

      if (updatedAllowanceType) {
        const updatedAllowanceTypes = allowanceTypes.map((allowanceType) =>
          allowanceType.id === editingAllowanceType.id ? updatedAllowanceType : allowanceType
        );
        setAllowanceTypes(updatedAllowanceTypes);
        clearFilters()
        toast.success("Allowance type updated successfully");
        resetFormData();
        setIsEditDialogOpen(false);
        setEditingAllowanceType(null);
      } else {
        toast.error("Failed to update allowance type");
      }
    } catch (error: any) {
      console.error("Error updating allowance type:", error);
      toast.error(error.message || "An error occurred while updating the allowance type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllowanceType = async () => {
    if (!deletingAllowanceType) return;

    setIsSubmitting(true);
    try {
      const success = await deleteAllowanceType(deletingAllowanceType.id);

      if (success) {
        setAllowanceTypes(allowanceTypes.filter((allowanceType) => allowanceType.id !== deletingAllowanceType.id));
        toast.success("Allowance type deleted successfully");
        setIsDeleteDialogOpen(false);
        setDeletingAllowanceType(null);
      } else {
        toast.error("Failed to delete allowance type");
      }
    } catch (error: any) {
      console.error("Error deleting allowance type:", error);
      toast.error(error.message || "An error occurred while deleting the allowance type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAllowanceType = (allowanceType: IAllowanceType) => {
    setEditingAllowanceType(allowanceType);
    setFormData({
      name: allowanceType.name,
      description: allowanceType.description,
      is_taxable: allowanceType.is_taxable,
      is_active: allowanceType.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchAllowanceTypes(true);
    setCurrentPage;
  };

  const filteredAllowanceTypes = useMemo(() => {
    return allowanceTypes.filter((allowanceType) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : allowanceType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          allowanceType.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && allowanceType.is_active) ||
        (statusFilter === "inactive" && !allowanceType.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [allowanceTypes, searchTerm, statusFilter]);

  const activeAllowanceTypes = useMemo(
    () => allowanceTypes.filter((at) => at.is_active),
    [allowanceTypes]
  );

  const taxableAllowanceTypes = useMemo(
    () => allowanceTypes.filter((at) => at.is_taxable),
    [allowanceTypes]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const paginatedAllowanceTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAllowanceTypes.slice(start, end);
  }, [filteredAllowanceTypes, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAllowanceTypes.length / pageSize);

  if (isLoading && !selectedInstitution?.id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Loading Institution Data</h3>
            <p className="text-gray-600">Please wait while we set up your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Allowance Types</h1>
          <p className="text-muted-foreground">
            Manage allowance types for {selectedInstitution?.institution_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2"
                disabled={!selectedInstitution?.id}
              >
                <Plus className="h-4 w-4" />
                Create Allowance Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
              <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
                <DialogTitle className="text-2xl font-bold text-gray-900">Add Allowance Type</DialogTitle>
                <DialogDescription className="text-gray-600 text-base">
                  Create a new allowance type to manage employee allowances efficiently.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-6 py-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm text-gray-800">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Housing Allowance, Transportation"
                    disabled={isSubmitting}
                    className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-800">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Provide a detailed description of this allowance type..."
                    disabled={isSubmitting}
                    className="rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base resize-none"
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="is_taxable"
                        checked={formData.is_taxable}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_taxable: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                      />
                      <Label htmlFor="is_taxable" className="text-sm font-medium text-gray-700">
                        Taxable Allowance
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                      />
                      <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                        Active Status
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAllowanceType}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Allowance Type"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search allowance types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 min-w-80">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full px-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rows per Page Selector */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[70px] h-8">
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
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{allowanceTypes.length}</div>
              <p className="text-xs text-muted-foreground">Total Allowance Types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{activeAllowanceTypes.length}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{taxableAllowanceTypes.length}</div>
              <p className="text-xs text-muted-foreground">Taxable</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Allowance Types Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredAllowanceTypes.length === 0 ? (
        <Card className="p-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No allowance types found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all"
              ? "No allowance types match your filter criteria."
              : "Get started by creating your first allowance type."}
          </p>
        </Card>
      ) : (
        <Card className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAllowanceTypes.map((allowanceType) => (
                <TableRow key={allowanceType.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full ${
                          allowanceType.is_active ? "bg-green-50" : "bg-gray-50"
                        } flex items-center justify-center`}
                      >
                        <Settings
                          className={`h-4 w-4 ${
                            allowanceType.is_active ? "text-green-600" : "text-gray-600"
                          }`}
                        />
                      </div>
                      <span>{allowanceType.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(allowanceType.is_active)}>
                      {allowanceType.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTaxableColor(allowanceType.is_taxable)}>
                      {allowanceType.is_taxable ? "Taxable" : "Non-taxable"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">
                      {allowanceType.description}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(allowanceType.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditAllowanceType(allowanceType)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingAllowanceType(allowanceType);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
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
        </Card>
      )}

      {/* Clear Filters Button */}
      {(searchTerm || statusFilter !== "all") && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            Clear Filters
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredAllowanceTypes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredAllowanceTypes.length)} of {filteredAllowanceTypes.length} allowance types
          {(searchTerm || statusFilter !== "all") && ` (filtered from ${allowanceTypes.length} total)`}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Select
            value={currentPage.toString()}
            onValueChange={(value) => handlePageChange(parseInt(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <SelectItem key={page} value={page.toString()}>
                  {page}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetFormData();
            setEditingAllowanceType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900">Edit Allowance Type</DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Make changes to the existing allowance type configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 py-6">
            <div className="space-y-3">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-800">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Housing Allowance, Transportation"
                disabled={isSubmitting}
                className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-800">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Provide a detailed description of this allowance type..."
                disabled={isSubmitting}
                className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base resize-none"
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="edit-is_taxable"
                    checked={formData.is_taxable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_taxable: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                    className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                  />
                  <Label htmlFor="edit-is_taxable" className="text-sm font-medium text-gray-700">
                    Taxable Allowance
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="edit-is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                    className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                  />
                  <Label htmlFor="edit-is_active" className="text-sm font-medium text-gray-700">
                    Active Status
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAllowanceType}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Allowance Type"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeletingAllowanceType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-4 pb-6">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">Delete Allowance Type</DialogTitle>
            <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{deletingAllowanceType?.name}"</span>? This action cannot be undone and will permanently remove this allowance type from your system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllowanceType}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllowanceTypesComponent;