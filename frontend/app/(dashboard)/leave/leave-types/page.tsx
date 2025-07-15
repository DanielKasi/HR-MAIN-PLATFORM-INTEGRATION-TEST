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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createLeaveType, getLeaveTypes, updateLeaveType, deleteLeaveType } from "@/lib/utils"
import { ILeaveType, ILeaveTypeFormData } from "@/app/types/types.utils"
import { toast } from "sonner"
import { select } from "redux-saga/effects"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { useSelector } from "react-redux"

interface LeaveType extends ILeaveType {

}

const LEAVE_CATEGORIES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "compassionate", label: "Compassionate Leave" },
  { value: "study", label: "Study Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
]

const GENDER_CHOICES = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

const LeaveTypesComponent = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null)
  const [deletingLeaveType, setDeletingLeaveType] = useState<LeaveType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedInstitution = useSelector(selectSelectedInstitution)

  const [formData, setFormData] = useState<{
    name: string
    category: string
    description: string
    max_days_per_year: string
    carry_forward_allowed: boolean
    max_carry_forward_days: string
    requires_document: boolean
    gender_specific: string
  }>({
    name: "",
    category: "annual",
    description: "",
    max_days_per_year: "",
    carry_forward_allowed: false,
    max_carry_forward_days: "",
    requires_document: false,
    gender_specific: "all",
  })

  const resetFormData = () => {
    setFormData({
      name: "",
      category: "annual",
      description: "",
      max_days_per_year: "",
      carry_forward_allowed: false,
      max_carry_forward_days: "",
      requires_document: false,
      gender_specific: "all",
    })
  }


 useEffect(() => {
  const fetchLeaveTypes = async () => {
    if (selectedInstitution?.id === undefined) {
      setLeaveTypes([]);
      return;
    }
    setIsLoading(true);
    try {
      const types = await getLeaveTypes({
        institutionId: selectedInstitution.id
      });
      setLeaveTypes(types);
    } catch (error) {
      toast.error("Failed to load leave types");
    } finally {
      setIsLoading(false);
    }
  };

  fetchLeaveTypes();
}, [selectedInstitution?.id]);

  const handleAddLeaveType = async () => {
    if (!formData.name || !formData.description || !formData.max_days_per_year) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const leaveTypeData: ILeaveTypeFormData = {
        name: formData.name,
        category: formData.category as any,
        description: formData.description,
        max_days_per_year: parseInt(formData.max_days_per_year),
        carry_forward_allowed: formData.carry_forward_allowed,
        max_carry_forward_days: parseInt(formData.max_carry_forward_days) || 0,
        is_active: true,
        requires_document: formData.requires_document,
        gender_specific: formData.gender_specific === "all" ? null : formData.gender_specific as any,
      }

      if (selectedInstitution?.id === undefined) {
        toast.error("Institution is not selected");
        setIsSubmitting(false);
        return;
      }
      const newLeaveType = await createLeaveType({
        institutionId: selectedInstitution.id,
        leaveTypeData,
      })

      if (newLeaveType) {
        setLeaveTypes([...leaveTypes, newLeaveType])
        toast.success("Leave type created successfully")
        resetFormData()
        setIsAddDialogOpen(false)
      } else {
        toast.error("Failed to create leave type")
      }
    } catch (error) {
      toast.error("An error occurred while creating the leave type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateLeaveType = async () => {
    if (!editingLeaveType) return

    if (!formData.name || !formData.description || !formData.max_days_per_year) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const leaveTypeData: ILeaveTypeFormData = {
        name: formData.name,
        category: formData.category as any,
        description: formData.description,
        max_days_per_year: parseInt(formData.max_days_per_year),
        carry_forward_allowed: formData.carry_forward_allowed,
        max_carry_forward_days: parseInt(formData.max_carry_forward_days) || 0,
        is_active: true,
        requires_document: formData.requires_document,
        gender_specific: formData.gender_specific === "null" ? "all" : formData.gender_specific as any,
      }
      const updatedLeaveType = await updateLeaveType({
        leaveTypeId: editingLeaveType.id,
        leaveTypeData,
      })

      if (updatedLeaveType) {
        const updatedLeaveTypes = leaveTypes.map((leaveType) =>
          leaveType.id === editingLeaveType.id ? updatedLeaveType : leaveType
        )
        setLeaveTypes(updatedLeaveTypes)
        toast.success("Leave type updated successfully")
        resetFormData()
        setIsEditDialogOpen(false)
        setEditingLeaveType(null)
      } else {
        toast.error("Failed to update leave type")
      }
    } catch (error) {
      toast.error("An error occurred while updating the leave type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLeaveType = async () => {
    if (!deletingLeaveType) return

    setIsSubmitting(true)
    try {
      const success = await deleteLeaveType({
        leaveTypeId: deletingLeaveType.id,
      });

      if (success) {
        setLeaveTypes(leaveTypes.filter((leaveType) => leaveType.id !== deletingLeaveType.id))
        toast.success("Leave type deleted successfully")
        setIsDeleteDialogOpen(false)
        setDeletingLeaveType(null)
      } else {
        toast.error("Failed to delete leave type from database")
      }
    } catch (error) {
      toast.error("An error occurred while deleting the leave type")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (leaveType: LeaveType) => {
    setDeletingLeaveType(leaveType)
    setIsDeleteDialogOpen(true)
  }

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType)
    setFormData({
      name: leaveType.name,
      category: leaveType.category,
      description: leaveType.description,
      max_days_per_year: leaveType.max_days_per_year.toString(),
      carry_forward_allowed: leaveType.carry_forward_allowed,
      max_carry_forward_days: leaveType.max_carry_forward_days.toString(),
      requires_document: leaveType.requires_document,
      gender_specific: leaveType.gender_specific || "all",
    })
    setIsEditDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="w-full py-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Leave Types</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">Add Leave Type</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Leave Type</DialogTitle>
                <DialogDescription>Create a new leave type to manage leave requests.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_days_per_year">Max Days Per Year *</Label>
                  <Input
                    id="max_days_per_year"
                    type="number"
                    value={formData.max_days_per_year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_days_per_year: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_carry_forward_days">Max Carry Forward Days</Label>
                  <Input
                    id="max_carry_forward_days"
                    type="number"
                    value={formData.max_carry_forward_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_carry_forward_days: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender_specific">Gender Specific</Label>
                  <Select
                    value={formData.gender_specific}
                    onValueChange={(value) => setFormData({ ...formData, gender_specific: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_CHOICES.map((gender) => (
                        <SelectItem key={gender.value} value={gender.value}>
                          {gender.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="carry_forward_allowed"
                        checked={formData.carry_forward_allowed}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            carry_forward_allowed: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="carry_forward_allowed" className="text-sm">
                        Carry Forward
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requires_document"
                        checked={formData.requires_document}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requires_document: e.target.checked,
                          })
                        }
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="requires_document" className="text-sm">
                        Requires Document
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleAddLeaveType}
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
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
            {leaveTypes.map((leaveType) => (
              <Card
                key={leaveType.id}
                className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-1">{leaveType.name}</CardTitle>
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs font-medium">
                        {leaveType.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-orange-50">
                          <MoreHorizontal className="h-3 w-3 text-orange-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => handleEditLeaveType(leaveType)}
                          className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                        >
                          <Edit className="h-4 w-4 mr-2 text-orange-600" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(leaveType)}
                          className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <CardDescription className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {leaveType.description}
                  </CardDescription>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Max Days:</span>
                      <span className="text-gray-900 font-semibold">{leaveType.max_days_per_year} days</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Carry Forward:</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          leaveType.carry_forward_allowed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {leaveType.carry_forward_allowed ? "Yes" : "No"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Requires Doc:</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          leaveType.requires_document ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {leaveType.requires_document ? "Yes" : "No"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Gender:</span>
                      <span className="text-gray-900 text-sm font-medium capitalize">
                        {leaveType.gender_specific || "All"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
            <DialogDescription>Make changes to an existing leave type.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-max_days_per_year">Max Days Per Year *</Label>
              <Input
                id="edit-max_days_per_year"
                type="number"
                value={formData.max_days_per_year}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_days_per_year: e.target.value,
                  })
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-max_carry_forward_days">Max Carry Forward Days</Label>
              <Input
                id="edit-max_carry_forward_days"
                type="number"
                value={formData.max_carry_forward_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_carry_forward_days: e.target.value,
                  })
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender_specific">Gender Specific</Label>
              <Select
                value={formData.gender_specific}
                onValueChange={(value) => setFormData({ ...formData, gender_specific: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_CHOICES.map((gender) => (
                    <SelectItem key={gender.value} value={gender.value}>
                      {gender.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-carry_forward_allowed"
                    checked={formData.carry_forward_allowed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carry_forward_allowed: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="edit-carry_forward_allowed" className="text-sm">
                    Carry Forward
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-requires_document"
                    checked={formData.requires_document}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requires_document: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="edit-requires_document" className="text-sm">
                    Requires Document
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleUpdateLeaveType}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Leave Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingLeaveType?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingLeaveType(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLeaveType}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LeaveTypesComponent
