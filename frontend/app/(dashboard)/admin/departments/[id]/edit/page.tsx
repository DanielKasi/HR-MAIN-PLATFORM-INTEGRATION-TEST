"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Building2, ArrowLeft, Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getDepartment, updateDepartment } from "@/lib/utils"
import { IDepartment, DepartmentFormData } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function EditDepartmentPage() {
  const [department, setDepartment] = useState<IDepartment | null>(null)
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: "",
    description: "",
    institution:0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<DepartmentFormData>>({})

  const router = useRouter()
  const params = useParams()
  const departmentId = Number.parseInt(params.id as string)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    if (isNaN(departmentId)) {
      toast.error("Invalid department ID")
      router.push("/admin/departments")
      return
    }

    fetchDepartment()
  }, [selectedInstitution, selectedBranch, departmentId, router])

  const fetchDepartment = async () => {
    if(!selectedInstitution){return}
    try {
      setIsLoading(true)
      const fetchedDepartment = await getDepartment({ departmentId })

      if (fetchedDepartment) {
        setDepartment(fetchedDepartment)
        setFormData({
          name: fetchedDepartment.name,
          description: fetchedDepartment?.description||"",
          institution:selectedInstitution.id
        })
      } else {
        toast.error("Department not found")
        router.push("/admin/departments")
      }
    } catch (error) {
      console.error("Error fetching department:", error)
      toast.error("Failed to load department data")
      router.push("/admin/departments")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof DepartmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<DepartmentFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Department name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Department name must be at least 2 characters"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Department description is required"
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution || !selectedBranch || !department) {
      toast.error("Missing required information")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    setIsSubmitting(true)

    try {
      const updatedDepartmentData: IDepartment = {
        ...department,
        name: formData.name.trim(),
        description: formData.description.trim(),
        institution: selectedInstitution.id,
      }

      const updatedDepartment = await updateDepartment({
        departmentData: updatedDepartmentData,
      })

      if (updatedDepartment) {
        toast.success("Department updated successfully!")
        router.push("/admin/departments")
      } else {
        toast.error("Failed to update department. Please try again.")
      }
    } catch (error) {
      console.error("Error updating department:", error)
      toast.error("Failed to update department. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-6">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-32" />
          </div>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="hidden lg:block"></div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-24 w-full" />
              </div>

              <Skeleton className="h-20 w-full" />

              <div className="flex justify-end gap-3 pt-6">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Departments
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Edit Department</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update department details for {selectedBranch.branch_name} - {selectedInstitution.Institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Fields - Responsive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Department Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Human Resources, Finance, Operations"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                {/* Empty div for spacing on large screens when description spans full width */}
                <div className="hidden lg:block"></div>
              </div>

              {/* Department Description - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Department Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the department's role, responsibilities, and objectives..."
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  rows={4}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              {/* Department Info Display */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3">Department Information:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Department ID:</span> {department?.id}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Organization:</span>{" "}
                      {selectedInstitution.Institution_name}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Branch:</span> {selectedBranch.branch_name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Institution ID:</span> {selectedInstitution.id}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Branch ID:</span> {selectedBranch.id}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Current Institution:</span>{" "}
                      {department?.institution}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Update Department
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
