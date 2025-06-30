"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { IDeductionTypeFormData, IDeductionType } from "@/app/types/types.utils"
import { createDeductionType, getDeductionTypes, updateDeductionType, deleteDeductionType } from "@/lib/utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"
import { useSelector } from "react-redux"

const DeductionTypesComponent = ({ institutionId: propInstitutionId }: { institutionId?: number }) => {
  const [deductionTypes, setDeductionTypes] = useState<IDeductionType[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingDeductionType, setEditingDeductionType] = useState<IDeductionType | null>(null)
  const [deletingDeductionType, setDeletingDeductionType] = useState<IDeductionType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [institutionId, setInstitutionId] = useState<number | null>(propInstitutionId || null)
  
  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_mandatory: false,
    is_active: true,
  })

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      is_mandatory: false,
      is_active: true,
    })
  }

  // Set institution ID from Redux state or prop
  useEffect(() => {
    if (propInstitutionId) {
      setInstitutionId(propInstitutionId)
    } else if (selectedInstitution?.id) {
      setInstitutionId(selectedInstitution.id)
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id)
    }
  }, [propInstitutionId, institutionsAttached, selectedInstitution])

  // Load deduction types when institution ID is available
  useEffect(() => {
    const fetchDeductionTypes = async () => {
      if (!institutionId) {
        return
      }
      
      setIsLoading(true)
      try {
        const types = await getDeductionTypes(institutionId)
        setDeductionTypes(types || [])
        
        if (!types || types.length === 0) {
          console.log("No deduction types found for this institution")
        }
      } catch (error) {
        console.error("Error fetching deduction types:", error)
        toast.error("Failed to load deduction types")
        setDeductionTypes([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDeductionTypes()
  }, [institutionId])

  const handleAddDeductionType = async () => {
    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!institutionId) {
      toast.error("Institution ID is required")
      return
    }

    setIsSubmitting(true)
    try {
      const deductionTypeData: IDeductionTypeFormData = {
        name: formData.name,
        description: formData.description,
        is_mandatory: formData.is_mandatory,
        is_active: formData.is_active,
      }

      const newDeductionType = await createDeductionType({
        institutionId,
        deductionTypeData,
      })

      if (newDeductionType) {
        setDeductionTypes([newDeductionType, ...deductionTypes])
        toast.success("Deduction type created successfully")
        resetFormData()
        setIsAddDialogOpen(false)
      } else {
        toast.error("Failed to create deduction type")
      }
    } catch (error: any) {
      console.error("Error creating deduction type:", error)
      toast.error(error.message || "An error occurred while creating the deduction type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateDeductionType = async () => {
    if (!editingDeductionType) return

    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const deductionTypeData: Partial<IDeductionTypeFormData> = {
        name: formData.name,
        description: formData.description,
        is_mandatory: formData.is_mandatory,
        is_active: formData.is_active,
      }

      const updatedDeductionType = await updateDeductionType({
        id: editingDeductionType.id,
        deductionTypeData,
      })

      if (updatedDeductionType) {
        const updatedDeductionTypes = deductionTypes.map((deductionType) =>
          deductionType.id === editingDeductionType.id ? updatedDeductionType : deductionType,
        )
        setDeductionTypes(updatedDeductionTypes)
        toast.success("Deduction type updated successfully")
        resetFormData()
        setIsEditDialogOpen(false)
        setEditingDeductionType(null)
      } else {
        toast.error("Failed to update deduction type")
      }
    } catch (error: any) {
      console.error("Error updating deduction type:", error)
      toast.error(error.message || "An error occurred while updating the deduction type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDeductionType = async () => {
    if (!deletingDeductionType) return

    setIsSubmitting(true)
    try {
      const success = await deleteDeductionType(deletingDeductionType.id)

      if (success) {
        setDeductionTypes(deductionTypes.filter((deductionType) => deductionType.id !== deletingDeductionType.id))
        toast.success("Deduction type deleted successfully")
        setIsDeleteDialogOpen(false)
        setDeletingDeductionType(null)
      } else {
        toast.error("Failed to delete deduction type")
      }
    } catch (error: any) {
      console.error("Error deleting deduction type:", error)
      toast.error(error.message || "An error occurred while deleting the deduction type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (deductionType: IDeductionType) => {
    setDeletingDeductionType(deductionType)
    setIsDeleteDialogOpen(true)
  }

  const handleEditDeductionType = (deductionType: IDeductionType) => {
    setEditingDeductionType(deductionType)
    setFormData({
      name: deductionType.name,
      description: deductionType.description,
      is_mandatory: deductionType.is_mandatory,
      is_active: deductionType.is_active,
    })
    setIsEditDialogOpen(true)
  }

  // Show loading if no institution ID is set
  if (isLoading && !institutionId) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading institution data...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="container py-6 px-8 md:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Deduction Types</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!institutionId}
              >
                Add Deduction Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Deduction Type</DialogTitle>
                <DialogDescription>Create a new deduction type to manage employee deductions.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Income Tax"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the deduction type..."
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_mandatory"
                        checked={formData.is_mandatory}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_mandatory: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="is_mandatory" className="text-sm">
                        Mandatory
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="is_active" className="text-sm">
                        Active
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleAddDeductionType}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creating..." : "Add"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading deduction types...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {deductionTypes.length > 0 ? (
              deductionTypes.map((deductionType) => (
                <Card
                  key={deductionType.id}
                  className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <CardHeader className="pb-3 pt-6 px-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{deductionType.name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge
                            className={`text-xs font-medium ${
                              deductionType.is_active
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }`}
                          >
                            {deductionType.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge
                            className={`text-xs font-medium ${
                              deductionType.is_mandatory
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                          >
                            {deductionType.is_mandatory ? "Mandatory" : "Optional"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-orange-50">
                            <MoreHorizontal className="h-3 w-3 text-orange-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleEditDeductionType(deductionType)}
                            className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                          >
                            <Edit className="h-4 w-4 mr-2 text-orange-600" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(deductionType)}
                            className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2 px-4 pb-6">
                    <CardDescription className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                      {deductionType.description}
                    </CardDescription>
                    <div className="text-xs text-gray-500 mt-4">
                      Created: {new Date(deductionType.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No deduction types found</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first deduction type.</p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!institutionId}
                  >
                    Add Deduction Type
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          resetFormData()
          setEditingDeductionType(null)
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Deduction Type</DialogTitle>
            <DialogDescription>Make changes to an existing deduction type.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Income Tax"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe the deduction type..."
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is_mandatory"
                    checked={formData.is_mandatory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_mandatory: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="edit-is_mandatory" className="text-sm">
                    Mandatory
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="edit-is_active" className="text-sm">
                    Active
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleUpdateDeductionType}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open)
        if (!open) {
          setDeletingDeductionType(null)
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Deduction Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingDeductionType?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingDeductionType(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDeductionType} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DeductionTypesComponent