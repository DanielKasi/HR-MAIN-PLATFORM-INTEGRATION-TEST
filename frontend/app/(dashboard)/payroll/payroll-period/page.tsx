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
import { Switch } from "@/components/ui/switch"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Loader2,
  Info,
  AlertTriangle 
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

interface PayrollPeriodsProps {
  institutionId?: number
}

export default function PayrollPeriods({ institutionId: propInstitutionId }: PayrollPeriodsProps) {
  const [payrollPeriods, setPayrollPeriods] = useState<IPayrollPeriod[]>([])
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<IPayrollPeriod | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "processed" | "pending">("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  const [institutionId, setInstitutionId] = useState<number | null>(propInstitutionId || null)

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
    is_processed: false,
  })


  useEffect(() => {
    if (propInstitutionId) {
      setInstitutionId(propInstitutionId)
    } else if (selectedInstitution?.id) {
      setInstitutionId(selectedInstitution.id)
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id)
    }
  }, [propInstitutionId, institutionsAttached, selectedInstitution])


  useEffect(() => {
    const fetchPayrollPeriods = async () => {
      if (!institutionId) {
        return
      }
      
      try {
        const periodsData = await getPayrollPeriods(institutionId)
        
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
  }, [institutionId])

  // Auto-generate period name when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date && !editingPeriod) {
      const generatedName = generatePeriodName(formData.start_date, formData.end_date)
      if (formData.name === "" || formData.name === generatePeriodName(formData.start_date, formData.end_date)) {
        setFormData(prev => ({ ...prev, name: generatedName }))
      }
    }
  }, [formData.start_date, formData.end_date, editingPeriod])

  const validatePayrollForm = () => {
    const validations = []

    if (!institutionId) {
      validations.push({ type: 'error', message: 'Institution ID is required' })
    }

    const formValidation = validatePayrollPeriodFormData(formData)
    formValidation.errors.forEach(error => {
      validations.push({ type: 'error', message: error })
    })

    return validations
  }

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      pay_date: "",
      is_processed: false,
    })
    setEditingPeriod(null)
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!institutionId) {
      toast.error("Institution ID is required")
      return
    }

    const validations = validatePayrollForm()
    const errors = validations.filter(v => v.type === 'error')
    
    if (errors.length > 0) {
      toast.error(errors[0].message)
      return
    }

    // Check for overlapping periods
    try {
      const overlapCheck = await checkPeriodOverlap({
        institutionId,
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
        is_processed: formData.is_processed,
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
          institutionId,
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
      is_processed: period.is_processed,
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

  // Render validation messages
  const renderValidationMessages = () => {
    const validations = validatePayrollForm()
    if (validations.length === 0) return null

    return (
      <div className="space-y-2">
        {validations.map((validation, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-3 rounded-lg ${
              validation.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            {validation.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${
              validation.type === 'error' ? 'text-red-800' : 'text-amber-800'
            }`}>
              {validation.message}
            </p>
          </div>
        ))}
      </div>
    )
  }

  if (!institutionId) {
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
                  disabled={!institutionId}
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
                      placeholder="e.g., January 2024, Week 1 - Jan 2024"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      disabled={saving}
                      className="focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
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
                        className="focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
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
                        className="focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
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
                      className="focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Mark as Processed</Label>
                        <p className="text-sm text-gray-500">Indicates if payroll has been processed for this period</p>
                      </div>
                      <Switch
                        checked={formData.is_processed}
                        onCheckedChange={(checked) => handleInputChange("is_processed", checked)}
                        className="data-[state=checked]:bg-orange-600"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Period Summary */}
                  {formData.start_date && formData.end_date && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                        <Info className="h-4 w-4 mr-2" />
                        Period Summary
                      </h4>
                      <div className="space-y-1 text-xs text-blue-700">
                        <p>• Duration: {Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24))} days</p>
                        {formData.pay_date && (
                          <p>• Days to pay: {getDaysRemaining(formData.pay_date)} days</p>
                        )}
                      </div>
                    </div>
                  )}

                  {renderValidationMessages()}

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
                      disabled={saving || validatePayrollForm().filter(v => v.type === 'error').length > 0}
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
                        <DollarSign className="w-4 h-4" />
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
                      className={`hover:bg-orange-50/30 transition-colors border-b ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
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
                          className={`${
                            period.is_processed
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(period)}
                            className="h-8 w-8 p-0 hover:bg-orange-100 rounded-full"
                            title="Edit period"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>

                          <Dialog
                            open={deleteConfirmId === period.id}
                            onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(period.id)}
                                className="h-8 w-8 p-0 hover:bg-red-100 rounded-full"
                                title="Delete period"
                              >
                                <Trash2 className="w-4 h-4 text-gray-600" />
                              </Button>
                            </DialogTrigger>
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