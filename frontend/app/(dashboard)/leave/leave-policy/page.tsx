"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Clock,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Plus,
  Settings,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createLeavePolicy, getLeavePolicies, updateLeavePolicy, deleteLeavePolicy, getLeaveTypes } from "@/lib/utils"
import { ILeavePolicyResponse, ILeavePolicyFormData, ILeaveType  } from "@/app/types/types.utils"
import { toast } from "sonner"
import { select } from "redux-saga/effects"
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors"
import { useSelector } from "react-redux"
import { PERMISSION_CODES } from "@/app/types/types.utils"
import ProtectedComponent from "@/components/ProtectedComponent"

type LeavePolicy = ILeavePolicyResponse & {
  leave_type: ILeaveType;
}

const LeavePolicyComponent = () => {
  const [policies, setPolicies] = useState<LeavePolicy[]>([])
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null)
  const [deletingPolicy, setDeletingPolicy] = useState<LeavePolicy | null>(null)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedInstitution = useSelector(selectSelectedInstitution)


  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leave_type: "",
    min_notice_days: "",
    max_consecutive_days: "",
    requires_manager_approval: true,
    requires_hr_approval: false,
    applicable_after_probation_months: "",
  })

  const getSelectedLeaveType = () => {
    if (!formData.leave_type) return null
    return leaveTypes.find(type => type.id.toString() === formData.leave_type)
  }

  const getMaxDaysValidation = () => {
    const selectedLeaveType = getSelectedLeaveType()
    if (!selectedLeaveType || !formData.max_consecutive_days) return null
    
    const maxConsecutive = parseInt(formData.max_consecutive_days)
    const maxPerYear = selectedLeaveType.max_days_per_year
    
    if (maxConsecutive > maxPerYear) {
      return {
        type: 'error',
        message: `Cannot exceed ${maxPerYear} days (max days per year for ${selectedLeaveType.name})`
      }
    } else if (maxConsecutive === maxPerYear) {
      return {
        type: 'warning',
        message: `You've set the maximum allowed days for ${selectedLeaveType.name}`
      }
    }
    
    return null
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if(!selectedInstitution?.id) {
        return;
      }
      try {
        const [policiesData, leaveTypesData] = await Promise.all([
          getLeavePolicies({ institutionId: selectedInstitution?.id }),
          getLeaveTypes({ institutionId: selectedInstitution?.id })
        ])
        
        
        const activePolicies = policiesData
          .filter(policy => policy.is_active !== false && policy.id != null)
          
          setPolicies(activePolicies as LeavePolicy[])
        
        const activeLeaveTypes = leaveTypesData.filter(type => type.is_active !== false)
        setLeaveTypes(activeLeaveTypes)
      } catch (error) {
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [selectedInstitution])

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      leave_type: "",
      min_notice_days: "",
      max_consecutive_days: "",
      requires_manager_approval: true,
      requires_hr_approval: false,
      applicable_after_probation_months: "",
    })
  }

  const handleAddPolicy = async () => {
    if (!formData.name || !formData.description || !formData.leave_type || !formData.min_notice_days || !formData.applicable_after_probation_months) {
      toast.error("Please fill in all required fields")
      return
    }

    const validation = getMaxDaysValidation()
    if (validation?.type === 'error') {
      toast.error(validation.message)
      return
    }

    setIsSubmitting(true)
    try {
      const policyData: ILeavePolicyFormData = {
        name: formData.name,
        description: formData.description,
        leave_type: parseInt(formData.leave_type),
        min_notice_days: parseInt(formData.min_notice_days),
        max_consecutive_days: formData.max_consecutive_days ? parseInt(formData.max_consecutive_days) : 0,
        requires_manager_approval: formData.requires_manager_approval,
        requires_hr_approval: formData.requires_hr_approval,
        applicable_after_probation_months: parseInt(formData.applicable_after_probation_months),
        is_active: true,
      }

      if (!selectedInstitution) {
        toast.error("No institution selected");
        setIsSubmitting(false);
        return;
      }
      const newPolicy = await createLeavePolicy({
        institutionId: selectedInstitution.id,
        leavePolicyData: policyData,
      })

      if (newPolicy) {
        const selectedLeaveType = leaveTypes.find(lt => lt.id.toString() === formData.leave_type)
        const policyWithLeaveType = {
          ...newPolicy,
          leave_type: {
            id: selectedLeaveType?.id || formData.leave_type,
            name: selectedLeaveType?.name || "",
            category: selectedLeaveType?.category || "",
          }
        }
        
        setPolicies([...policies, policyWithLeaveType as LeavePolicy]);
        toast.success("Leave policy created successfully")
        resetForm()
        setIsAddDialogOpen(false)
      } else {
        toast.error("Failed to create leave policy")
      }
    } catch (error) {
      toast.error("An error occurred while creating the leave policy")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePolicy = async () => {
    if (!editingPolicy) return

    if (!formData.name || !formData.description || !formData.leave_type || !formData.min_notice_days || !formData.applicable_after_probation_months) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate max consecutive days
    const validation = getMaxDaysValidation()
    if (validation?.type === 'error') {
      toast.error(validation.message)
      return
    }

    setIsSubmitting(true)
    try {
      const policyData: ILeavePolicyFormData = {
        name: formData.name,
        description: formData.description,
        leave_type: parseInt(formData.leave_type),
        min_notice_days: parseInt(formData.min_notice_days),
        max_consecutive_days: formData.max_consecutive_days ? parseInt(formData.max_consecutive_days) : 0,
        requires_manager_approval: formData.requires_manager_approval,
        requires_hr_approval: formData.requires_hr_approval,
        applicable_after_probation_months: parseInt(formData.applicable_after_probation_months),
        is_active: true,
      }

      const updatedPolicy = await updateLeavePolicy({
        leavePolicyId: editingPolicy.id,
        leavePolicyData: policyData,
      })

      if (updatedPolicy) {
        const selectedLeaveType = leaveTypes.find(lt => lt.id.toString() === formData.leave_type)
        const policyWithLeaveType = {
          ...updatedPolicy,
          leave_type: {
            id: selectedLeaveType?.id || formData.leave_type,
            name: selectedLeaveType?.name || "",
            category: selectedLeaveType?.category || "",
          }
        }

        const updatedPolicies = policies.map((policy) =>
          policy.id === editingPolicy.id ? policyWithLeaveType as LeavePolicy : policy
        )
        setPolicies(updatedPolicies)
        toast.success("Leave policy updated successfully")
        resetForm()
        setIsEditDialogOpen(false)
        setEditingPolicy(null)
      } else {
        toast.error("Failed to update leave policy")
      }
    } catch (error) {
      toast.error("An error occurred while updating the leave policy")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePolicy = async () => {
    if (!deletingPolicy) return

    setIsSubmitting(true)
    try {
      const success = await deleteLeavePolicy({ 
        leavePolicyId: deletingPolicy.id, 
      });
      
      if (success) {
        setPolicies(policies.filter((policy) => policy.id !== deletingPolicy.id))
        toast.success("Leave policy deleted successfully")
        setIsDeleteDialogOpen(false)
        setDeletingPolicy(null)
      } else {
        toast.error("Failed to delete leave policy from database")
      }
    } catch (error) {
      toast.error("An error occurred while deleting the leave policy")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (policy: LeavePolicy) => {
    setDeletingPolicy(policy)
    setIsDeleteDialogOpen(true)
  }

  const handleEditPolicy = (policy: LeavePolicy) => {
    setEditingPolicy(policy)
    setFormData({
      name: policy.name,
      description: policy.description,
      leave_type: policy.leave_type.id.toString(),
      min_notice_days: policy.min_notice_days.toString(),
      max_consecutive_days: policy.max_consecutive_days?.toString() || "",
      requires_manager_approval: policy.requires_manager_approval,
      requires_hr_approval: policy.requires_hr_approval,
      applicable_after_probation_months: policy.applicable_after_probation_months.toString(),
    })
    setIsEditDialogOpen(true)
  }

  const togglePolicyStatus = async (policy: LeavePolicy) => {
    try {
      const policyData: ILeavePolicyFormData = {
        name: policy.name,
        description: policy.description,
        leave_type: parseInt(policy.leave_type.id.toString()),
        min_notice_days: policy.min_notice_days,
        max_consecutive_days: policy.max_consecutive_days || 0,
        requires_manager_approval: policy.requires_manager_approval,
        requires_hr_approval: policy.requires_hr_approval,
        applicable_after_probation_months: policy.applicable_after_probation_months,
        is_active: !policy.is_active,
      }

      const updatedPolicy = await updateLeavePolicy({
        leavePolicyId: policy.id,
        leavePolicyData: policyData,
      })

      if (updatedPolicy) {
        const updatedPolicies = policies.map((p) =>
          p.id === policy.id ? { ...p, is_active: !p.is_active } : p
        )
        setPolicies(updatedPolicies)
        toast.success(`Policy ${!policy.is_active ? 'activated' : 'deactivated'} successfully`)
      } else {
        toast.error("Failed to update policy status")
      }
    } catch (error) {
      toast.error("An error occurred while updating the policy status")
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      annual: "bg-blue-50 text-blue-700 border-blue-200",
      sick: "bg-red-50 text-red-700 border-red-200",
      maternity: "bg-pink-50 text-pink-700 border-pink-200",
      paternity: "bg-indigo-50 text-indigo-700 border-indigo-200",
      study: "bg-purple-50 text-purple-700 border-purple-200",
      compassionate: "bg-green-50 text-green-700 border-green-200",
    }
    return colors[category as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200"
  }

  const toggleDescription = (policyId: string) => {
    const newExpanded = new Set(expandedDescriptions)
    if (newExpanded.has(policyId)) {
      newExpanded.delete(policyId)
    } else {
      newExpanded.add(policyId)
    }
    setExpandedDescriptions(newExpanded)
  }

  // Render Max Consecutive Days field with validation
  const renderMaxConsecutiveDaysField = (isEdit = false) => {
    const selectedLeaveType = getSelectedLeaveType()
    const validation = getMaxDaysValidation()
    const fieldId = isEdit ? "edit-max_consecutive_days" : "max_consecutive_days"
    
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId} className="text-sm font-medium">
          Max Consecutive Days
        </Label>
        <Input
          id={fieldId}
          type="number"
          placeholder="Leave empty for no limit"
          value={formData.max_consecutive_days}
          onChange={(e) => setFormData({ ...formData, max_consecutive_days: e.target.value })}
          className={`focus:ring-orange-500 focus:border-orange-500 ${
            validation?.type === 'error' ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          disabled={isSubmitting}
        />
        
        {/* Show leave type limit info */}
        {selectedLeaveType && (
          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium">
                {selectedLeaveType.name} Limit: {selectedLeaveType.max_days_per_year} days per year
              </p>
              <p className="text-blue-600 text-xs">
                Max consecutive days cannot exceed the annual limit
              </p>
            </div>
          </div>
        )}
        
        {/* Show validation message */}
        {validation && (
          <div className={`flex items-start gap-2 p-2 rounded-lg ${
            validation.type === 'error' 
              ? 'bg-red-50' 
              : 'bg-amber-50'
          }`}>
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
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <div className="w-full px-2 py-8">
        {/* Header Section */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Policies</h1>
              <p className="text-gray-600">Manage your organization's leave policies and approval workflows</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Add Leave Policy</DialogTitle>
                  <DialogDescription>Create a new leave policy for your organization.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Policy Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="focus:ring-orange-500 focus:border-orange-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leave_type" className="text-sm font-medium">
                      Leave Type *
                    </Label>
                    <Select 
                      value={formData.leave_type}
                      onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} ({type.max_days_per_year} days/year)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="focus:ring-orange-500 focus:border-orange-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_notice_days" className="text-sm font-medium">
                      Minimum Notice Days *
                    </Label>
                    <Input
                      id="min_notice_days"
                      type="number"
                      value={formData.min_notice_days}
                      onChange={(e) => setFormData({ ...formData, min_notice_days: e.target.value })}
                      className="focus:ring-orange-500 focus:border-orange-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  {renderMaxConsecutiveDaysField()}
                  <div className="space-y-2">
                    <Label htmlFor="applicable_after_probation_months" className="text-sm font-medium">
                      Applicable After Probation (Months) *
                    </Label>
                    <Input
                      id="applicable_after_probation_months"
                      type="number"
                      value={formData.applicable_after_probation_months}
                      onChange={(e) => setFormData({ ...formData, applicable_after_probation_months: e.target.value })}
                      className="focus:ring-orange-500 focus:border-orange-500"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Approval Requirements</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="requires_manager_approval"
                          checked={formData.requires_manager_approval}
                          onChange={(e) => setFormData({ ...formData, requires_manager_approval: e.target.checked })}
                          className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="requires_manager_approval" className="text-sm">
                          Requires Manager Approval
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="requires_hr_approval"
                          checked={formData.requires_hr_approval}
                          onChange={(e) => setFormData({ ...formData, requires_hr_approval: e.target.checked })}
                          className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="requires_hr_approval" className="text-sm">
                          Requires HR Approval
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  onClick={handleAddPolicy}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Creating..." : "Add Policy"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 px-2">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Policies</p>
                  <p className="text-2xl font-bold text-gray-900">{policies.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{policies.filter((p) => p.is_active).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-gray-900">{policies.filter((p) => !p.is_active).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">HR Approval</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {policies.filter((p) => p.requires_hr_approval).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((policy) => (
            <Card
              key={policy.id}
              className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white overflow-hidden ${
                policy.is_active ? "" : "opacity-75"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={`${getCategoryColor(policy.leave_type.category)} border font-medium px-3 py-1`}>
                        {policy.leave_type.name}
                      </Badge>
                      <Badge
                        className={`font-medium px-3 py-1 ${
                          policy.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {policy.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {policy.name}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => handleEditPolicy(policy)}
                        className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                      >
                        <Edit className="h-4 w-4 mr-2 text-orange-600" />
                        Edit Policy
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => togglePolicyStatus(policy)}
                        className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
                      >
                        <Users className="h-4 w-4 mr-2 text-orange-600" />
                        {policy.is_active ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(policy)}
                        className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Policy
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-600 mb-4 leading-relaxed">
                  <div className="relative group">
                    <p
                      className={`${expandedDescriptions.has(policy.id.toString()) ? "" : "line-clamp-2"} transition-all duration-200`}
                    >
                      {policy.description}
                    </p>

                    {/* Show more/less button for long descriptions */}
                    {policy.description.length > 120 && (
                      <button
                        onClick={() => toggleDescription(policy.id.toString())}
                        className="text-orange-600 hover:text-orange-700 text-xs font-medium mt-1 transition-colors"
                      >
                        {expandedDescriptions.has(policy.id.toString()) ? "Show less" : "Show more"}
                      </button>
                    )}

                    {/* Hover tooltip for quick preview */}
                    {!expandedDescriptions.has(policy.id.toString()) && policy.description.length > 120 && (
                      <div className="absolute left-0 top-full mt-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-sm pointer-events-none">
                        {policy.description}
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Policy Details */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Min Notice</p>
                        <p className="text-sm font-semibold text-gray-900">{policy.min_notice_days} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Max Days</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {policy.max_consecutive_days ? `${policy.max_consecutive_days} days` : "No limit"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Probation Period */}
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">After Probation</span>
                    <span className="text-sm font-bold text-blue-900">
                      {policy.applicable_after_probation_months} months
                    </span>
                  </div>

                  {/* Approval Requirements */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approval Required</p>
                    <div className="flex gap-2">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          policy.requires_manager_approval
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {policy.requires_manager_approval ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Manager
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          policy.requires_hr_approval ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {policy.requires_hr_approval ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        HR
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Edit Leave Policy</DialogTitle>
              <DialogDescription>Make changes to the existing leave policy.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Policy Name *
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="focus:ring-orange-500 focus:border-orange-500"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-leave_type" className="text-sm font-medium">
                  Leave Type *
                </Label>
                <Select 
                  value={formData.leave_type}
                  onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} ({type.max_days_per_year} days/year)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-description" className="text-sm font-medium">
                  Description *
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="focus:ring-orange-500 focus:border-orange-500"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min_notice_days" className="text-sm font-medium">
                  Minimum Notice Days *
                </Label>
                <Input
                  id="edit-min_notice_days"
                  type="number"
                  value={formData.min_notice_days}
                  onChange={(e) => setFormData({ ...formData, min_notice_days: e.target.value })}
                  className="focus:ring-orange-500 focus:border-orange-500"
                  disabled={isSubmitting}
                />
              </div>
              {renderMaxConsecutiveDaysField(true)}
              <div className="space-y-2">
                <Label htmlFor="edit-applicable_after_probation_months" className="text-sm font-medium">
                  Applicable After Probation (Months) *
                </Label>
                <Input
                  id="edit-applicable_after_probation_months"
                  type="number"
                  value={formData.applicable_after_probation_months}
                  onChange={(e) => setFormData({ ...formData, applicable_after_probation_months: e.target.value })}
                  className="focus:ring-orange-500 focus:border-orange-500"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Approval Requirements</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="edit-requires_manager_approval"
                      checked={formData.requires_manager_approval}
                      onChange={(e) => setFormData({ ...formData, requires_manager_approval: e.target.checked })}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="edit-requires_manager_approval" className="text-sm">
                      Requires Manager Approval
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="edit-requires_hr_approval"
                      checked={formData.requires_hr_approval}
                      onChange={(e) => setFormData({ ...formData, requires_hr_approval: e.target.checked })}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="edit-requires_hr_approval" className="text-sm">
                      Requires HR Approval
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              onClick={handleUpdatePolicy}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Updating..." : "Update Policy"}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Leave Policy</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingPolicy?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setDeletingPolicy(null)
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePolicy}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default LeavePolicyComponent