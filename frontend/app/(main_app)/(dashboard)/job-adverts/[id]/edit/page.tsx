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
import { Skeleton } from "@/components/ui/skeleton"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositions, getJobPositionAdvertById, updateJobPositionAdvert, getJobPosition } from "@/lib/utils"
import type {
  JobPositionAdvertFormData,
  IJobPosition,
  JobAdvertStatus,
  JobPositionAdvert,
} from "@/types/types.utils"
import { toast } from "sonner"
import { SearchableSelect, SearchableSelectItem } from "@/components/searchable-select";
import { RichEditorField } from "@/components/common/rich-editor"

export default function EditJobAdvertPage() {
  const [jobAdvert, setJobAdvert] = useState<JobPositionAdvert | null>(null)
  const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null)
  const [formData, setFormData] = useState<JobPositionAdvertFormData>({
  job_position: 0,
  job_position_advert_status: "active" as JobAdvertStatus,
  expiry_date: "",
  number_of_employees_expected: 1,
  extra_information: "",
  level: 0, // Provide a default value
  interviewers: [], // Provide a default value
});

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
      toast.error("Invalid job opening ID")
      router.push("/job-adverts")
      return
    }

    fetchInitialData()
  }, [selectedInstitution, selectedBranch, jobAdvertId, router])

  const fetchInitialData = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)

      // Fetch job opening details
      const fetchedJobAdvert = await getJobPositionAdvertById({ advertId: jobAdvertId })

      if (!fetchedJobAdvert) {
        toast.error("Job position not found")
        router.push("/job-adverts")
        return
      }

      setJobAdvert(fetchedJobAdvert)

      const [fetchedJobPositionsResponse, fetchedJobPosition] = await Promise.all([
        getJobPositions({ institutionId: selectedInstitution.id }),
        getJobPosition({ jobPositionId: fetchedJobAdvert.job_position }),
      ])

      // Handle paginated job positions/titles response
      if (fetchedJobPositionsResponse && 'results' in fetchedJobPositionsResponse && Array.isArray(fetchedJobPositionsResponse.results)) {
        setJobPositions(fetchedJobPositionsResponse.results)
      } else if (Array.isArray(fetchedJobPositionsResponse)) {
        setJobPositions(fetchedJobPositionsResponse)
      } else {
        setJobPositions([])
      }

      if (fetchedJobPosition) {
        setJobPosition(fetchedJobPosition)
      }

      const expiryDate = fetchedJobAdvert.expiry_date
        ? new Date(fetchedJobAdvert.expiry_date).toISOString().split('T')[0]
        : ""

     const formDataToSet: JobPositionAdvertFormData = {
        job_position: 0,
        job_position_advert_status: "active",
        expiry_date: "",
        number_of_employees_expected: 1,
        extra_information: "",
        level: 0, 
        interviewers: [] 
      };

      setFormData(formDataToSet);

    } catch (error) {
      toast.error("Failed to load job opening data")
      router.push("/job-adverts")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof JobPositionAdvertFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionAdvertFormData, string>> = {}

    if (!formData.job_position || formData.job_position === 0) {
      newErrors.job_position = "Please select a job position"
    }

    if (!formData.job_position_advert_status) {
      newErrors.job_position_advert_status = "Status is required"
    }

    if (!formData.expiry_date) {
      newErrors.expiry_date = "Expiry date is required"
    } else {
      const expiryDate = new Date(formData.expiry_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (expiryDate <= today) {
        newErrors.expiry_date = "Expiry date must be in the future"
      }

      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 2)
      if (expiryDate > maxDate) {
        newErrors.expiry_date = "Expiry date cannot be more than 2 years in the future"
      }
    }

    if (formData.job_position && !jobPositions.some((pos) => pos.id === formData.job_position)) {
      newErrors.job_position = "Selected job position/title does not exist"
    }

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

    if (formData.extra_information && formData.extra_information.length > 0 && formData.extra_information.length < 10) {
      newErrors.extra_information = "Extra information must be at least 10 characters"
    }

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
        job_position_advert_status: formData.job_position_advert_status,
        expiry_date: formData.expiry_date,
        number_of_employees_expected: formData.number_of_employees_expected || undefined,
        extra_information: formData.extra_information || undefined,
      }

      const updatedJobAdvert = await updateJobPositionAdvert({
        advertId: jobAdvertId,
        advertData: updateData,
      })

      if (updatedJobAdvert) {
        toast.success("Job position updated successfully!")
        router.push(`/job-adverts`)
      } else {
        toast.error("Failed to update job position. Please try again.")
      }
    } catch (error) {
      toast.error("Failed to update job opening. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  // Prepare job positions for searchable select
  const jobPositionItems: SearchableSelectItem[] = jobPositions.map((position) => ({
    id: position.id,
    label: `${position.name} - ${position.department_details?.name}`,
    value: `${position.name} ${position.department_details?.name}`.toLowerCase(),
  }));

  // Prepare status options for searchable select
  const statusItems: SearchableSelectItem[] = [
    { id: "active", label: "Active", value: "active" },
    { id: "expired", label: "Expired", value: "expired" },
    { id: "archived", label: "Archived", value: "archived" },
    { id: "closed", label: "Closed", value: "closed" },
  ];

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
      <div className="w-full space-y-6">


        <Card className="w-full -ml-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center justify-start">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2 rounded-full aspect-square">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-xl">Edit Job Opening</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Update job opening for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Fields - Responsive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Position/Title */}
                <div className="space-y-2">
                  <Label htmlFor="job_position" className="text-sm font-medium">
                    Job Position / Title *
                  </Label>
                  <SearchableSelect
                    items={jobPositionItems}
                    selectedItems={formData.job_position ? [formData.job_position] : []}
                    placeholder="Select a job position"
                    searchPlaceholder="Search job positions..."
                    emptyMessage="No job positions found."
                    onSelect={(itemId) => updateFormData("job_position", Number(itemId))}
                    multiple={false}
                    triggerClassName={errors.job_position ? "border-destructive" : ""}
                    popoverClassName="w-[400px]"
                  />
                  {errors.job_position && <p className="text-sm text-destructive">{errors.job_position}</p>}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status *
                  </Label>
                  <SearchableSelect
                    items={statusItems}
                    selectedItems={formData.job_position_advert_status ? [formData.job_position_advert_status] : []}
                    placeholder="Select status"
                    searchPlaceholder="Search status..."
                    emptyMessage="No status options found."
                    onSelect={(itemId) => updateFormData("job_position_advert_status", itemId as JobAdvertStatus)}
                    multiple={false}
                    triggerClassName={errors.job_position_advert_status ? "border-destructive" : ""}
                    popoverClassName="w-[200px]"
                  />
                  {errors.job_position_advert_status && (
                    <p className="text-sm text-destructive">{errors.job_position_advert_status}</p>
                  )}
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

                {/* Number of Employees Required */}
                <div className="space-y-2">
                  <Label htmlFor="number_of_employees_expected" className="text-sm font-medium">
                    Number of Employees Required
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
              <div >
                <Label htmlFor="extra_information" className="text-sm font-medium">
                  Job Description (Optional)
                </Label>

                <RichEditorField id="extra_information"
                  placeholder="Add any additional information about this job opening..."
                  value={formData.extra_information || ""}
                  onChange={(value) => updateFormData("extra_information", value)}
                  className={errors.extra_information ? "border-destructive" : ""}
                />
                {errors.extra_information && <p className="text-sm text-destructive">{errors.extra_information}</p>}
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
                      Update Job Position
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