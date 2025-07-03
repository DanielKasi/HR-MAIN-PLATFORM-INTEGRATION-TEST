"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Users, ArrowLeft, Check, Loader2, User, Building } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { updateInterview, getInterviewById, getJobApplications, getInterviewStages } from "@/lib/utils"
import type { IInterviewFormData, IInterview, JobApplication, IInterviewStage } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function EditInterviewPage() {
  const [interview, setInterview] = useState<IInterview | null>(null)
  const [formData, setFormData] = useState<IInterviewFormData>({
    job_position_application: 0,
    interview_stage: 0,
    interview_date: "",
    status: "scheduled",
    feedback: "",
    rating: undefined,
  })
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([])
  const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([])
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [selectedStage, setSelectedStage] = useState<IInterviewStage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof IInterviewFormData, string>>>({})

  const router = useRouter()
  const params = useParams()
  const interviewId = Number.parseInt(params.id as string)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    if (isNaN(interviewId)) {
      toast.error("Invalid interview ID")
      router.push("/job-interviews")
      return
    }

    fetchInitialData()
  }, [selectedInstitution, selectedBranch, interviewId, router])

  const fetchInitialData = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)

      // Fetch interview details
      const fetchedInterview = await getInterviewById({ interviewId })

      if (!fetchedInterview) {
        toast.error("Interview not found")
        router.push("/job-interviews")
        return
      }

      setInterview(fetchedInterview)

      // Fetch applications and stages in parallel
      const [fetchedApplications, fetchedStages] = await Promise.all([
        getJobApplications({ institutionId: selectedInstitution.id }),
        getInterviewStages({ institutionId: selectedInstitution.id }),
      ])

      if (fetchedApplications) {
        setJobApplications(fetchedApplications)
        const currentApplication = fetchedApplications.find(
          (app) => app.id === fetchedInterview.job_position_application,
        )
        setSelectedApplication(currentApplication || null)
      }

      if (fetchedStages) {
        setInterviewStages(fetchedStages)
        const currentStage = fetchedStages.find((stage) => stage.id === fetchedInterview.interview_stage)
        setSelectedStage(currentStage || null)
      }

      // Pre-populate form data
      setFormData({
        job_position_application: fetchedInterview.job_position_application,
        interview_stage: fetchedInterview.interview_stage,
        interview_date: new Date(fetchedInterview.interview_date).toISOString().slice(0, 16),
        status: fetchedInterview.status,
        feedback: fetchedInterview.feedback || "",
        rating: fetchedInterview.rating || undefined,
      })
    } catch (error) {
      console.error("Error fetching initial data:", error)
      toast.error("Failed to load interview data")
      router.push("/job-interviews")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof IInterviewFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    // Update selected application when job_position_application changes
    if (field === "job_position_application") {
      const application = jobApplications.find((app) => app.id === Number(value))
      setSelectedApplication(application || null)
    }

    // Update selected stage when interview_stage changes
    if (field === "interview_stage") {
      const stage = interviewStages.find((stage) => stage.id === Number(value))
      setSelectedStage(stage || null)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IInterviewFormData, string>> = {}

    // Application validation
    if (!formData.job_position_application || formData.job_position_application === 0) {
      newErrors.job_position_application = "Please select a job application"
    }

    // Interview stage validation
    if (!formData.interview_stage || formData.interview_stage === 0) {
      newErrors.interview_stage = "Please select an interview stage"
    }

    // Interview date validation
    if (!formData.interview_date) {
      newErrors.interview_date = "Interview date and time is required"
    } else {
      const interviewDate = new Date(formData.interview_date)
      const now = new Date()
      // Only validate future date for scheduled interviews
      if (formData.status === "scheduled" && interviewDate <= now) {
        newErrors.interview_date = "Scheduled interview date must be in the future"
      }
    }

    // Rating validation (if provided)
    if (formData.rating !== undefined && formData.rating !== null) {
      const rating = Number(formData.rating)
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        newErrors.rating = "Rating must be a whole number between 1 and 10"
      }
    }

    // Feedback validation (optional length constraint)
    if (formData.feedback && formData.feedback.length > 1000) {
      newErrors.feedback = "Feedback cannot exceed 1000 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution || !selectedBranch || !interview) {
      toast.error("Missing required information")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    setIsSubmitting(true)

    try {
      const updateData: Partial<IInterviewFormData> = {
        job_position_application: formData.job_position_application,
        interview_stage: formData.interview_stage,
        interview_date: formData.interview_date,
        status: formData.status,
        feedback: formData.feedback || undefined,
        rating: formData.rating || undefined,
      }

      const updatedInterview = await updateInterview({
        interviewId,
        interviewData: updateData,
      })

      if (updatedInterview) {
        toast.success("Interview updated successfully!")
        router.push(`/job-interviews/${interviewId}`)
      } else {
        toast.error("Failed to update interview. Please try again.")
      }
    } catch (error) {
      console.error("Error updating interview:", error)
      toast.error("Failed to update interview. Please try again.")
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
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
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
            Back to Interview
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Edit Interview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update interview details for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Interview Info */}
              {interview && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-yellow-800">Current Interview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
                    <div>
                      <p>
                        <span className="font-medium">ID:</span> #{interview.id}
                      </p>
                      <p>
                        <span className="font-medium">Current Status:</span>
                        <Badge variant="outline" className="ml-1 capitalize">
                          {interview.status}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <p>
                        <span className="font-medium">Original Date:</span>{" "}
                        {new Date(interview.interview_date).toLocaleString()}
                      </p>
                      <p>
                        <span className="font-medium">Current Rating:</span>{" "}
                        {interview.rating ? `${interview.rating}/10` : "Not rated"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Application Info */}
              {selectedApplication && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-800">Selected Applicant</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                    <div>
                      <p>
                        <span className="font-medium">Name:</span> {selectedApplication.applicant_name}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {selectedApplication.applicant_email}
                      </p>
                    </div>
                    <div>
                      <p>
                        <span className="font-medium">Phone:</span> {selectedApplication.applicant_phone}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>
                        <Badge variant="outline" className="ml-1 capitalize">
                          {selectedApplication.status}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Stage Info */}
              {selectedStage && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-green-800">Selected Interview Stage</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                    <div>
                      <p>
                        <span className="font-medium">Stage:</span> {selectedStage.name}
                      </p>
                      <p>
                        <span className="font-medium">Level:</span> {selectedStage.level}
                      </p>
                    </div>
                    <div>
                      <p>
                        <span className="font-medium">Interviewer:</span>
                        {selectedStage.interviewer_details?.first_name} {selectedStage.interviewer_details?.last_name}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {selectedStage.interviewer_details?.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields - Responsive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Application */}
                <div className="space-y-2">
                  <Label htmlFor="job_position_application" className="text-sm font-medium">
                    Job Application *
                  </Label>
                  <Select
                    value={formData.job_position_application.toString()}
                    onValueChange={(value) => updateFormData("job_position_application", Number(value))}
                  >
                    <SelectTrigger className={errors.job_position_application ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a job application" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobApplications.map((application) => (
                        <SelectItem key={application.id} value={application.id.toString()}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {application.applicant_name} -{" "}
                            {application.job_position_advert_job_details?.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.job_position_application && (
                    <p className="text-sm text-destructive">{errors.job_position_application}</p>
                  )}
                </div>

                {/* Interview Stage */}
                <div className="space-y-2">
                  <Label htmlFor="interview_stage" className="text-sm font-medium">
                    Interview Stage *
                  </Label>
                  <Select
                    value={formData.interview_stage.toString()}
                    onValueChange={(value) => updateFormData("interview_stage", Number(value))}
                  >
                    <SelectTrigger className={errors.interview_stage ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select interview stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {stage.name} (Level {stage.level})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.interview_stage && <p className="text-sm text-destructive">{errors.interview_stage}</p>}
                </div>

                {/* Interview Date */}
                <div className="space-y-2">
                  <Label htmlFor="interview_date" className="text-sm font-medium">
                    Interview Date & Time *
                  </Label>
                  <Input
                    id="interview_date"
                    type="datetime-local"
                    value={formData.interview_date}
                    onChange={(e) => updateFormData("interview_date", e.target.value)}
                    className={errors.interview_date ? "border-destructive" : ""}
                  />
                  {errors.interview_date && <p className="text-sm text-destructive">{errors.interview_date}</p>}
                  <p className="text-xs text-muted-foreground">
                    {formData.status === "scheduled"
                      ? "Must be a future date for scheduled interviews"
                      : "Date and time of the interview"}
                  </p>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status *
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => updateFormData("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <Label htmlFor="rating" className="text-sm font-medium">
                    Rating (Optional)
                  </Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    placeholder="1-10"
                    value={formData.rating || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      const numValue = value === "" ? undefined : Number(value)
                      updateFormData("rating", numValue)
                    }}
                    className={errors.rating ? "border-destructive" : ""}
                  />
                  {errors.rating && <p className="text-sm text-destructive">{errors.rating}</p>}
                  <p className="text-xs text-muted-foreground">Rate from 1 to 10 (leave empty to remove rating)</p>
                </div>
              </div>

              {/* Feedback - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="feedback" className="text-sm font-medium">
                  Feedback (Optional)
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Add any feedback or notes about this interview..."
                  value={formData.feedback || ""}
                  onChange={(e) => updateFormData("feedback", e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className={errors.feedback ? "border-destructive" : ""}
                />
                {errors.feedback && <p className="text-sm text-destructive">{errors.feedback}</p>}
                <p className="text-xs text-muted-foreground">{formData.feedback?.length || 0}/1000 characters</p>
              </div>

              {/* Interview Info Display */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3">Interview Information:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Interview ID:</span> #{interview?.id}
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
                      <span className="font-medium text-foreground">Available Applications:</span>{" "}
                      {jobApplications.length}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Available Stages:</span> {interviewStages.length}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Current Status:</span> {interview?.status}
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
                      Update Interview
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
