"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSelector } from "react-redux"
import { MoreVertical, Edit, Trash2, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Settings } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { IDeductionType } from "@/app/types/types.utils"
import { getDeductionTypes } from "@/lib/utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { CreateDeductionTypeDialog } from "@/components/deduction-types/create-deduction-type-dialog"
import { EditDeductionTypeDialog } from "@/components/deduction-types/edit-deduction-type-dialog"
import { DeleteDeductionTypeDialog } from "@/components/deduction-types/delete-deduction-type-dialog"
import { ALLOWANCE_FREQUENCIES } from "@/app/types/types.utils"

const PAGE_SIZES = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 10

const getStatusColor = (status: boolean) => {
  return status
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200"
}

const getMandatoryColor = (isMandatory: boolean) => {
  return isMandatory
    ? "bg-red-100 text-red-800 border-red-200"
    : "bg-blue-100 text-blue-800 border-blue-200"
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const DeductionTypesComponent = () => {
  const [deductionTypes, setDeductionTypes] = useState<IDeductionType[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingDeductionType, setEditingDeductionType] = useState<IDeductionType | null>(null)
  const [deletingDeductionType, setDeletingDeductionType] = useState<IDeductionType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const selectedInstitution = useSelector(selectSelectedInstitution)

  const fetchDeductionTypes = useCallback(
    async (showRefreshLoader = false) => {
      if (!selectedInstitution?.id) return

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }
        const types = await getDeductionTypes(selectedInstitution.id)
        setDeductionTypes(types || [])
      } catch (error) {
        toast.error("Failed to load deduction types")
        setDeductionTypes([])
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [selectedInstitution?.id],
  )

  useEffect(() => {
    fetchDeductionTypes()
  }, [fetchDeductionTypes])

  const handleCreateSuccess = (newDeductionType: IDeductionType) => {
    setDeductionTypes([newDeductionType, ...deductionTypes])
    clearFilters()
  }

  const handleUpdateSuccess = (updatedDeductionType: IDeductionType) => {
    const updatedDeductionTypes = deductionTypes.map((deductionType) =>
      deductionType.id === updatedDeductionType.id ? updatedDeductionType : deductionType,
    )
    setDeductionTypes(updatedDeductionTypes)
    clearFilters()
    setEditingDeductionType(null)
  }

  const handleDeleteSuccess = (deletedId: number) => {
    setDeductionTypes(deductionTypes.filter((deductionType) => deductionType.id !== deletedId))
    setDeletingDeductionType(null)
  }

  const handleEditDeductionType = (deductionType: IDeductionType) => {
    setEditingDeductionType(deductionType)
    setIsEditDialogOpen(true)
  }

  const handleDeleteDeductionType = (deductionType: IDeductionType) => {
    setDeletingDeductionType(deductionType)
    setIsDeleteDialogOpen(true)
  }

  const handleRefresh = () => {
    fetchDeductionTypes(true)
    setCurrentPage(1)
  }

  const filteredDeductionTypes = useMemo(() => {
    return deductionTypes.filter((deductionType) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : deductionType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          deductionType.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && deductionType.is_active) ||
        (statusFilter === "inactive" && !deductionType.is_active)

      return matchesSearch && matchesStatus
    })
  }, [deductionTypes, searchTerm, statusFilter])

  const activeDeductionTypes = useMemo(
    () => deductionTypes.filter((dt) => dt.is_active),
    [deductionTypes],
  )

  const mandatoryDeductionTypes = useMemo(
    () => deductionTypes.filter((dt) => dt.is_mandatory),
    [deductionTypes],
  )

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
    setCurrentPage(1)
  }

  const paginatedDeductionTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredDeductionTypes.slice(start, end)
  }, [filteredDeductionTypes, currentPage, pageSize])

  const totalPages = Math.ceil(filteredDeductionTypes.length / pageSize)

  if (isLoading && !selectedInstitution?.id) {
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
          <CreateDeductionTypeDialog
            onSuccess={handleCreateSuccess}
            disabled={!selectedInstitution?.id}
          />
        </div>
      </div>

           {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-12">
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search deduction types..."
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
                <TableHead>Recurrence</TableHead>
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
                    <Badge
                      className={
                        deductionType.is_recurring
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {deductionType.is_recurring
                        ? `Recurring${deductionType.frequency ? ` (${ALLOWANCE_FREQUENCIES[deductionType.frequency as keyof typeof ALLOWANCE_FREQUENCIES]})` : ""}`
                        : "One-time"}
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
                          onClick={() => handleDeleteDeductionType(deductionType)}
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

      {(searchTerm || statusFilter !== "all") && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            Clear Filters
          </Button>
        </div>
      )}

      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredDeductionTypes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredDeductionTypes.length)} of{" "}
          {filteredDeductionTypes.length} deduction types
          {(searchTerm || statusFilter !== "all") && ` (filtered from ${deductionTypes.length} total)`}
        </div>
      )}

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
            onValueChange={(value) => handlePageChange(Number.parseInt(value))}
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

      <EditDeductionTypeDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        deductionType={editingDeductionType}
        onSuccess={handleUpdateSuccess}
      />

      <DeleteDeductionTypeDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        deductionType={deletingDeductionType}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}

export default DeductionTypesComponent
