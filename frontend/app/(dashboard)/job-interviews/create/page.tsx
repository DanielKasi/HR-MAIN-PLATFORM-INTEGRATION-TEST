"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Users, ArrowLeft, Check, User, Building } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import {
  createInterview,
  getJobApplications,
  getInterviewStages,
  createInterviewStage,
  fetchEmployees,
} from "@/lib/utils"
import type { JobApplication, IInterviewStage, IInterviewStageFormData, IInterview, IInterviewFormData, IEmployee } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function CreateInterviewPage() {
  const [formData, setFormData] = useState<IInterviewFormData>({
    job_position_application: 0,
    interview_stage: 0,
    interview_date: "",
    location: "",
    interview_time: "",
    interview_type: "",
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
  const [errors, setErrors] = useState<Partial<Record<keyof IInterview, string>>>({})
  const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false)
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
    name: "",
    level: 1,
    interviewer: 0,
    job_position_advert: 0,
  })
  const [stageErrors, setStageErrors] = useState<any>({})

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    fetchInitialData()
  }, [selectedInstitution, selectedBranch, router])

  useEffect(() => {
    if (selectedApplication) {
      setStageFormData(prev => ({ ...prev, job_position_advert: selectedApplication.job_position_advert }))
    }
  }, [selectedApplication])

  const fetchInitialData = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)
      const [fetchedApplications, fetchedStages, fetchedEmployees] = await Promise.all([
        getJobApplications({ institutionId: selectedInstitution.id }),
        getInterviewStages({ institutionId: selectedInstitution.id }),
        fetchEmployees({ institutionId: selectedInstitution.id }),
      ])

      if (fetchedApplications) {
        const eligibleApplications = fetchedApplications.filter(
          (app) => app.status === "shortlisted" || app.status === "reviewed",
        )
        setJobApplications(eligibleApplications)
      }

      if (fetchedStages) {
        setInterviewStages(fetchedStages)
      }

      if (fetchedEmployees) {
        setEmployees(fetchedEmployees)
      }
    } catch (error) {
      console.error("Error fetching initial data:", error)
      toast.error("Failed to load applications and interview stages")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: keyof IInterview, value: any) => {
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
    const newErrors: Partial<Record<keyof IInterview, string>> = {}

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
      if (interviewDate <= now) {
        newErrors.interview_date = "Interview date must be in the future"
      }
    }

    // Location validation
    if (!formData.location || formData.location.trim() === "") {
      newErrors.location = "Interview location is required"
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

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event from bubbling to parent form

    if (!selectedInstitution) {
      toast.error("Missing organization information")
      return
    }
    if (!selectedApplication) {
      toast.error("No selected application")
      return
    }

    // Validate stage form
    const newStageErrors: any = {}
    if (!stageFormData.name.trim()) {
      newStageErrors.name = "Stage name is required"
    }
    if (!stageFormData.interviewer || stageFormData.interviewer === 0) {
      newStageErrors.interviewer = "Please select an interviewer"
    }
    if (stageFormData.level < 1) {
      newStageErrors.level = "Level must be at least 1"
    }

    if (Object.keys(newStageErrors).length > 0) {
      setStageErrors(newStageErrors)
      return
    }

    setIsCreatingStage(true)

    try {
      const newStage = await createInterviewStage({
        institutionId: selectedInstitution.id,
        stageData: stageFormData,
      })

      if (newStage) {
        // Add the new stage to the list
        setInterviewStages((prev) => [...prev, newStage])

        // Select the newly created stage
        updateFormData("interview_stage", newStage.id)

        // Reset stage form
        setStageFormData({
          name: "",
          level: 1,
          interviewer: 0,
          job_position_advert: selectedApplication.job_position_advert
        })
        setStageErrors({})
        setIsCreateStageDialogOpen(false)

        toast.success("Interview stage created successfully!")
      } else {
        toast.error("Failed to create interview stage")
      }
    } catch (error) {
      console.error("Error creating interview stage:", error)
      toast.error("Failed to create interview stage")
    } finally {
      setIsCreatingStage(false)
    }
  }

  const updateStageFormData = (field: string, value: any) => {
    setStageFormData((prev) => ({ ...prev, [field]: value }))
    if (stageErrors[field]) {
      setStageErrors((prev: any) => ({ ...prev, [field]: undefined }))
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
      const createData: IInterviewFormData = {
        job_position_application: formData.job_position_application,
        interview_stage: formData.interview_stage,
        interview_date: formData.interview_date,
        location: formData.location,
        interview_time: formData.interview_time,
        interview_type: formData.interview_type,
        status: formData.status || "scheduled",
        feedback: formData.feedback || undefined,
        rating: formData.rating || undefined,
      }

      const newInterview = await createInterview({
        institutionId: selectedInstitution.id,
        interviewData: createData,
      })

      if (newInterview) {
        toast.success("Interview scheduled successfully!")
        router.push("/job-interviews")
      } else {
        toast.error("Failed to schedule interview. Please try again.")
      }
    } catch (error) {
      console.error("Error creating interview:", error)
      toast.error("Failed to schedule interview. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  // Set default interview date to tomorrow at 10 AM
  useEffect(() => {
    if (!formData.interview_date) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      setFormData((prev) => ({
        ...prev,
        interview_date: tomorrow.toISOString().slice(0, 16), // Format for datetime-local input
      }))
    }
  }, [formData.interview_date])

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return <div>Loading applications and interview stages...</div>
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Interviews
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Schedule New Interview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Schedule an interview for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                      <div className="inline-block">
                        <span className="font-medium">Status:</span>
                        <Badge variant="outline" className="ml-1 capitalize">
                          {selectedApplication.status}
                        </Badge>
                      </div>
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
                  <div className="flex gap-2">
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

                    <Dialog open={isCreateStageDialogOpen} onOpenChange={setIsCreateStageDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create Interview Stage</DialogTitle>
                          <DialogDescription>Create a new interview stage for your organization.</DialogDescription>
                        </DialogHeader>

                        <div onClick={(e) => e.stopPropagation()}>
                          <form onSubmit={handleCreateStage} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="stage_name">Stage Name *</Label>
                              <Input
                                id="stage_name"
                                value={stageFormData.name}
                                onChange={(e) => updateStageFormData("name", e.target.value)}
                                placeholder="e.g., Technical Interview, HR Round"
                                className={stageErrors.name ? "border-destructive" : ""}
                              />
                              {stageErrors.name && <p className="text-sm text-destructive">{stageErrors.name}</p>}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="stage_level">Level *</Label>
                              <Input
                                id="stage_level"
                                type="number"
                                min="1"
                                value={stageFormData.level}
                                onChange={(e) => updateStageFormData("level", Number(e.target.value))}
                                className={stageErrors.level ? "border-destructive" : ""}
                              />
                              {stageErrors.level && <p className="text-sm text-destructive">{stageErrors.level}</p>}
                              <p className="text-xs text-muted-foreground">
                                Stage order (1 = first stage, 2 = second stage, etc.)
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="stage_interviewer">Interviewer *</Label>
                              <Select
                                value={stageFormData.interviewer.toString()}
                                onValueChange={(value) => updateStageFormData("interviewer", Number(value))}
                              >
                                <SelectTrigger className={stageErrors.interviewer ? "border-destructive" : ""}>
                                  <SelectValue placeholder="Select interviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees.map((employee) => (
                                    <SelectItem key={employee.id} value={employee.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {employee.user.fullname}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {stageErrors.interviewer && (
                                <p className="text-sm text-destructive">{stageErrors.interviewer}</p>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsCreateStageDialogOpen(false)
                                }}
                                disabled={isCreatingStage}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isCreatingStage} onClick={(e) => e.stopPropagation()}>
                                {isCreatingStage ? (
                                  <>
                                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Create Stage
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {errors.interview_stage && <p className="text-sm text-destructive">{errors.interview_stage}</p>}
                  <p className="text-xs text-muted-foreground">
                    Can't find the right stage? Click the + button to create a new one.
                  </p>
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
                    min={new Date().toISOString().slice(0, 16)} // Prevent past dates
                  />
                  {errors.interview_date && <p className="text-sm text-destructive">{errors.interview_date}</p>}
                  <p className="text-xs text-muted-foreground">Must be a future date and time</p>
                </div>

                {/* Interview Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Interview Location *
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateFormData("location", e.target.value)}
                    className={errors.location ? "border-destructive" : ""}
                    placeholder="e.g., Zoom, Google Meet, In-person at office"
                  />
                  {errors.location && (
                    <p className="text-sm text-destructive">{errors.location}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Specify if interview is in-person or virtual</p>
                </div>

                {/* Interview Time */}
                <div className="space-y-2">
                  <Label htmlFor="interview_time" className="text-sm font-medium">
                    Interview Time
                  </Label>
                  <Input
                    id="interview_time"
                    type="time"
                    value={formData.interview_time}
                    onChange={(e) => updateFormData("interview_time", e.target.value)}
                    className={errors.interview_time ? "border-destructive" : ""}
                    placeholder="e.g., 10:00 AM"
                  />
                </div>

                {/* Interview Type */}
                <div className="space-y-2">
                  <Label htmlFor="interview_type" className="text-sm font-medium">
                    Interview Type
                  </Label>
                  <Select
                    value={formData.interview_type}
                    onValueChange={(value) => updateFormData("interview_type", value)}
                  >
                    <SelectTrigger className={errors.interview_type ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select interview type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Organization Info Display */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-3">Interview will be scheduled for:</h4>
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
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Available Applications:</span>{" "}
                      {jobApplications.length}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Available Stages:</span> {interviewStages.length}
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
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Schedule Interview
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
