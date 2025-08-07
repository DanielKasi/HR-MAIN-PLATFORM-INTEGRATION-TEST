"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertCircle,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react"
import { toast } from "sonner"

// Import your API functions and types
import { getEmployeeTypes, createEmployeeType, updateEmployeeType, deleteEmployeeType } from "@/lib/utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import type { IEmployeeType, IEmployeeTypeFormData } from "@/types/types.utils"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { TableSkeleton } from "@/components/common/table-skeleton"

interface EmployeeTypeModalProps {
  isOpen: boolean
  onClose: () => void
  editingType: IEmployeeType | null
  onSave: (data: IEmployeeTypeFormData) => Promise<void>
  isSubmitting: boolean
  existingTypes: IEmployeeType[]
}

// Employee Type Form Modal Component
function EmployeeTypeModal({
  isOpen,
  onClose,
  editingType,
  onSave,
  isSubmitting,
  existingTypes,
}: EmployeeTypeModalProps) {
  const [formData, setFormData] = useState<IEmployeeTypeFormData>({
    name: "",
    description: "",
    code: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof IEmployeeTypeFormData, string>>>({})

  // Reset form when modal opens/closes or editing type changes
  useEffect(() => {
    if (isOpen) {
      if (editingType) {
        setFormData({
          name: editingType.name,
          description: editingType.description || "",
          code: editingType.code || "",
        })
      } else {
        setFormData({ name: "", description: "", code: "" })
      }
      setErrors({})
    }
  }, [isOpen, editingType])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IEmployeeTypeFormData, string>> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be 100 characters or less"
    }

    if (formData.code && formData.code.length > 10) {
      newErrors.code = "Code must be 10 characters or less"
    }

    // Check for duplicate names (excluding current editing item)
    const duplicateName = existingTypes.find(
      (type) => type.name.toLowerCase() === formData.name?.toLowerCase() && type.id !== editingType?.id,
    )
    if (duplicateName) {
      newErrors.name = "An employee type with this name already exists"
    }

    // Check for duplicate codes (excluding current editing item)
    if (formData.code?.trim()) {
      const duplicateCode = existingTypes.find(
        (type) => type.code?.toLowerCase() === formData.code?.toLowerCase() && type.id !== editingType?.id,
      )
      if (duplicateCode) {
        newErrors.code = "An employee type with this code already exists"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      // Error is handled in parent component
    }
  }

  const handleInputChange = (field: keyof IEmployeeTypeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingType ? "Edit Employee Type" : "Create Employee Type"}</DialogTitle>
          <DialogDescription>
            {editingType
              ? "Update the employee type information below."
              : "Add a new employee type to your organization."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Full-time, Part-time, Contractor"
                maxLength={100}
                className={errors.name ? "border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code || ""}
                onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                maxLength={10}
                className={errors.code ? "border-red-500" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe this employee type..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-sm bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto text-sm">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? "Saving..." : editingType ? "Update Employee Type" : "Create Employee Type"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Employee Type Details Modal
interface EmployeeTypeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  employeeType: IEmployeeType | null
}

function EmployeeTypeDetailsModal({ isOpen, onClose, employeeType }: EmployeeTypeDetailsModalProps) {
  if (!employeeType) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Employee Type Details</DialogTitle>
          <DialogDescription>View the details of this employee type</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Name</Label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <span className="font-medium">{employeeType.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Code</Label>
              <div className="p-3 bg-gray-50 rounded-md border">
                {employeeType.code ? (
                  <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                    {employeeType.code}
                  </Badge>
                ) : (
                  <span className="text-gray-400 italic">No code assigned</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <div className="p-3 bg-gray-50 rounded-md border min-h-[80px]">
                {employeeType.description ? (
                  <span className="text-gray-700">{employeeType.description}</span>
                ) : (
                  <span className="text-gray-400 italic">No description provided</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main Component
export default function EmployeeTypeManagement() {
  const selectedInstitution = useSelector(selectSelectedInstitution)

  const [employeeTypes, setEmployeeTypes] = useState<IEmployeeType[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [employeeTypeToDelete, setEmployeeTypeToDelete] = useState<IEmployeeType | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5) // You can make this configurable

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingType, setEditingType] = useState<IEmployeeType | null>(null)
  const [viewingType, setViewingType] = useState<IEmployeeType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredTypes = employeeTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (type.code && type.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Pagination calculations
  const totalPages = Math.ceil(filteredTypes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTypes = filteredTypes.slice(startIndex, endIndex)

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  // Fetch employee types on component mount
  useEffect(() => {
    if (selectedInstitution?.id) {
      fetchEmployeeTypes()
    }
  }, [selectedInstitution?.id])

  const fetchEmployeeTypes = async () => {
    if (!selectedInstitution?.id) return

    try {
      setLoading(true)
      const data = await getEmployeeTypes({ institutionId: selectedInstitution.id })
      setEmployeeTypes(data)
    } catch (error) {
      console.error("Error fetching employee types:", error)
      toast.error("Failed to load employee types")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (formData: IEmployeeTypeFormData) => {
    if (!selectedInstitution?.id) return

    setIsSubmitting(true)

    try {
      if (editingType) {
        // Update existing
        await updateEmployeeType({
          institutionId: selectedInstitution.id,
          employeeTypeId: editingType.id,
          employeeTypeData: formData,
        })

        // Clear search and reset page to ensure updated item is visible
        setSearchTerm("")
        setCurrentPage(1)
        await fetchEmployeeTypes()
        toast.success("Employee type updated successfully!")
      } else {
        // Create new
        const newType = await createEmployeeType({
          institutionId: selectedInstitution.id,
          employeeTypeData: formData,
        })

        console.log("Created employee type:", newType) // Debug log

        // Add the new type to the list if we got a valid response
        if (newType) {
          // Clear search term to ensure new item is visible
          setSearchTerm("")
          setCurrentPage(1) // Reset to first page

          setEmployeeTypes((prev) => {
            const updated = [...prev, newType]
            console.log("Previous array length:", prev.length)
            console.log("New array length:", updated.length)
            console.log("New item:", newType)
            return updated
          })

          // Force a small delay to ensure state has updated
          setTimeout(() => {
            console.log("Current employeeTypes state:", employeeTypes.length)
          }, 100)

          toast.success("Employee type created successfully!")
        } else {
          // Fallback: refetch if API returned null for some reason
          console.warn("API returned null, refetching...")
          setSearchTerm("") // Clear search here too
          setCurrentPage(1) // Reset to first page
          await fetchEmployeeTypes()
          toast.success("Employee type created successfully!")
        }
      }
    } catch (error) {
      console.error("Error saving employee type:", error)
      toast.error(`Failed to ${editingType ? "update" : "create"} employee type`)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreate = () => {
    setEditingType(null)
    setShowFormModal(true)
  }

  const handleEdit = (type: IEmployeeType) => {
    setEditingType(type)
    setShowFormModal(true)
  }

  const handleView = (type: IEmployeeType) => {
    setViewingType(type)
    setShowDetailsModal(true)
  }

  const handleDelete = async (employeeType: IEmployeeType) => {
    if (!selectedInstitution?.id) return

    try {
      setIsDeleting(true)

      await deleteEmployeeType({
        institutionId: selectedInstitution.id,
        employeeTypeId: employeeType.id,
      })

      setEmployeeTypes((prev) => prev.filter((type) => type.id !== employeeType.id))
      toast.success("Employee type deleted successfully!")
    } catch (error) {
      console.error("Error deleting employee type:", error)
      toast.error("Failed to delete employee type")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCloseFormModal = () => {
    setShowFormModal(false)
    setEditingType(null)
  }

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false)
    setViewingType(null)
  }

  if (!selectedInstitution) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please select an institution to manage employee types.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <Card className="h-[calc(100vh-2rem)] shadow-lg">
          <CardHeader className="border-b p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-8 items-start sm:items-center">
              <div className="flex items-center justify-start gap-4">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 sm:h-6 bg-gray-200 rounded w-48 sm:w-64 animate-pulse"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-48 animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-24 sm:h-10 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </CardHeader>
          <TableSkeleton rows={10} columns={3} />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Employee Types List */}
      <div className="w-full bg-white">
        <div className="mb-6">
          <div className="mb-6">
            <div>
              <h1 className="text-2xl font-bold">Employee Types</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage different types of employees in your organization
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-20 mt-12">
            <div className="relative w-[38rem]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee types..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <div className="ml-auto">
            <Button onClick={handleCreate} className="w-full sm:w-auto text-sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Employee Type</span>
              <span className="sm:hidden">Add Type</span>
            </Button>
          </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    <span className="text-gray-600 text-sm sm:text-base">Loading employee types...</span>
                  </div>
                </div>
              ) : (
                <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0 mt-12">
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-900 py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm">
                        Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm">
                        Description
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 py-3 sm:py-4 px-4 sm:px-6 w-[80px] sm:w-[100px] text-center text-xs sm:text-sm">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 sm:py-12 text-gray-500 bg-white">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                              <Search className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                            </div>
                            <span className="text-sm sm:text-base">
                              {searchTerm
                                ? "No employee types found matching your search."
                                : "No employee types found."}
                            </span>
                            {!searchTerm && (
                              <Button
                                onClick={handleCreate}
                                variant="outline"
                                size="sm"
                                className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent text-xs sm:text-sm"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add your first employee type
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTypes.map((type, index) => (
                        <TableRow
                          key={type.id}
                          className="bg-white hover:bg-gray-50 transition-colors duration-150"
                        >
                          <TableCell className="py-3 sm:py-4 px-4 sm:px-6">
                            <div className="font-medium text-gray-900 text-sm sm:text-base">{type.name}</div>
                          </TableCell>
                          <TableCell className="py-3 sm:py-4 px-4 sm:px-6 max-w-xs sm:max-w-md">
                            <div className="text-gray-700 leading-relaxed text-xs sm:text-sm">
                              {type.description ? (
                                <span className="line-clamp-2">{type.description}</span>
                              ) : (
                                <span className="text-gray-400 italic">No description provided</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 sm:py-4 px-4 sm:px-6 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 rounded-full"
                                  disabled={employeeTypeToDelete?.id === type.id}
                                >
                                  {employeeTypeToDelete?.id === type.id ? (
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-gray-600" />
                                  ) : (
                                    <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-40 sm:w-48 bg-white border border-gray-200 shadow-lg"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleView(type)}
                                  className="flex items-center px-2 sm:px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm"
                                >
                                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500" />
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEdit(type)}
                                  className="flex items-center px-2 sm:px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setEmployeeTypeToDelete(type)}
                                  className="flex items-center px-2 sm:px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer text-xs sm:text-sm"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-red-500" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Responsive Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTypes.length)} of {filteredTypes.length}{" "}
                  results
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 overflow-x-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-xs px-2 sm:px-3"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber
                    if (totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i
                    } else {
                      pageNumber = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs ${
                          currentPage === pageNumber
                            ? "bg-orange-600 hover:bg-orange-700 text-white"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 text-xs px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <EmployeeTypeModal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        editingType={editingType}
        onSave={handleSave}
        isSubmitting={isSubmitting}
        existingTypes={employeeTypes}
      />

      {/* Details Modal */}
      <EmployeeTypeDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseDetailsModal}
        employeeType={viewingType}
      />

      {employeeTypeToDelete && (
        <DeleteConfirmationDialog
          description="Are you sure you want to delete this employee type? This action cannot be undone."
          isDeleting={isDeleting}
          isOpen={!!employeeTypeToDelete}
          title={`Delete ${employeeTypeToDelete.name}`}
          onConfirm={() => handleDelete(employeeTypeToDelete)}
          onClose={() => {
            setEmployeeTypeToDelete(null)
            setIsDeleting(false)
          }}
        />
      )}
    </div>
  )
}
