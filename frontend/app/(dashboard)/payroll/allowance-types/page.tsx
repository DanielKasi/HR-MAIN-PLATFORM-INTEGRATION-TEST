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
import type { IAllowanceType } from "@/app/types/types.utils"
import { getAllowanceTypes } from "@/lib/utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { CreateAllowanceTypeDialog } from "@/components/allowance-types/create-allowance-type-dialog"
import { EditAllowanceTypeDialog } from "@/components/allowance-types/edit-allowance-type-dialog"
import { DeleteAllowanceTypeDialog } from "@/components/allowance-types/delete-allowance-type-dialog"

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 10

const getStatusColor = (status: boolean) => {
  return status
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200"
}

const getTaxableColor = (isTaxable: boolean) => {
  return isTaxable
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

const AllowanceTypesComponent = () => {
  const [allowanceTypes, setAllowanceTypes] = useState<IAllowanceType[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingAllowanceType, setEditingAllowanceType] = useState<IAllowanceType | null>(null)
  const [deletingAllowanceType, setDeletingAllowanceType] = useState<IAllowanceType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const selectedInstitution = useSelector(selectSelectedInstitution)

  // Fetch allowance types
  const fetchAllowanceTypes = useCallback(
    async (showRefreshLoader = false) => {
      if (!selectedInstitution?.id) return

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }
        const types = await getAllowanceTypes(selectedInstitution.id)
        setAllowanceTypes(types || [])
        if (!types || types.length === 0) {
          console.log("No allowance types found for this institution")
        }
      } catch (error) {
        console.error("Error fetching allowance types:", error)
        toast.error("Failed to load allowance types")
        setAllowanceTypes([])
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [selectedInstitution?.id],
  )

  useEffect(() => {
    fetchAllowanceTypes()
  }, [fetchAllowanceTypes])

  const handleCreateSuccess = (newAllowanceType: IAllowanceType) => {
    setAllowanceTypes([newAllowanceType, ...allowanceTypes])
    clearFilters()
  }

  const handleUpdateSuccess = (updatedAllowanceType: IAllowanceType) => {
    const updatedAllowanceTypes = allowanceTypes.map((allowanceType) =>
      allowanceType.id === updatedAllowanceType.id ? updatedAllowanceType : allowanceType,
    )
    setAllowanceTypes(updatedAllowanceTypes)
    clearFilters()
    setEditingAllowanceType(null)
  }

  const handleDeleteSuccess = (deletedId: number) => {
    setAllowanceTypes(allowanceTypes.filter((allowanceType) => allowanceType.id !== deletedId))
    setDeletingAllowanceType(null)
  }

  const handleEditAllowanceType = (allowanceType: IAllowanceType) => {
    setEditingAllowanceType(allowanceType)
    setIsEditDialogOpen(true)
  }

  const handleDeleteAllowanceType = (allowanceType: IAllowanceType) => {
    setDeletingAllowanceType(allowanceType)
    setIsDeleteDialogOpen(true)
  }

  const handleRefresh = () => {
    fetchAllowanceTypes(true)
    setCurrentPage(1)
  }

  const filteredAllowanceTypes = useMemo(() => {
    return allowanceTypes.filter((allowanceType) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : allowanceType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          allowanceType.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && allowanceType.is_active) ||
        (statusFilter === "inactive" && !allowanceType.is_active)

      return matchesSearch && matchesStatus
    })
  }, [allowanceTypes, searchTerm, statusFilter])

  const activeAllowanceTypes = useMemo(
    () => allowanceTypes.filter((at) => at.is_active),
    [allowanceTypes],
  )

  const taxableAllowanceTypes = useMemo(
    () => allowanceTypes.filter((at) => at.is_taxable),
    [allowanceTypes],
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

  const paginatedAllowanceTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredAllowanceTypes.slice(start, end)
  }, [filteredAllowanceTypes, currentPage, pageSize])

  const totalPages = Math.ceil(filteredAllowanceTypes.length / pageSize)

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
          <CreateAllowanceTypeDialog
            institutionId={selectedInstitution?.id || 0}
            onSuccess={handleCreateSuccess}
            disabled={!selectedInstitution?.id}
          />
        </div>
      </div>


         {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
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


      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-20 mt-12">
        <div className="relative w-[32rem]">
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

      </div>

 
   
      {/* Allowance Types Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredAllowanceTypes.length === 0 ? (
        <div className="p-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No allowance types found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all"
              ? "No allowance types match your filter criteria."
              : "Get started by creating your first allowance type."}
          </p>
        </div>
      ) : (
           <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
              <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>Recurrence</TableHead>
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
                    <Badge
                      className={
                        allowanceType.is_recurring
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {allowanceType.is_recurring
                        ? `Recurring${allowanceType.frequency ? ` (${allowanceType.frequency})` : ""}`
                        : "One-time"}
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
                          onClick={() => handleDeleteAllowanceType(allowanceType)}
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
          Showing {filteredAllowanceTypes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredAllowanceTypes.length)} of{" "}
          {filteredAllowanceTypes.length} allowance types
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

      {/* Dialog Components */}
      <EditAllowanceTypeDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        allowanceType={editingAllowanceType}
        onSuccess={handleUpdateSuccess}
      />

      <DeleteAllowanceTypeDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        allowanceType={deletingAllowanceType}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}

export default AllowanceTypesComponent
