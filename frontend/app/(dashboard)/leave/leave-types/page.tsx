"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSelector } from "react-redux"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { ILeaveType, ILeaveTypeFormData } from "@/app/types/types.utils"
import { createLeaveType, getLeaveTypes, updateLeaveType, deleteLeaveType } from "@/lib/utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { PERMISSION_CODES } from "@/app/types/types.utils"
import ProtectedComponent from "@/components/ProtectedComponent"
import type { IUserInstitution } from "@/app/types"
import { TableSkeleton } from "@/components/common/table-skeleton"

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 10

const LEAVE_CATEGORIES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "compassionate", label: "Compassionate Leave" },
  { value: "study", label: "Study Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
]

const GENDER_CHOICES = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

const getStatusColor = (status: boolean) => {
  return status ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"
}

const getCarryForwardColor = (carryForward: boolean) => {
  return carryForward ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-gray-100 text-gray-800 border-gray-200"
}

const getRequiresDocumentColor = (requiresDocument: boolean) => {
  return requiresDocument
    ? "bg-orange-100 text-orange-800 border-orange-200"
    : "bg-gray-100 text-gray-800 border-gray-200"
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

interface LeaveType extends ILeaveType {}

const LeaveTypesComponent = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null)
  const [deletingLeaveType, setDeletingLeaveType] = useState<LeaveType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]

  const [formData, setFormData] = useState<{
    name: string
    category: string
    description: string
    max_days_per_year: string
    carry_forward_allowed: boolean
    max_carry_forward_days: string
    requires_document: boolean
    gender_specific: string
  }>({
    name: "",
    category: "annual",
    description: "",
    max_days_per_year: "",
    carry_forward_allowed: false,
    max_carry_forward_days: "",
    requires_document: false,
    gender_specific: "all",
  })

  // Reset form data
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
    })
  }

  // Fetch leave types
  const fetchLeaveTypes = useCallback(
    async (showRefreshLoader = false) => {
      if (selectedInstitution?.id === undefined) {
        setLeaveTypes([])
        return
      }

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }
        const types = await getLeaveTypes({ institutionId: selectedInstitution.id })
        setLeaveTypes(types || [])
        if (!types || types.length === 0) {
          console.log("No leave types found for this institution")
        }
      } catch (error) {
        console.error("Error fetching leave types:", error)
        toast.error("Failed to load leave types")
        setLeaveTypes([])
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [selectedInstitution?.id],
  )

  useEffect(() => {
    fetchLeaveTypes()
  }, [fetchLeaveTypes])

  const handleAddLeaveType = async () => {
    if (!formData.name || !formData.description || !formData.max_days_per_year) {
      toast.error("Please fill in all required fields")
      return
    }

    if (selectedInstitution?.id === undefined) {
      toast.error("Institution is not selected")
      return
    }

    setIsSubmitting(true)
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
        gender_specific: formData.gender_specific === "all" ? null : (formData.gender_specific as any),
      }

      const newLeaveType = await createLeaveType({
        institutionId: selectedInstitution.id,
        leaveTypeData,
      })

      if (newLeaveType) {
        setLeaveTypes([newLeaveType, ...leaveTypes])
        clearFilters()
        toast.success("Leave type created successfully")
        resetFormData()
        setIsAddDialogOpen(false)
      } else {
        toast.error("Failed to create leave type")
      }
    } catch (error: any) {
      console.error("Error creating leave type:", error)
      toast.error(error.message || "An error occurred while creating the leave type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateLeaveType = async () => {
    if (!editingLeaveType) return

    if (!formData.name || !formData.description || !formData.max_days_per_year) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
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
        gender_specific: formData.gender_specific === "all" ? null : (formData.gender_specific as any),
      }

      const updatedLeaveType = await updateLeaveType({
        leaveTypeId: editingLeaveType.id,
        leaveTypeData,
      })

      if (updatedLeaveType) {
        const updatedLeaveTypes = leaveTypes.map((leaveType) =>
          leaveType.id === editingLeaveType.id ? updatedLeaveType : leaveType,
        )
        setLeaveTypes(updatedLeaveTypes)
        clearFilters()
        toast.success("Leave type updated successfully")
        resetFormData()
        setIsEditDialogOpen(false)
        setEditingLeaveType(null)
      } else {
        toast.error("Failed to update leave type")
      }
    } catch (error: any) {
      console.error("Error updating leave type:", error)
      toast.error(error.message || "An error occurred while updating the leave type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLeaveType = async () => {
    if (!deletingLeaveType) return

    setIsSubmitting(true)
    try {
      const success = await deleteLeaveType({
        leaveTypeId: deletingLeaveType.id,
      })

      if (success) {
        setLeaveTypes(leaveTypes.filter((leaveType) => leaveType.id !== deletingLeaveType.id))
        toast.success("Leave type deleted successfully")
        setIsDeleteDialogOpen(false)
        setDeletingLeaveType(null)
      } else {
        toast.error("Failed to delete leave type")
      }
    } catch (error: any) {
      console.error("Error deleting leave type:", error)
      toast.error(error.message || "An error occurred while deleting the leave type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType)
    setFormData({
      name: leaveType.name,
      category: leaveType.category,
      description: leaveType.description,
      max_days_per_year: leaveType.max_days_per_year.toString(),
      carry_forward_allowed: leaveType.carry_forward_allowed,
      max_carry_forward_days: leaveType.max_carry_forward_days.toString(),
      requires_document: leaveType.requires_document,
      gender_specific: leaveType.gender_specific || "all",
    })
    setIsEditDialogOpen(true)
  }

  const handleRefresh = () => {
    fetchLeaveTypes(true)
    setCurrentPage(1)
  }

  const filteredLeaveTypes = useMemo(() => {
    return leaveTypes.filter((leaveType) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : leaveType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          leaveType.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && leaveType.is_active) ||
        (statusFilter === "inactive" && !leaveType.is_active)

      const matchesCategory = categoryFilter === "all" || leaveType.category === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [leaveTypes, searchTerm, statusFilter, categoryFilter])

  const activeLeaveTypes = useMemo(() => leaveTypes.filter((lt) => lt.is_active), [leaveTypes])

  const carryForwardLeaveTypes = useMemo(() => leaveTypes.filter((lt) => lt.carry_forward_allowed), [leaveTypes])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number.parseInt(newPageSize))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setCategoryFilter("all")
    setCurrentPage(1)
  }

  const paginatedLeaveTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredLeaveTypes.slice(start, end)
  }, [filteredLeaveTypes, currentPage, pageSize])

  const totalPages = Math.ceil(filteredLeaveTypes.length / pageSize)

  if (isLoading && !selectedInstitution?.id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Loading Institution Data</h3>
            <p className="text-sm sm:text-base text-gray-600">Please wait while we set up your workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <Card className="h-[calc(100vh-2rem)] shadow-lg">
          <CardHeader className="border-b p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-8 items-start sm:items-center">
              <div className="flex items-center justify-start gap-4">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 sm:h-6 bg-gray-200 rounded w-48 sm:w-64 animate-pulse"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-48 animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 sm:h-10 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-28 sm:h-10 sm:w-36 bg-gray-200 rounded animate-pulse"></div>
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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Leave Types</h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
            Manage leave types for {selectedInstitution?.institution_name}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs sm:text-sm bg-transparent"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 text-xs sm:text-sm">
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
                    <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                    <Label htmlFor="category" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                          <SelectItem key={category.value} value={category.value} className="text-sm sm:text-base">
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label htmlFor="description" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                    <Label htmlFor="max_days_per_year" className="text-xs sm:text-sm font-semibold text-gray-800">
                      Max Days Per Year *
                    </Label>
                    <Input
                      id="max_days_per_year"
                      type="number"
                      value={formData.max_days_per_year}
                      onChange={(e) => setFormData({ ...formData, max_days_per_year: e.target.value })}
                      placeholder="e.g., 20"
                      disabled={isSubmitting}
                      className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="max_carry_forward_days" className="text-xs sm:text-sm font-semibold text-gray-800">
                      Max Carry Forward Days
                    </Label>
                    <Input
                      id="max_carry_forward_days"
                      type="number"
                      value={formData.max_carry_forward_days}
                      onChange={(e) => setFormData({ ...formData, max_carry_forward_days: e.target.value })}
                      placeholder="e.g., 5"
                      disabled={isSubmitting}
                      className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="gender_specific" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                          <SelectItem key={gender.value} value={gender.value} className="text-sm sm:text-base">
                            {gender.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-4 md:col-span-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
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
                        <Label htmlFor="carry_forward_allowed" className="text-xs sm:text-sm font-medium text-gray-700">
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
                        <Label htmlFor="requires_document" className="text-xs sm:text-sm font-medium text-gray-700">
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
                  <Button
                    onClick={handleAddLeaveType}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-xs sm:text-sm"
                  >
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

         {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{leaveTypes.length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Leave Types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{activeLeaveTypes.length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {carryForwardLeaveTypes.length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Carry Forward Allowed</p>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Search and Filters */}
<div className="flex flex-col lg:flex-row gap-20 mt-12 items-center ">
  {/* Search bar with limited width */}
  <div className="relative flex-shrink-0 max-w-md w-full">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <Input
      placeholder="Search leave types..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10 text-sm sm:text-base"
    />
  </div>

  {/* Filters side-by-side, close to search */}
  <div className="flex gap-2 flex-shrink-0 ml-14">
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-40 px-4 sm:px-6 text-sm sm:text-base">
        <div className="flex items-center gap-2">
          <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
          <SelectValue placeholder="Filter by status" />
        </div>
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

    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
      <SelectTrigger className="w-40 px-4 sm:px-6 text-sm sm:text-base">
        <div className="flex items-center gap-2">
          <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
          <SelectValue placeholder="Filter by category" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-sm sm:text-base">
          All Categories
        </SelectItem>
        {LEAVE_CATEGORIES.map((category) => (
          <SelectItem key={category.value} value={category.value} className="text-sm sm:text-base">
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>

{/* Rows per Page Selector remains below or wherever you want */}

     
   
      {/* Leave Types Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredLeaveTypes.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <Settings className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">No leave types found</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
              ? "No leave types match your filter criteria."
              : "Get started by creating your first leave type."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
              <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Category</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm">Max Days</TableHead>
                    <TableHead className="text-xs sm:text-sm">Carry Forward</TableHead>
                    <TableHead className="text-xs sm:text-sm">Requires Doc</TableHead>
                    <TableHead className="text-xs sm:text-sm">Gender</TableHead>
                    <TableHead className="text-xs sm:text-sm">Created Date</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeaveTypes.map((leaveType) => (
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
                      <TableCell className="text-xs sm:text-sm">{leaveType.max_days_per_year} days</TableCell>
                      <TableCell>
                        <Badge className={`${getCarryForwardColor(leaveType.carry_forward_allowed)} text-xs`}>
                          {leaveType.carry_forward_allowed ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRequiresDocumentColor(leaveType.requires_document)} text-xs`}>
                          {leaveType.requires_document ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{leaveType.gender_specific || "All"}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{formatDate(leaveType.created_at ?? "")}</TableCell>
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
                                  setDeletingLeaveType(leaveType)
                                  setIsDeleteDialogOpen(true)
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


      )}

      {/* Results Summary */}
      {!isLoading && (
        <div className="text-xs sm:text-sm text-muted-foreground">
          Showing {filteredLeaveTypes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredLeaveTypes.length)} of {filteredLeaveTypes.length} leave types
          {(searchTerm || statusFilter !== "all" || categoryFilter !== "all") &&
            ` (filtered from ${leaveTypes.length} total)`}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t">
          <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 overflow-x-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="text-xs px-2 sm:px-3"
            >
              <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">First</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="text-xs px-2 sm:px-3"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <Select value={currentPage.toString()} onValueChange={(value) => handlePageChange(Number.parseInt(value))}>
              <SelectTrigger className="w-[60px] sm:w-[70px] h-7 sm:h-8 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <SelectItem key={page} value={page.toString()} className="text-xs sm:text-sm">
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
              className="text-xs px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="text-xs px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-1">Last</span>
              <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open)
            if (!open) {
              resetFormData()
              setEditingLeaveType(null)
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
                <Label htmlFor="edit-name" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                <Label htmlFor="edit-category" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                      <SelectItem key={category.value} value={category.value} className="text-sm sm:text-base">
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="edit-description" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                <Label htmlFor="edit-max_days_per_year" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                <Label htmlFor="edit-max_carry_forward_days" className="text-xs sm:text-sm font-semibold text-gray-800">
                  Max Carry Forward Days
                </Label>
                <Input
                  id="edit-max_carry_forward_days"
                  type="number"
                  value={formData.max_carry_forward_days}
                  onChange={(e) => setFormData({ ...formData, max_carry_forward_days: e.target.value })}
                  placeholder="e.g., 5"
                  disabled={isSubmitting}
                  className="h-10 sm:h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm sm:text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-gender_specific" className="text-xs sm:text-sm font-semibold text-gray-800">
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
                      <SelectItem key={gender.value} value={gender.value} className="text-sm sm:text-base">
                        {gender.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-4 md:col-span-2">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
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
                    <Label htmlFor="edit-requires_document" className="text-xs sm:text-sm font-medium text-gray-700">
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
              <Button
                onClick={handleUpdateLeaveType}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-xs sm:text-sm"
              >
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
            setIsDeleteDialogOpen(open)
            if (!open) {
              setDeletingLeaveType(null)
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
                <span className="font-semibold text-gray-900">"{deletingLeaveType?.name}"</span>? This action cannot be
                undone and will permanently remove this leave type from your system.
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
  )
}

export default LeaveTypesComponent
