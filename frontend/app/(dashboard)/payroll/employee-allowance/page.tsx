"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, MoreVertical, Edit, Trash2, Search, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useSelector } from "react-redux"
import { TableSkeleton } from "@/components/common/table-skeleton"
import {
  getPaginatedEmployeeAllowances,
  getPaginatedEmployeeAllowancesFromUrl,
  deleteEmployeeAllowance,
  getAllowanceTypes,
  getAllEmployees,
} from "@/lib/utils"
import type { IEmployeeAllowance, IAllowanceType, IEmployee } from "@/types/types.utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { EmployeeAllowanceFormDialog } from "@/components/employee-allowances/employee-allowance-form-dialog"

import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export default function EmployeeAllowancesPage() {
  const [allowanceTypes, setAllowanceTypes] = useState<IAllowanceType[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAllowance, setEditingAllowance] = useState<IEmployeeAllowance | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [methodFilter, setMethodFilter] = useState<"all" | "fixed" | "percentage">("all")
  const [refreshFunction, setRefreshFunction] = useState<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const refreshTableRef = useRef<(() => void) | null>(null);


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
      setEmployees(fetchedEmployees.results || [])
    } catch (error: any) {
      setEmployees([])
      toast.error(error?.message || error?.detail || "Failed to load employees")
    } finally {
      setIsLoadingEmployees(false)
      setIsLoading(false)
    }
  }


  const getCalculatedAmount = (allowance: IEmployeeAllowance): number => {
    if (allowance.calculation_method === "percentage" && allowance.employee.salary) {
      return (Number(allowance.employee.salary || 0) * Number.parseFloat(allowance.percentage)) / 100
    }
    return Number.parseFloat(allowance.amount) || 0
  }

  const handleFormSuccess = (allowance: any, isEdit: boolean) => {
    setEditingAllowance(null)
    if (refreshFunction) {
      refreshFunction();
    }
    toast.success(isEdit ? "Allowance updated successfully" : "Allowance created successfully")
    refreshTableRef.current?.();
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
        if (refreshFunction) {
          refreshFunction();
        }
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

 


  if (!selectedInstitution || !selectedInstitution.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution selected...</span>
      </div>
    )
  }

    return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Allowances</h1>
              
            </div>
                </div>
              </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employee allowances..."
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
              <Button
                onClick={openNewAllowanceDialog}
                disabled={!selectedInstitution.id}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Allowance
              </Button>
            </div>
          </div>

         
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<IEmployeeAllowance>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await getPaginatedEmployeeAllowances({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={getPaginatedEmployeeAllowancesFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {

              useEffect(() => {
                refreshTableRef.current = refresh;
              }, [refresh]);
        
            // setRefreshFunction(refresh)
              if (loading) {
                return <TableSkeleton rows={10} columns={8} />;
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No allowances found matching your search criteria" : "No employee allowances found"}
                  </div>
                );
              }

              // Apply client-side filters (status and method filters)
              const filteredResults = data.results.filter((allowance) => {
                const matchesStatus = statusFilter === "all" || 
                  (statusFilter === "active" && allowance.is_active) ||
                  (statusFilter === "inactive" && !allowance.is_active);
                
                const matchesMethod = methodFilter === "all" || 
                  allowance.calculation_method === methodFilter;
                
                return matchesStatus && matchesMethod;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No allowances found matching the selected filters.
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Allowance Type</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created Date</TableHead>
                          <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((allowance) => (
                          <TableRow key={allowance.id}>
                            <TableCell className="font-medium">
                              {allowance.employee.user?.fullname || 'Unknown Employee'}
                            </TableCell>
                            <TableCell>
                              {allowance.allowance_type.name}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                allowance.calculation_method === "percentage" 
                                  ? "bg-blue-100 text-blue-800 border-blue-200" 
                                  : "bg-green-100 text-green-800 border-green-200"
                              }>
                                {allowance.calculation_method === "percentage" ? "Percentage" : "Fixed Amount"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {allowance.calculation_method === "percentage" 
                                ? `${allowance.percentage}%` 
                                : `$${Number.parseFloat(allowance.amount).toFixed(2)}`
                              }
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                allowance.is_active 
                                  ? "bg-green-100 text-green-800 border-green-200" 
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }>
                                {allowance.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(allowance.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(allowance)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(allowance.id)}
                                    className="text-red-600"
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

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-3">
                    {filteredResults.map((allowance) => (
                      <div key={allowance.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {allowance.employee.user?.fullname || 'Unknown Employee'}
                              </h3>
                            </div>
                            <div className="space-y-1 mb-2">
                              <p className="text-sm text-gray-600">
                                Type: {allowance.allowance_type.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Method: {allowance.calculation_method === "percentage" ? "Percentage" : "Fixed Amount"}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  allowance.is_active 
                                    ? "bg-green-100 text-green-800 border-green-200" 
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }>
                                  {allowance.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  Created: {new Date(allowance.created_at).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(allowance)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(allowance.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>

     

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
  );
};
