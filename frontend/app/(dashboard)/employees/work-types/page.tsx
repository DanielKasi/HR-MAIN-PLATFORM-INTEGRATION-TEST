"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CheckCircle, AlertCircle, Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, Eye, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react"
import { toast } from "sonner"

// Import your API functions and types
import { getWorkTypes, updateWorkType, deleteWorkType, createWorkType } from "@/lib/utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import type { IWorkType, IWorkTypeFormData } from "@/app/types/types.utils"

interface EmployeeTypeModalProps {
  isOpen: boolean
  onClose: () => void
  editingType: IWorkType| null
  onSave: (data: IWorkTypeFormData) => Promise<void>
  isSubmitting: boolean
  existingTypes: IWorkType[]
}

// Employee Type Form Modal Component
function EmployeeTypeModal({ isOpen, onClose, editingType, onSave, isSubmitting, existingTypes }: EmployeeTypeModalProps) {
  const [formData, setFormData] = useState<IWorkTypeFormData>({
    name: "",
    description: "",
    code: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof IWorkTypeFormData, string>>>({})

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
    const newErrors: Partial<Record<keyof IWorkTypeFormData, string>> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be 100 characters or less"
    }

    if (formData.code && formData.code.length > 10) {
      newErrors.code = "Code must be 10 characters or less"
    }

    const duplicateName = existingTypes.find(
      (type) => 
        type.name.toLowerCase() === formData.name?.toLowerCase() && 
        type.id !== editingType?.id
    )
    if (duplicateName) {
      newErrors.name = "An work type with this name already exists"
    }

    // Check for duplicate codes (excluding current editing item)
    if (formData.code?.trim()) {
      const duplicateCode = existingTypes.find(
        (type) => 
          type.code?.toLowerCase() === formData.code?.toLowerCase() && 
          type.id !== editingType?.id
      )
      if (duplicateCode) {
        newErrors.code = "An work type with this code already exists"
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

  const handleInputChange = (field: keyof IWorkTypeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingType ? "Edit Work Type" : "Create Work Type"}</DialogTitle>
          <DialogDescription>
            {editingType
              ? "Update the work type information below."
              : "Add a new work type to your organization."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
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
              placeholder="Describe this work type..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? "Saving..." : editingType ? "Update Work Type" : "Create Work Type"}
            </Button>

            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
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
  employeeType: IWorkType | null
}

function EmployeeTypeDetailsModal({ isOpen, onClose, employeeType }: EmployeeTypeDetailsModalProps) {
  if (!employeeType) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Work Type Details
          </DialogTitle>
          <DialogDescription>
            View the details of this work type
          </DialogDescription>
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
  
  const [workTypes, setWorkTypes] = useState<IWorkType[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5) // You can make this configurable

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingType, setEditingType] = useState<IWorkType | null>(null)
  const [viewingType, setViewingType] = useState<IWorkType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredTypes = workTypes.filter(
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
      fetchWorkTypes()
    }
  }, [selectedInstitution?.id])

  const fetchWorkTypes = async () => {
    if (!selectedInstitution?.id) return

    try {
      setLoading(true)
      const data = await getWorkTypes({ institutionId: selectedInstitution.id })
      setWorkTypes(data)
    } catch (error) {
      toast.error("Failed to load work types")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (formData: IWorkTypeFormData) => {
    if (!selectedInstitution?.id) return

    setIsSubmitting(true)

    try {
     if (editingType) {
  // Update existing
      await updateWorkType({
        institutionId: selectedInstitution.id,
        employeeTypeId: editingType.id,
        employeeTypeData: formData,
      })

      // Clear search and reset page to ensure updated item is visible
      setSearchTerm("")
      setCurrentPage(1)
      await fetchWorkTypes()
      toast.success("Work type updated successfully!")
    } else {
        // Create new
        const newType = await createWorkType({
          institutionId: selectedInstitution.id,
          workTypeData: formData,
        })
        
        if (newType) {
          setSearchTerm("")
          setCurrentPage(1) 
          
          setWorkTypes((prev) => {
            const updated = [...prev, newType]
            return updated
          })
          
          setTimeout(() => {
          }, 100)
          
          toast.success("Work type created successfully!")
        } else {
          
          setSearchTerm("") 
          setCurrentPage(1)
          await fetchWorkTypes()
          toast.success("Work type created successfully!")
        }
      }
    } catch (error) {
      console.error("Error saving work type:", error)
      toast.error(`Failed to ${editingType ? 'update' : 'create'} work type`)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreate = () => {
    setEditingType(null)
    setShowFormModal(true)
  }

  const handleEdit = (type: IWorkType) => {
    setEditingType(type)
    setShowFormModal(true)
  }

  const handleView = (type: IWorkType) => {
    setViewingType(type)
    setShowDetailsModal(true)
  }

  const handleDelete = async (employeeType: IWorkType) => {
    if (!selectedInstitution?.id) return

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${employeeType.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(employeeType.id)
      
      await deleteWorkType({
        institutionId: selectedInstitution.id,
        employeeTypeId: employeeType.id,
      })

      setWorkTypes((prev) => prev.filter((type) => type.id !== employeeType.id))
      toast.success("Work type deleted successfully!")
    } catch (error) {
      console.error("Error deleting work type:", error)
      toast.error("Failed to delete work type")
    } finally {
      setDeleting(null)
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
          <p className="text-gray-600">Please select an institution to manage work types.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Employee Types List */}
      <Card className="w-full bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Work Types</CardTitle>
              <CardDescription>Manage different work types of employees in your organization</CardDescription>
            </div>
            <Button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Work Type
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
              {filteredTypes.length} type{filteredTypes.length !== 1 ? "s" : ""}
              {/* {totalPages > 1 && (
                <span className="ml-1">
                  • Page {currentPage} of {totalPages}
                </span>
              )} */}
            </Badge>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                  <span className="text-gray-600">Loading work types...</span>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">Name</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">Description</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6 w-[100px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-gray-500 bg-white">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Search className="h-6 w-6 text-gray-400" />
                          </div>
                          {searchTerm ? "No work types found matching your search." : "No work types found."}
                          {!searchTerm && (
                            <Button
                              onClick={handleCreate}
                              variant="outline"
                              size="sm"
                              className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add your first work type
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTypes.map((type, index) => (
                      <TableRow
                        key={type.id}
                        className={`
                          bg-white hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0
                          ${(startIndex + index) % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                        `}
                      >
                        <TableCell className="py-4 px-6">
                          <div className="font-medium text-gray-900">{type.name}</div>
                        </TableCell>
                        <TableCell className="py-4 px-6 max-w-md">
                          <div className="text-gray-700 leading-relaxed">
                            {type.description ? (
                              <span className="line-clamp-2">{type.description}</span>
                            ) : (
                              <span className="text-gray-400 italic">No description provided</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                disabled={deleting === type.id}
                              >
                                {deleting === type.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                                ) : (
                                  <MoreVertical className="h-4 w-4 text-gray-600" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                              <DropdownMenuItem
                                onClick={() => handleView(type)}
                                className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-3 text-gray-500" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(type)}
                                className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-3 text-gray-500" />
                                Edit work type
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(type)}
                                className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-3 text-red-500" />
                                Delete work type
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTypes.length)} of {filteredTypes.length} results
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-8 h-8 p-0 ${
                          currentPage === pageNumber 
                            ? "bg-orange-600 hover:bg-orange-700 text-white" 
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <EmployeeTypeModal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        editingType={editingType}
        onSave={handleSave}
        isSubmitting={isSubmitting}
        existingTypes={workTypes}
      />

      {/* Details Modal */}
      <EmployeeTypeDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseDetailsModal}
        employeeType={viewingType}
      />
    </div>
  )
}