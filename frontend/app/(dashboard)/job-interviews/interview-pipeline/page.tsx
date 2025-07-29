"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Edit,
  Save,
  Search,
  MapPin,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Plus,
  Eye,
  UserCheck,
  Code,
  Check,
  X,
  Briefcase,
  Star,
  History,
  Building2
} from "lucide-react"
import { toast } from "sonner"
import type { IInterviewStage, IInterviewStageFormData, IEmployee, IInterview } from "@/app/types/types.utils"
import { createInterviewStage, fetchEmployees, getInterviews, getInterviewStages, updateInterview, createInterview, bulkCreateOnBoarding } from "@/lib/utils"
import { selectUser, selectSelectedInstitution } from "@/store/auth/selectors"
import { EmployeeSearchableSelect } from "@/components/ui/employee-searchable-select"

interface JobPosition {
  id: number
  name: string
  department: string
  totalInterviews: number
}

interface ProcessedStage {
  id: string
  name: string
  count: number
  icon: React.ReactNode
  color: string
  bgColor: string
  level: number
  interviewer: string
  candidates: InterviewCandidate[]
}

interface InterviewCandidate {
  id: number
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  gender: string
  state: string
  address: string
  country: string
  source: string
  feedback?: string
  rating?: number
  interview_date?: string
  interview_time?: string
  location?: string
  interview_id?: number
  interview?: IInterview
  status: string
}

interface InterviewScheduleData {
  interview_date: string
  location: string
  interview_type: "online" | "in_person"
}

// Utility functions
const getStageIcon = (stageName: string, index: number) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'initial': <Users className="h-5 w-5" />,
    'assessment': <Users className="h-5 w-5" />,
    'phone': <Phone className="h-5 w-5" />,
    'technical': <Code className="h-5 w-5" />,
    'final': <MessageSquare className="h-5 w-5" />,
    'offer': <CheckCircle className="h-5 w-5" />,
    'hired': <UserCheck className="h-5 w-5" />,
  }

  const lowerStageName = stageName.toLowerCase()
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerStageName.includes(key)) return icon
  }

  const defaultIcons = [
    <Users className="h-5 w-5" />,
    <Phone className="h-5 w-5" />,
    <Code className="h-5 w-5" />,
    <MessageSquare className="h-5 w-5" />,
    <CheckCircle className="h-5 w-5" />,
    <UserCheck className="h-5 w-5" />,
  ]

  return defaultIcons[index % defaultIcons.length]
}

const getStageColors = (index: number) => {
  const colors = [
    { color: "text-blue-600", bgColor: "bg-blue-100" },
    { color: "text-purple-600", bgColor: "bg-purple-100" },
    { color: "text-orange-600", bgColor: "bg-orange-100" },
    { color: "text-yellow-600", bgColor: "bg-yellow-100" },
    { color: "text-green-600", bgColor: "bg-green-100" },
    { color: "text-emerald-600", bgColor: "bg-emerald-100" },
  ]
  return colors[index % colors.length]
}

// Helper function to process interviews into candidates for a specific job
const processInterviewsForJob = (interviews: IInterview[], jobPositionId: number): InterviewCandidate[] => {
  return interviews
    .filter(interview => 
      interview.job_position_application_details?.job_position_advert === jobPositionId
    )
    .map(interview => ({
      id: interview.job_position_application,
      applicant_name: interview.job_position_application_details?.applicant_name || 'Unknown',
      applicant_email: interview.job_position_application_details?.applicant_email || '',
      applicant_phone: interview.job_position_application_details?.applicant_phone || '',
      gender: interview.job_position_application_details?.gender || '',
      state: interview.job_position_application_details?.state || '',
      address: interview.job_position_application_details?.address || '',
      country: interview.job_position_application_details?.country || '',
      source: interview.job_position_application_details?.source || '',
      feedback: interview.feedback || undefined,
      rating: interview.rating || undefined,
      interview_date: interview.interview_date,
      interview_time: interview.interview_time,
      location: interview.location,
      interview_id: interview.id,
      interview: interview,
      status: interview.status
    }))
}

// Group interviews by stage for a specific job
const groupInterviewsByStageForJob = (
  interviews: IInterview[],
  jobPositionId: number
): ProcessedStage[] => {
  // Filter interviews for the specific job position
  const jobInterviews = interviews.filter(
    interview =>
      interview.job_position_application_details?.job_position_advert === jobPositionId
  )

  const stageMap = new Map<string, {
    stage: IInterview['interview_stage_details'],
    interviews: IInterview[]
  }>()

  // Group interviews by stage
  jobInterviews.forEach(interview => {
    const stage = interview.interview_stage_details
    if (stage) {
      const stageKey = stage.id.toString()
      if (!stageMap.has(stageKey)) {
        stageMap.set(stageKey, {
          stage,
          interviews: []
        })
      }
      stageMap.get(stageKey)!.interviews.push(interview)
    }
  })

  // Convert to processed stages
  const processedStages: ProcessedStage[] = Array.from(stageMap.entries())
    .map(([stageId, { stage, interviews }], index) => {
      if (!stage) return null // 👈 Defensive check for TypeScript

      const colors = getStageColors(index)
      const candidates = processInterviewsForJob(interviews, jobPositionId)

      // Get interviewer names
      const interviewerNames = Array.isArray(stage.interviewers_details)
        ? stage.interviewers_details.map(emp =>
            emp.user?.fullname || `${emp.first_name} ${emp.last_name}` || 'Unknown'
          ).join(', ')
        : 'Not assigned'

      return {
        id: stageId,
        name: stage.name,
        count: interviews.length,
        level: stage.level,
        interviewer: interviewerNames,
        icon: getStageIcon(stage.name, index),
        candidates,
        ...colors
      }
    })
    .filter((s): s is ProcessedStage => s !== null) 

  // Sort by level
  return processedStages.sort((a, b) => a.level - b.level)
}

// Sub-components
const RatingInput = ({
  rating,
  onRatingChange
}: {
  rating: number
  onRatingChange?: (rating: number) => void
}) => {
  return (
    <div className="space-y-2">
      <Input
        type="number"
        min="1"
        max="10"
        value={rating || ''}
        onChange={(e) => onRatingChange?.(Number(e.target.value))}
        className="w-20"
      />
      <p className="text-xs text-muted-foreground">Rate 1-10</p>
    </div>
  )
}

const FeedbackDialog = ({
  candidate,
  onSave,
  isOpen,
  onClose,
  nextStage,
  onReject,
  onScheduleAndMove
}: {
  candidate: InterviewCandidate | null
  onSave: (feedback: string, rating: number) => void
  isOpen: boolean
  onClose: () => void
  nextStage?: ProcessedStage | null
  onReject?: () => void
  onScheduleAndMove?: () => void
}) => {
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [action, setAction] = useState<'save' | 'reject' | 'schedule' | null>(null)

  useEffect(() => {
    if (candidate) {
      setFeedback(candidate.feedback || '')
      setRating(candidate.rating || 0)
    }
  }, [candidate])

  if (!candidate) return null

  const handleSave = async () => {
    if (!feedback.trim() || !rating) {
      toast.error('Please provide both feedback and rating')
      return
    }

    setIsSaving(true)
    try {
      await onSave(feedback, rating)
      onClose()
      toast.success('Feedback updated successfully')
    } catch (error) {
      toast.error('Failed to update feedback')
    } finally {
      setIsSaving(false)
      setAction(null)
    }
  }

  const handleScheduleAndMove = async () => {
    if (!feedback.trim() || !rating) {
      toast.error('Please provide both feedback and rating before scheduling')
      return
    }

    setIsSaving(true)
    setAction('schedule')
    try {
      await onSave(feedback, rating)
      if (onScheduleAndMove) {
        onScheduleAndMove()
      }
      onClose()
    } catch (error) {
      toast.error('Failed to save feedback')
    } finally {
      setIsSaving(false)
      setAction(null)
    }
  }

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback for rejection')
      return
    }

    setIsSaving(true)
    setAction('reject')
    try {
      await onSave(feedback, rating || 1)
      if (onReject) {
        await onReject()
      }
      onClose()
      toast.success('Candidate rejected')
    } catch (error) {
      toast.error('Failed to reject candidate')
    } finally {
      setIsSaving(false)
      setAction(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>
            Provide feedback and rating for {candidate.applicant_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Rating *</Label>
            <RatingInput rating={rating} onRatingChange={setRating} />
          </div>

          <div className="space-y-2">
            <Label>Feedback *</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter your feedback about the candidate's performance..."
              rows={6}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAction('save')
                    handleSave()
                  }}
                  disabled={isSaving}
                >
                  {isSaving && action === 'save' ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Only
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isSaving}
                >
                  {isSaving && action === 'reject' ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>

                {nextStage && (
                  <Button
                    onClick={handleScheduleAndMove}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving && action === 'schedule' ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule & Move to {nextStage.name}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const InterviewSchedulingDialog = ({
  isOpen,
  onClose,
  onSchedule,
  candidates,
  targetStage,
  isScheduling
}: {
  isOpen: boolean
  onClose: () => void
  onSchedule: (scheduleData: InterviewScheduleData) => void
  candidates: InterviewCandidate[]
  targetStage: ProcessedStage | null
  isScheduling: boolean
}) => {
  const [scheduleData, setScheduleData] = useState<InterviewScheduleData>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    return {
      interview_date: tomorrow.toISOString().slice(0, 16),
      location: "Conference Room",
      interview_type: "online"
    }
  })

  const [errors, setErrors] = useState<any>({})

  const updateScheduleData = (field: keyof InterviewScheduleData, value: string) => {
    setScheduleData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateScheduleForm = (): boolean => {
    const newErrors: any = {}

    if (!scheduleData.interview_date || scheduleData.interview_date.trim() === "") {
      newErrors.interview_date = "Interview date is required"
    } else {
      const interviewDate = new Date(scheduleData.interview_date)
      const now = new Date()
      if (interviewDate <= now) {
        newErrors.interview_date = "Interview date must be in the future"
      }
    }

    if (!scheduleData.location || scheduleData.location.trim() === "") {
      newErrors.location = "Interview location is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSchedule = () => {
    if (!validateScheduleForm()) {
      toast.error("Please fix the form errors before scheduling")
      return
    }

    onSchedule(scheduleData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Interview for Next Stage</DialogTitle>
          <DialogDescription>
            Schedule interviews for {candidates.length} candidate(s) in {targetStage?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-semibold text-sm mb-2 text-blue-800">
              Candidates to Schedule ({candidates.length})
            </h4>
            <div className="space-y-1">
              {candidates.map((candidate, index) => (
                <div key={index} className="text-sm text-blue-700">
                  • {candidate.applicant_name}
                </div>
              ))}
            </div>
          </div>

          {targetStage && (
            <div className="bg-green-50 p-4 rounded-md">
              <h4 className="font-semibold text-sm mb-2 text-green-800">Target Stage</h4>
              <div className="text-sm text-green-700">
                <p><strong>{targetStage.name}</strong> (Level {targetStage.level})</p>
                <p>Interviewer: {targetStage.interviewer}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interview_date" className="text-sm font-medium">
                Interview Date & Time *
              </Label>
              <Input
                id="interview_date"
                type="datetime-local"
                value={scheduleData.interview_date}
                onChange={(e) => updateScheduleData("interview_date", e.target.value)}
                className={errors.interview_date ? "border-destructive" : ""}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.interview_date && (
                <p className="text-sm text-destructive">{errors.interview_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Interview Location *
              </Label>
              <Input
                id="location"
                type="text"
                value={scheduleData.location}
                onChange={(e) => updateScheduleData("location", e.target.value)}
                className={errors.location ? "border-destructive" : ""}
                placeholder="e.g., Zoom, Google Meet, Conference Room A"
                required
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interview_type" className="text-sm font-medium">
                Interview Type *
              </Label>
              <Select
                value={scheduleData.interview_type}
                onValueChange={(value: "online" | "in_person") => updateScheduleData("interview_type", value)}
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

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isScheduling}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={isScheduling}>
              {isScheduling ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule & Move to Next Stage
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main Component
export default function JobSpecificInterviewPipeline() {
  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const userData = useSelector(selectUser);
  const createdBy = userData?.id ?? 0;

  // State management
  const [interviews, setInterviews] = useState<IInterview[]>([])
  const [processedStages, setProcessedStages] = useState<ProcessedStage[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Job position state
  const [selectedJobPosition, setSelectedJobPosition] = useState<JobPosition | null>(null)
  const [availableJobPositions, setAvailableJobPositions] = useState<JobPosition[]>([])

  // UI State
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([])

  // Dialog states
  const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false)
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<InterviewCandidate | null>(null)
  const [candidatesToSchedule, setCandidatesToSchedule] = useState<InterviewCandidate[]>([])

  // Form states
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [isProcessingProgression, setIsProcessingProgression] = useState(false)
  const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
    name: "",
    level: 1,
    interviewers: [],
    job_position_advert: 0,
  })
  const [stageErrors, setStageErrors] = useState<any>({})

  // Computed values
  const activeStage = processedStages.find(stage => stage.id === activeStageId)
  const nextStageForActive = processedStages.find(stage =>
    activeStage && stage.level === activeStage.level + 1
  )

  // Filter candidates based on search
  const filteredCandidates = useMemo(() => {
    if (!activeStage) return []

    let candidates = activeStage.candidates

    // Apply search filter
    if (searchTerm) {
      candidates = candidates.filter(candidate =>
        candidate.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.applicant_phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return candidates
  }, [activeStage, searchTerm])

  // Data fetching
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!selectedInstitution?.id) {
        throw new Error('Institution information is missing')
      }

      const [fetchedInterviews, fetchedEmployees] = await Promise.all([
        getInterviews({ institutionId: selectedInstitution.id }),
        fetchEmployees({ institutionId: selectedInstitution.id })
      ])

      setInterviews(fetchedInterviews || [])

      let employeesArray: IEmployee[] = []
      if (fetchedEmployees && 'results' in fetchedEmployees && Array.isArray(fetchedEmployees.results)) {
        employeesArray = fetchedEmployees.results
      } else if (Array.isArray(fetchedEmployees)) {
        employeesArray = fetchedEmployees
      }
      setEmployees(employeesArray)

      // Extract unique job positions from interviews
      const jobPositionsMap = new Map<number, JobPosition>()
      
      fetchedInterviews?.forEach(interview => {
        const jobAdvert = interview.job_position_application_details?.job_position_advert
        const jobName = interview.job_position_application_details?.job_position_advert_job_details?.name
        const jobDepartment = interview.job_position_application_details?.job_position_advert_job_details?.department
        
        if (jobAdvert && jobName) {
          if (!jobPositionsMap.has(jobAdvert)) {
            jobPositionsMap.set(jobAdvert, {
              id: jobAdvert,
              name: jobName,
              department: jobDepartment || '',
              totalInterviews: 0
            })
          }
          jobPositionsMap.get(jobAdvert)!.totalInterviews++
        }
      })

      const positions = Array.from(jobPositionsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
      setAvailableJobPositions(positions)

      // Auto-select the first job position if none selected
      if (!selectedJobPosition && positions.length > 0) {
        setSelectedJobPosition(positions[0])
      }

    } catch (err) {
      setError(`Failed to load interview pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Process interviews into stages when job position changes
  useEffect(() => {
    if (interviews.length > 0 && selectedJobPosition) {
      const stages = groupInterviewsByStageForJob(interviews, selectedJobPosition.id)
      setProcessedStages(stages)

      // Set active stage to first stage if none selected
      if (!activeStageId && stages.length > 0) {
        setActiveStageId(stages[0].id)
      }
    } else {
      setProcessedStages([])
      setActiveStageId(null)
    }
  }, [interviews, selectedJobPosition])

  useEffect(() => {
    if (selectedInstitution) {
      fetchData()
    }
  }, [selectedInstitution])

  // Stage management functions
  const updateStageFormData = (field: string, value: any) => {
    setStageFormData((prev) => ({ ...prev, [field]: value }))
    if (stageErrors[field]) {
      setStageErrors((prev: any) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution) {
      toast.error("Missing organization information")
      return
    }

    if (!selectedJobPosition) {
      toast.error("Please select a job position first")
      return
    }

    const newStageErrors: any = {}
    if (!stageFormData.name.trim()) {
      newStageErrors.name = "Stage name is required"
    }
    if (!stageFormData.interviewers || stageFormData.interviewers.length === 0) {
      newStageErrors.interviewers = "Please select at least one interviewer"
    }

    if (Object.keys(newStageErrors).length > 0) {
      setStageErrors(newStageErrors)
      return
    }

    setIsCreatingStage(true)

    try {
      const stageDataWithJob = {
        ...stageFormData,
        job_position_advert: selectedJobPosition.id
      }

      const newStage = await createInterviewStage({
        institutionId: selectedInstitution.id,
        stageData: stageDataWithJob,
      })

      if (newStage) {
        setStageFormData({
          name: "",
          level: 1,
          interviewers: [],
          job_position_advert: selectedJobPosition.id
        })
        setStageErrors({})
        setIsCreateStageDialogOpen(false)

        toast.success("Interview stage created successfully!")
        await fetchData() // Refresh data
      } else {
        toast.error("Failed to create interview stage")
      }
    } catch (error) {
      toast.error("Failed to create interview stage")
    } finally {
      setIsCreatingStage(false)
    }
  }

  // Auto-fill the next level for new stage
  useEffect(() => {
    if (isCreateStageDialogOpen && processedStages.length > 0) {
      const maxLevel = Math.max(...processedStages.map(stage => stage.level))
      const nextLevel = maxLevel + 1
      setStageFormData(prev => ({ ...prev, level: nextLevel }))
    } else if (isCreateStageDialogOpen) {
      setStageFormData(prev => ({ ...prev, level: 1 }))
    }
  }, [isCreateStageDialogOpen, processedStages])

  // Candidate management functions
  const handleSelectCandidate = (candidateKey: string, checked: boolean) => {
    // Extract candidate ID from the key (format: "candidateId-interviewId")
    const candidateId = parseInt(candidateKey.split('-')[0])
    
    if (checked) {
      setSelectedCandidates((prev) => [...prev, candidateId])
    } else {
      setSelectedCandidates((prev) => prev.filter((id) => id !== candidateId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Get unique candidate IDs from filtered candidates
      const uniqueCandidateIds = [...new Set(filteredCandidates.map(candidate => candidate.id))]
      setSelectedCandidates(uniqueCandidateIds)
    } else {
      setSelectedCandidates([])
    }
  }

  const handleUpdateFeedback = async (feedback: string, rating: number) => {
    if (!selectedCandidate) return

    try {
      const interviewId = selectedCandidate.interview_id;

      if (!interviewId) {
        throw new Error('No interview found for this candidate');
      }

      const isFinalStage = !nextStageForActive;

      const interviewData = {
        feedback: feedback,
        rating: rating,
        status: isFinalStage ? 'completed' : selectedCandidate.interview?.status || 'scheduled'
      }

      const result = await updateInterview({
        interviewId: interviewId,
        interviewData: interviewData
      });

      if (!result) {
        throw new Error('Failed to update interview feedback');
      }

      // Update local state
      setInterviews(prev =>
        prev.map(interview => {
          if (interview.id === interviewId) {
            return {
              ...interview,
              feedback: result.feedback,
              rating: result.rating,
              status: result.status
            }
          }
          return interview
        })
      )

      setSelectedCandidate(prev => {
        if (!prev || prev.interview_id !== interviewId) return prev
        return {
          ...prev,
          feedback: result.feedback || undefined,
          rating: result.rating || undefined
        }
      })

      await fetchData() // Refresh data
    } catch (error) {
      throw error
    }
  }

  const rejectCandidate = async (candidateId: number) => {
    try {
      const candidate = filteredCandidates.find(c => c.id === candidateId);

      if (!candidate || !candidate.interview_id) {
        throw new Error(`No interview found for candidate ${candidateId}`);
      }

      const interviewData = {
        status: 'rejected'
      };

      const result = await updateInterview({
        interviewId: candidate.interview_id,
        interviewData: interviewData
      });

      if (!result) {
        throw new Error('Failed to reject candidate');
      }
      return { success: true, data: result };
    } catch (error) {
      throw error;
    }
  }

  const scheduleInterviewsForNextStage = async (
    candidates: InterviewCandidate[],
    scheduleData: InterviewScheduleData
  ) => {
    if (!selectedInstitution || !nextStageForActive || !selectedJobPosition) {
      throw new Error('Missing institution, next stage, or job position data');
    }

    try {
      const interviewPromises = candidates.map(async (candidate) => {
        // Extract time from datetime-local input
        let interviewTime = "10:00:00" // Default fallback
        let interviewDate = scheduleData.interview_date

        if (scheduleData.interview_date) {
          try {
            const dateTime = new Date(scheduleData.interview_date)
            if (!isNaN(dateTime.getTime())) {
              const hours = dateTime.getHours().toString().padStart(2, '0')
              const minutes = dateTime.getMinutes().toString().padStart(2, '0')
              interviewTime = `${hours}:${minutes}:00`
              interviewDate = dateTime.toISOString()
            }
          } catch (error) {
            console.error('Error parsing interview date:', error)
          }
        }

        const location = (scheduleData.location || "").trim() || "To be determined"
        const interview_type = scheduleData.interview_type || "online"
        
        const createData = {
          job_position_application: candidate.id,
          interview_stage: parseInt(nextStageForActive.id),
          interview_date: interviewDate,
          location: location,
          interview_time: interviewTime,
          interview_type: interview_type,
          status: "scheduled",
          feedback: null,
          rating: null,
          created_by: createdBy,
        };

        try {
          const result = await createInterview({
            institutionId: selectedInstitution.id,
            interviewData: createData,
          });
          return result
        } catch (apiError) {
          console.error('Failed to create interview:', apiError)
          return null
        }
      });

      const results = await Promise.all(interviewPromises);
      const successCount = results.filter(result => result !== null).length;

      if (successCount === 0) {
        throw new Error('Failed to schedule any interviews');
      }

      return { successCount, totalCount: candidates.length, failureCount: results.length - successCount };
    } catch (error) {
      throw error;
    }
  }

  const moveToNextStage = async (candidateId: number) => {
    try {
      const candidate = filteredCandidates.find(c => c.id === candidateId);

      if (!candidate || !candidate.interview_id) {
        throw new Error(`No interview found for candidate ${candidateId}`);
      }

      const currentInterviewData = {
        status: 'completed'
      };

      const result = await updateInterview({
        interviewId: candidate.interview_id,
        interviewData: currentInterviewData
      });

      if (!result) {
        throw new Error('Failed to update current interview status');
      }

      return { success: true, data: result };
    } catch (error) {
      throw error;
    }
  }

  const handleScheduleAndMove = async (scheduleData: InterviewScheduleData) => {
    setIsProcessingProgression(true)

    try {
      // Step 1: Schedule interviews for next stage
      const scheduleResult = await scheduleInterviewsForNextStage(candidatesToSchedule, scheduleData)

      if (scheduleResult.successCount > 0) {
        // Step 2: Mark current interviews as completed
        const moveResults = []
        const moveErrors = []

        for (const candidate of candidatesToSchedule) {
          try {
            const result = await moveToNextStage(candidate.id)
            moveResults.push({ candidateId: candidate.id, success: true, data: result })
          } catch (error) {
            moveErrors.push({ candidateId: candidate.id, error })
          }
        }

        if (moveErrors.length === 0) {
          toast.success(`Successfully scheduled interviews and moved ${candidatesToSchedule.length} candidates to ${nextStageForActive?.name}`)
        } else if (moveResults.length > 0) {
          toast.warning(`${moveResults.length} candidates moved successfully, ${moveErrors.length} failed to move`)
        } else {
          toast.error('Failed to move any candidates to the next stage')
        }

        setSelectedCandidates([])
        setIsSchedulingDialogOpen(false)
        setCandidatesToSchedule([])

        await fetchData()
      } else {
        toast.error('Failed to schedule interviews')
      }
    } catch (error) {
      toast.error('Failed to schedule interviews and move candidates')
    } finally {
      setIsProcessingProgression(false)
    }
  }

  const handleBulkOnboard = async () => {
     const eligibleCandidates = filteredCandidates.filter(candidate =>
    selectedCandidates.includes(candidate.id) &&
    candidate.feedback && 
    candidate.rating && 
    candidate.rating > 0 &&
    candidate.status === 'completed'
  )

    if (eligibleCandidates.length === 0) {
      toast.error('No candidates eligible for onboarding. Candidates need feedback and rating first.')
      return
    }

    try {
      const eligibleIds = eligibleCandidates.map(c => c.id)
      const result = await bulkCreateOnBoarding({ applicationIds: eligibleIds })

      if (result) {
        const createdCount = result.summary?.created_count || result.created?.length || 0
        const skippedCount = result.summary?.skipped_count || result.skipped?.length || 0

        if (createdCount > 0 && skippedCount === 0) {
          toast.success(`Successfully onboarded ${createdCount} candidate(s)`)
          setSelectedCandidates([])
          await fetchData()
        } else if (createdCount > 0 && skippedCount > 0) {
          toast.warning(`${createdCount} candidates onboarded successfully, ${skippedCount} were already onboarded`)
          setSelectedCandidates([])
          await fetchData()
        } else if (createdCount === 0 && skippedCount > 0) {
          toast.warning(`All ${skippedCount} selected candidate(s) are already onboarded`)
          setSelectedCandidates([])
          await fetchData()
        } else {
          toast.error('No candidates were processed successfully')
        }
      } else {
        toast.error('Failed to onboard candidates - API returned no response')
      }
    } catch (error) {
      toast.error(`Failed to onboard candidates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // UI Event Handlers
  const handleBack = () => {
    router.push('/job-interviews')
  }

  const openFeedbackDialog = (candidate: InterviewCandidate) => {
    setSelectedCandidate(candidate)
    setIsFeedbackDialogOpen(true)
  }

  const handleIndividualScheduleAndMove = () => {
    if (!selectedCandidate) return
    setCandidatesToSchedule([selectedCandidate])
    setIsFeedbackDialogOpen(false)
    setIsSchedulingDialogOpen(true)
  }

  const handleBulkScheduleAndMove = () => {
    const eligibleCandidates = filteredCandidates.filter(candidate =>
    selectedCandidates.includes(candidate.id) &&
    candidate.feedback && 
    candidate.rating && 
    candidate.rating > 0 &&
    candidate.status === 'completed' 
  )

    if (eligibleCandidates.length === 0) {
      toast.error('No candidates eligible for moving. Candidates need feedback and rating first.')
      return
    }

    if (!nextStageForActive) {
      toast.error('No next stage available')
      return
    }

    setCandidatesToSchedule(eligibleCandidates)
    setIsSchedulingDialogOpen(true)
  }

  const handleJobPositionChange = (jobPositionId: string) => {
    const jobPosition = availableJobPositions.find(job => job.id.toString() === jobPositionId)
    setSelectedJobPosition(jobPosition || null)
    setActiveStageId(null)
    setSelectedCandidates([])
    setSearchTerm('')
  }

  // Loading and error states
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <MessageSquare className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Calculate stats for selected job position
  const jobInterviews = selectedJobPosition 
    ? interviews.filter(i => i.job_position_application_details?.job_position_advert === selectedJobPosition.id)
    : []
  const totalInterviews = jobInterviews.length
  const completedInterviews = jobInterviews.filter(i => i.status === 'completed').length
  const scheduledInterviews = jobInterviews.filter(i => i.status === 'scheduled').length
  const pendingFeedback = jobInterviews.filter(i => i.status === 'completed' && (!i.feedback || !i.rating)).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Interviews
          </Button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job-Specific Interview Pipeline</h1>
            <p className="text-gray-600">
              Manage interview stages and candidates for specific job positions
            </p>
          </div>
        </div>
      </div>

      {/* Job Position Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Job Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <Label htmlFor="job-position">Job Position</Label>
              <Select
                value={selectedJobPosition?.id.toString() || ""}
                onValueChange={handleJobPositionChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job position to manage" />
                </SelectTrigger>
                <SelectContent>
                  {availableJobPositions.map((position) => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{position.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {position.department} • {position.totalInterviews} interviews
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedJobPosition && (
              <Dialog open={isCreateStageDialogOpen} onOpenChange={setIsCreateStageDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4" />
                    Add Interview Stage
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Interview Stage</DialogTitle>
                    <DialogDescription>
                      Create a new interview stage for {selectedJobPosition.name}.
                    </DialogDescription>
                  </DialogHeader>

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
                      <Label htmlFor="stage_interviewer">Interviewers *</Label>
                      <EmployeeSearchableSelect
                        employees={employees as any}
                        value={stageFormData.interviewers.map(id => id.toString())}
                        onValueChange={(values) => {
                          const numberValues = Array.isArray(values)
                            ? values.map(v => Number(v))
                            : [Number(values)]
                          const uniqueValues = [...new Set(numberValues)]
                          updateStageFormData("interviewers", uniqueValues)
                        }}
                        disabled={isCreatingStage}
                        placeholder="Search and select interviewers"
                        showEmployeeId={false}
                        showDepartment={false}
                        multiple={true}
                      />
                      {stageErrors.interviewers && (
                        <p className="text-sm text-destructive">{stageErrors.interviewers}</p>
                      )}

                      {stageFormData.interviewers.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">
                              Selected Interviewers ({stageFormData.interviewers.length})
                            </p>
                            <button
                              type="button"
                              onClick={() => updateStageFormData("interviewers", [])}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Clear all
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {stageFormData.interviewers.map((interviewerId) => {
                              const employee = employees.find(emp => emp.id === interviewerId);
                              const fullName = employee?.user?.fullname || `Employee ${interviewerId}`;
                              const displayName = fullName.length > 30 ? `${fullName.substring(0, 30)}...` : fullName;

                              return (
                                <div
                                  key={interviewerId}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm max-w-xs"
                                  title={fullName}
                                >
                                  <span className="truncate flex-1 min-w-0">{displayName}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newInterviewers = stageFormData.interviewers.filter(id => id !== interviewerId);
                                      updateStageFormData("interviewers", newInterviewers);
                                    }}
                                    className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-200 text-blue-600 hover:bg-blue-300 flex items-center justify-center text-xs font-bold"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateStageDialogOpen(false)}
                        disabled={isCreatingStage}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreatingStage}>
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
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedJobPosition ? (
        /* No job selected state */
        <Card className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Job Position</h3>
              <p className="text-muted-foreground mb-4">
                Choose a job position above to manage its interview pipeline
              </p>
              {availableJobPositions.length === 0 && (
                <p className="text-sm text-gray-500">
                  No job positions with interviews found. Schedule some interviews first.
                </p>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary Stats for Selected Job */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                    <p className="text-3xl font-bold text-gray-900">{totalInterviews}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Scheduled</p>
                    <p className="text-3xl font-bold text-gray-900">{scheduledInterviews}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-gray-900">{completedInterviews}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Feedback</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingFeedback}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <MessageSquare className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {processedStages.length === 0 ? (
            /* No stages state */
            <Card className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Interview Stages</h3>
                  <p className="text-muted-foreground mb-4">
                    Create interview stages for {selectedJobPosition.name} to start managing the pipeline
                  </p>
                  <Button onClick={() => setIsCreateStageDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Interview Stage
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            /* Main Pipeline Interface */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
              {/* Left Panel - Stages List */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Interview Stages ({processedStages.length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedJobPosition.name} - {selectedJobPosition.department}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {processedStages.map((stage) => (
                        <div
                          key={stage.id}
                          className={`p-4 cursor-pointer transition-all duration-200 border-l-4 hover:bg-gray-50 ${
                            activeStageId === stage.id
                              ? 'bg-blue-50 border-l-blue-500 shadow-sm'
                              : 'border-l-transparent hover:border-l-gray-300'
                          }`}
                          onClick={() => {
                            setActiveStageId(stage.id)
                            setSelectedCandidates([])
                            setSearchTerm('')
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${stage.bgColor}`}>
                                <div className={stage.color}>{stage.icon}</div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">{stage.name}</h4>
                                <p className="text-xs text-gray-500">Level {stage.level}</p>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`font-bold ${
                                stage.count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {stage.count}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 ml-11">
                            Interviewer: {stage.interviewer}
                          </div>
                          {activeStageId === stage.id && (
                            <div className="text-xs text-blue-600 ml-11 mt-1 flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>Currently viewing</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - Candidates for Selected Stage */}
              <div className="lg:col-span-2">
                {activeStage ? (
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {activeStage.icon}
                            {activeStage.name} - Candidates
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Level {activeStage.level} • Interviewer: {activeStage.interviewer} • {filteredCandidates.length} candidates
                          </p>
                        </div>
                        {nextStageForActive && (
                          <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            Next: {nextStageForActive.name}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Search */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search candidates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {/* Bulk Actions */}
                        {selectedCandidates.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                {selectedCandidates.length} candidate(s) selected
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedCandidates([])}
                                >
                                Clear
                                </Button>
                                
                                {/* Show feedback message for onboard instead of disabled button */}
                                {(() => {
                                const eligibleForOnboard = filteredCandidates.filter(candidate =>
                                    selectedCandidates.includes(candidate.id) &&
                                    candidate.feedback && 
                                    candidate.rating && 
                                    candidate.rating > 0 &&
                                    candidate.status === 'completed'
                                ).length;

                                const selectedWithoutFeedback = filteredCandidates.filter(candidate =>
                                    selectedCandidates.includes(candidate.id) &&
                                    (!candidate.feedback || !candidate.rating || candidate.status !== 'completed')
                                ).length;

                                if (eligibleForOnboard > 0) {
                                    return (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleBulkOnboard}
                                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        Onboard Selected ({eligibleForOnboard})
                                    </Button>
                                    );
                                } else if (selectedWithoutFeedback > 0) {
                                    return (
                                    <div className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded border border-orange-200">
                                        <Clock className="h-4 w-4 inline mr-1" />
                                        Please provide feedback & rating first
                                    </div>
                                    );
                                }
                                return null;
                                })()}
                                
                                {/* Show feedback message for scheduling instead of disabled button */}
                                {nextStageForActive && (() => {
                                const eligibleForSchedule = filteredCandidates.filter(candidate =>
                                    selectedCandidates.includes(candidate.id) &&
                                    candidate.feedback && 
                                    candidate.rating && 
                                    candidate.rating > 0 &&
                                    candidate.status === 'completed'
                                ).length;

                                const selectedWithoutFeedback = filteredCandidates.filter(candidate =>
                                    selectedCandidates.includes(candidate.id) &&
                                    (!candidate.feedback || !candidate.rating || candidate.status !== 'completed')
                                ).length;

                                if (eligibleForSchedule > 0) {
                                    return (
                                    <Button
                                        size="sm"
                                        onClick={handleBulkScheduleAndMove}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Move to {nextStageForActive.name} ({eligibleForSchedule})
                                    </Button>
                                    );
                                } else if (selectedWithoutFeedback > 0) {
                                    return (
                                    <div className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded border border-orange-200">
                                        <Clock className="h-4 w-4 inline mr-1" />
                                        Complete interviews & provide feedback first
                                    </div>
                                    );
                                }
                                return null;
                                })()}
                            </div>
                            </div>
                        </div>
                        )}

                      {/* Candidates Table */}
                      <div className="border rounded-lg max-h-[400px] overflow-auto">
                        {filteredCandidates.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                            <p className="text-muted-foreground">
                              {searchTerm
                                ? "No candidates match your search criteria."
                                : "No candidates have been assigned to this stage yet."}
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={
                                      filteredCandidates.length > 0 &&
                                      [...new Set(filteredCandidates.map(c => c.id))].every(id => selectedCandidates.includes(id))
                                    }
                                    onCheckedChange={handleSelectAll}
                                  />
                                </TableHead>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Feedback</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredCandidates.map((candidate) => (
                                <TableRow key={`${candidate.id}-${candidate.interview_id}`}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedCandidates.includes(candidate.id)}
                                      onCheckedChange={(checked) => handleSelectCandidate(`${candidate.id}-${candidate.interview_id}`, checked as boolean)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium">{candidate.applicant_name}</div>
                                      <div className="text-xs text-muted-foreground capitalize">{candidate.gender}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="flex items-center text-sm">
                                        <Mail className="mr-1 h-3 w-3" />
                                        {candidate.applicant_email}
                                      </div>
                                      {candidate.applicant_phone && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                          <Phone className="mr-1 h-3 w-3" />
                                          {candidate.applicant_phone}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-xs">
                                      {candidate.feedback ? (
                                        <p className="text-sm text-gray-600 truncate" title={candidate.feedback}>
                                          {candidate.feedback}
                                        </p>
                                      ) : (
                                        <p className="text-sm text-gray-400 italic">No feedback yet</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-center">
                                      {candidate.rating ? (
                                        <div className="flex items-center gap-1">
                                          <Star className="h-4 w-4 text-yellow-500" />
                                          <span className="font-semibold">{candidate.rating}/10</span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-400">-</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      {candidate.feedback && candidate.rating ? (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Reviewed
                                        </Badge>
                                      ) : candidate.status === 'completed' ? (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Needs Feedback
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                          <Clock className="h-3 w-3 mr-1" />
                                          {candidate.status || 'Scheduled'}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openFeedbackDialog(candidate)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Provide Feedback
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                    {/* Show active move option or feedback message */}
                                    {nextStageForActive && candidate.feedback && candidate.rating && candidate.status === 'completed' && (
                                        <DropdownMenuItem
                                        onClick={() => {
                                            setCandidatesToSchedule([candidate])
                                            setIsSchedulingDialogOpen(true)
                                        }}
                                        className="text-green-600"
                                        >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Schedule & Move to {nextStageForActive.name}
                                        </DropdownMenuItem>
                                    )}

                                    {/* Show feedback message instead of disabled item */}
                                    {nextStageForActive && (!candidate.feedback || !candidate.rating || candidate.status !== 'completed') && (
                                        <div className="px-2 py-1.5 text-sm text-orange-600 bg-orange-50 mx-1 rounded">
                                        <Clock className="h-4 w-4 inline mr-2" />
                                        Complete interview & provide feedback first
                                        </div>
                                    )}

                                    {/* Show active onboard option or feedback message */}
                                    {!nextStageForActive && candidate.feedback && candidate.rating && candidate.status === 'completed' && (
                                        <DropdownMenuItem
                                        onClick={async () => {
                                            try {
                                            const result = await bulkCreateOnBoarding({ applicationIds: [candidate.id] })
                                            if (result) {
                                                toast.success(`${candidate.applicant_name} onboarded successfully`)
                                                await fetchData()
                                            } else {
                                                toast.error(`Failed to onboard ${candidate.applicant_name}`)
                                            }
                                            } catch (error) {
                                            toast.error(`Failed to onboard ${candidate.applicant_name}`)
                                            }
                                        }}
                                        className="text-purple-600"
                                        >
                                        <Users className="h-4 w-4 mr-2" />
                                        Onboard Candidate
                                        </DropdownMenuItem>
                                    )}

                                    {/* Show feedback message for onboarding instead of disabled item */}
                                    {!nextStageForActive && (!candidate.feedback || !candidate.rating || candidate.status !== 'completed') && (
                                        <div className="px-2 py-1.5 text-sm text-orange-600 bg-orange-50 mx-1 rounded">
                                        <Clock className="h-4 w-4 inline mr-2" />
                                        Complete interview & provide feedback first
                                        </div>
                                    )}

                                    {/* Show message for candidates still in pipeline */}
                                    {nextStageForActive && candidate.feedback && candidate.rating && candidate.status === 'completed' && (
                                        <div className="px-2 py-1.5 text-sm text-blue-600 bg-blue-50 mx-1 rounded">
                                        <Users className="h-4 w-4 inline mr-2" />
                                        Complete all stages before onboarding
                                        </div>
                                    )}

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                        onClick={async () => {
                                        try {
                                            await rejectCandidate(candidate.id);
                                            toast.success(`${candidate.applicant_name} rejected`);
                                            await fetchData();
                                        } catch (error) {
                                            toast.error(`Failed to reject ${candidate.applicant_name}`);
                                        }
                                        }}
                                        className="text-red-600"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject Candidate
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* No stage selected state */
                  <Card className="h-full">
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Select an Interview Stage</h3>
                        <p className="text-muted-foreground">
                          Choose a stage from the left panel to view and manage candidates
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {processedStages.length > 0 && (
            <div className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Progress for {selectedJobPosition.name}</h3>
                  <div className="flex items-center space-x-2 overflow-x-auto pb-4">
                    {processedStages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center flex-shrink-0">
                        <div
                          className={`flex items-center justify-center w-12 h-12 rounded-full border-2 cursor-pointer transition-all ${
                            stage.count > 0
                              ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                              : 'border-gray-300 bg-gray-50 text-gray-400 hover:bg-gray-100'
                          } ${activeStageId === stage.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                          onClick={() => setActiveStageId(stage.id)}
                          title={`Click to view ${stage.name}`}
                        >
                          <span className="text-sm font-bold">{stage.count}</span>
                        </div>
                        {index < processedStages.length - 1 && (
                          <div className={`h-0.5 w-8 mx-2 ${
                            stage.count > 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 overflow-x-auto">
                    {processedStages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center flex-shrink-0">
                        <div className="w-12 text-center">
                          <span
                            className={`text-xs font-medium truncate block cursor-pointer ${
                              activeStageId === stage.id ? 'text-blue-600' : 'text-gray-600'
                            }`}
                            onClick={() => setActiveStageId(stage.id)}
                            title={stage.name}
                          >
                            {stage.name}
                          </span>
                        </div>
                        {index < processedStages.length - 1 && (
                          <div className="w-8 mx-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <FeedbackDialog
        candidate={selectedCandidate}
        onSave={handleUpdateFeedback}
        isOpen={isFeedbackDialogOpen}
        onClose={() => {
          setIsFeedbackDialogOpen(false)
          setSelectedCandidate(null)
        }}
        nextStage={nextStageForActive}
        onReject={async () => {
          if (selectedCandidate) {
            try {
              await rejectCandidate(selectedCandidate.id);
              toast.success(`${selectedCandidate.applicant_name} rejected`);
              await fetchData();
            } catch (error) {
              toast.error(`Failed to reject ${selectedCandidate.applicant_name}`);
            }
          }
        }}
        onScheduleAndMove={handleIndividualScheduleAndMove}
      />

      <InterviewSchedulingDialog
        isOpen={isSchedulingDialogOpen}
        onClose={() => {
          setIsSchedulingDialogOpen(false)
          setCandidatesToSchedule([])
        }}
        onSchedule={handleScheduleAndMove}
        candidates={candidatesToSchedule}
        targetStage={nextStageForActive ?? null}
        isScheduling={isProcessingProgression}
      />
    </div>
  )
}