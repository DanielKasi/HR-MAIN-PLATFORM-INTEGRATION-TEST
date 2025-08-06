"use client"

import { useState, useEffect } from "react"
import { Plus, Users } from 'lucide-react'
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { toast } from "sonner"
import {
  getEmployeeDeductions,
  updateEmployeeDeduction,
  deleteEmployeeDeduction,
  getAllEmployees,
  getDeductionTypes,
} from "@/lib/utils"
import {
  IDeductionType,
  IDepartment,
  IEmployee,
  IEmployeeDeduction,
} from "@/app/types/types.utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { CreateDeductionTypeDialog } from "@/components/deduction-types/create-deduction-type-dialog"
import { EmployeeDeductionFormDialog } from "@/components/employee-deductions/employee-deduction-form-dialog"
import { DeductionStatsCards } from "@/components/employee-deductions/deduction-stats-cards"
import { DeductionFilters } from "@/components/employee-deductions/deduction-filters"
import { DeductionExportMenu } from "@/components/employee-deductions/deduction-export-menu"
import { DeductionTable } from "@/components/employee-deductions/deduction-table"



interface ILocalEmployeeDeduction extends IEmployeeDeduction {
  context?: "employee" | "department" | "job_position"
  context_ids?: number[]
}

export default function EmployeeDeductionsRefactored() {
  const [deductions, setDeductions] = useState<IEmployeeDeduction[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [deductionTypes, setDeductionTypes] = useState<IDeductionType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingDeduction, setEditingDeduction] = useState<ILocalEmployeeDeduction | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [methodFilter, setMethodFilter] = useState<"all" | "fixed" | "percentage">("all")

  const selectedInstitution = useSelector(selectSelectedInstitution)

  useEffect(() => {
    if (selectedInstitution?.id) {
      fetchData()
    }
  }, [selectedInstitution])

  const fetchData = async () => {
    if (!selectedInstitution?.id) return

    setIsLoading(true)
    try {
      await Promise.all([
        fetchDeductions(),
        fetchEmployees(),
        fetchDeductionTypes(),
      ])
    } catch (error) {
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDeductions = async () => {
    if (!selectedInstitution?.id) return
    try {
      const deductionsData = await getEmployeeDeductions(selectedInstitution.id)
      setDeductions(deductionsData)
    } catch (error) {
      setDeductions([])
      toast.error("Failed to load deductions")
    }
  }

  const fetchEmployees = async () => {
    if (!selectedInstitution?.id) return
    try {
      const fetchedEmployees = await getAllEmployees({ institutionId: selectedInstitution.id })
      setEmployees(fetchedEmployees)
    } catch (error: any) {
      setEmployees([])
      toast.error(error?.detail || error?.message || "Failed to load employees")
    }
  }

  const fetchDeductionTypes = async () => {
    if (!selectedInstitution?.id) return
    try {
      const types = await getDeductionTypes(selectedInstitution.id)
        setDeductionTypes(types)
    } catch (error) {
      setDeductionTypes([])
      toast.error("Failed to load deduction types")
    }
  }

  const getCalculatedAmount = (deduction: IEmployeeDeduction): number => {
    if (deduction.calculation_method === "percentage" && deduction.employee.salary) {
      return (Number(deduction.employee.salary || 0) * parseFloat(deduction.percentage)) / 100
    }
    return parseFloat(deduction.amount) || 0
  }

  const handleEdit = (deduction: IEmployeeDeduction) => {
    setEditingDeduction(deduction as ILocalEmployeeDeduction)
    setIsFormDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deleteEmployeeDeduction(id)
      if (success) {
        setDeductions((prev) => prev.filter((d) => d.id !== id))
        toast.success("Deduction deleted successfully")
      } else {
        toast.error("Failed to delete deduction")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the deduction")
    }
  }

  const handleFormSuccess = (deduction: any, isEdit: boolean) => {
    if (isEdit) {
      setDeductions((prev) =>
        prev.map((d) => (d.id === deduction.id ? deduction : d))
      )
      toast.success("Deduction updated successfully")
    } else {
      setDeductions((prev) => [...prev, deduction])
      toast.success("Deduction created successfully")
    }
    setEditingDeduction(null)
  }

  const handleDeductionTypeCreated = (newType: IDeductionType) => {
    setDeductionTypes((prev) => [...prev, newType])
  }

  const openNewDeductionDialog = () => {
    setEditingDeduction(null)
    setIsFormDialogOpen(true)
  }

  const filteredDeductions = deductions.filter((deduction) => {
    const matchesSearch = deduction.employee.user?.fullname
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && deduction.is_active) ||
      (statusFilter === "inactive" && !deduction.is_active)

    const matchesMethod = methodFilter === "all" || deduction.calculation_method === methodFilter

    return matchesSearch && matchesStatus && matchesMethod
  })

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setMethodFilter("all")
  }

  if (!selectedInstitution?.id) {
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
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header Section */}
      <div className="mb-8 px-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Deductions</h1>
            <p className="text-gray-600">
              Manage employee-specific deductions and their calculation methods
            </p>
          </div>
          <div className="flex gap-3">
            <DeductionExportMenu
              deductions={filteredDeductions}
              getCalculatedAmount={getCalculatedAmount}
              disabled={filteredDeductions.length === 0}
            />

            {/* <CreateDeductionTypeDialog
              onSuccess={handleDeductionTypeCreated}
              disabled={!selectedInstitution?.id}
              isEmbedded={true}
            /> */}

            <Button
              onClick={openNewDeductionDialog}
              disabled={!selectedInstitution?.id}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Deduction
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <DeductionStatsCards
        deductions={filteredDeductions}
        getCalculatedAmount={getCalculatedAmount}
      />

      {/* Search and Filters */}
      <DeductionFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        methodFilter={methodFilter}
        onMethodFilterChange={setMethodFilter}
        onClearFilters={clearAllFilters}
      />

      {/* Results Table */}
      <DeductionTable
        deductions={filteredDeductions}
        totalDeductions={deductions.length}
        getCalculatedAmount={getCalculatedAmount}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClearFilters={clearAllFilters}
      />

      {/* Form Dialog */}
      <EmployeeDeductionFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        editingDeduction={editingDeduction}
        deductionTypes={deductionTypes}
        institutionId={selectedInstitution.id}
        onSuccess={handleFormSuccess}
        onDeductionTypeCreated={handleDeductionTypeCreated}
      />
    </div>
  )
}
