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
import { MoreHorizontal, Edit, Trash2, Loader2, Plus, FileX, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { IDeductionTypeFormData, IDeductionType } from "@/app/types/types.utils"
import { createDeductionType, getDeductionTypes, updateDeductionType, deleteDeductionType } from "@/lib/utils"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { IUserInstitution } from "@/app/types"
import { useSelector } from "react-redux"
import { se } from "date-fns/locale"

const DeductionTypesComponent = () => {
  const [deductionTypes, setDeductionTypes] = useState<IDeductionType[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingDeductionType, setEditingDeductionType] = useState<IDeductionType | null>(null)
  const [deletingDeductionType, setDeletingDeductionType] = useState<IDeductionType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  
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

  // Load deduction types when institution ID is available
  useEffect(() => {
    const fetchDeductionTypes = async () => {
      if (!selectedInstitution?.id) {
        return
      }
      
      setIsLoading(true)
      try {
        const types = await getDeductionTypes(selectedInstitution?.id)
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
  }, [selectedInstitution?.id])

  const handleAddDeductionType = async () => {
    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedInstitution?.id) {
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
        institutionId: selectedInstitution?.id,
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
  if (isLoading && !selectedInstitution?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Loading Institution Data</h3>
            <p className="text-gray-600">Please wait while we set up your workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-4 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Deduction Types
              </h1>
              <p className="text-gray-600 text-sm">
                Manage and configure employee deduction categories
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-4 py-2 rounded-lg font-medium"
                  disabled={!selectedInstitution?.id}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deduction Type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
                <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
                  <DialogTitle className="text-2xl font-bold text-gray-900">Add Deduction Type</DialogTitle>
                  <DialogDescription className="text-gray-600 text-base">
                    Create a new deduction type to manage employee deductions efficiently.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-6 py-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-800">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Income Tax, Health Insurance"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-800">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder="Provide a detailed description of this deduction type..."
                      disabled={isSubmitting}
                      className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base resize-none"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="flex items-center space-x-3">
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
                          className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                        />
                        <Label htmlFor="is_mandatory" className="text-sm font-medium text-gray-700">
                          Mandatory Deduction
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
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
                          className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                        />
                        <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                          Active Status
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-100">
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 rounded-xl font-medium text-base"
                    onClick={handleAddDeductionType}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {isSubmitting ? "Creating Deduction Type..." : "Create Deduction Type"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Types</p>
                  <p className="text-xl font-bold text-gray-900">{deductionTypes.length}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Active</p>
                  <p className="text-xl font-bold text-green-600">{deductionTypes.filter(dt => dt.is_active).length}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Mandatory</p>
                  <p className="text-xl font-bold text-red-600">{deductionTypes.filter(dt => dt.is_mandatory).length}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
              <Settings className="w-8 h-8 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Deduction Types</h3>
              <p className="text-gray-600">Fetching your deduction configurations...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {deductionTypes.length > 0 ? (
              deductionTypes.map((deductionType) => (
                <Card
                  key={deductionType.id}
                  className="group bg-white border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden"
                >
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-200">{deductionType.name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              deductionType.is_active
                                ? "bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-200"
                                : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border-gray-200"
                            }`}
                          >
                            {deductionType.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              deductionType.is_mandatory
                                ? "bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200"
                                : "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {deductionType.is_mandatory ? "Mandatory" : "Optional"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-orange-50 rounded-full transition-colors duration-200">
                            <MoreHorizontal className="h-3 w-3 text-gray-400 hover:text-orange-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-0">
                          <DropdownMenuItem
                            onClick={() => handleEditDeductionType(deductionType)}
                            className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50 rounded-lg m-1 px-3 py-2"
                          >
                            <Edit className="h-4 w-4 mr-3 text-orange-600" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(deductionType)}
                            className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600 rounded-lg m-1 px-3 py-2"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Delete Type
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-1 px-4 pb-4">
                    <CardDescription className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                      {deductionType.description}
                    </CardDescription>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Created {new Date(deductionType.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <FileX className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Deduction Types Yet</h3>
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    Get started by creating your first deduction type to manage employee salary deductions effectively.
                  </p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-6 py-2 rounded-lg font-medium"
                    disabled={!selectedInstitution?.id}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Deduction Type
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
        <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900">Edit Deduction Type</DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Make changes to the existing deduction type configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 py-6">
            <div className="space-y-3">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-800">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Income Tax, Health Insurance"
                disabled={isSubmitting}
                className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-800">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Provide a detailed description of this deduction type..."
                disabled={isSubmitting}
                className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base resize-none"
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center space-x-3">
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
                    className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                  />
                  <Label htmlFor="edit-is_mandatory" className="text-sm font-medium text-gray-700">
                    Mandatory Deduction
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
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
                    className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
                  />
                  <Label htmlFor="edit-is_active" className="text-sm font-medium text-gray-700">
                    Active Status
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-100">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 rounded-xl font-medium text-base"
              onClick={handleUpdateDeductionType}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isSubmitting ? "Updating Deduction Type..." : "Update Deduction Type"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open)
        if (!open) {
          setDeletingDeductionType(null)
        }
      }}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-4 pb-6">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">Delete Deduction Type</DialogTitle>
            <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{deletingDeductionType?.name}"</span>? This action cannot be undone and will permanently remove this deduction type from your system.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingDeductionType(null)
              }}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl border-gray-200 hover:bg-gray-50 font-medium"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDeductionType} 
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 h-12 rounded-xl font-medium shadow-lg"
            >
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isSubmitting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DeductionTypesComponent