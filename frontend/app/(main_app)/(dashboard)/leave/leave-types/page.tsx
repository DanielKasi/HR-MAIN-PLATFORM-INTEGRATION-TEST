"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  Filter,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ILeaveType, ILeaveTypeFormData } from "@/types/types.utils";
import { LeaveTypesAPI } from "@/lib/utils";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import type { IUserInstitution } from "@/types";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { Icon } from "@iconify/react";


const LEAVE_CATEGORIES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "compassionate", label: "Compassionate Leave" },
  { value: "study", label: "Study Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

const GENDER_CHOICES = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const getStatusColor = (status: boolean) => {
  return status
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const getCarryForwardColor = (carryForward: boolean) => {
  return carryForward
    ? "bg-blue-100 text-blue-800 border-blue-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const getRequiresDocumentColor = (requiresDocument: boolean) => {
  return requiresDocument
    ? "bg-orange-100 text-orange-800 border-orange-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};



const LeaveTypesPage = () => {

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<ILeaveType | null>(null);
  const [deletingLeaveType, setDeletingLeaveType] = useState<ILeaveType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const refreshTableRef = useRef<(() => void) | null>(null);
  const [ordering, setOrdering] = useState("");

  const selectedInstitution = useSelector(selectSelectedInstitution);

  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    description: string;
    max_days_per_year: string;
    carry_forward_allowed: boolean;
    max_carry_forward_days: string;
    requires_document: boolean;
    gender_specific: string;
  }>({
    name: "",
    category: "annual",
    description: "",
    max_days_per_year: "",
    carry_forward_allowed: false,
    max_carry_forward_days: "",
    requires_document: false,
    gender_specific: "all",
  });

  const resetFormData = () => {
    setFormData({
      name: "",
      category: "annual",
      description: "",
      max_days_per_year: "",
      carry_forward_allowed: false,
      max_carry_forward_days: "",
      requires_document: false,
      gender_specific: "all",
    });
  };

  const handleCreateSuccess = (newLeaveType: ILeaveType) => {
    toast.success("Leave type created successfully");
    refreshTableRef.current?.();
  };

  const handleUpdateSuccess = (updatedLeaveType: ILeaveType) => {
    toast.success("Leave type updated successfully");
    refreshTableRef.current?.();
  };

  const handleDeleteSuccess = () => {
    toast.success("Leave type deleted successfully");
    refreshTableRef.current?.();
  };

  const handleAddLeaveType = async () => {
    if (!formData.name || !formData.description || !formData.max_days_per_year) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedInstitution?.id === undefined) {
      toast.error("Institution is not selected");
      return;
    }

    setIsSubmitting(true);
    try {
      const leaveTypeData: ILeaveTypeFormData = {
        name: formData.name,
        category: formData.category as any,
        description: formData.description,
        max_days_per_year: Number.parseInt(formData.max_days_per_year),
        carry_forward_allowed: formData.carry_forward_allowed,
        max_carry_forward_days: Number.parseInt(formData.max_carry_forward_days) || 0,
        is_active: true,
        requires_document: formData.requires_document,
        gender_specific:
          formData.gender_specific === "all" ? null : (formData.gender_specific as any),
      };

      const newLeaveType = await LeaveTypesAPI.create({
        institutionId: selectedInstitution.id,
        leaveTypeData,
      });

      if (newLeaveType) {
        handleCreateSuccess(newLeaveType);
        resetFormData();
        setIsAddDialogOpen(false);
      } else {
        toast.error("Failed to create leave type");
      }
    } catch (error: any) {
      console.error("Error creating leave type:", error);
      toast.error(error.message || "An error occurred while creating the leave type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLeaveType = async () => {
    if (!editingLeaveType) return;

    if (!formData.name || !formData.description || !formData.max_days_per_year) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const leaveTypeData: ILeaveTypeFormData = {
        name: formData.name,
        category: formData.category as any,
        description: formData.description,
        max_days_per_year: Number.parseInt(formData.max_days_per_year),
        carry_forward_allowed: formData.carry_forward_allowed,
        max_carry_forward_days: Number.parseInt(formData.max_carry_forward_days) || 0,
        is_active: true,
        requires_document: formData.requires_document,
        gender_specific:
          formData.gender_specific === "all" ? null : (formData.gender_specific as any),
      };

      const updatedLeaveType = await LeaveTypesAPI.update({
        leaveTypeId: editingLeaveType.id,
        leaveTypeData,
      });

      if (updatedLeaveType) {
        handleUpdateSuccess(updatedLeaveType);
        resetFormData();
        setIsEditDialogOpen(false);
        setEditingLeaveType(null);
      } else {
        toast.error("Failed to update leave type");
      }
    } catch (error: any) {
      console.error("Error updating leave type:", error);
      toast.error(error.message || "An error occurred while updating the leave type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeaveType = async () => {
    if (!deletingLeaveType) return;

    setIsSubmitting(true);
    try {
      const success = await LeaveTypesAPI.delete(deletingLeaveType.id);

      if (success) {
        handleDeleteSuccess();
        setIsDeleteDialogOpen(false);
        setDeletingLeaveType(null);
      } else {
        toast.error("Failed to delete leave type");
      }
    } catch (error: any) {
      console.error("Error deleting leave type:", error);
      toast.error(error.message || "An error occurred while deleting the leave type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLeaveType = (leaveType: ILeaveType) => {
    setEditingLeaveType(leaveType);
    setFormData({
      name: leaveType.name,
      category: leaveType.category,
      description: leaveType.description,
      max_days_per_year: leaveType.max_days_per_year.toString(),
      carry_forward_allowed: leaveType.carry_forward_allowed,
      max_carry_forward_days: leaveType.max_carry_forward_days.toString(),
      requires_document: leaveType.requires_document,
      gender_specific: leaveType.gender_specific || "all",
    });
    setIsEditDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const hasFilters = searchTerm || statusFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Leave Types</h1>

        </div>


      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className=" border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              {/* Search bar */}
              <div className="relative flex-shrink-0 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search leave types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>

              {/* Filters */}

            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm sm:text-base">
                    All Statuses
                  </SelectItem>
                  <SelectItem value="active" className="text-sm sm:text-base">
                    Active
                  </SelectItem>
                  <SelectItem value="inactive" className="text-sm sm:text-base">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={(value: string) => setCategoryFilter(value as "all" | "annual" | "sick" | "maternity" | "paternity" | "study" | "unpaid")}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm sm:text-base">
                    All Categories
                  </SelectItem>
                  {LEAVE_CATEGORIES.map((category) => (
                    <SelectItem
                      key={category.value}
                      value={category.value}
                      className="text-sm sm:text-base"
                    >
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">

              <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 text-xs sm:text-sm rounded-[12px]">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Create Leave Type</span>
                      <span className="sm:hidden">Create</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[900px] w-[95vw] sm:w-full rounded-2xl border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
                      <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                        Add Leave Type
                      </DialogTitle>
                      <DialogDescription className="text-sm sm:text-base text-gray-600">
                        Create a new leave type to manage employee leave requests efficiently.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
                      <div className="space-y-3">
                        <Label
                          htmlFor="name"
                          className="text-xs sm:text-sm font-semibold text-gray-800"
                        >
                          Name *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Annual Leave, Sick Leave"
                          disabled={isSubmitting}
                          className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="category"
                          className="text-xs sm:text-sm font-semibold text-gray-800"
                        >
                          Category *
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAVE_CATEGORIES.map((category) => (
                              <SelectItem
                                key={category.value}
                                value={category.value}
                                className="text-sm sm:text-base"
                              >
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <Label
                          htmlFor="description"
                          className="text-xs sm:text-sm font-semibold text-gray-800"
                        >
                          Description *
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={4}
                          placeholder="Provide a detailed description of this leave type..."
                          disabled={isSubmitting}
                          className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base resize-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="max_days_per_year"
                          className="text-xs sm:text-sm font-semibold text-gray-800"
                        >
                          Max Days Per Year *
                        </Label>
                        <Input
                          id="max_days_per_year"
                          type="number"
                          value={formData.max_days_per_year}
                          onChange={(e) =>
                            setFormData({ ...formData, max_days_per_year: e.target.value })
                          }
                          placeholder="e.g., 20"
                          disabled={isSubmitting}
                          className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="max_carry_forward_days"
                          className="text-xs sm:text-sm font-semibold text-gray-800"
                        >
                          Max Carry Forward Days
                        </Label>
                        <Input
                          id="max_carry_forward_days"
                          type="number"
                          value={formData.max_carry_forward_days}
                          onChange={(e) =>
                            setFormData({ ...formData, max_carry_forward_days: e.target.value })
                          }
                          placeholder="e.g., 5"
                          disabled={isSubmitting}
                          className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="gender_specific"
                          className="text-xs sm:text-sm font-semibold text-gray-800"
                        >
                          Gender Specific
                        </Label>
                        <Select
                          value={formData.gender_specific}
                          onValueChange={(value) => setFormData({ ...formData, gender_specific: value })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_CHOICES.map((gender) => (
                              <SelectItem
                                key={gender.value}
                                value={gender.value}
                                className="text-sm sm:text-base"
                              >
                                {gender.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-4 md:col-span-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">
                          Configuration Options
                        </h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="carry_forward_allowed"
                              checked={formData.carry_forward_allowed}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  carry_forward_allowed: e.target.checked,
                                })
                              }
                              disabled={isSubmitting}
                              className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                            />
                            <Label
                              htmlFor="carry_forward_allowed"
                              className="text-xs sm:text-sm font-medium text-gray-700"
                            >
                              Carry Forward Allowed
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="requires_document"
                              checked={formData.requires_document}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  requires_document: e.target.checked,
                                })
                              }
                              disabled={isSubmitting}
                              className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                            />
                            <Label
                              htmlFor="requires_document"
                              className="text-xs sm:text-sm font-medium text-gray-700"
                            >
                              Requires Document
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddLeaveType} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Leave Type"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ProtectedComponent>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Types Table */}

      <div>
        <CardContent className="p-0 -ml-3">
          <PaginatedTableWrapper<ILeaveType>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected")
              return await LeaveTypesAPI.getPaginated({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
                ordering: ordering || undefined,
              })
            }}
            fetchFromUrl={LeaveTypesAPI.getPaginatedFromUrl}
            deps={[selectedInstitution?.id, searchTerm, ordering]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({ data, loading, refresh }) => {
              // Store refresh function in ref when component mounts/updates
              useEffect(() => {
                refreshTableRef.current = refresh
              }, [refresh])

              if (loading) {
                return <TableSkeleton rows={10} columns={8} />
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No leave types found matching your search criteria" : "No leave types found"}
                  </div>
                )
              }

              // Apply client-side filters (status and category filters)
              const filteredResults = data.results.filter((leaveType) => {
                const matchesStatus = statusFilter === "all" || leaveType.is_active === (statusFilter === "active");
                const matchesCategory = categoryFilter === "all" || leaveType.category === categoryFilter;

                return matchesStatus && matchesCategory;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No leave types found matching the selected filters.
                  </div>
                )
              }

              return (
                <div className="overflow-x-auto mt-10">
                  <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">
                          Name
                          <Button size="sm" variant={ordering === "name" ? "default" : "outline"} className="ml-2" onClick={() => setOrdering(ordering === "name" ? "" : "name")}>
                            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-xs sm:text-sm">
                          Category
                          <Button size="sm" variant={ordering === "category" ? "default" : "outline"} className="ml-2" onClick={() => setOrdering(ordering === "category" ? "" : "category")}>
                            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-xs sm:text-sm">
                          Status
                          <Button size="sm" variant={ordering === "is_active" ? "default" : "outline"} className="ml-2" onClick={() => setOrdering(ordering === "is_active" ? "" : "is_active")}>
                            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-xs sm:text-sm">
                          Max Days
                          <Button size="sm" variant={ordering === "max_days_per_year" ? "default" : "outline"} className="ml-2" onClick={() => setOrdering(ordering === "max_days_per_year" ? "" : "max_days_per_year")}>
                            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-xs sm:text-sm">
                          Carry Forward
                          <Button size="sm" variant={ordering === "carry_forward_allowed" ? "default" : "outline"} className="ml-2" onClick={() => setOrdering(ordering === "carry_forward_allowed" ? "" : "carry_forward_allowed")}>
                            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-xs sm:text-sm">Requires Doc</TableHead>
                        <TableHead className="text-xs sm:text-sm">Gender</TableHead>

                        <TableHead className="text-xs sm:text-sm">
                          Created Date
                          <Button size="sm" variant={ordering === "created_at" ? "default" : "outline"} className="ml-2" onClick={() => setOrdering(ordering === "created_at" ? "" : "created_at")}>
                            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
                          </Button>
                        </TableHead>

                        <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((leaveType) => (
                        <TableRow key={leaveType.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-xs sm:text-sm">{leaveType.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                              {LEAVE_CATEGORIES.find((cat) => cat.value === leaveType.category)?.label ||
                                leaveType.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(leaveType.is_active)} text-xs`}>
                              {leaveType.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {leaveType.max_days_per_year} days
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getCarryForwardColor(leaveType.carry_forward_allowed)} text-xs`}
                            >
                              {leaveType.carry_forward_allowed ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getRequiresDocumentColor(leaveType.requires_document)} text-xs`}
                            >
                              {leaveType.requires_document ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {leaveType.gender_specific || "All"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {formatDate(leaveType.created_at ?? "")}
                          </TableCell>
                          <TableCell className="text-right">
                            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
                                    <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEditLeaveType(leaveType)}
                                    className="text-xs sm:text-sm"
                                  >
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDeletingLeaveType(leaveType);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive text-xs sm:text-sm"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </ProtectedComponent>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            }}
          </PaginatedTableWrapper>
        </CardContent>
      </div>

      {/* Edit Dialog */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              resetFormData();
              setEditingLeaveType(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[900px] w-[95vw] sm:w-full rounded-2xl border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                Edit Leave Type
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-gray-600">
                Make changes to the existing leave type configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
              <div className="space-y-3">
                <Label
                  htmlFor="edit-name"
                  className="text-xs sm:text-sm font-semibold text-gray-800"
                >
                  Name *
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Leave, Sick Leave"
                  disabled={isSubmitting}
                  className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="edit-category"
                  className="text-xs sm:text-sm font-semibold text-gray-800"
                >
                  Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_CATEGORIES.map((category) => (
                      <SelectItem
                        key={category.value}
                        value={category.value}
                        className="text-sm sm:text-base"
                      >
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label
                  htmlFor="edit-description"
                  className="text-xs sm:text-sm font-semibold text-gray-800"
                >
                  Description *
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Provide a detailed description of this leave type..."
                  disabled={isSubmitting}
                  className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base resize-none"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="edit-max_days_per_year"
                  className="text-xs sm:text-sm font-semibold text-gray-800"
                >
                  Max Days Per Year *
                </Label>
                <Input
                  id="edit-max_days_per_year"
                  type="number"
                  value={formData.max_days_per_year}
                  onChange={(e) => setFormData({ ...formData, max_days_per_year: e.target.value })}
                  placeholder="e.g., 20"
                  disabled={isSubmitting}
                  className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="edit-max_carry_forward_days"
                  className="text-xs sm:text-sm font-semibold text-gray-800"
                >
                  Max Carry Forward Days
                </Label>
                <Input
                  id="edit-max_carry_forward_days"
                  type="number"
                  value={formData.max_carry_forward_days}
                  onChange={(e) =>
                    setFormData({ ...formData, max_carry_forward_days: e.target.value })
                  }
                  placeholder="e.g., 5"
                  disabled={isSubmitting}
                  className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="edit-gender_specific"
                  className="text-xs sm:text-sm font-semibold text-gray-800"
                >
                  Gender Specific
                </Label>
                <Select
                  value={formData.gender_specific}
                  onValueChange={(value) => setFormData({ ...formData, gender_specific: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_CHOICES.map((gender) => (
                      <SelectItem
                        key={gender.value}
                        value={gender.value}
                        className="text-sm sm:text-base"
                      >
                        {gender.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-4 md:col-span-2">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">
                  Configuration Options
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="edit-carry_forward_allowed"
                      checked={formData.carry_forward_allowed}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          carry_forward_allowed: e.target.checked,
                        })
                      }
                      disabled={isSubmitting}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                    />
                    <Label
                      htmlFor="edit-carry_forward_allowed"
                      className="text-xs sm:text-sm font-medium text-gray-700"
                    >
                      Carry Forward Allowed
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="edit-requires_document"
                      checked={formData.requires_document}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requires_document: e.target.checked,
                        })
                      }
                      disabled={isSubmitting}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                    />
                    <Label
                      htmlFor="edit-requires_document"
                      className="text-xs sm:text-sm font-medium text-gray-700"
                    >
                      Requires Document
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateLeaveType} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Leave Type"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ProtectedComponent>

      {/* Delete Confirmation Dialog */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) {
              setDeletingLeaveType(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px] w-[95vw] sm:w-full rounded-2xl border-0 shadow-2xl">
            <DialogHeader className="space-y-4 pb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              </div>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 text-center">
                Delete Leave Type
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-gray-600 text-center leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">"{deletingLeaveType?.name}"</span>?
                This action cannot be undone and will permanently remove this leave type from your
                system.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteLeaveType}
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ProtectedComponent>
    </div>
  );
};

export default LeaveTypesPage;
