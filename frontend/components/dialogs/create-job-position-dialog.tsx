"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Briefcase, Plus } from "lucide-react"
import { useSelector } from "react-redux"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { selectSelectedInstitution } from "@/store/auth/selectors"
import { getDepartments, createJobPosition } from "@/lib/utils"
import type { JobPositionFormData, IDepartment, CreateJobPositionData } from "@/app/types/types.utils"
import { toast } from "sonner"
import { CreateDepartmentDialog } from "./create-department-dialog"
import { RichEditorField } from "../common/rich-editor"

function formatWithCommas(value: string) {
  const num = value.replace(/,/g, "")
  if (!num) return ""
  return parseFloat(num).toLocaleString("en-US")
}

function unformat(value: string) {
  return value.replace(/,/g, "")
}

interface CreateJobPositionDialogProps {
  trigger?: React.ReactNode
  onJobPositionCreated?: (jobPosition: any) => void
}

export function CreateJobPositionDialog({
  trigger,
  onJobPositionCreated
}: CreateJobPositionDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<JobPositionFormData>({
    name: "",
    description: "",
    department: null,
    reports_to: null,
    job_position_status: "inactive",
    offer_letter_template: null,
    salary: "",
  })
  const [departments, setDepartments] = useState<IDepartment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof JobPositionFormData, string>>>({})
  const [salaryDisplay, setSalaryDisplay] = useState(
    formData.salary ? formatWithCommas(String(formData.salary)) : ""
  )

  const selectedInstitution = useSelector(selectSelectedInstitution)

  useEffect(() => {
    setSalaryDisplay(formData.salary ? formatWithCommas(String(formData.salary)) : "")
  }, [formData.salary])

  useEffect(() => {
    if (open && selectedInstitution) {
      fetchDepartments()
    }
  }, [open, selectedInstitution])

  const fetchDepartments = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)
      const fetchedDepartments = await getDepartments({ institutionId: selectedInstitution.id })
      if (fetchedDepartments) {
        setDepartments(fetchedDepartments)
      }
    } catch (error) {
      toast.error("Failed to load departments")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof JobPositionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Job position name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Job position name must be at least 2 characters"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Job description is required"
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters"
    }

    if (!formData.department) {
      newErrors.department = "Please select a department"
    }

    if (!formData.salary.trim()) {
      newErrors.salary = "Salary is required"
    } else if (isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
      newErrors.salary = "Please enter a valid salary amount"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedInstitution) {
      toast.error("Missing organization information")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    setIsSubmitting(true)

    try {
      const createData: CreateJobPositionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        department: formData.department!,
        salary: Number(formData.salary),
        affected_employees: [],
        job_position_status: formData.job_position_status,
      }

      const newJobPosition = await createJobPosition({
        institutionId: selectedInstitution.id,
        jobPositionData: createData,
      })

      if (newJobPosition) {
        toast.success("Job position created successfully!")
        onJobPositionCreated?.(newJobPosition)
        setOpen(false)
        setFormData({
          name: "",
          description: "",
          department: null,
          reports_to: null,
          job_position_status: "inactive",
          offer_letter_template: null,
          salary: "",
        })
      } else {
        toast.error("Failed to create job position. Please try again.")
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.job_position_status?.join(", ") ||
        error.response?.data?.non_field_errors?.join(", ") ||
        "Failed to create job position. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Create New Job Position</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Create New Job Position</DialogTitle>
              <DialogDescription>
                Add a new job position to your organization.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} >
          <div className="grid gap-4 overflow-y-auto h-full max-h-[70svh] py-8 mb-8">
            <div className="grid grid-cols-1 gap-6">
              {/* Job Position Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Job Position Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Software Engineer, HR Manager, Sales Representative"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              {/* Department with Create New Option */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="department">Department</Label>
                  <CreateDepartmentDialog
                    trigger={
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    }
                    onDepartmentCreated={(newDepartment) => {
                      setDepartments((prev) => [...prev, newDepartment])
                      updateFormData("department", newDepartment.id)
                    }}
                  />
                </div>
                <Select
                  value={formData.department?.toString() || "0"}
                  onValueChange={(value) => updateFormData("department", Number(value))}
                >
                  <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-sm text-destructive">{errors.department}</p>
                )}
              </div>

              {/* Salary */}
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  type="text"
                  inputMode="numeric"
                  placeholder="50,000"
                  value={salaryDisplay}
                  onChange={(e) => {
                    const raw = e.target.value
                    const numeric = unformat(raw)

                    if (!/^\d*$/.test(numeric)) return

                    setSalaryDisplay(formatWithCommas(numeric))
                    updateFormData("salary", numeric)
                  }}
                  className={errors.salary ? "border-destructive" : ""}
                />
                {errors.salary && <p className="text-sm text-destructive">{errors.salary}</p>}
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>

                <RichEditorField
                  id="description"
                  placeholder="Describe the job responsibilities, requirements, and qualifications..."
                  value={formData.description}
                  onChange={(value) => updateFormData("description", value)}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Job Position"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
