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
import { IAllowanceTypeFormData, IAllowanceType } from "@/app/types/types.utils"
import { createAllowanceType, getAllowanceTypes, updateAllowanceType, deleteAllowanceType } from "@/lib/utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"
import { useSelector } from "react-redux"

const AllowanceTypesComponent = ({ institutionId: propInstitutionId }: { institutionId?: number }) => {
  const [allowanceTypes, setAllowanceTypes] = useState<IAllowanceType[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingAllowanceType, setEditingAllowanceType] = useState<IAllowanceType | null>(null)
  const [deletingAllowanceType, setDeletingAllowanceType] = useState<IAllowanceType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [institutionId, setInstitutionId] = useState<number | null>(propInstitutionId || null)
  
  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[]
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_taxable: true,
    is_active: true,
  })

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      is_taxable: true,
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

  // Load allowance types when institution ID is available
  useEffect(() => {
    const fetchAllowanceTypes = async () => {
      if (!institutionId) {
        return
      }
      
      setIsLoading(true)
      try {
        const types = await getAllowanceTypes(institutionId)
        setAllowanceTypes(types || [])
        
        if (!types || types.length === 0) {
          console.log("No allowance types found for this institution")
        }
      } catch (error) {
        console.error("Error fetching allowance types:", error)
        toast.error("Failed to load allowance types")
        setAllowanceTypes([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAllowanceTypes()
  }, [institutionId])

  const handleAddAllowanceType = async () => {
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
      const allowanceTypeData: IAllowanceTypeFormData = {
        name: formData.name,
        description: formData.description,
        is_taxable: formData.is_taxable,
        is_active: formData.is_active,
      }

      const newAllowanceType = await createAllowanceType({
        institutionId,
        allowanceTypeData,
      })

      if (newAllowanceType) {
        setAllowanceTypes([newAllowanceType, ...allowanceTypes])
        toast.success("Allowance type created successfully")
        resetFormData()
        setIsAddDialogOpen(false)
      } else {
        toast.error("Failed to create allowance type")
      }
    } catch (error: any) {
      console.error("Error creating allowance type:", error)
      toast.error(error.message || "An error occurred while creating the allowance type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAllowanceType = async () => {
    if (!editingAllowanceType) return

    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const allowanceTypeData: Partial<IAllowanceTypeFormData> = {
        name: formData.name,
        description: formData.description,
        is_taxable: formData.is_taxable,
        is_active: formData.is_active,
      }

      const updatedAllowanceType = await updateAllowanceType({
        id: editingAllowanceType.id,
        allowanceTypeData,
      })

      if (updatedAllowanceType) {
        const updatedAllowanceTypes = allowanceTypes.map((allowanceType) =>
          allowanceType.id === editingAllowanceType.id ? updatedAllowanceType : allowanceType,
        )
        setAllowanceTypes(updatedAllowanceTypes)
        toast.success("Allowance type updated successfully")
        resetFormData()
        setIsEditDialogOpen(false)
        setEditingAllowanceType(null)
      } else {
        toast.error("Failed to update allowance type")
      }
    } catch (error: any) {
      console.error("Error updating allowance type:", error)
      toast.error(error.message || "An error occurred while updating the allowance type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAllowanceType = async () => {
    if (!deletingAllowanceType) return

    setIsSubmitting(true)
    try {
      const success = await deleteAllowanceType(deletingAllowanceType.id)

      if (success) {
        setAllowanceTypes(allowanceTypes.filter((allowanceType) => allowanceType.id !== deletingAllowanceType.id))
        toast.success("Allowance type deleted successfully")
        setIsDeleteDialogOpen(false)
        setDeletingAllowanceType(null)
      } else {
        toast.error("Failed to delete allowance type")
      }
    } catch (error: any) {
      console.error("Error deleting allowance type:", error)
      toast.error(error.message || "An error occurred while deleting the allowance type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (allowanceType: IAllowanceType) => {
    setDeletingAllowanceType(allowanceType)
    setIsDeleteDialogOpen(true)
  }

  const handleEditAllowanceType = (allowanceType: IAllowanceType) => {
    setEditingAllowanceType(allowanceType)
    setFormData({
      name: allowanceType.name,
      description: allowanceType.description,
      is_taxable: allowanceType.is_taxable,
      is_active: allowanceType.is_active,
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="container py-12 px-8 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Allowance Types</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!institutionId}
              >
                Add Allowance Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Allowance Type</DialogTitle>
                <DialogDescription>Create a new allowance type to manage employee allowances.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Housing Allowance"
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
                    placeholder="Describe the allowance type..."
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_taxable"
                        checked={formData.is_taxable}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_taxable: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="is_taxable" className="text-sm">
                        Taxable
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
                onClick={handleAddAllowanceType}
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
            <span className="ml-2">Loading allowance types...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {allowanceTypes.length > 0 ? (
              allowanceTypes.map((allowanceType) => (
                <Card
                  key={allowanceType.id}
                  className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <CardHeader className="pb-3 pt-6 px-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{allowanceType.name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge
                            className={`text-xs font-medium ${
                              allowanceType.is_active
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }`}
                          >
                            {allowanceType.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge
                            className={`text-xs font-medium ${
                              allowanceType.is_taxable
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                          >
                            {allowanceType.is_taxable ? "Taxable" : "Non-taxable"}
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
                            onClick={() => handleEditAllowanceType(allowanceType)}
                            className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                          >
                            <Edit className="h-4 w-4 mr-2 text-orange-600" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(allowanceType)}
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
                      {allowanceType.description}
                    </CardDescription>
                    <div className="text-xs text-gray-500 mt-4">
                      Created: {new Date(allowanceType.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No allowance types found</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first allowance type.</p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!institutionId}
                  >
                    Add Allowance Type
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
          setEditingAllowanceType(null)
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Allowance Type</DialogTitle>
            <DialogDescription>Make changes to an existing allowance type.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Housing Allowance"
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
                placeholder="Describe the allowance type..."
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is_taxable"
                    checked={formData.is_taxable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_taxable: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="edit-is_taxable" className="text-sm">
                    Taxable
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
            onClick={handleUpdateAllowanceType}
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
          setDeletingAllowanceType(null)
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Allowance Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingAllowanceType?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingAllowanceType(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllowanceType} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AllowanceTypesComponent