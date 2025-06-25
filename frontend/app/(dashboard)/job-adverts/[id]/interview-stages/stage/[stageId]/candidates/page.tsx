"use client"

import { useState, useEffect, use } from "react"
import type React from "react"
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
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Plus
} from "lucide-react"
import { toast } from "sonner"
import type { JobPositionAdvert, IInterviewFormData, IInterview } from "@/app/types/types.utils"
import { getJobPositionAdvertById, updateInterview, getInterviews, createInterview } from "@/lib/utils"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"

interface Candidate {
  id: number
  job_position_advert: number
  job_position_advert_job_details: {
    name: string
    description: string
    job_posted_date: string
  }
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  resume: string
  cover_letter: string
  application_date: string
  status: string
  gender: string
  state: string
  address: string
  country: string
  source: string
  positions: number
  feedback?: string
  rating?: number
  interview_date?: string
  interview_time?: string
  location?: string
  interview_id?: number 
  interview?: any 
}

interface InterviewStage {
  id: number
  job_position_advert: number
  name: string
  level: number
  interviewer: number
  interviewer_details: {
    id: number
    user: {
      id: number
      email: string
      fullname: string
      is_active: boolean
      is_email_verified: boolean
      is_password_verified: boolean
      is_staff: boolean
      roles: any[]
      branches: any[]
      permissions: any[]
    }
    email: string
    phone_number: string
    position: {
      id: number
      name: string
      department_id: number
    }
    department: {
      id: number
      name: string
      institution_id: number
    }
    [key: string]: any
  }
  candidates_count: number
  candidates: Candidate[]
}

interface StageCandidatesPageProps {
  params: Promise<{
    id: string
    stageId: string
  }>
}

interface InterviewScheduleData {
  interview_date: string
  interview_time: string
  location: string
  interview_type: string
}

const sourceLabels = {
  website: "Website",
  referral: "Referral",
  job_board: "Job Board",
  social_media: "Social Media",
  other: "Other",
}

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
        max="5"
        value={rating || ''}
        onChange={(e) => onRatingChange?.(Number(e.target.value))}
        placeholder="1-5"
        className="w-20"
      />
      <p className="text-xs text-muted-foreground">Rate 1-5</p>
    </div>
  )
}

const LoadingState = () => (
  <div className="w-full h-full p-6">
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)

const ErrorState = ({ message }: { message: string }) => (
  <div className="w-full h-full p-6">
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  </div>
)

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
  candidates: Candidate[]
  targetStage: InterviewStage | null
  isScheduling: boolean
}) => {
  const [scheduleData, setScheduleData] = useState<InterviewScheduleData>({
    interview_date: "",
    interview_time: "",
    location: "",
    interview_type: ""
  })
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    if (!scheduleData.interview_date) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      setScheduleData(prev => ({
        ...prev,
        interview_date: tomorrow.toISOString().slice(0, 16),
      }))
    }
  }, [scheduleData.interview_date])

  const updateScheduleData = (field: string, value: string) => {
    setScheduleData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateScheduleForm = (): boolean => {
    const newErrors: any = {}

    if (!scheduleData.interview_date) {
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
                <p>Interviewer: {targetStage.interviewer_details?.user?.fullname || 'Not assigned'}</p>
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
              <Label htmlFor="interview_time" className="text-sm font-medium">
                Interview Time
              </Label>
              <Input
                id="interview_time"
                type="time"
                value={scheduleData.interview_time}
                onChange={(e) => updateScheduleData("interview_time", e.target.value)}
                placeholder="e.g., 10:00"
              />
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
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interview_type" className="text-sm font-medium">
                Interview Type
              </Label>
              <Select
                value={scheduleData.interview_type}
                onValueChange={(value) => updateScheduleData("interview_type", value)}
              >
                <SelectTrigger>
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

const FeedbackDialog = ({ 
  candidate, 
  onSave, 
  isOpen, 
  onClose,
  nextStage,
  onMoveToNextStage,
  onReject,
  onScheduleAndMove
}: {
  candidate: Candidate
  onSave: (feedback: string, rating: number) => void
  isOpen: boolean
  onClose: () => void
  nextStage?: InterviewStage | null
  onMoveToNextStage?: () => void
  onReject?: () => void
  onScheduleAndMove?: () => void
}) => {
  const [feedback, setFeedback] = useState(candidate.feedback || '')
  const [rating, setRating] = useState(candidate.rating || 0)
  const [isSaving, setIsSaving] = useState(false)
  const [action, setAction] = useState<'save' | 'advance' | 'reject' | 'schedule' | null>(null)

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

            {nextStage && (
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>Next stage: <strong>{nextStage.name}</strong> (Level {nextStage.level})</span>
                </div>
                <div className="mt-1 ml-6">
                  Interviewer: {nextStage.interviewer_details?.user?.fullname || 'Not assigned'}
                </div>
                <div className="mt-1 ml-6 text-xs">
                  Click "Schedule & Move" to schedule an interview for the next stage
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const StageProgressionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  candidateNames,
  targetStage,
  isProcessing,
  onScheduleFirst
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  candidateNames: string[]
  targetStage: InterviewStage | null
  isProcessing: boolean
  onScheduleFirst: () => void
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Candidates to Next Stage</DialogTitle>
          <DialogDescription>
            Schedule interviews and move candidates to the next stage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-semibold text-sm mb-2">Candidates ({candidateNames.length}):</h4>
            <ul className="text-sm space-y-1">
              {candidateNames.map((name, index) => (
                <li key={index} className="text-gray-700">• {name}</li>
              ))}
            </ul>
          </div>

          {targetStage && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-semibold text-sm mb-1">Target Stage:</h4>
              <p className="text-sm text-blue-700">
                <strong>{targetStage.name}</strong> (Level {targetStage.level})
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Interviewer: {targetStage.interviewer_details?.user?.fullname || 'Not assigned'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={onScheduleFirst} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Interviews
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const StageCandidatesContent = ({ 
  jobId, 
  stageId 
}: { 
  jobId: string
  stageId: string 
}) => {
  const router = useRouter()
  const [jobAdvert, setJobAdvert] = useState<JobPositionAdvert | null>(null)
  const [currentStage, setCurrentStage] = useState<InterviewStage | null>(null)
  const [nextStage, setNextStage] = useState<InterviewStage | null>(null)
  const [allStages, setAllStages] = useState<InterviewStage[]>([])
  const [interviews, setInterviews] = useState<IInterview[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
  const [isProgressionDialogOpen, setIsProgressionDialogOpen] = useState(false)
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false)
  const [isProcessingProgression, setIsProcessingProgression] = useState(false)
  const [candidatesToSchedule, setCandidatesToSchedule] = useState<Candidate[]>([])

  const selectedInstitution = useSelector(selectSelectedInstitution)

  const handleBack = () => {
    router.push(`/job-adverts/${jobId}/interview-stages`)
  }

  const moveToNextStage = async (candidateId: number, targetStageId: number) => {
    try {
      const candidate = filteredCandidates.find(c => c.id === candidateId);
      
      if (!candidate || !candidate.interview_id) {
        throw new Error(`No interview found for candidate ${candidateId}`);
      }

      const interviewData = {
        interview_stage: targetStageId
      };

      const result = await updateInterview({
        interviewId: candidate.interview_id,
        interviewData: interviewData
      });

      if (!result) {
        throw new Error('Failed to update interview stage');
      }

      console.log(`Successfully moved candidate ${candidateId} to stage ${targetStageId}`);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error moving candidate ${candidateId} to stage ${targetStageId}:`, error);
      throw error;
    }
  };

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

      console.log(`Successfully rejected candidate ${candidateId}`);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error rejecting candidate ${candidateId}:`, error);
      throw error;
    }
  };

  const scheduleInterviewsForNextStage = async (
    candidates: Candidate[], 
    scheduleData: InterviewScheduleData
  ) => {
    if (!selectedInstitution || !nextStage) {
      throw new Error('Missing institution or next stage data');
    }

    try {
      const interviewPromises = candidates.map(async (candidate) => {
        const createData: IInterviewFormData = {
          job_position_application: candidate.id,
          interview_stage: nextStage.id,
          interview_date: scheduleData.interview_date,
          interview_time: scheduleData.interview_time,
          location: scheduleData.location,
          interview_type: scheduleData.interview_type,
          status: "scheduled",
          feedback: undefined,
          rating: undefined,
        };

        return createInterview({
          institutionId: selectedInstitution.id,
          interviewData: createData,
        });
      });

      const results = await Promise.all(interviewPromises);
      const successCount = results.filter(result => result !== null).length;
      
      if (successCount === 0) {
        throw new Error('Failed to schedule any interviews');
      }

      return { successCount, totalCount: candidates.length };
    } catch (error) {
      console.error('Error scheduling interviews:', error);
      throw error;
    }
  };

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const jobAdvertData = await getJobPositionAdvertById({ advertId: parseInt(jobId) })
      
      if (!jobAdvertData) {
        throw new Error('No job advert data returned')
      }
      
      const stages = (jobAdvertData.interview_stages as unknown as InterviewStage[]) || []
      const sortedStages = stages.sort((a, b) => a.level - b.level)
      setAllStages(sortedStages)
      
      const stage = sortedStages.find(s => s.id === parseInt(stageId))
      
      if (!stage) {
        throw new Error(`Interview stage with ID ${stageId} not found`)
      }

      const currentStageIndex = sortedStages.findIndex(s => s.id === parseInt(stageId))
      const nextStageData = currentStageIndex < sortedStages.length - 1 ? sortedStages[currentStageIndex + 1] : null
      
      setCurrentStage(stage)
      setNextStage(nextStageData)

      if (selectedInstitution?.id) {
        const fetchedInterviews = await getInterviews({ institutionId: selectedInstitution.id })
        setInterviews(fetchedInterviews || [])
      }
      
      setJobAdvert(jobAdvertData)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  // Enhanced function to merge candidate data with interview data and show all relevant candidates
  const mergeInterviewData = (candidates: Candidate[], interviews: IInterview[]): Candidate[] => {
    const processedCandidates = new Map<number, Candidate>()
    
    // First, add all candidates from the current stage
    candidates.forEach(candidate => {
      const interview = interviews.find(
        (interview) => interview.job_position_application === candidate.id && 
        interview.interview_stage === parseInt(stageId)
      )
      
      if (interview) {
        processedCandidates.set(candidate.id, {
          ...candidate,
          feedback: interview.feedback,
          rating: interview.rating,
          interview_date: interview.interview_date,
          interview_time: interview.interview_time,
          location: interview.location,
          interview_id: interview.id,
          interview: interview
        })
      } else {
        processedCandidates.set(candidate.id, candidate)
      }
    })

    // Then, add candidates who have interviews in later stages but originated from this job position
    // and have completed interviews in the current stage
    interviews.forEach(interview => {
      if (interview.interview_stage !== parseInt(stageId) && 
          interview.job_position_application_details?.job_position_advert === parseInt(jobId)) {
        
        // Check if this candidate has a completed interview in the current stage
        const currentStageInterview = interviews.find(
          (int) => int.job_position_application === interview.job_position_application &&
          int.interview_stage === parseInt(stageId) &&
          int.status === 'completed' &&
          int.feedback &&
          int.rating
        )

        if (currentStageInterview && !processedCandidates.has(interview.job_position_application)) {
          // Create a candidate object from the interview data
          const candidateFromInterview: Candidate = {
            id: interview.job_position_application,
            job_position_advert: interview.job_position_application_details?.job_position_advert || parseInt(jobId),
            job_position_advert_job_details: {
              name: interview.job_position_application_details?.job_position_advert_job_details?.name || 'Unknown Position',
              description: interview.job_position_application_details?.job_position_advert_job_details?.description || '',
              job_posted_date: interview.job_position_application_details?.job_position_advert_job_details?.job_posted_date || ''
            },
            applicant_name: interview.job_position_application_details?.applicant_name || 'Unknown',
            applicant_email: interview.job_position_application_details?.applicant_email || '',
            applicant_phone: interview.job_position_application_details?.applicant_phone || '',
            resume: interview.job_position_application_details?.resume || '',
            cover_letter: interview.job_position_application_details?.cover_letter || '',
            application_date: interview.job_position_application_details?.application_date || '',
            status: interview.job_position_application_details?.status || '',
            gender: interview.job_position_application_details?.gender || '',
            state: interview.job_position_application_details?.state || '',
            address: interview.job_position_application_details?.address || '',
            country: interview.job_position_application_details?.country || '',
            source: interview.job_position_application_details?.source || '',
            positions: interview.job_position_application_details?.positions || 1,
            // Use the current stage interview data for feedback/rating
            feedback: currentStageInterview.feedback,
            rating: currentStageInterview.rating,
            interview_date: currentStageInterview.interview_date,
            interview_time: currentStageInterview.interview_time,
            location: currentStageInterview.location,
            interview_id: currentStageInterview.id,
            interview: currentStageInterview
          }
          
          processedCandidates.set(interview.job_position_application, candidateFromInterview)
        }
      }
    })
    
    return Array.from(processedCandidates.values())
  }

  const filterCandidates = () => {
    if (!currentStage) return

    let candidates = currentStage.candidates || []
    
    // Merge interview data with candidate data - this now includes candidates moved to later stages
    let mergedCandidates = mergeInterviewData(candidates, interviews)

    // Filter by search term
    if (searchTerm) {
      mergedCandidates = mergedCandidates.filter(
        (candidate) =>
          candidate.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.applicant_phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Remove duplicates based on candidate ID (in case there are any)
    const uniqueCandidates = mergedCandidates.filter((candidate, index, self) => 
      index === self.findIndex(c => c.id === candidate.id)
    )

    setFilteredCandidates(uniqueCandidates)
  }

  useEffect(() => {
    if (jobId && stageId) {
      fetchData()
    }
  }, [jobId, stageId])

  useEffect(() => {
    filterCandidates()
  }, [currentStage, interviews, searchTerm])

  const handleSelectCandidate = (candidateId: number, checked: boolean) => {
    if (checked) {
      setSelectedCandidates((prev) => [...prev, candidateId])
    } else {
      setSelectedCandidates((prev) => prev.filter((id) => id !== candidateId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCandidates(filteredCandidates.map((candidate) => candidate.id))
    } else {
      setSelectedCandidates([])
    }
  }

  const handleClearSelection = () => {
    setSelectedCandidates([])
  }

  const handleBulkMoveToNextStage = () => {
    if (selectedCandidates.length === 0) {
      toast.error('Please select candidates to move')
      return
    }

    if (!nextStage) {
      toast.error('No next stage available')
      return
    }

    setIsProgressionDialogOpen(true)
  }

  const handleBulkScheduleFirst = () => {
    const candidatesData = filteredCandidates.filter(c => selectedCandidates.includes(c.id))
    setCandidatesToSchedule(candidatesData)
    setIsProgressionDialogOpen(false)
    setIsSchedulingDialogOpen(true)
  }

  const handleScheduleAndMove = async (scheduleData: InterviewScheduleData) => {
    setIsProcessingProgression(true)
    
    try {
      const scheduleResult = await scheduleInterviewsForNextStage(candidatesToSchedule, scheduleData)
      
      if (scheduleResult.successCount > 0) {
        const moveResults = []
        const moveErrors = []

        for (const candidate of candidatesToSchedule) {
          try {
            const result = await moveToNextStage(candidate.id, nextStage!.id)
            moveResults.push({ candidateId: candidate.id, success: true, data: result })
          } catch (error) {
            console.error(`Failed to move candidate ${candidate.id}:`, error)
            moveErrors.push({ candidateId: candidate.id, error })
          }
        }

        if (moveErrors.length === 0) {
          toast.success(`Successfully scheduled interviews and moved ${candidatesToSchedule.length} candidates to ${nextStage?.name}`)
        } else if (moveResults.length > 0) {
          toast.warning(`${moveResults.length} candidates moved successfully, ${moveErrors.length} failed to move`)
        } else {
          toast.error('Failed to move any candidates to the next stage')
        }

        setSelectedCandidates([])
        setIsSchedulingDialogOpen(false)
        setCandidatesToSchedule([])
        
        await refreshStageData()
      } else {
        toast.error('Failed to schedule interviews')
      }
    } catch (error) {
      console.error('Error in schedule and move process:', error)
      toast.error('Failed to schedule interviews and move candidates')
    } finally {
      setIsProcessingProgression(false)
    }
  }

  const refreshStageData = async () => {
    try {
      const data = await getJobPositionAdvertById({ advertId: parseInt(jobId) })
      if (data && data.interview_stages) {
        const stages = (data.interview_stages as unknown as InterviewStage[]).sort((a, b) => a.level - b.level)
        setAllStages(stages)
        
        const stage = stages.find((s: any) => s.id === parseInt(stageId))
        if (stage) {
          setCurrentStage(stage)
        }
        
        const currentStageIndex = stages.findIndex(s => s.id === parseInt(stageId))
        const nextStageData = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null
        setNextStage(nextStageData)
      }

      if (selectedInstitution?.id) {
        const fetchedInterviews = await getInterviews({ institutionId: selectedInstitution.id })
        setInterviews(fetchedInterviews || [])
      }
    } catch (error) {
      console.error('Error refreshing stage data:', error)
    }
  }

  const handleUpdateFeedback = async (feedback: string, rating: number) => {
    if (!selectedCandidate || !currentStage) return

    try {
      const interviewId = selectedCandidate.interview_id;

      if (!interviewId) {
        throw new Error('No interview found for this candidate');
      }

      const isFinalStage = !nextStage;

      const interviewData = {
        feedback: feedback,
        rating: rating,
        ...(isFinalStage && { status: 'completed' })
      }

      const result = await updateInterview({
        interviewId: interviewId,
        interviewData: interviewData
      });

      if (!result) {
        throw new Error('Failed to update interview feedback');
      }

      setInterviews(prev => 
        prev.map(interview => {
          if (interview.id === interviewId) {
            return { ...interview, feedback: result.feedback, rating: result.rating }
          }
          return interview
        })
      )

      setSelectedCandidate(prev => {
        if (!prev || prev.interview_id !== interviewId) return prev
        return {
          ...prev,
          feedback: result.feedback,
          rating: result.rating
        }
      })

      await refreshStageData()
    } catch (error) {
      console.error('Error updating feedback:', error)
      throw error
    }
  }

  const handleIndividualScheduleAndMove = () => {
    if (!selectedCandidate) return
    setCandidatesToSchedule([selectedCandidate])
    setIsFeedbackDialogOpen(false)
    setIsSchedulingDialogOpen(true)
  }

  const handleMoveToNextStage = async () => {
    if (!selectedCandidate || !nextStage) return

    try {
      await moveToNextStage(selectedCandidate.id, nextStage.id)
      await refreshStageData()
    } catch (error) {
      console.error('Error moving candidate:', error)
      throw error
    }
  }

  const handleRejectCandidate = async () => {
    if (!selectedCandidate) return

    try {
      await rejectCandidate(selectedCandidate.id)
      await refreshStageData()
    } catch (error) {
      console.error('Error rejecting candidate:', error)
      throw error
    }
  }

  const openFeedbackDialog = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setIsFeedbackDialogOpen(true)
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!currentStage) return <ErrorState message="Interview stage not found" />

  const candidates = filteredCandidates
  const selectedCandidateNames = filteredCandidates
    .filter(c => selectedCandidates.includes(c.id))
    .map(c => c.applicant_name)

  return (
    <div className="w-full h-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Interview Stages
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{currentStage.name} - Candidates</h1>
              <p className="text-muted-foreground">
                Level {currentStage.level} • Interviewer: {currentStage.interviewer_details?.user.fullname || 'Not assigned'} • {candidates.length} total candidates
              </p>
            </div>
          </div>
        </div>

        {nextStage && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Next stage: <strong>{nextStage.name}</strong> (Level {nextStage.level})
                  </span>
                </div>
                <div className="text-sm text-green-700">
                  Interviewer: {nextStage.interviewer_details?.user?.fullname || 'Not assigned'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {selectedCandidates.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
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
                    onClick={handleClearSelection}
                    className="text-gray-600"
                  >
                    Clear Selection
                  </Button>
                  {nextStage && (
                    <Button
                      size="sm"
                      onClick={handleBulkMoveToNextStage}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule & Move to {nextStage.name}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Candidates ({filteredCandidates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No candidates match your search."
                    : "No candidates have been assigned to this interview stage yet."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredCandidates.length > 0 &&
                            selectedCandidates.length === filteredCandidates.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate, index) => (
                      <TableRow key={`${candidate.id}-${index}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCandidates.includes(candidate.id)}
                            onCheckedChange={(checked) => handleSelectCandidate(candidate.id, checked as boolean)}
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
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <MapPin className="mr-1 h-3 w-3" />
                              {candidate.country}
                            </div>
                            {candidate.state && (
                              <div className="text-sm text-muted-foreground">{candidate.state}</div>
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
                              <span className="text-lg font-semibold">{candidate.rating}/5</span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {candidate.feedback && candidate.rating ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Reviewed
                                </Badge>
                                {(() => {
                                  const laterStageInterview = interviews.find(
                                    int => int.job_position_application === candidate.id && 
                                    int.interview_stage > parseInt(stageId)
                                  )
                                  if (laterStageInterview) {
                                    const laterStage = allStages.find(s => s.id === laterStageInterview.interview_stage)
                                    return (
                                      <Badge variant="outline" className="bg-blue-100 text-blue-700 ml-1">
                                        <ArrowRight className="h-3 w-3 mr-1" />
                                        In {laterStage?.name || 'Next Stage'}
                                      </Badge>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
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
                              
                              {nextStage && candidate.feedback && candidate.rating && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      setCandidatesToSchedule([candidate])
                                      setIsSchedulingDialogOpen(true)
                                    }}
                                    className="text-green-600"
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Schedule & Move to {nextStage.name}
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      try {
                                        await moveToNextStage(candidate.id, nextStage.id);
                                        toast.success(`${candidate.applicant_name} moved to ${nextStage.name}`);
                                        await refreshStageData();
                                      } catch (error) {
                                        console.error('Failed to move candidate:', error);
                                        toast.error(`Failed to move ${candidate.applicant_name}`);
                                      }
                                    }}
                                    className="text-blue-600"
                                  >
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                    Move Without Scheduling
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              <DropdownMenuItem 
                                onClick={async () => {
                                  try {
                                    await rejectCandidate(candidate.id);
                                    toast.success(`${candidate.applicant_name} rejected`);
                                    await refreshStageData();
                                  } catch (error) {
                                    console.error('Failed to reject candidate:', error);
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
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCandidate && (
          <FeedbackDialog
            candidate={selectedCandidate}
            onSave={handleUpdateFeedback}
            isOpen={isFeedbackDialogOpen}
            onClose={() => {
              setIsFeedbackDialogOpen(false)
              setSelectedCandidate(null)
            }}
            nextStage={nextStage}
            onMoveToNextStage={handleMoveToNextStage}
            onReject={handleRejectCandidate}
            onScheduleAndMove={handleIndividualScheduleAndMove}
          />
        )}

        <StageProgressionDialog
          isOpen={isProgressionDialogOpen}
          onClose={() => setIsProgressionDialogOpen(false)}
          onConfirm={() => {}}
          candidateNames={selectedCandidateNames}
          targetStage={nextStage}
          isProcessing={isProcessingProgression}
          onScheduleFirst={handleBulkScheduleFirst}
        />

        <InterviewSchedulingDialog
          isOpen={isSchedulingDialogOpen}
          onClose={() => {
            setIsSchedulingDialogOpen(false)
            setCandidatesToSchedule([])
          }}
          onSchedule={handleScheduleAndMove}
          candidates={candidatesToSchedule}
          targetStage={nextStage}
          isScheduling={isProcessingProgression}
        />
      </div>
    </div>
  )
}

export default function StageCandidatesPage({ params }: StageCandidatesPageProps) {
  const resolvedParams = use(params)

  return (
    <StageCandidatesContent 
      jobId={resolvedParams.id} 
      stageId={resolvedParams.stageId} 
    />
  )
}