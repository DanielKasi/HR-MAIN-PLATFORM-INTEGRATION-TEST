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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Allowances</h1>
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
                disabled={!selectedInstitution.id}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Allowance
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
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
      </div>
    </div>
  )
}
