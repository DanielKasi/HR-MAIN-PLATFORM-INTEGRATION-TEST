"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Megaphone, ArrowLeft, Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositions, getJobPositionAdvertById, updateJobPositionAdvert, getJobPosition } from "@/lib/utils"
import type {
  JobPositionAdvertFormData,
  IJobPosition,
  JobAdvertStatus,
  JobPositionAdvert,
} from "@/app/types/types.utils"
import { toast } from "sonner"

export default function EditJobAdvertPage() {
  const [jobAdvert, setJobAdvert] = useState<JobPositionAdvert | null>(null)
  const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null)
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
  const params = useParams()
  const jobAdvertId = Number.parseInt(params.id as string)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    if (isNaN(jobAdvertId)) {
      toast.error("Invalid job advert ID")
      router.push("/job-adverts")
      return
    }

    fetchInitialData()
  }, [selectedInstitution, selectedBranch, jobAdvertId, router])

  const fetchInitialData = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)

      // Fetch job advert details
      const fetchedJobAdvert = await getJobPositionAdvertById({ advertId: jobAdvertId })

      if (!fetchedJobAdvert) {
        toast.error("Job advert not found")
        router.push("/job-adverts")
        return
      }

      setJobAdvert(fetchedJobAdvert)

      // Fetch job positions and job position details in parallel
      const [fetchedJobPositions, fetchedJobPosition] = await Promise.all([
        getJobPositions({ institutionId: selectedInstitution.id }),
        getJobPosition({ jobPositionId: fetchedJobAdvert.job_position }),
      ])

      if (fetchedJobPositions) {
        setJobPositions(fetchedJobPositions)
      }

      if (fetchedJobPosition) {
        setJobPosition(fetchedJobPosition)
      }

      // Pre-populate form data
      setFormData({
        job_position: fetchedJobAdvert.job_position,
        status: fetchedJobAdvert.status,
        expiry_date: fetchedJobAdvert.expiry_date.split("T")[0], // Convert to YYYY-MM-DD format
        number_of_employees_expected: fetchedJobAdvert.number_of_employees_expected || 1,
        extra_information: fetchedJobAdvert.extra_information || "",
      })
    } catch (error) {
      console.error("Error fetching initial data:", error)
      toast.error("Failed to load job advert data")
      router.push("/job-adverts")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof JobPositionAdvertFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionAdvertFormData, string>> = {}

    // Job position validation
    if (!formData.job_position || formData.job_position === 0) {
      newErrors.job_position = "Please select a job position"
    }

    // Expiry date validation - enhanced constraints
    if (!formData.expiry_date) {
      newErrors.expiry_date = "Expiry date is required"
    } else {
      const expiryDate = new Date(formData.expiry_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (expiryDate <= today) {
        newErrors.expiry_date = "Expiry date must be in the future"
      }

      // Check if the date is too far in the future (optional constraint)
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 2) // Max 2 years in future
      if (expiryDate > maxDate) {
        newErrors.expiry_date = "Expiry date cannot be more than 2 years in the future"
      }
    }

    // Number of employees validation - enhanced constraints
    if (formData.number_of_employees_expected !== undefined && formData.number_of_employees_expected !== null) {
      const numEmployees = Number(formData.number_of_employees_expected)

      if (!Number.isInteger(numEmployees)) {
        newErrors.number_of_employees_expected = "Number of employees must be a whole number"
      } else if (numEmployees < 1) {
        newErrors.number_of_employees_expected = "Number of employees must be at least 1"
      } else if (numEmployees > 1000) {
        newErrors.number_of_employees_expected = "Number of employees cannot exceed 1000"
      }
    }

    // Extra information validation (optional length constraint)
    if (formData.extra_information && formData.extra_information.length > 2000) {
      newErrors.extra_information = "Extra information cannot exceed 2000 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution || !selectedBranch || !jobAdvert) {
      toast.error("Missing required information")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    setIsSubmitting(true)

    try {
      const updateData: Partial<JobPositionAdvertFormData> = {
        job_position: formData.job_position,
        status: formData.status,
        expiry_date: formData.expiry_date,
        number_of_employees_expected: formData.number_of_employees_expected || undefined,
        extra_information: formData.extra_information || undefined,
      }

      const updatedJobAdvert = await updateJobPositionAdvert({
        advertId: jobAdvertId,
        advertData: updateData,
      })

      if (updatedJobAdvert) {
        toast.success("Job advert updated successfully!")
        router.push(`/job-adverts/${jobAdvertId}`)
      } else {
        toast.error("Failed to update job advert. Please try again.")
      }
    } catch (error) {
      console.error("Error updating job advert:", error)
      toast.error("Failed to update job advert. Please try again.")
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
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-24 w-full" />
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
            Back to Job Advert
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Edit Job Advert</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update job advertisement for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Job Position Info */}
              {jobPosition && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-800">Current Job Position</h4>
                  <div className="text-sm text-blue-700">
                    <p>
                      <span className="font-medium">Position:</span> {jobPosition.name}
                    </p>
                    <p>
                      <span className="font-medium">Department:</span> {jobPosition.department_details?.name}
                    </p>
                    <p>
                      <span className="font-medium">Salary:</span> ${jobPosition.salary.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

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

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status *
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => updateFormData("status", value as JobAdvertStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiry_date" className="text-sm font-medium">
                    Expiry Date *
                  </Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => updateFormData("expiry_date", e.target.value)}
                    className={errors.expiry_date ? "border-destructive" : ""}
                    min={new Date().toISOString().split("T")[0]} // Prevent past dates
                  />
                  {errors.expiry_date && <p className="text-sm text-destructive">{errors.expiry_date}</p>}
                  <p className="text-xs text-muted-foreground">Must be a future date (max 2 years ahead)</p>
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
                    step="1"
                    placeholder="1"
                    value={formData.number_of_employees_expected || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      const numValue = value === "" ? undefined : Number(value)
                      updateFormData("number_of_employees_expected", numValue)
                    }}
                    className={errors.number_of_employees_expected ? "border-destructive" : ""}
                  />
                  {errors.number_of_employees_expected && (
                    <p className="text-sm text-destructive">{errors.number_of_employees_expected}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Must be a positive integer (1-1000)</p>
                </div>
              </div>

              {/* Extra Information - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="extra_information" className="text-sm font-medium">
                  Extra Information (Optional)
                </Label>
                <Textarea
                  id="extra_information"
                  placeholder="Add any additional information about this job advertisement..."
                  value={formData.extra_information || ""}
                  onChange={(e) => updateFormData("extra_information", e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className={errors.extra_information ? "border-destructive" : ""}
                />
                {errors.extra_information && <p className="text-sm text-destructive">{errors.extra_information}</p>}
                <p className="text-xs text-muted-foreground">
                  {formData.extra_information?.length || 0}/2000 characters
                </p>
              </div>

              {/* Job Advert Info Display */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3">Job Advert Information:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Advert ID:</span> {jobAdvert?.id}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Organization:</span>{" "}
                      {selectedInstitution.institution_name}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Branch:</span> {selectedBranch.branch_name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Published:</span>{" "}
                      {jobAdvert?.published_date ? new Date(jobAdvert.published_date).toLocaleDateString() : "N/A"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Current Status:</span> {jobAdvert?.status}
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
                      Update Job Advert
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
