"use client"

import React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Leaf,
} from "lucide-react"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { getAllLeaveBalances, createLeaveBalance, updateLeaveBalance, deleteLeaveBalance } from "@/lib/utils"
import { getAllEmployees } from "@/lib/utils"
import { getLeaveTypes } from "@/lib/utils"
import { ILeaveBalance, EmployeeFromAPI, ILeaveType } from "@/app/types/types.utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const years = [2023, 2024, 2025, 2026]

// Define grouped employee interface
interface GroupedEmployee {
  employeeId: number
  employeeName: string
  employeeCode: string
  leaveBalances: ILeaveBalance[]
  totalAvailable: number
  status: 'good' | 'low' | 'overused'
}

export default function LeaveBalanceComponent() {
  const selectedInstitution = useSelector(selectSelectedInstitution)
  
  // State management
  const [data, setData] = useState<ILeaveBalance[]>([])
  const [employees, setEmployees] = useState<EmployeeFromAPI[]>([])
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterYear, setFilterYear] = useState("2025")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ILeaveBalance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    employee: "",
    leave_type: "",
    year: new Date().getFullYear(),
    allocated_days: "",
    used_days: "",
    pending_days: "",
    carried_forward_days: "",
  })

  // Calculate available days
  const calculateAvailable = (item: typeof formData) => {
    const allocated = parseFloat(item.allocated_days) || 0
    const used = parseFloat(item.used_days) || 0
    const pending = parseFloat(item.pending_days) || 0
    const carriedForward = parseFloat(item.carried_forward_days) || 0
    return allocated + carriedForward - used - pending
  }

  // Optimized data fetching - fetch all data in parallel
  const fetchAllData = useCallback(async () => {
    if (!selectedInstitution?.id) {
      setData([])
      setEmployees([])
      setLeaveTypes([])
      return
    }

    setIsLoading(true)
    try {
      // Fetch all data in parallel instead of sequentially
      const [balances, employeeData, types] = await Promise.all([
        getAllLeaveBalances({ institutionId: selectedInstitution.id }),
        getAllEmployees({ institutionId: selectedInstitution.id }),
        getLeaveTypes({ institutionId: selectedInstitution.id })
      ])
      
      setData(balances)
      setEmployees(employeeData)
      setLeaveTypes(types)
    } catch (error) {
      toast.error("Failed to load data")
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedInstitution?.id])

  // Effects
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Memoized helper functions to avoid recalculation
  const getEmployeeName = useCallback((employee: any) => {
    if (typeof employee === 'object' && employee?.user?.fullname) {
      return employee.user.fullname
    }
    const emp = employees.find(emp => emp.id === employee)
    return emp?.user?.fullname || 'Unknown Employee'
  }, [employees])

  const getEmployeeCode = useCallback((employee: any) => {
    if (typeof employee === 'object' && employee?.employee_id !== undefined) {
      return employee.employee_id
    }
    const emp = employees.find(emp => emp.id === employee)
    //return emp?.employee_id || 'N/A'
  }, [employees])

  const getLeaveTypeName = useCallback((leaveType: any) => {
    if (typeof leaveType === 'object' && leaveType?.name) {
      return leaveType.name
    }
    const type = leaveTypes.find(type => type.id === leaveType)
    return type ? type.name : 'Unknown Leave Type'
  }, [leaveTypes])

  const getEmployeeId = (employee: any) => {
    return typeof employee === 'object' ? employee.id : employee
  }

  const getLeaveTypeId = (leaveType: any) => {
    return typeof leaveType === 'object' ? leaveType.id : leaveType
  }

  // Group employees with their leave balances - optimized
  const groupedEmployees = useMemo((): GroupedEmployee[] => {
    const filtered = data.filter((item) => {
      const employeeName = getEmployeeName(item.employee)
      const employeeCode = getEmployeeCode(item.employee)
      const leaveTypeName = getLeaveTypeName(item.leave_type)
      
      const matchesSearch =
        employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || leaveTypeName === filterType
      const matchesYear = filterYear === "all" || item.year.toString() === filterYear
      return matchesSearch && matchesType && matchesYear
    })

    const grouped = new Map<number, GroupedEmployee>()

    filtered.forEach(item => {
      const employeeId = getEmployeeId(item.employee)
      const employeeName = getEmployeeName(item.employee)
      const employeeCode = getEmployeeCode(item.employee)

      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, {
          employeeId,
          employeeName,
          employeeCode,
          leaveBalances: [],
          totalAvailable: 0,
          status: 'good'
        })
      }

      const group = grouped.get(employeeId)!
      group.leaveBalances.push(item)
    })

    // Calculate total available and status for each employee
    return Array.from(grouped.values()).map(group => {
      const totalAvailable = group.leaveBalances.reduce((sum, balance) => {
        const available = typeof balance.available_days === 'string' 
          ? parseFloat(balance.available_days) 
          : balance.available_days
        return sum + available
      }, 0)

      let status: 'good' | 'low' | 'overused' = 'good'
      if (totalAvailable < 0) {
        status = 'overused'
      } else if (totalAvailable <= 5) {
        status = 'low'
      }

      return {
        ...group,
        totalAvailable,
        status
      }
    })
  }, [data, searchTerm, filterType, filterYear, getEmployeeName, getEmployeeCode, getLeaveTypeName])

  // Pagination calculations
  const totalPages = Math.ceil(groupedEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = groupedEmployees.slice(startIndex, endIndex)
  const startRecord = startIndex + 1
  const endRecord = Math.min(endIndex, groupedEmployees.length)

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterYear])

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToFirstPage = () => setCurrentPage(1)
  const goToLastPage = () => setCurrentPage(totalPages)
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1))
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1))

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  // Get status badge for grouped employee
  const getStatusBadge = (status: 'good' | 'low' | 'overused') => {
    switch (status) {
      case 'overused':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overused</Badge>
      case 'low':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Low</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Good</Badge>
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution?.id) {
      toast.error("Institution not selected")
      return
    }

    if (!formData.employee || !formData.leave_type) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const leaveBalanceData = {
        employee: parseInt(formData.employee),
        leave_type: parseInt(formData.leave_type),
        year: formData.year,
        allocated_days: formData.allocated_days,
        used_days: formData.used_days,
        pending_days: formData.pending_days,
        carried_forward_days: formData.carried_forward_days,
      }

      if (editingItem) {
        await updateLeaveBalance({
          id: editingItem.id,
          leaveBalanceData,
        })
        toast.success("Leave balance updated successfully")
      } else {
        await createLeaveBalance({
          institutionId: selectedInstitution.id,
          leaveBalanceData,
        })
        toast.success("Leave balance created successfully")
      }

      // Only refetch leave balances, not all data
      const balances = await getAllLeaveBalances({ institutionId: selectedInstitution.id })
      setData(balances)
      
      setFormData({
        employee: "",
        leave_type: "",
        year: new Date().getFullYear(),
        allocated_days: "",
        used_days: "",
        pending_days: "",
        carried_forward_days: "",
      })
      setEditingItem(null)
      setIsDialogOpen(false)
    } catch (error) {
      toast.error("Failed to save leave balance")
      console.error("Error saving leave balance:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle view - navigate to employee detail page with loading feedback
 const handleView = (employeeId: number) => {
  // Show immediate loading feedback
  toast.loading("Loading employee details...", { id: `loading-${employeeId}` })
  
  // Updated to match your URL structure
  router.push(`/leave/leave-balances/${employeeId}`)  // Changed from leave-balances/${employeeId}
}

  // Handle edit - find first leave balance for the employee
  const handleEdit = (group: GroupedEmployee) => {
    const firstBalance = group.leaveBalances[0]
    if (firstBalance) {
      setEditingItem(firstBalance)
      setFormData({
        employee: getEmployeeId(firstBalance.employee).toString(),
        leave_type: getLeaveTypeId(firstBalance.leave_type).toString(),
        year: firstBalance.year,
        allocated_days: firstBalance.allocated_days,
        used_days: firstBalance.used_days,
        pending_days: firstBalance.pending_days,
        carried_forward_days: firstBalance.carried_forward_days,
      })
      setIsDialogOpen(true)
    }
  }

  // Handle delete - delete all leave balances for employee with optimistic update
  const handleDelete = async (group: GroupedEmployee) => {
    if (!confirm(`Are you sure you want to delete all leave balance records for ${group.employeeName}?`)) return

    try {
      // Optimistic update - remove from UI first
      const updatedData = data.filter(item => {
        const employeeId = getEmployeeId(item.employee)
        return employeeId !== group.employeeId
      })
      setData(updatedData)

      // Delete all leave balances for this employee
      await Promise.all(
        group.leaveBalances.map(balance => 
          deleteLeaveBalance({ id: balance.id })
        )
      )
      
      toast.success("Leave balances deleted successfully")
    } catch (error) {
      toast.error("Failed to delete leave balances")
      console.error("Error deleting leave balances:", error)
      // Revert optimistic update on error
      await fetchAllData()
    }
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i)
        }
      }
    }

    return pages
  }

  // Get unique years from data - memoized
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    data.forEach(item => {
      years.add(item.year)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [data])

  // Set default filter year to the most recent year when data loads
  useEffect(() => {
    if (availableYears.length > 0 && filterYear === "all") {
      setFilterYear(availableYears[0].toString())
    }
  }, [availableYears, filterYear])

  // Get unique leave type names for filter - memoized
  const uniqueLeaveTypes = useMemo(() => {
    const types = new Set<string>()
    data.forEach(item => {
      const typeName = getLeaveTypeName(item.leave_type)
      if (typeName !== 'Unknown Leave Type') {
        types.add(typeName)
      }
    })
    return Array.from(types)
  }, [data, getLeaveTypeName])

  if (!selectedInstitution?.id) {
    return (
      <div className="p-6 text-center">
        <Leaf className="w-12 h-12 text-orange-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Institution Selected</h3>
        <p className="text-gray-600">Please select an institution to manage leave balances.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Leaf className="w-8 h-8 text-orange-600" />
            Leave Balance
          </h1>
          <p className="text-gray-600">Manage employee leave balances</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Balance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-orange-900">{editingItem ? "Edit" : "Add"} Leave Balance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select
                    value={formData.employee}
                    onValueChange={(value) => setFormData({ ...formData, employee: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-orange-200 focus:border-orange-500">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.user?.fullname || 'Unknown Employee'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-orange-200 focus:border-orange-500">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, year: Number.parseInt(value) })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="border-orange-200 focus:border-orange-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Allocated Days</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.allocated_days}
                    onChange={(e) => setFormData({ ...formData, allocated_days: e.target.value })}
                    className="border-orange-200 focus:border-orange-500"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Used Days</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.used_days}
                    onChange={(e) => setFormData({ ...formData, used_days: e.target.value })}
                    className="border-orange-200 focus:border-orange-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pending Days</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pending_days}
                    onChange={(e) => setFormData({ ...formData, pending_days: e.target.value })}
                    className="border-orange-200 focus:border-orange-500"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carried Forward</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.carried_forward_days}
                    onChange={(e) => setFormData({ ...formData, carried_forward_days: e.target.value })}
                    className="border-orange-200 focus:border-orange-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-orange-900">Available Days:</span>
                  <span className="text-lg font-bold text-orange-700">{calculateAvailable(formData)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingItem ? "Update" : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingItem(null)
                    setFormData({
                      employee: "",
                      leave_type: "",
                      year: new Date().getFullYear(),
                      allocated_days: "",
                      used_days: "",
                      pending_days: "",
                      carried_forward_days: "",
                    })
                  }}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center flex-1">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
                <Input
                  placeholder="Search by name or employee code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-orange-200 focus:border-orange-500"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48 border-orange-200 focus:border-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leave Types</SelectItem>
                  {uniqueLeaveTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-32 border-orange-200 focus:border-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 whitespace-nowrap">Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20 h-8 border-orange-200 focus:border-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-orange-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Employee Leave Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              <span className="ml-2 text-gray-600">Loading leave balances...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">Employee</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center">Leave Types</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center">Total Available</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((group) => (
                    <TableRow key={group.employeeId} className="hover:bg-orange-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{group.employeeName}</div>
                          <div className="text-sm text-gray-500">{group.employeeCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {group.leaveBalances.length} {group.leaveBalances.length === 1 ? 'Type' : 'Types'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className={`text-center font-bold text-lg ${
                        group.status === 'overused' ? 'text-red-600' : 
                        group.status === 'low' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {group.totalAvailable.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(group.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(group.employeeId)}
                            className="h-8 w-8 p-0 hover:bg-orange-100"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(group)}
                            className="h-8 w-8 p-0 hover:bg-orange-100"
                            title="Edit Record"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(group)}
                            className="h-8 w-8 p-0 hover:bg-orange-100"
                            title="Delete Records"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {groupedEmployees.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Leaf className="w-12 h-12 text-orange-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Records Found</h3>
                  <p className="text-gray-600">No leave balance records match your search criteria.</p>
                </div>
              )}

              {/* Pagination */}
              {groupedEmployees.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {startRecord} to {endRecord} of {groupedEmployees.length} employees
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0 bg-transparent border-orange-300 hover:bg-orange-50"
                    >
                      <ChevronsLeft className="w-4 h-4 text-orange-700" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0 bg-transparent border-orange-300 hover:bg-orange-50"
                    >
                      <ChevronLeft className="w-4 h-4 text-orange-700" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className={`h-8 w-8 p-0 ${
                            currentPage === pageNum
                              ? "bg-orange-600 hover:bg-orange-700 text-white"
                              : "border-orange-300 text-orange-700 hover:bg-orange-50"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0 bg-transparent border-orange-300 hover:bg-orange-50"
                    >
                      <ChevronRight className="w-4 h-4 text-orange-700" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0 bg-transparent border-orange-300 hover:bg-orange-50"
                    >
                      <ChevronsRight className="w-4 h-4 text-orange-700" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}