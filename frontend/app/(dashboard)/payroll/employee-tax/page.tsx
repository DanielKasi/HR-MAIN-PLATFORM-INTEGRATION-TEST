"use client"

import { useState, useEffect } from "react"
import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSelector } from "react-redux"
import { Card, CardHeader } from "@/components/ui/card"
import { TableSkeleton } from "@/components/common/table-skeleton"
import {
  taxAPI,
  getAllEmployees,
} from "@/lib/utils"
import type { IEmployeeTax, IEmployee, ITax } from "@/types/types.utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { EmployeeTaxFormDialog } from "@/components/employee-taxes/employee-tax-form-dialog"
import { TaxStatsCards } from "@/components/employee-taxes/tax-stats-cards"
import { TaxFilters } from "@/components/employee-taxes/tax-filters"
import { TaxExportMenu } from "@/components/employee-taxes/tax-export-menu"
import { TaxTable } from "@/components/employee-taxes/tax-table"


export default function EmployeeTaxesPage() {
  const [taxes, setTaxes] = useState<IEmployeeTax[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [taxTypes, setTaxTypes] = useState<ITax[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTax, setEditingTax] = useState<IEmployeeTax | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired" | "upcoming">("all")
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const selectedInstitution = useSelector(selectSelectedInstitution)

  useEffect(() => {
    const fetchTaxTypes = async () => {
      if (!selectedInstitution?.id) {
        return
      }

      try {
        const types = await taxAPI.getAll()
        setTaxTypes(types || [])
      } catch (error) {
        setTaxTypes([])
        toast.error("Failed to load tax types")
      }
    }

    fetchTaxTypes()
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
    const fetchTaxes = async () => {
      if (!selectedInstitution) {
        return
      }

      try {
        const taxesData = await taxAPI.getAllEmployeeTaxes({})
        setTaxes((taxesData.results as unknown as IEmployeeTax[]) || [])
      } catch (error) {
        setTaxes([])
       
      }
    }

    fetchTaxes()
  }, [selectedInstitution])

  const handleFormSuccess = (tax: IEmployeeTax, isEdit: boolean) => {
    if (isEdit) {
      setTaxes(prev => prev.map(t => t.id === tax.id ? tax : t))
    } else {
      setTaxes(prev => [...prev, tax])
    }
    setEditingTax(null)
  }

  const handleTaxTypeCreated = (newType: ITax) => {
    setTaxTypes(prev => [...prev, newType])
  }

  const handleEdit = (tax: IEmployeeTax) => {
    setEditingTax(tax)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await taxAPI.deleteEmployeeTax(id)
      if (success) {
        setTaxes(prev => prev.filter(t => t.id !== id))
        toast.success("Employee tax deleted successfully")
      } else {
        toast.error("Failed to delete employee tax")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the employee tax")
    }
  }

  const openNewTaxDialog = () => {
    setEditingTax(null)
    setIsDialogOpen(true)
  }

  const filteredTaxes = taxes.filter((tax) => {
    // Search filter
    const matchesSearch =
      tax.employee.user?.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tax.institution_tax.tax_name.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    const now = new Date()
    const effectiveFrom = new Date(tax.effective_from)
    const effectiveTo = tax.effective_to ? new Date(tax.effective_to) : null
    
    let matchesStatus = true
    if (statusFilter === "active") {
      matchesStatus = effectiveFrom <= now && (!effectiveTo || effectiveTo >= now)
    } else if (statusFilter === "inactive") {
      matchesStatus = effectiveFrom > now
    } else if (statusFilter === "expired") {
      matchesStatus = effectiveTo !== null && effectiveTo < now
    } else if (statusFilter === "upcoming") {
      matchesStatus = effectiveFrom > now
    }

    return matchesSearch && matchesStatus
  })

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
  }

  const hasActiveFilters = statusFilter !== "all"

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Tax Configurations</h1>
              <p className="text-gray-600">Manage employee-specific tax configurations and settings</p>
            </div>
            <div className="flex gap-3">
              <TaxExportMenu
                taxes={filteredTaxes}
                disabled={filteredTaxes.length === 0}
              />

              <Button
                onClick={openNewTaxDialog}
                disabled={!selectedInstitution.id}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Tax Configuration
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <TaxStatsCards
            taxes={filteredTaxes}
          />
        </div>

        {/* Search and Filters */}
        <TaxFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Results Table */}
        <TaxTable
          taxes={filteredTaxes}
          totalTaxes={taxes.length}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClearFilters={clearAllFilters}
        />

        {/* Form Dialog */}
        <EmployeeTaxFormDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingTax={editingTax}
          taxes={taxTypes}
          institutionId={selectedInstitution.id}
          onSuccess={handleFormSuccess}
          onTaxCreated={handleTaxTypeCreated}
        />
      </div>
    </div>
  )
}
