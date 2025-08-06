"use client"

import { useState, useEffect } from "react"
import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSelector } from "react-redux"
import { Card, CardHeader } from "@/components/ui/card"
import { TableSkeleton } from "@/components/common/table-skeleton"
import {
  getEmployeeAllowances,
  deleteEmployeeAllowance,
  getAllEmployees,
  getAllowanceTypes,
} from "@/lib/utils"
import type { IEmployeeAllowance, IEmployee, IAllowanceType } from "@/app/types/types.utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { EmployeeAllowanceFormDialog } from "@/components/employee-allowances/employee-allowance-form-dialog"
import { AllowanceStatsCards } from "@/components/employee-allowances/allowance-stats-cards"
import { AllowanceFilters } from "@/components/employee-allowances/allowance-filters"
import { AllowanceExportMenu } from "@/components/employee-allowances/allowance-export-menu"
import { AllowanceTable } from "@/components/employee-allowances/allowance-table"


export default function EmployeeAllowancesPage() {
  const [allowances, setAllowances] = useState<IEmployeeAllowance[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [allowanceTypes, setAllowanceTypes] = useState<IAllowanceType[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAllowance, setEditingAllowance] = useState<IEmployeeAllowance | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [methodFilter, setMethodFilter] = useState<"all" | "fixed" | "percentage">("all")
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  const selectedInstitution = useSelector(selectSelectedInstitution)

  useEffect(() => {
    const fetchAllowanceTypes = async () => {
      if (!selectedInstitution?.id) {
        return
      }

      try {
        const types = await getAllowanceTypes(selectedInstitution.id)
          setAllowanceTypes(types)
      } catch (error) {
        setAllowanceTypes([])
        toast.error("Failed to load allowance types")
      }
    }

    fetchAllowanceTypes()
  }, [selectedInstitution?.id])

  useEffect(() => {
    fetchEmployees()
  }, [selectedInstitution])

  const fetchEmployees = async () => {
    if (!selectedInstitution?.id) {
      return
    }

    setIsLoadingEmployees(true)
    try {
      const fetchedEmployees = await getAllEmployees({ institutionId: selectedInstitution.id })
      setEmployees(fetchedEmployees)
    } catch (error: any) {
      setEmployees([])
      toast.error(error?.message || error?.detail || "Failed to load employees")
    } finally {
      setIsLoadingEmployees(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchAllowances = async () => {
      if (!selectedInstitution) {
        return
      }

      try {
        const allowancesData = await getEmployeeAllowances(selectedInstitution.id)
        setAllowances(allowancesData)
      } catch (error) {
        setAllowances([])
        toast.error("Failed to load allowances")
      }
    }

    fetchAllowances()
  }, [selectedInstitution])

  const getCalculatedAmount = (allowance: IEmployeeAllowance): number => {
    if (allowance.calculation_method === "percentage" && allowance.employee.salary) {
      return (Number(allowance.employee.salary || 0) * Number.parseFloat(allowance.percentage)) / 100
    }
    return Number.parseFloat(allowance.amount) || 0
  }

  const handleFormSuccess = (allowance: any, isEdit: boolean) => {
    if (isEdit) {
      setAllowances(prev => prev.map(a => a.id === allowance.id ? allowance : a))
    } else {
      setAllowances(prev => [...prev, allowance])
    }
    setEditingAllowance(null)
  }

  const handleAllowanceTypeCreated = (newType: IAllowanceType) => {
    setAllowanceTypes(prev => [...prev, newType])
  }

  const handleEdit = (allowance: IEmployeeAllowance) => {
    setEditingAllowance(allowance)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deleteEmployeeAllowance(id)
      if (success) {
        setAllowances(prev => prev.filter(a => a.id !== id))
        toast.success("Allowance deleted successfully")
      } else {
        toast.error("Failed to delete allowance")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the allowance")
    }
  }

  const openNewAllowanceDialog = () => {
    setEditingAllowance(null)
    setIsDialogOpen(true)
  }

  const filteredAllowances = allowances.filter((allowance) => {
    // Search filter
    const matchesSearch =
      allowance.employee.user?.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allowance.allowance_type.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && allowance.is_active) ||
      (statusFilter === "inactive" && !allowance.is_active)

    // Method filter
    const matchesMethod = methodFilter === "all" || allowance.calculation_method === methodFilter

    return matchesSearch && matchesStatus && matchesMethod
  })

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setMethodFilter("all")
  }

  const hasActiveFilters = methodFilter !== "all" || statusFilter !== "all"

  if (!selectedInstitution || !selectedInstitution.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution selected...</span>
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
    <div>
      <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
        {/* Header Section */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between mb-4">
            <div>
<<<<<<< Updated upstream
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Allowances</h1>
=======
              <h1 className="text-2xl font-bold">Employee Allowances</h1>
>>>>>>> Stashed changes
              <p className="text-gray-600">Manage employee-specific allowances and benefits</p>
            </div>
            <div className="flex gap-3">
              <AllowanceExportMenu
                allowances={filteredAllowances}
                getCalculatedAmount={getCalculatedAmount}
                disabled={filteredAllowances.length === 0}
              />

              <Button
                onClick={openNewAllowanceDialog}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                disabled={!selectedInstitution.id}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Allowance
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
<<<<<<< Updated upstream
          <AllowanceStatsCards
            allowances={filteredAllowances}
            getCalculatedAmount={getCalculatedAmount}
          />
        </div>

        {/* Search and Filters */}
        <AllowanceFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          methodFilter={methodFilter}
          onMethodFilterChange={setMethodFilter}
          onClearFilters={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Results Table */}
        <AllowanceTable
          allowances={filteredAllowances}
          totalAllowances={allowances.length}
          getCalculatedAmount={getCalculatedAmount}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClearFilters={clearAllFilters}
        />

        {/* Form Dialog */}
        <EmployeeAllowanceFormDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingAllowance={editingAllowance}
          allowanceTypes={allowanceTypes}
          institutionId={selectedInstitution.id}
          onSuccess={handleFormSuccess}
          onAllowanceTypeCreated={handleAllowanceTypeCreated}
        />
=======
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 px-2 pt-12">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Allowances</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredAllowances.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Coins2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active Allowances</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredAllowances.filter((a) => a.is_active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarIcon2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Monthly Cost</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredAllowances
                      .filter((a) => a.is_active)
                      .reduce((sum, a) => sum + getCalculatedAmount(a), 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Percent className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Percentage Based</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {filteredAllowances.filter((a) => a.calculation_method === "percentage").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        {/* Search and Filters */}
<div className="bg-white p-4 mb-6 mx-2">
  <div className="flex items-center justify-start gap-4">
    {/* Search Bar */}
    <div className="relative w-full max-w-xl">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by employee name or allowance type..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 focus:ring-orange-500 focus:border-orange-500"
      />
    </div>

    {/* Filters wrapper with customizable left margin */}
    <div className="flex items-center gap-4 ml-20">
      <Select
        value={statusFilter}
        onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}
      >
        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500 w-24 lg:w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={methodFilter}
        onValueChange={(value: "all" | "fixed" | "percentage") => setMethodFilter(value)}
      >
        <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500 w-24 lg:w-36">
          <SelectValue placeholder="Method" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Methods</SelectItem>
          <SelectItem value="fixed">Fixed Amount</SelectItem>
          <SelectItem value="percentage">Percentage</SelectItem>
        </SelectContent>
      </Select>

      {(methodFilter !== "all" || statusFilter !== "all") ? (
        <Button
          onClick={clearAllFilters}
          variant="outline"
          className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
        >
          Clear Filters
        </Button>
      ) : null}
    </div>
  </div>
</div>

        {/* Results Table */}
        <div className="bg-white overflow-hidden mx-2">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Current Allowances
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredAllowances.length} of {allowances.length} records)
              </span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">Overview of all employee allowances and their calculated amounts</p>
          </div>

          {filteredAllowances.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No allowances found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {allowances.length === 0
                  ? "No allowances have been created yet."
                  : "No allowances match your current filters."}
              </p>
              {allowances.length > 0 && (
                <Button onClick={clearAllFilters} variant="outline" className="mt-4 bg-transparent">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
              <TableHeader className="bg-gray-50/50">
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-900">Employee</TableHead>
                  <TableHead className="font-semibold text-gray-900">Allowance Type</TableHead>
                  <TableHead className="font-semibold text-gray-900">Method</TableHead>
                  <TableHead className="font-semibold text-gray-900">Calculated Amount</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Effective Period</TableHead>
                  <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllowances.map((allowance) => (
                  <TableRow key={allowance.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{allowance.employee.user?.fullname}</div>
                        <div className="text-sm text-gray-500">{allowance.employee.email}</div>

                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getCategoryColor()} border font-medium`}
                      >
                        {allowance.allowance_type.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {allowance.calculation_method === "fixed" ? "Fixed" : "Percentage"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-semibold text-orange-600">
                        {getCalculatedAmount(allowance).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={allowance.is_active ? "default" : "secondary"}
                        className={
                          allowance.is_active
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-200 text-gray-700"
                        }
                      >
                        {allowance.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">From: {format(new Date(allowance.effective_from), "MMM dd, yyyy")}</div>
                        {allowance.effective_to && (
                          <div className="text-gray-500">To: {format(new Date(allowance.effective_to), "MMM dd, yyyy")}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleEdit(allowance)}
                            className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                          >
                            <Edit className="h-4 w-4 mr-2 text-orange-600" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(allowance.id)}
                            className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
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
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
  )
}
