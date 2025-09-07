"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, MoreVertical, Edit, Trash2, Search, X } from 'lucide-react'
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  getPaginatedEmployeeDeductions,
  getPaginatedEmployeeDeductionsFromUrl,
  deleteEmployeeDeduction,
  getDeductionTypes,
} from "@/lib/utils"
import { IDeductionType, IEmployeeDeduction } from "@/types/types.utils"
import { PERMISSION_CODES } from "@/constants"
import ProtectedComponent from "@/components/ProtectedComponent"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { EmployeeDeductionFormDialog } from "@/components/employee-deductions/employee-deduction-form-dialog"
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ref } from "process"
import { formatCurrency } from "@/lib/helpers"
import { Icon } from "@iconify/react";


interface ILocalEmployeeDeduction extends IEmployeeDeduction {
  context?: "employee" | "department" | "job_position"
  context_ids?: number[]
}

export default function EmployeeDeductionsPage() {
  const [deductionTypes, setDeductionTypes] = useState<IDeductionType[]>([])
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingDeduction, setEditingDeduction] = useState<IEmployeeDeduction | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [methodFilter, setMethodFilter] = useState<"all" | "fixed" | "percentage">("all")
  const refreshTableRef = useRef<(() => void) | null>(null);
  const [ordering, setOrdering] = useState("");

  const selectedInstitution = useSelector(selectSelectedInstitution)

  useEffect(() => {
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
    fetchDeductionTypes()
  }, [selectedInstitution?.id])

  const getCalculatedAmount = (deduction: IEmployeeDeduction): number => {
    if (deduction.calculation_method === "percentage" && deduction.employee.salary) {
      return (Number(deduction.employee.salary || 0) * parseFloat(deduction.percentage)) / 100
    }
    return parseFloat(deduction.amount) || 0
  }

  const handleEdit = (deduction: IEmployeeDeduction) => {
    setEditingDeduction(deduction)
    setIsFormDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deleteEmployeeDeduction(id)
      if (success) {
        toast.success("Deduction deleted successfully")
      } else {
        toast.error("Failed to delete deduction")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the deduction")
    }
  }

  const handleFormSuccess = (deduction: any, isEdit: boolean) => {
    setEditingDeduction(null)
    toast.success(isEdit ? "Deduction updated successfully" : "Deduction created successfully")
    refreshTableRef.current?.()
  }

  const handleDeductionTypeCreated = (newType: IDeductionType) => {
    setDeductionTypes((prev) => [...prev, newType])
  }

  const openNewDeductionDialog = () => {
    setEditingDeduction(null)
    setIsFormDialogOpen(true)
  }

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm min-h-screen">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Deductions</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employee deductions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={(value: string) => setMethodFilter(value as "all" | "fixed" | "percentage")}>
                <SelectTrigger className="w-full sm:w-[140px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>

            </div>
            <div className="flex items-center gap-2">
              <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_EMPLOYEE_DEDUCTIONS}>
                <Button onClick={openNewDeductionDialog} disabled={!selectedInstitution.id}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Employee Deduction
                </Button>
              </ProtectedComponent>
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<IEmployeeDeduction>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await getPaginatedEmployeeDeductions({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
                ordering,
              });
            }}
            fetchFromUrl={getPaginatedEmployeeDeductionsFromUrl}
            deps={[selectedInstitution?.id, searchTerm, ordering]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({ data, loading, refresh }) => {

              refreshTableRef.current = refresh;

              if (loading) {
                return <TableSkeleton rows={10} columns={7} />;
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? "No deductions found matching your search criteria"
                      : "No employee deductions found"}
                  </div>
                );
              }

              // Apply client-side filters (status and method filters)
              const filteredResults = data.results.filter((deduction) => {
                const matchesStatus =
                  statusFilter === "all" ||
                  (statusFilter === "active" && deduction.is_active) ||
                  (statusFilter === "inactive" && !deduction.is_active);

                const matchesMethod =
                  methodFilter === "all" ||
                  deduction.calculation_method === methodFilter;

                return matchesStatus && matchesMethod;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No deductions found matching the selected filters.
                  </div>
                );
              }

              return (
                <>
                  <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_EMPLOYEE_DEDUCTIONS}>
                    {/* Desktop Table */}
                    <div className="hidden sm:block rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <div className="flex items-center justify-start gap-4">
                                <span>Employee</span>
                                <Button
                                  onClick={() => {
                                    if (ordering === "employee__user__fullname") {
                                      setOrdering("");
                                    } else {
                                      setOrdering("employee__user__fullname");
                                    }
                                  }}
                                  size={"sm"}
                                  variant={ordering === "employee__user__fullname" ? "default" : "outline"}
                                  type="button"
                                >
                                  <Icon icon="hugeicons:sorting-02" className="!h-5 !w-5" />
                                </Button>
                              </div>
                            </TableHead>
                            <TableHead>Deduction Type</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>
                              <div className="flex items-center justify-start gap-4">
                                <span>Amount</span>
                                <Button
                                  onClick={() => {
                                    if (ordering === "amount") {
                                      setOrdering("");
                                    } else {
                                      setOrdering("amount");
                                    }
                                  }}
                                  size={"sm"}
                                  variant={ordering === "amount" ? "default" : "outline"}
                                  type="button"
                                >
                                  <Icon icon="hugeicons:sorting-02" className="!h-5 !w-5" />
                                </Button>
                              </div>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created Date</TableHead>
                            <TableHead className="w-12">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredResults.map((deduction) => (
                            <TableRow key={deduction.id}>
                              <TableCell className="font-medium">
                                {deduction.employee.user?.fullname || "Unknown Employee"}
                              </TableCell>
                              <TableCell>{deduction.deduction_type.name}</TableCell>
                              <TableCell>
                                <Badge className={
                                  deduction.calculation_method === "percentage"
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : "bg-purple-100 text-purple-800 border-purple-200"
                                }>
                                  {deduction.calculation_method === "percentage" ? "Percentage" : "Fixed Amount"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {`${formatCurrency(deduction.amount)}`}
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  deduction.is_active
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }>
                                  {deduction.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(deduction.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEE_DEDUCTIONS}>
                                      <DropdownMenuItem onClick={() => handleEdit(deduction)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                    </ProtectedComponent>
                                    <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_EMPLOYEE_DEDUCTIONS}>
                                      <DropdownMenuItem onClick={() => handleDelete(deduction.id)} className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </ProtectedComponent>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ProtectedComponent>
                  <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_EMPLOYEE_DEDUCTIONS}>
                    <div className="sm:hidden space-y-3">
                      {filteredResults.map((deduction) => (
                        <div key={deduction.id} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {deduction.employee.user?.fullname || 'Unknown Employee'}
                              </h3>
                              <p className="text-sm text-gray-600">Type: {deduction.deduction_type.name}</p>
                              <p className="text-sm text-gray-600">Method: {deduction.calculation_method === "percentage" ? "Percentage" : "Fixed Amount"}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={
                                  deduction.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"
                                }>
                                  {deduction.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  Created: {new Date(deduction.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                </span>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEE_DEDUCTIONS}>
                                  <DropdownMenuItem onClick={() => handleEdit(deduction)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                </ProtectedComponent>
                                <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_EMPLOYEE_DEDUCTIONS}>
                                  <DropdownMenuItem onClick={() => handleDelete(deduction.id)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </ProtectedComponent>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ProtectedComponent>
                </>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>



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