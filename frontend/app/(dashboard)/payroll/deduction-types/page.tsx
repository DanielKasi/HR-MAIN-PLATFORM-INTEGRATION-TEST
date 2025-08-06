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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { IDeductionTypeFormData, IDeductionType, IInstitution } from "@/app/types/types.utils";
import { createDeductionType, getDeductionTypes, updateDeductionType, deleteDeductionType } from "@/lib/utils";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types";
import { TableSkeleton } from "@/components/common/table-skeleton";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getStatusColor = (status: boolean) => {
  return status
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const getMandatoryColor = (isMandatory: boolean) => {
  return isMandatory
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

const DeductionTypesComponent = () => {
  const [deductionTypes, setDeductionTypes] = useState<IDeductionType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDeductionType, setEditingDeductionType] = useState<IDeductionType | null>(null);
  const [deletingDeductionType, setDeletingDeductionType] = useState<IDeductionType | null>(null);
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
    is_mandatory: false,
    is_active: true,
  });

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      is_mandatory: false,
      is_active: true,
    });
  };

  // Fetch deduction types
  const fetchDeductionTypes = useCallback(
    async (showRefreshLoader = false) => {
      if (!selectedInstitution?.id) return;

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        const types = await getDeductionTypes(selectedInstitution.id);
        setDeductionTypes(types || []);
        if (!types || types.length === 0) {
          console.log("No deduction types found for this institution");
        }
      } catch (error) {
        console.error("Error fetching deduction types:", error);
        toast.error("Failed to load deduction types");
        setDeductionTypes([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedInstitution?.id]
  );

  useEffect(() => {
    fetchDeductionTypes();
  }, [fetchDeductionTypes]);

  const handleAddDeductionType = async () => {
    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const deductionTypeData: IDeductionTypeFormData = {
        name: formData.name,
        description: formData.description,
        is_mandatory: formData.is_mandatory,
        is_active: formData.is_active,
      };

      const newDeductionType = await createDeductionType({
        institutionId: selectedInstitution.id,
        deductionTypeData,
      });

      if (newDeductionType) {
        setDeductionTypes([newDeductionType, ...deductionTypes]);
        clearFilters()
        toast.success("Deduction type created successfully");
        resetFormData();
        setIsAddDialogOpen(false);
      } else {
        toast.error("Failed to create deduction type");
      }
    } catch (error: any) {
      console.error("Error creating deduction type:", error);
      toast.error(error.message || "An error occurred while creating the deduction type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDeductionType = async () => {
    if (!editingDeductionType) return;

    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const deductionTypeData: Partial<IDeductionTypeFormData> = {
        name: formData.name,
        description: formData.description,
        is_mandatory: formData.is_mandatory,
        is_active: formData.is_active,
      };

      const updatedDeductionType = await updateDeductionType({
        id: editingDeductionType.id,
        deductionTypeData,
      });

      if (updatedDeductionType) {
        const updatedDeductionTypes = deductionTypes.map((deductionType) =>
          deductionType.id === editingDeductionType.id ? updatedDeductionType : deductionType
        );
        setDeductionTypes(updatedDeductionTypes);
        clearFilters()
        toast.success("Deduction type updated successfully");
        resetFormData();
        setIsEditDialogOpen(false);
        setEditingDeductionType(null);
      } else {
        toast.error("Failed to update deduction type");
      }
    } catch (error: any) {
      console.error("Error updating deduction type:", error);
      toast.error(error.message || "An error occurred while updating the deduction type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDeductionType = async () => {
    if (!deletingDeductionType) return;

    setIsSubmitting(true);
    try {
      const success = await deleteDeductionType(deletingDeductionType.id);

      if (success) {
        setDeductionTypes(deductionTypes.filter((deductionType) => deductionType.id !== deletingDeductionType.id));
        toast.success("Deduction type deleted successfully");
        setIsDeleteDialogOpen(false);
        setDeletingDeductionType(null);
      } else {
        toast.error("Failed to delete deduction type");
      }
    } catch (error: any) {
      console.error("Error deleting deduction type:", error);
      toast.error(error.message || "An error occurred while deleting the deduction type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDeductionType = (deductionType: IDeductionType) => {
    setEditingDeductionType(deductionType);
    setFormData({
      name: deductionType.name,
      description: deductionType.description,
      is_mandatory: deductionType.is_mandatory,
      is_active: deductionType.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchDeductionTypes(true);
    setCurrentPage(1);
  };

  const filteredDeductionTypes = useMemo(() => {
    return deductionTypes.filter((deductionType) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : deductionType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deductionType.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && deductionType.is_active) ||
        (statusFilter === "inactive" && !deductionType.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [deductionTypes, searchTerm, statusFilter]);

  const activeDeductionTypes = useMemo(
    () => deductionTypes.filter((dt) => dt.is_active),
    [deductionTypes]
  );

  const mandatoryDeductionTypes = useMemo(
    () => deductionTypes.filter((dt) => dt.is_mandatory),
    [deductionTypes]
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

  const paginatedDeductionTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredDeductionTypes.slice(start, end);
  }, [filteredDeductionTypes, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredDeductionTypes.length / pageSize);

 
    if (isLoading) {
      return (
        <div className="p-2 space-y-6">
          <Card className="h-[calc(100vh-2rem)] shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between gap-8 items-center">
                <div className="flex items-center justify-start gap-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardHeader>
            <TableSkeleton rows={10} columns={8} />
          </Card>
        </div>
      )
    }
  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Deduction Types</h1>
          <p className="text-muted-foreground">
            Manage deduction types for {selectedInstitution?.institution_name}
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
                Create Deduction Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
              <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
                <DialogTitle className="text-2xl font-bold text-gray-900">Add Deduction Type</DialogTitle>
                <DialogDescription className="text-gray-600 text-base">
                  Create a new deduction type to manage employee deductions efficiently.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-6 py-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-800">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Income Tax, Health Insurance"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-gray-200 focus:border-500 focus:ring-500/20 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-800">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Provide a detailed description of this deduction type..."
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
                        id="is_mandatory"
                        checked={formData.is_mandatory}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_mandatory: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                      />
                      <Label htmlFor="is_mandatory" className="text-sm font-medium text-gray-700">
                        Mandatory Deduction
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
                  onClick={handleAddDeductionType}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Deduction Type"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

           {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{deductionTypes.length}</div>
              <p className="text-xs text-muted-foreground">Total Deduction Types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{activeDeductionTypes.length}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{mandatoryDeductionTypes.length}</div>
              <p className="text-xs text-muted-foreground">Mandatory</p>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Search and Filters */}
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-20 pt-12">

  
  {/* Search Bar */}
  <div className="relative w-[32rem]">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <Input
      placeholder="Search deduction types..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>

  {/* Filters Group (Status Filter + Rows per Page side by side) */}
  <div className="flex items-center gap-10 min-w-[20rem] pl-20">
    
    {/* Status Filter */}
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-full px-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-12" />
          <SelectValue placeholder="Filter by status" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>

    {/* Rows per Page Selector */}
      <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
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
</div>

 
      {/* Deduction Types Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredDeductionTypes.length === 0 ? (
        <div className="p-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No deduction types found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all"
              ? "No deduction types match your filter criteria."
              : "Get started by creating your first deduction type."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
              <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDeductionTypes.map((deductionType) => (
                <TableRow key={deductionType.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span>{deductionType.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(deductionType.is_active)}>
                      {deductionType.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMandatoryColor(deductionType.is_mandatory)}>
                      {deductionType.is_mandatory ? "Mandatory" : "Optional"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">
                      {deductionType.description}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(deductionType.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditDeductionType(deductionType)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingDeductionType(deductionType);
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
        </div>
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
          Showing {filteredDeductionTypes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredDeductionTypes.length)} of {filteredDeductionTypes.length} deduction types
          {(searchTerm || statusFilter !== "all") && ` (filtered from ${deductionTypes.length} total)`}
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
            setEditingDeductionType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900">Edit Deduction Type</DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Make changes to the existing deduction type configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 py-6">
            <div className="space-y-3">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-800">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Income Tax, Health Insurance"
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
                placeholder="Provide a detailed description of this deduction type..."
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
                    id="edit-is_mandatory"
                    checked={formData.is_mandatory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_mandatory: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                    className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                  />
                  <Label htmlFor="edit-is_mandatory" className="text-sm font-medium text-gray-700">
                    Mandatory Deduction
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
              onClick={handleUpdateDeductionType}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Deduction Type"
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
            setDeletingDeductionType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-4 pb-6">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">Delete Deduction Type</DialogTitle>
            <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{deletingDeductionType?.name}"</span>? This action cannot be undone and will permanently remove this deduction type from your system.
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
              onClick={handleDeleteDeductionType}
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

export default DeductionTypesComponent;