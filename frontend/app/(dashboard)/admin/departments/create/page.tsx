"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Building2, ArrowLeft, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { createDepartment } from "@/lib/utils"
import { DepartmentFormData } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function CreateDepartmentPage() {
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: "",
    description: "",
    institution:0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<DepartmentFormData>>({})

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
    }
  }, [selectedInstitution, selectedBranch, router])

  const updateFormData = (field: keyof DepartmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

    if (!selectedInstitution || !selectedBranch) {
      toast.error("Missing organization or branch information")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    setIsSubmitting(true)

    try {
      const newDepartment = await createDepartment({
        departmentData: {
          name: formData.name.trim(),
          description: formData.description.trim(),
          institution:selectedInstitution.id
        },
      })

      if (newDepartment) {
        toast.success("Department created successfully!")
        router.push("/admin/departments")
      } else {
        toast.error("Failed to create department. Please try again.")
      }
    } catch (error) {
      toast.error("Failed to create department. Please try again.")
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

  return (
    <div className="w-full h-full p-6">
      <div className="w-full space-y-6">
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
                <CardTitle className="text-xl">Create New Department</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add a new department to {selectedBranch.branch_name} - {selectedInstitution.institution_name}
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

              {/* Organization Info Display */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3">Department will be created for:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Organization:</span>{" "}
                      {selectedInstitution.institution_name}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Branch:</span> {selectedBranch.branch_name}
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
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Department
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
