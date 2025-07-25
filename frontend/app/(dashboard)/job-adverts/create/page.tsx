"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Megaphone, ArrowLeft, Check, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositions, createJobPositionAdvert } from "@/lib/utils"
import type { JobPositionAdvertFormData, IJobPosition, JobAdvertStatus } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function CreateJobAdvertPage() {
  const [formData, setFormData] = useState<JobPositionAdvertFormData>({
    job_position: 0,
    status: "active" as JobAdvertStatus,
    expiry_date: "",
    number_of_employees_expected: 1,
    extra_information: "",
  })
  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof JobPositionAdvertFormData, string>>>({})

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  // Get tomorrow's date in YYYY-MM-DD format (minimum selectable date)
  const getTomorrowString = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    fetchJobPositions()
  }, [selectedInstitution, selectedBranch, router])

  const fetchJobPositions = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)
      const fetchedJobPositions = await getJobPositions({ institutionId: selectedInstitution.id })

      if (fetchedJobPositions) {
        setJobPositions(fetchedJobPositions)
      } else {
        toast.error("Failed to load job positions")
      }
    } catch (error) {
      toast.error("Failed to load job positions")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof Exclude<JobPositionAdvertFormData, "status">, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // Enhanced date validation
  const validateExpiryDate = (dateString: string): string | null => {
    if (!dateString) {
      return "Expiry date is required"
    }

    const selectedDate = new Date(dateString)
    const today = new Date()
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate <= today) {
      return "Expiry date must be at least tomorrow"
    }

    // Optional: Add maximum date validation (e.g., not more than 1 year from now)
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 1)
    maxDate.setHours(0, 0, 0, 0)
    
    if (selectedDate > maxDate) {
      return "Expiry date cannot be more than 1 year from now"
    }

    return null
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionAdvertFormData, string>> = {}

    if (!formData.job_position || formData.job_position === 0) {
      newErrors.job_position = "Please select a job position"
    }

    // Use enhanced date validation
    const dateError = validateExpiryDate(formData.expiry_date)
    if (dateError) {
      newErrors.expiry_date = dateError
    }

    if (formData.number_of_employees_expected && formData.number_of_employees_expected < 1) {
      newErrors.number_of_employees_expected = "Number of employees must be at least 1"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle date change with immediate validation
  const handleDateChange = (dateString: string) => {
    updateFormData("expiry_date", dateString)
    
    // Immediate validation feedback
    const dateError = validateExpiryDate(dateString)
    if (dateError) {
      setErrors((prev) => ({ ...prev, expiry_date: dateError }))
    } else {
      setErrors((prev) => ({ ...prev, expiry_date: undefined }))
    }
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
      const createData: JobPositionAdvertFormData = {
        job_position: formData.job_position,
        status: formData.status,
        expiry_date: formData.expiry_date,
        number_of_employees_expected: formData.number_of_employees_expected || undefined,
        extra_information: formData.extra_information || undefined,
      }

      const newJobAdvert = await createJobPositionAdvert({
        institutionId: selectedInstitution.id,
        advertData: createData,
      })

      if (newJobAdvert) {
        toast.success("Job advert created successfully!")
        router.push("/job-adverts")
      } else {
        toast.error("Failed to create job advert. Please try again.")
      }
    } catch (error) {
      toast.error("Failed to create job advert. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  // Set default expiry date to 30 days from now
  useEffect(() => {
    if (!formData.expiry_date) {
      const defaultExpiryDate = new Date()
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30)
      setFormData((prev) => ({
        ...prev,
        expiry_date: defaultExpiryDate.toISOString().split("T")[0],
      }))
    }
  }, [formData.expiry_date])

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return <div>Loading job positions...</div>
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Adverts
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Create New Job Advert</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create a job advertisement for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Fields - Responsive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Position */}
                <div className="space-y-2">
                  <Label htmlFor="job_position" className="text-sm font-medium">
                    Job Position *
                  </Label>
                  <Select
                    value={formData.job_position.toString()}
                    onValueChange={(value) => updateFormData("job_position", Number(value))}
                  >
                    <SelectTrigger className={errors.job_position ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a job position" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobPositions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name} - {position.department_details?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.job_position && <p className="text-sm text-destructive">{errors.job_position}</p>}
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiry_date" className="text-sm font-medium">
                    Expiry Date *
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      onBlur={(e) => {
                        // Additional validation on blur
                        const selectedDate = new Date(e.target.value)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        selectedDate.setHours(0, 0, 0, 0)
                        
                        if (selectedDate <= today) {
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          const correctedDate = tomorrow.toISOString().split("T")[0]
                          setFormData((prev) => ({ ...prev, expiry_date: correctedDate }))
                          toast.error("Past dates are not allowed. Date corrected to tomorrow.")
                        }
                      }}
                      className={`pl-10 ${errors.expiry_date ? "border-destructive" : ""}`}
                      min={getTomorrowString()} // Restrict to tomorrow and future dates
                      required
                    />
                  </div>
                </div>

                {/* Number of Employees Expected */}
                <div className="space-y-2">
                  <Label htmlFor="number_of_employees_expected" className="text-sm font-medium">
                    Number of Employees Expected
                  </Label>
                  <Input
                    id="number_of_employees_expected"
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="1"
                    value={formData.number_of_employees_expected || ""}
                    onChange={(e) =>
                      updateFormData("number_of_employees_expected", Number(e.target.value) || undefined)
                    }
                    className={errors.number_of_employees_expected ? "border-destructive" : ""}
                  />
                  {errors.number_of_employees_expected && (
                    <p className="text-sm text-destructive">{errors.number_of_employees_expected}</p>
                  )}
                </div>
              </div>

              {/* Extra Information - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="extra_information" className="text-sm font-medium">
                  Job Description (Optional)
                </Label>
                <Textarea
                  id="extra_information"
                  placeholder="Add any additional information about this job advertisement..."
                  value={formData.extra_information || ""}
                  onChange={(e) => updateFormData("extra_information", e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Provide additional details about the role, requirements, or company benefits
                </p>
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
                      Create Job Advert
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