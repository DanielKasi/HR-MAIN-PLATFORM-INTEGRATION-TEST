"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Loader2,
  Info,
  AlertTriangle,
  Eye,
  MoreHorizontal
} from "lucide-react"
import { toast } from "sonner"

import {
  createPayrollPeriod,
  getPayrollPeriods,
  updatePayrollPeriod,
  deletePayrollPeriod,
  validatePayrollPeriodFormData,
  generatePeriodName,
  checkPeriodOverlap,
} from "@/lib/utils"
import { IPayrollPeriod, IPayrollPeriodFormData } from "@/app/types/types.utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"
import { useSelector } from "react-redux"
import { select } from "redux-saga/effects"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface PayrollPeriodsProps {
  institutionId?: number
}

interface ValidationResult {
  name?: string
  start_date?: string
  end_date?: string
  pay_date?: string
  warning?: string
}

export default function PayrollPeriods() {
  const [payrollPeriods, setPayrollPeriods] = useState<IPayrollPeriod[]>([])
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<IPayrollPeriod | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({})

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "processed" | "pending">("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions)
  // const [institutionId, setInstitutionId] = useState<number | null>(propInstitutionId || null)

  // Filtered payroll periods logic
  const filteredPeriods = payrollPeriods.filter((period) => {
    const matchesSearch = period.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "processed" && period.is_processed) ||
      (filterStatus === "pending" && !period.is_processed)

    return matchesSearch && matchesStatus
  })

  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    pay_date: "",
  })

  useEffect(() => {
    const fetchPayrollPeriods = async () => {
      if (!selectedInstitution?.id) {
        return
      }

      try {
        const periodsData = await getPayrollPeriods(selectedInstitution?.id)

        if (periodsData && Array.isArray(periodsData)) {
          setPayrollPeriods(periodsData)
        } else {
          setPayrollPeriods([])
        }
      } catch (error) {
        console.warn("Error fetching payroll periods:", error)
        setPayrollPeriods([])
        toast.error("Failed to load payroll periods")
      }
    }

    fetchPayrollPeriods()
  }, [selectedInstitution?.id])

  useEffect(() => {
    const fetchPayrollPeriods = async () => {
      if (!selectedInstitution?.id) {
        return
      }

      try {
        const periodsData = await getPayrollPeriods(selectedInstitution?.id)

        if (periodsData && Array.isArray(periodsData)) {
          setPayrollPeriods(periodsData)
        } else {
          setPayrollPeriods([])
        }
      } catch (error) {
        console.error("Error fetching payroll periods:", error)
        setPayrollPeriods([])
        toast.error("Failed to load payroll periods")
      }
    }

    fetchPayrollPeriods()
  }, [selectedInstitution?.id])

  // Auto-generate period name when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date && !editingPeriod) {
      const generatedName = generatePeriodName(formData.start_date, formData.end_date)
      if (formData.name === "" || formData.name === generatePeriodName(formData.start_date, formData.end_date)) {
        setFormData(prev => ({ ...prev, name: generatedName }))
      }
    }
  }, [formData.start_date, formData.end_date, editingPeriod])

  // Validate form and update validation errors
  useEffect(() => {
    const errors: ValidationResult = {}

    if (isModalOpen) {
      // Only show validation errors for fields that have been interacted with
      if (formData.name && formData.name.trim().length < 3) {
        errors.name = 'Period name must be at least 3 characters long'
      }

      if (formData.start_date && formData.end_date) {
        if (new Date(formData.end_date) <= new Date(formData.start_date)) {
          errors.end_date = 'End date must be after start date'
        }
      }

      if (formData.pay_date && formData.end_date) {
        if (new Date(formData.pay_date) < new Date(formData.end_date)) {
          errors.pay_date = 'Pay date should typically be after the period end date'
        }
      }

      // Duration validation
      if (formData.start_date && formData.end_date) {
        const duration = Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24))
        if (duration > 365) {
          errors.warning = 'This period is longer than a year. Please verify the dates are correct.'
        } else if (duration < 1) {
          errors.end_date = 'Period must be at least 1 day long'
        }
      }
    }

    setValidationErrors(errors)
  }, [formData, isModalOpen])

  const hasValidationErrors = () => {
    // Check for missing required fields
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.pay_date) {
      return true
    }

    // Check for validation errors in the state
    const errorKeys = Object.keys(validationErrors).filter(key => key !== 'warning')
    return errorKeys.length > 0
  }

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      pay_date: "",
    })
    setEditingPeriod(null)
    setValidationErrors({})
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution?.id) {
      toast.error("Institution ID is required")
      return
    }

    if (hasValidationErrors()) {
      toast.error("Please fix the validation errors before submitting")
      return
    }

    if (validationErrors.warning) {
      toast.warning(validationErrors.warning)
    }

    // Check for overlapping periods
    try {
      const overlapCheck = await checkPeriodOverlap({
        institutionId: selectedInstitution?.id,
        startDate: formData.start_date,
        endDate: formData.end_date,
        excludeId: editingPeriod?.id
      })

      if (overlapCheck.hasOverlap) {
        const overlappingNames = overlapCheck.overlappingPeriods.map(p => p.name).join(", ")
        toast.error(`Period overlaps with existing periods: ${overlappingNames}`)
        return
      }
    } catch (error) {
      console.error("Error checking overlap:", error)
      toast.warning("Could not verify period overlap. Please check manually.")
    }

    setSaving(true)
    try {
      const formattedData: IPayrollPeriodFormData = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        pay_date: formData.pay_date,
        is_processed: false, // Always false since backend handles this
      }

      if (editingPeriod) {
        const updatedPeriod = await updatePayrollPeriod({
          id: editingPeriod.id,
          payrollPeriodData: formattedData
        })
        if (updatedPeriod) {
          setPayrollPeriods(prev => prev.map(p => p.id === editingPeriod.id ? updatedPeriod : p))
          toast.success("Payroll period updated successfully")
        }
      } else {
        const newPeriod = await createPayrollPeriod({
          institutionId: selectedInstitution?.id,
          payrollPeriodData: formattedData
        })
        if (newPeriod) {
          setPayrollPeriods(prev => [...prev, newPeriod])
          toast.success("Payroll period created successfully")
        }
      }

      setIsModalOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Failed to save payroll period:", error)
      toast.error(error.message || "An error occurred while saving the payroll period")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (period: IPayrollPeriod) => {
    setEditingPeriod(period)
    setFormData({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      pay_date: period.pay_date,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deletePayrollPeriod(id)
      if (success) {
        setPayrollPeriods(prev => prev.filter(p => p.id !== id))
        toast.success("Payroll period deleted successfully")
      } else {
        toast.error("Failed to delete payroll period")
      }
    } catch (error: any) {
      console.error("Failed to delete payroll period:", error)
      toast.error(error.message || "An error occurred while deleting the payroll period")
    }
    setDeleteConfirmId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getDaysRemaining = (payDate: string) => {
    const today = new Date()
    const pay = new Date(payDate)
    const diffTime = pay.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (!selectedInstitution?.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution selected...</span>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-6">
      <Card className="h-[calc(100vh-2rem)] shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Payroll Periods</CardTitle>
              <CardDescription className="text-gray-600">
                Manage payroll periods and track processing status
              </CardDescription>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-orange-600 hover:bg-orange-700 shadow-md"
                  disabled={!selectedInstitution?.id}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Period
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingPeriod ? "Edit Payroll Period" : "Add New Payroll Period"}</DialogTitle>
                  <DialogDescription>Configure payroll period details and dates</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Period Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Please enter a period name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      disabled={saving}
                      className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                    />
                    {validationErrors.name && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {validationErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange("start_date", e.target.value)}
                        disabled={saving}
                        className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.start_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                      />
                      {validationErrors.start_date && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.start_date}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange("end_date", e.target.value)}
                        disabled={saving}
                        min={formData.start_date}
                        className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.end_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                      />
                      {validationErrors.end_date && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {validationErrors.end_date}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pay_date">Pay Date *</Label>
                    <Input
                      id="pay_date"
                      type="date"
                      value={formData.pay_date}
                      onChange={(e) => handleInputChange("pay_date", e.target.value)}
                      disabled={saving}
                      className={`focus:ring-orange-500 focus:border-orange-500 ${validationErrors.pay_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                    />
                    {validationErrors.pay_date && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {validationErrors.pay_date}
                      </p>
                    )}
                  </div>
                  {/* Warning message */}
                  {validationErrors.warning && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium text-amber-800">
                          {validationErrors.warning}
                        </p>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={saving || hasValidationErrors()}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {saving ? "Saving..." : editingPeriod ? "Update Period" : "Add Period"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* Search and Filter Section */}
        <div className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by period name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onValueChange={(value: "all" | "processed" | "pending") => setFilterStatus(value)}
              >
                <SelectTrigger className="w-32 focus:ring-orange-500 focus:border-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <CardContent className="overflow-auto max-h-[calc(100vh-16rem)] p-0">
          {filteredPeriods.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll periods found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {payrollPeriods.length === 0
                  ? "No payroll periods have been created yet."
                  : "No periods match your current search."}
              </p>
            </div>
          ) : (
            <div className="bg-white">
              <Table>
                <TableHeader className="bg-gray-50/80 sticky top-0 z-10">
                  <TableRow className="border-b-2 border-gray-200">
                    <TableHead className="font-semibold text-gray-700 py-4">Period Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Period Dates
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        Pay Date
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Days to Pay</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeriods.map((period, index) => (
                    <TableRow
                      key={period.id}
                      className={`hover:bg-orange-50/30 transition-colors border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                    >
                      <TableCell className="py-4">
                        <div className="text-gray-900">{period.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(period.start_date)} - {formatDate(period.end_date)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.ceil(
                              (new Date(period.end_date).getTime() - new Date(period.start_date).getTime()) /
                              (1000 * 60 * 60 * 24),
                            )}{" "}
                            days
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">{formatDate(period.pay_date)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={period.is_processed ? "default" : "secondary"}
                          className={`${period.is_processed
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
                            } font-medium px-3 py-1`}
                        >
                          <div className="flex items-center gap-1">
                            {period.is_processed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {period.is_processed ? "Processed" : "Pending"}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const daysRemaining = getDaysRemaining(period.pay_date)
                          return (
                            <div className="font-semibold text-gray-700">
                              {daysRemaining < 0
                                ? `${Math.abs(daysRemaining)} days ago`
                                : daysRemaining === 0
                                  ? "Today"
                                  : `${daysRemaining} days`}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-1">

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                title="Actions"
                              >
                                <MoreHorizontal className="w-5 h-5 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Link
                                  href={`/payroll/payroll-period/${period.id}`}
                                  passHref
                                  legacyBehavior
                                >
                                  <div className="flex items-center">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(period)}
                                className="flex items-center"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(period.id)}
                                className="flex items-center text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Dialog
                            open={deleteConfirmId === period.id}
                            onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                          >
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete the payroll period "{period.name}"? This action cannot
                                  be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={() => handleDelete(period.id)}>
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}