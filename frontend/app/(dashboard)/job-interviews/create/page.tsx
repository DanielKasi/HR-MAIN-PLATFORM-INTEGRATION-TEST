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
import { Plus, Users, ArrowLeft, Check, User, Building, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import {
  createInterview,
  getJobApplications,
  getInterviewStages,
  createInterviewStage,
  fetchEmployees,
  getInterviews,
} from "@/lib/utils"
import type { JobApplication, IInterviewStage, IInterviewStageFormData, IInterview, IInterviewFormData, IEmployee } from "@/app/types/types.utils"
import { toast } from "sonner"

interface MultiInterviewFormData extends Omit<IInterviewFormData, 'job_position_application'> {
  selected_applications: number[]
}

export default function CreateInterviewPage() {
  const [formData, setFormData] = useState<MultiInterviewFormData>({
    selected_applications: [],
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
  const [selectedApplications, setSelectedApplications] = useState<JobApplication[]>([])
  const [selectedStage, setSelectedStage] = useState<IInterviewStage | null>(null)
  const [selectedJobPosition, setSelectedJobPosition] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false)
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [existingInterviews, setExistingInterviews] = useState<IInterview[]>([])
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


  const getAvailableApplications = (applications: JobApplication[]) => {
  const scheduledApplicationIds = new Set(
    existingInterviews
      .filter(interview => 
        interview.status === "scheduled" || 
        interview.status === "completed"
      )
      .map(interview => interview.job_position_application)
  )
  return applications.filter(app => !scheduledApplicationIds.has(app.id))
}


      const groupedApplications = jobApplications.reduce((acc, app) => {
      const jobId = app.job_position_advert
      const jobName = app.job_position_advert_job_details?.name || 'Unknown Position'
      
      if (!acc[jobId]) {
        acc[jobId] = {
          jobName,
          applications: []
        }
      }
      acc[jobId].applications.push(app)
      return acc
    }, {} as Record<number, { jobName: string; applications: JobApplication[] }>)

    const filteredGroupedApplications = Object.entries(groupedApplications).reduce((acc, [jobId, { jobName, applications }]) => {
      const availableApplications = getAvailableApplications(applications)
      
      if (availableApplications.length > 0) {
        acc[Number(jobId)] = {
          jobName,
          applications: availableApplications
        }
      }
      
      return acc
    }, {} as Record<number, { jobName: string; applications: JobApplication[] }>)

    useEffect(() => {
        if (!selectedInstitution || !selectedBranch) {
          router.push("/dashboard")
          return
        }

        fetchInitialData()
      }, [selectedInstitution, selectedBranch, router])

  useEffect(() => {
    if (selectedApplications.length > 0) {
      const firstApp = selectedApplications[0]
      setStageFormData(prev => ({ ...prev, job_position_advert: firstApp.job_position_advert }))
    }
  }, [selectedApplications])

  const fetchInitialData = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)
      const [fetchedApplications, fetchedStages, fetchedEmployees, fetchedInterviews] = await Promise.all([
        getJobApplications({ institutionId: selectedInstitution.id }),
        getInterviewStages({ institutionId: selectedInstitution.id }),
        fetchEmployees({ institutionId: selectedInstitution.id }),
        getInterviews({ institutionId: selectedInstitution.id }),
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

      if (fetchedInterviews) {
        setExistingInterviews(fetchedInterviews)
      }
    } catch (error) {
      console.error("Error fetching initial data:", error)
      toast.error("Failed to load applications and interview stages")
    } finally {
      setIsLoading(false)
    }
  }
  
    const handleJobPositionSelect = (jobPositionId: string) => {
    if (jobPositionId === "no-positions") {
      return
    }
    
    setSelectedJobPosition(jobPositionId)
    setSelectedApplications([])
    setFormData(prev => ({ ...prev, selected_applications: [] }))
    
    if (errors.job_position) {
      setErrors((prev: any) => ({ ...prev, job_position: undefined }))
    }
  }

  const handleApplicationToggle = (application: JobApplication) => {
    const isSelected = selectedApplications.some(app => app.id === application.id)
    
    if (isSelected) {
      const newSelectedApps = selectedApplications.filter(app => app.id !== application.id)
      setSelectedApplications(newSelectedApps)
      setFormData(prev => ({
        ...prev,
        selected_applications: newSelectedApps.map(app => app.id)
      }))
    } else {
      const newSelectedApps = [...selectedApplications, application]
      setSelectedApplications(newSelectedApps)
      setFormData(prev => ({
        ...prev,
        selected_applications: newSelectedApps.map(app => app.id)
      }))
    }

    if (errors.selected_applications) {
      setErrors((prev: any) => ({ ...prev, selected_applications: undefined }))
    }
  }

  const removeSelectedApplication = (applicationId: number) => {
    const newSelectedApps = selectedApplications.filter(app => app.id !== applicationId)
    setSelectedApplications(newSelectedApps)
    setFormData(prev => ({
      ...prev,
      selected_applications: newSelectedApps.map(app => app.id)
    }))
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: undefined }))
    }

    if (field === "interview_stage") {
      const stage = interviewStages.find((stage) => stage.id === Number(value))
      setSelectedStage(stage || null)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: any = {}

    if (!selectedJobPosition) {
      newErrors.job_position = "Please select a job position"
    }

    if (formData.selected_applications.length === 0) {
      newErrors.selected_applications = "Please select at least one applicant"
    }
    if (!formData.interview_stage || formData.interview_stage === 0) {
      newErrors.interview_stage = "Please select an interview stage"
    }


    if (!formData.interview_date) {
      newErrors.interview_date = "Interview date and time is required"
    } else {
      const interviewDate = new Date(formData.interview_date)
      const now = new Date()
      if (interviewDate <= now) {
        newErrors.interview_date = "Interview date must be in the future"
      }
    }

    if (!formData.location || formData.location.trim() === "") {
      newErrors.location = "Interview location is required"
    }

    if (formData.rating !== undefined && formData.rating !== null) {
      const rating = Number(formData.rating)
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        newErrors.rating = "Rating must be a whole number between 1 and 10"
      }
    }

    if (formData.feedback && formData.feedback.length > 1000) {
      newErrors.feedback = "Feedback cannot exceed 1000 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedInstitution) {
      toast.error("Missing organization information")
      return
    }
    if (selectedApplications.length === 0) {
      toast.error("No selected applications")
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
        setInterviewStages((prev) => [...prev, newStage])
        updateFormData("interview_stage", newStage.id)

        setStageFormData({
          name: "",
          level: 1,
          interviewer: 0,
          job_position_advert: selectedApplications[0]?.job_position_advert || 0
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
      const interviewPromises = formData.selected_applications.map(async (applicationId) => {
        const createData: IInterviewFormData = {
          job_position_application: applicationId,
          interview_stage: formData.interview_stage,
          interview_date: formData.interview_date,
          location: formData.location,
          interview_time: formData.interview_time,
          interview_type: formData.interview_type,
          status: formData.status || "scheduled",
          feedback: formData.feedback || undefined,
          rating: formData.rating || undefined,
        }

        return createInterview({
          institutionId: selectedInstitution.id,
          interviewData: createData,
        })
      })

      const results = await Promise.all(interviewPromises)
      const successCount = results.filter(result => result !== null).length
      const failureCount = results.length - successCount

      if (successCount > 0) {
        toast.success(`${successCount} interview(s) scheduled successfully!${failureCount > 0 ? ` ${failureCount} failed.` : ''}`)
        router.push("/job-interviews")
      } else {
        toast.error("Failed to schedule any interviews. Please try again.")
      }
    } catch (error) {
      console.error("Error creating interviews:", error)
      toast.error("Failed to schedule interviews. Please try again.")
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
        interview_date: tomorrow.toISOString().slice(0, 16),
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
      <div className="w-full mx-auto space-y-6">
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
                  Schedule interviews for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Position Selection */}
                <div className="space-y-2">
                  <Label htmlFor="job_position" className="text-sm font-medium">
                    Job Position *
                  </Label>
                  <Select
                    value={selectedJobPosition}
                    onValueChange={handleJobPositionSelect}
                  >
                    <SelectTrigger className={errors.job_position ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a job position" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(filteredGroupedApplications).map(([jobId, { jobName, applications }]) => (
                        <SelectItem key={jobId} value={jobId}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {jobName} ({applications.length} available applicant{applications.length !== 1 ? 's' : ''})
                          </div>
                        </SelectItem>
                      ))}
                      {Object.keys(filteredGroupedApplications).length === 0 && (
                        <SelectItem value="no-positions" disabled>
                          No job positions with available applicants
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.job_position && (
                    <p className="text-sm text-destructive">{errors.job_position}</p>
                  )}
                </div>

              {/* Applicant Selection */}
                {selectedJobPosition && filteredGroupedApplications[Number(selectedJobPosition)] && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Select Applicants * ({filteredGroupedApplications[Number(selectedJobPosition)]?.applications.length || 0} available)
                        </Label>
                        <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                          <div className="space-y-3">
                            {filteredGroupedApplications[Number(selectedJobPosition)]?.applications.map((application) => (
                              <div key={application.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                                <Checkbox
                                  id={`app-${application.id}`}
                                  checked={selectedApplications.some(app => app.id === application.id)}
                                  onCheckedChange={() => handleApplicationToggle(application)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{application.applicant_name}</span>
                                    <Badge variant="outline" className="capitalize">
                                      {application.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Email: {application.applicant_email}</p>
                                    <p>Phone: {application.applicant_phone}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {filteredGroupedApplications[Number(selectedJobPosition)]?.applications.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">All applicants for this position have already been scheduled for interviews</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {errors.selected_applications && (
                          <p className="text-sm text-destructive">{errors.selected_applications}</p>
                        )}
                      </div>
                      {/* Rest of your selected applicants summary code remains the same */}
                    </div>
                  )}

              {/* Form Fields - Responsive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    min={new Date().toISOString().slice(0, 16)}
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
                  disabled={isSubmitting || selectedApplications.length === 0}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Scheduling {selectedApplications.length} interview{selectedApplications.length !== 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Schedule {selectedApplications.length} Interview{selectedApplications.length !== 1 ? 's' : ''}
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