"use client"

import  React, { useState, useEffect, use } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  Plus,
  Eye,
  Filter,
  UserCheck,
  Code,
  Check,
  X,
  ChevronDown,
  Briefcase,
  Star,
  FileText,
  History,
  TrendingUp,
  Award,
  ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import type { JobPositionAdvert, IInterviewStage, IInterviewStageFormData, IEmployee, IInterview, IInterviewFormData } from "@/app/types/types.utils"
import { getJobPositionAdvertById, createInterviewStage, fetchEmployees, getInterviews, updateInterview, createInterview, bulkCreateOnBoarding, getOnBoardings } from "@/lib/utils"
import { selectUser, selectSelectedInstitution } from "@/store/auth/selectors"
import { EmployeeSearchableSelect } from "@/components/ui/employee-searchable-select"


interface UnifiedInterviewPipelineProps {
  params: Promise<{
    id: string
  }>
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
  candidates: Candidate[]
}

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

interface InterviewScheduleData {
  interview_date: string
  location: string
  interview_type: "online" | "in_person"
}

// New interface for interview history
interface InterviewHistoryEntry {
  stage_id: number
  stage_name: string
  stage_level: number
  interviewer: string
  interview_date?: string
  interview_time?: string
  location?: string
  feedback?: string
  rating?: number
  status: string
  created_at?: string
  updated_at?: string
}

interface CandidateWithHistory extends Candidate {
  interview_history: InterviewHistoryEntry[]
  current_stage_level: number
  current_stage_name: string
  overall_rating: number
  completion_rate: number
}
  
// Utility functions from original components
const recalculateStageCandidateCounts = (
  stages: IInterviewStage[],
  interviews: IInterview[]
): IInterviewStage[] => {
  const candidateLatestStage = new Map<number, number>();

  interviews.forEach((interview: IInterview) => {
    const candidateId = interview.job_position_application;
    const currentStage = interview.interview_stage;

    if (!candidateLatestStage.has(candidateId) ||
        candidateLatestStage.get(candidateId)! < currentStage) {
      candidateLatestStage.set(candidateId, currentStage);
    }
  });

  return stages.map((stage: IInterviewStage) => {
    const originalCandidates = (stage as any).candidates || [];
    let currentStageCandidates: any[] = [];

    originalCandidates.forEach((candidate: any) => {
      const latestStage = candidateLatestStage.get(candidate.id);
      if (!latestStage || latestStage === stage.id) {
        currentStageCandidates.push(candidate);
      }
    });

    const candidatesInThisStage = interviews.filter((interview: IInterview) => {
      const candidateId = interview.job_position_application;
      const latestStage = candidateLatestStage.get(candidateId);
      return latestStage === stage.id;
    });

    const uniqueCandidateIds = new Set();
    currentStageCandidates.forEach((candidate: any) => {
      uniqueCandidateIds.add(candidate.id);
    });

    candidatesInThisStage.forEach((interview: IInterview) => {
      uniqueCandidateIds.add(interview.job_position_application);
    });

    const totalCount = uniqueCandidateIds.size;
    return {
      ...stage,
      candidates_count: totalCount,
      candidates: currentStageCandidates
    };
  });
};

// Enhanced function to build candidate history
const buildCandidateHistory = (
  candidates: Candidate[],
  interviews: IInterview[],
  stages: ProcessedStage[]
): CandidateWithHistory[] => {
  return candidates.map(candidate => {
    const candidateInterviews = interviews
      .filter(interview => interview.job_position_application === candidate.id)
      .sort((a, b) => {
        const stageA = stages.find(s => s.id === a.interview_stage.toString());
        const stageB = stages.find(s => s.id === b.interview_stage.toString());
        return (stageA?.level || 0) - (stageB?.level || 0);
      });

    // 🧱 Build interview history entries once
    const interview_history = candidateInterviews.map(interview => {
      const stage = stages.find(s => s.id === interview.interview_stage.toString());
      return {
        stage_id: interview.interview_stage,
        stage_name: stage?.name || 'Unknown Stage',
        stage_level: stage?.level || 0,
        interviewer: stage?.interviewer || 'Unknown',
        interview_date: interview.interview_date,
        interview_time: interview.interview_time,
        location: interview.location,
        feedback: interview.feedback,
        rating: interview.rating ?? undefined,
        status: interview.status || 'completed',
        created_at: interview.created_at,
        updated_at: interview.updated_at,
      };
    });

    // 🎯 Determine current stage (last one)
    const currentStageEntry = interview_history.length > 0
      ? interview_history[interview_history.length - 1]
      : null;

    const current_stage_level = currentStageEntry?.stage_level || 0;
    const current_stage_name = currentStageEntry?.stage_name || 'Not Started';

    // ⭐ Calculate overall rating
    const ratings = interview_history.filter(h => h.rating && h.rating > 0);
    const overall_rating = ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum, h) => sum + (h.rating || 0), 0) / ratings.length) * 10
        ) / 10
      : 0;

    // 📊 Completion rate
    const feedbacks = interview_history.filter(h => h.feedback && h.feedback.trim().length > 0);
    const completion_rate = interview_history.length > 0
      ? Math.round((feedbacks.length / interview_history.length) * 100)
      : 0;

    return {
      ...candidate,
      interview_history,
      current_stage_level,
      current_stage_name,
      overall_rating,
      completion_rate,
    } as CandidateWithHistory;
  });
};



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
    if (lowerStageName.includes(key)) {
      return icon
    }
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

const mergeInterviewData = (
  candidates: Candidate[],
  interviews: IInterview[],
  stageId: string
): Candidate[] => {
  const processedCandidates = new Map<number, Candidate>();

  candidates.forEach((candidate) => {
    const laterStageInterview = interviews.find(
      (interview) =>
        interview.job_position_application === candidate.id &&
        interview.interview_stage > parseInt(stageId)
    );

    if (laterStageInterview) {
      return;
    }

    const currentStageInterview = interviews.find(
      (interview) =>
        interview.job_position_application === candidate.id &&
        interview.interview_stage === parseInt(stageId)
    );

    if (currentStageInterview) {
      processedCandidates.set(candidate.id, {
        ...candidate,
        feedback: currentStageInterview.feedback || undefined,
        rating: currentStageInterview.rating || undefined,
        interview_date: currentStageInterview.interview_date,
        interview_time: currentStageInterview.interview_time,
        location: currentStageInterview.location,
        interview_id: currentStageInterview.id,
        interview: currentStageInterview,
      });
    } else {
      processedCandidates.set(candidate.id, candidate);
    }
  });

  return Array.from(processedCandidates.values());
};

// Loading and Error Components
const ErrorState = ({ message }: { message: string }) => (
  <div className="p-6">
    <Card className="p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <MessageSquare className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">{message}</p>
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

// New Component: Candidate History Dialog
const CandidateHistoryDialog = ({
  candidate,
  isOpen,
  onClose,
  stages
}: {
  candidate: CandidateWithHistory | null
  isOpen: boolean
  onClose: () => void
  stages: ProcessedStage[]
}) => {
  if (!candidate) return null

  const getStageStatusIcon = (entry: InterviewHistoryEntry) => {
    if (entry.feedback && entry.rating) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (entry.feedback) {
      return <Clock className="h-4 w-4 text-yellow-600" />
    } else {
      return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-green-600 bg-green-100"
    if (rating >= 6) return "text-yellow-600 bg-yellow-100"
    if (rating >= 4) return "text-orange-600 bg-orange-100"
    return "text-red-600 bg-red-100"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Interview History - {candidate.applicant_name}
          </DialogTitle>
          <DialogDescription>
            Complete interview journey and performance across all stages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{candidate.current_stage_level}</div>
                  <div className="text-sm text-gray-600">Current Stage Level</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{candidate.overall_rating}</div>
                  <div className="text-sm text-gray-600">Overall Rating</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{candidate.completion_rate}%</div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{candidate.applicant_email}</span>
                </div>
                {candidate.applicant_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{candidate.applicant_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="capitalize">{candidate.gender}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{candidate.state}, {candidate.country}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interview Journey</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.interview_history.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No interview history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {candidate.interview_history.map((entry, index) => (
                    <div key={index} className="relative">
                      {/* Timeline line */}
                      {index < candidate.interview_history.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      <div className="flex gap-4">
                        {/* Timeline dot */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                          {getStageStatusIcon(entry)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <Card className="mb-2">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-lg">{entry.stage_name}</h4>
                                  <p className="text-sm text-gray-600">Level {entry.stage_level} • {entry.interviewer}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {entry.rating && (
                                    <Badge className={`${getRatingColor(entry.rating)} border-0`}>
                                      <Star className="h-3 w-3 mr-1" />
                                      {entry.rating}/10
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="capitalize">
                                    {entry.status}
                                  </Badge>
                                </div>
                              </div>

                              {/* Interview Details */}
                              {(entry.interview_date || entry.location) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                                  {entry.interview_date && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-500" />
                                      <span>
                                        {new Date(entry.interview_date).toLocaleDateString()}
                                        {entry.interview_time && ` at ${entry.interview_time}`}
                                      </span>
                                    </div>
                                  )}
                                  {entry.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-gray-500" />
                                      <span>{entry.location}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Feedback */}
                              {entry.feedback && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium text-sm">Feedback</span>
                                  </div>
                                  <p className="text-sm text-gray-700">{entry.feedback}</p>
                                </div>
                              )}

                              {!entry.feedback && !entry.rating && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <p className="text-sm text-yellow-700">
                                    <Clock className="h-4 w-4 inline mr-1" />
                                    No feedback provided yet
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ratings Chart */}
                <div>
                  <h4 className="font-medium mb-3">Stage Ratings</h4>
                  <div className="space-y-2">
                    {candidate.interview_history
                      .filter(entry => entry.rating)
                      .map((entry, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="text-sm min-w-0 flex-1 truncate">{entry.stage_name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  entry.rating! >= 8 ? 'bg-green-500' :
                                  entry.rating! >= 6 ? 'bg-yellow-500' :
                                  entry.rating! >= 4 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${(entry.rating! / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{entry.rating}/10</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Progress Statistics */}
                <div>
                  <h4 className="font-medium mb-3">Progress Statistics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Stages Completed</span>
                      <span className="font-medium">{candidate.interview_history.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Stages with Feedback</span>
                      <span className="font-medium">
                        {candidate.interview_history.filter(h => h.feedback).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average Rating</span>
                      <span className="font-medium">{candidate.overall_rating || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completion Rate</span>
                      <span className="font-medium">{candidate.completion_rate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Sub-components (keeping the existing ones)
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
  candidate: Candidate | null
  onSave: (feedback: string, rating: number) => void
  isOpen: boolean
  onClose: () => void
  nextStage?: ProcessedStage | null
  onMoveToNextStage?: () => void
  onReject?: () => void
  onScheduleAndMove?: () => void
}) => {
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [action, setAction] = useState<'save' | 'advance' | 'reject' | 'schedule' | null>(null)

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
  candidates: Candidate[]
  targetStage: ProcessedStage | null
  isScheduling: boolean
}) => {
  // Initialize with proper default values immediately
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

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      setScheduleData({
        interview_date: tomorrow.toISOString().slice(0, 16),
        location: "Conference Room",
        interview_type: "online"
      })
      setErrors({})
    }
  }, [isOpen])

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

    if (!scheduleData.interview_type || !["online", "in_person"].includes(scheduleData.interview_type)) {
      newErrors.interview_type = "Please select a valid interview type"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSchedule = () => {

    if (!validateScheduleForm()) {
      toast.error("Please fix the form errors before scheduling")
      return
    }

    // No need to include interview_time since we extract it from interview_date
    const finalScheduleData: InterviewScheduleData = {
      interview_date: scheduleData.interview_date.trim(),
      location: scheduleData.location.trim() || "Conference Room",
      interview_type: scheduleData.interview_type || "online"
    }
    onSchedule(finalScheduleData)
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
              <p className="text-xs text-muted-foreground">Must be a future date and time</p>
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
              <p className="text-xs text-muted-foreground">Specify if interview is in-person or virtual</p>
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
              {errors.interview_type && (
                <p className="text-sm text-destructive">{errors.interview_type}</p>
              )}
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
export default function UnifiedInterviewPipeline({ params }: UnifiedInterviewPipelineProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const userData = useSelector(selectUser);
  const createdBy = userData?.id ?? 0;

  // State management
  const [jobPositionAdvert, setJobPositionAdvert] = useState<JobPositionAdvert | null>(null)
  const [processedStages, setProcessedStages] = useState<ProcessedStage[]>([])
  const [interviews, setInterviews] = useState<IInterview[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI State
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current')
  const [showPipeline, setShowPipeline] = useState(true)

  // Dialog states
  const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false)
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [selectedCandidateWithHistory, setSelectedCandidateWithHistory] = useState<CandidateWithHistory | null>(null)
  const [candidatesToSchedule, setCandidatesToSchedule] = useState<Candidate[]>([])

  // Form states
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [isProcessingProgression, setIsProcessingProgression] = useState(false)
  const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
    name: "",
    level: 1,
    interviewers: [],
    job_position_advert: parseInt(resolvedParams.id),
  })
  const [stageErrors, setStageErrors] = useState<any>({})

  // Enhanced computed values with validation logic
  const activeStage = processedStages.find(stage => stage.id === activeStageId)
  const nextStageForActive = processedStages.find(stage =>
    activeStage && stage.level === activeStage.level + 1
  )
  const filteredCandidates = activeStage ?
    activeStage.candidates.filter(candidate =>
      candidate.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.applicant_phone?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : []

  // Helper functions for candidate validation
  const canCandidateBeMoved = (candidate: Candidate): boolean => {
    return !!(candidate.feedback && candidate.rating && candidate.rating > 0)
  }

  const canCandidateBeOnboarded = (candidate: Candidate): boolean => {
    return !!(candidate.feedback && candidate.rating && candidate.rating > 0)
  }

  const isCandidateAlreadyOnboarded = (candidate: Candidate): boolean => {
    return candidate.status === 'onboarded' || candidate.status === 'hired'
  }

 const canCandidateBeSelected = (candidate: Candidate | CandidateWithHistory): boolean => {
  return !(candidate.feedback && candidate.rating && candidate.rating > 0) && !isCandidateAlreadyOnboarded(candidate)
}

  const selectableCandidates = filteredCandidates.filter(canCandidateBeSelected)

  // Filter candidates for bulk actions
  const candidatesEligibleForOnboarding = filteredCandidates.filter(candidate =>
    selectedCandidates.includes(candidate.id) &&
    canCandidateBeOnboarded(candidate) &&
    !isCandidateAlreadyOnboarded(candidate)
  )

  const candidatesEligibleForMoving = filteredCandidates.filter(candidate =>
    selectedCandidates.includes(candidate.id) &&
    canCandidateBeMoved(candidate)
  )

  const allCandidatesWithHistory = React.useMemo(() => {
    if (!jobPositionAdvert?.applications) return []

    const allCandidates = jobPositionAdvert.applications.map(app => ({
      id: app.id,
      job_position_advert: app.job_position_advert,
      job_position_advert_job_details: app.job_position_advert_job_details,
      applicant_name: app.applicant_name,
      applicant_email: app.applicant_email,
      applicant_phone: app.applicant_phone,
      resume: app.resume,
      cover_letter: app.cover_letter,
      application_date: app.application_date,
      status: app.status,
      gender: app.gender,
      state: app.state,
      address: app.address,
      country: app.country,
      source: app.source,
      positions: app.positions
    }))

    return buildCandidateHistory(allCandidates, interviews, processedStages)
  }, [jobPositionAdvert?.applications, interviews, processedStages])

  const filteredHistoryCandidates = allCandidatesWithHistory.filter(candidate =>
    candidate.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.applicant_phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Data fetching
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getJobPositionAdvertById({ advertId: parseInt(resolvedParams.id) })
      if (!data) {
        throw new Error('No data returned from API')
      }

      setJobPositionAdvert(data as JobPositionAdvert)

      if (selectedInstitution?.id) {
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
      }
    } catch (err) {
      setError(`Failed to load interview pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Process stages with candidates
  useEffect(() => {
    if (jobPositionAdvert?.interview_stages && interviews.length >= 0) {
      const interviewStages = jobPositionAdvert.interview_stages as unknown as IInterviewStage[]
      const stagesWithCorrectCounts = recalculateStageCandidateCounts(interviewStages, interviews)

      const processed: ProcessedStage[] = stagesWithCorrectCounts
        .sort((a, b) => a.level - b.level)
        .map((stage, index) => {
          const colors = getStageColors(index)
          const interviewerNames = stage.interviewers_details && Array.isArray(stage.interviewers_details)
            ? stage.interviewers_details.map(emp => emp.user?.fullname || 'Unknown').join(', ')
            : 'Not assigned'

          const mergedCandidates = mergeInterviewData(
            stage.candidates || [],
            interviews,
            stage.id.toString()
          )

          return {
            id: stage.id.toString(),
            name: stage.name,
            count: stage.candidates_count || 0,
            level: stage.level,
            interviewer: interviewerNames,
            icon: getStageIcon(stage.name, index),
            candidates: mergedCandidates,
            ...colors
          }
        })

      setProcessedStages(processed)

      // Set active stage to first stage if none selected
      if (!activeStageId && processed.length > 0) {
        setActiveStageId(processed[0].id)
      }
    }
  }, [jobPositionAdvert, interviews])

  useEffect(() => {
    if (resolvedParams.id) {
      fetchData()
    }
  }, [resolvedParams.id, selectedInstitution])

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
      const newStage = await createInterviewStage({
        institutionId: selectedInstitution.id,
        stageData: stageFormData,
      })

      if (newStage) {
        setStageFormData({
          name: "",
          level: 1,
          interviewers: [],
          job_position_advert: parseInt(resolvedParams.id)
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
 const handleSelectCandidate = (candidateId: number, checked: boolean) => {
  const candidate = (viewMode === 'current' ? filteredCandidates : filteredHistoryCandidates).find(c => c.id === candidateId)

  if (checked) {
    if (!candidate) {
      toast.error("Candidate not found")
      return
    }
    
    // Check if candidate already has feedback and rating
    if (candidate.feedback && candidate.rating && candidate.rating > 0) {
      toast.error("This candidate already has feedback and rating. Use individual actions to onboard or move them.")
      return
    }
    
    // Check if candidate is already onboarded
    if (isCandidateAlreadyOnboarded(candidate)) {
      toast.error("This candidate is already onboarded.")
      return
    }
    
    // Only allow selection if candidate can be selected (needs action)
    if (canCandidateBeSelected(candidate)) {
      setSelectedCandidates((prev) => [...prev, candidateId])
    } else {
      toast.error("This candidate cannot be selected for bulk actions")
    }
  } else {
    setSelectedCandidates((prev) => prev.filter((id) => id !== candidateId))
  }
}


const handleSelectAll = (checked: boolean) => {
  const candidatesToSelect = viewMode === 'current' ? selectableCandidates : filteredHistoryCandidates.filter(canCandidateBeSelected)
  
  if (checked) {
    if (candidatesToSelect.length === 0) {
      if (viewMode === 'current') {
        toast.info("No candidates need feedback. All candidates have already been reviewed or onboarded.")
      } else {
        toast.info("No candidates can be selected. All candidates have feedback/rating or are already onboarded.")
      }
      return
    }
    
    // Only select candidates who need action
    setSelectedCandidates(candidatesToSelect.map((candidate) => candidate.id))
    
    const totalCandidates = viewMode === 'current' ? filteredCandidates.length : filteredHistoryCandidates.length
    if (candidatesToSelect.length < totalCandidates) {
      const skippedCount = totalCandidates - candidatesToSelect.length
      toast.info(`Selected ${candidatesToSelect.length} candidates needing feedback. ${skippedCount} candidates skipped (already reviewed or onboarded).`)
    } else {
      toast.success(`Selected ${candidatesToSelect.length} candidates for feedback.`)
    }
  } else {
    setSelectedCandidates([])
  }
}
  const moveToNextStage = async (candidateId: number, targetStageId: number) => {
    try {
      const candidate = filteredCandidates.find(c => c.id === candidateId);

      if (!candidate || !candidate.interview_id) {
        throw new Error(`No interview found for candidate ${candidateId}`);
      }

      // Only mark current interview as completed
      // The new interview for next stage will be created when scheduled
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
      return { success: true, data: result };
    } catch (error) {
      throw error;
    }
  };

  const scheduleInterviewsForNextStage = async (
    candidates: Candidate[],
    scheduleData: InterviewScheduleData
  ) => {
    if (!selectedInstitution || !nextStageForActive) {
      throw new Error('Missing institution or next stage data');
    }

    try {
      const interviewPromises = candidates.map(async (candidate, index) => {
        // Extract time from datetime-local input
        let interviewTime = "10:00:00" // Default fallback
        let interviewDate = scheduleData.interview_date

        if (scheduleData.interview_date) {
          try {
            const dateTime = new Date(scheduleData.interview_date)
            if (!isNaN(dateTime.getTime())) {
              // Extract time for the interview_time field
              const hours = dateTime.getHours().toString().padStart(2, '0')
              const minutes = dateTime.getMinutes().toString().padStart(2, '0')
              interviewTime = `${hours}:${minutes}:00`

              // Format date for the interview_date field (might need different format)
              interviewDate = dateTime.toISOString() // Full ISO format
            }
          } catch (error) {
            console.error('Error parsing interview date:', error)
          }
        }

        // Validate and clean all fields
        const location = (scheduleData.location || "").trim() || "To be determined"
        const interview_type = scheduleData.interview_type || "online"
        const createData = {
          job_position_application: candidate.id,
          interview_stage: parseInt(nextStageForActive.id),
          interview_date: interviewDate, // Full datetime
          location: location,
          interview_time: interviewTime, // Extracted time
          interview_type: interview_type,
          status: "scheduled",
          feedback: null,
          rating: null,
          created_by: createdBy, 
        };

        // Validation check
        const validation = {
          job_position_application: !!createData.job_position_application,
          interview_stage: !!createData.interview_stage,
          interview_date: !!createData.interview_date,
          interview_time: !!createData.interview_time && createData.interview_time !== "",
          location: !!createData.location && createData.location.trim() !== "",
          interview_type: ["online", "in_person"].includes(createData.interview_type),
          status: !!createData.status
        }

        const failed = Object.entries(validation).filter(([key, value]) => !value)
        if (failed.length > 0) {
          throw new Error(`Missing required fields: ${failed.map(([key]) => key).join(', ')}`)
        }

        try {
          const result = await createInterview({
            institutionId: selectedInstitution.id,
            interviewData: createData,
          });
          return result
        } catch (apiError) {
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
  };
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
        // Mark as completed if it's the final stage, otherwise keep current status
        status: isFinalStage ? 'completed' : selectedCandidate.interview?.status || 'scheduled'
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
            // Only mark current interview as completed
            const result = await moveToNextStage(candidate.id, parseInt(nextStageForActive!.id))
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
    if (candidatesEligibleForOnboarding.length === 0) {
      toast.error('No candidates eligible for onboarding. Candidates need feedback and rating first.')
      return
    }

    try {
      const eligibleIds = candidatesEligibleForOnboarding.map(c => c.id)
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

  const handleIndividualOnboard = async (candidate: Candidate) => {
    try {
      const result = await bulkCreateOnBoarding({ applicationIds: [candidate.id] })

      if (result) {
        const createdCount = result.summary?.created_count || result.created?.length || 0
        const skippedCount = result.summary?.skipped_count || result.skipped?.length || 0

        if (createdCount > 0) {
          await fetchData()
          return { success: true }
        } else if (skippedCount > 0) {
          return {
            success: false,
            alreadyOnboarded: true,
            message: 'Candidate is already onboarded'
          }
        } else {
          return {
            success: false,
            alreadyOnboarded: false,
            message: 'Failed to onboard candidate - unknown error'
          }
        }
      } else {
        return {
          success: false,
          alreadyOnboarded: false,
          message: 'Failed to onboard candidate - API returned no response'
        }
      }
    } catch (error) {
      return {
        success: false,
        alreadyOnboarded: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // UI Event Handlers
  const handleBack = () => {
    router.push('/job-adverts')
  }

  const openFeedbackDialog = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setIsFeedbackDialogOpen(true)
  }

  const openHistoryDialog = (candidate: CandidateWithHistory) => {
    setSelectedCandidateWithHistory(candidate)
    setIsHistoryDialogOpen(true)
  }

  const handleIndividualScheduleAndMove = () => {
    if (!selectedCandidate) return
    setCandidatesToSchedule([selectedCandidate])
    setIsFeedbackDialogOpen(false)
    setIsSchedulingDialogOpen(true)
  }

  const handleBulkScheduleAndMove = () => {
    if (candidatesEligibleForMoving.length === 0) {
      toast.error('No candidates eligible for moving. Candidates need feedback and rating first.')
      return
    }

    if (!nextStageForActive) {
      toast.error('No next stage available')
      return
    }

    const candidatesData = filteredCandidates.filter(c => candidatesEligibleForMoving.map(ec => ec.id).includes(c.id))
    setCandidatesToSchedule(candidatesData)
    setIsSchedulingDialogOpen(true)
  }

  // Loading and error states
  if (error) return <ErrorState message={error} />
  if (!jobPositionAdvert) return <ErrorState message="Job position advert not found." />

  // Calculate stats
  const totalApplicants = jobPositionAdvert.applications?.length || 0
  const totalCandidatesInPipeline = processedStages.reduce((sum, stage) => sum + stage.count, 0)
  const finalStageCount = processedStages[processedStages.length - 1]?.count || 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Openings
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Pipeline</h1>
            <p className="text-gray-600">
              {jobPositionAdvert.job_position_details?.name || 'Position'} - Complete interview management with history tracking
            </p>
          </div>
        </div>
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
                Create a new interview stage for {jobPositionAdvert.job_position_details?.name || 'this position'}.
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
                <div className="w-full max-w-full overflow-hidden">
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
                </div>
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
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">{totalApplicants}</p>
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
                <p className="text-sm font-medium text-gray-600">In Interview Pipeline</p>
                <p className="text-3xl font-bold text-gray-900">{totalCandidatesInPipeline}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Final Stage</p>
                <p className="text-3xl font-bold text-gray-900">{finalStageCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {processedStages.length === 0 ? (
        /* No stages state */
        <Card className="mt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No interview stages configured yet</p>
              <Button onClick={() => setIsCreateStageDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Interview Stage
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Main interface with tabs for current view and history view */
     <Tabs value={viewMode} onValueChange={(value) => {
          setViewMode(value as 'current' | 'history')
          setSelectedCandidates([])
          setSearchTerm('')
        }}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="current" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Current Stage View
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="current">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
              {/* Left Panel - Stages List */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Interview Stages ({processedStages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-1 max-h-[500px] overflow-y-auto">
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
                      {/* Search and Actions */}
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
        {/* Show warning if any selected candidates need feedback first */}
        {selectedCandidates.some(id => {
          const candidate = (viewMode === 'current' ? filteredCandidates : filteredHistoryCandidates).find(c => c.id === id)
          return candidate && !(candidate.feedback && candidate.rating && candidate.rating > 0)
        }) && (
          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
            Some candidates need feedback & rating first
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedCandidates([])}
        >
          Clear
        </Button>
        
        {/* Only show onboard button if there are eligible candidates */}
        {candidatesEligibleForOnboarding.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const eligibleIds = candidatesEligibleForOnboarding.map(c => c.id)
              setSelectedCandidates(eligibleIds)
              handleBulkOnboard()
            }}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
            title={`Onboard ${candidatesEligibleForOnboarding.length} eligible candidates`}
          >
            <Users className="h-4 w-4 mr-2" />
            Onboard ({candidatesEligibleForOnboarding.length})
          </Button>
        )}
        
        {/* Only show move button in current view if there are eligible candidates */}
        {viewMode === 'current' && nextStageForActive && candidatesEligibleForMoving.length > 0 && (
          <Button
            size="sm"
            onClick={() => {
              const eligibleIds = candidatesEligibleForMoving.map(c => c.id)
              setSelectedCandidates(eligibleIds)
              handleBulkScheduleAndMove()
            }}
            className="bg-green-600 hover:bg-green-700"
            title={`Move ${candidatesEligibleForMoving.length} candidates with feedback to ${nextStageForActive.name}`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Move to {nextStageForActive.name} ({candidatesEligibleForMoving.length})
          </Button>
        )}
        
        {/* Show message when no candidates are eligible for any actions */}
        {candidatesEligibleForOnboarding.length === 0 && candidatesEligibleForMoving.length === 0 && selectedCandidates.length > 0 && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
            Please first provide feedback & rating, then schedule interviews before onboarding
          </div>
        )}
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
                                ? "No candidates match your search."
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
                                    selectableCandidates.length > 0 &&
                                    selectedCandidates.length === selectableCandidates.length &&
                                    selectableCandidates.every(c => selectedCandidates.includes(c.id))
                                  }
                                  onCheckedChange={handleSelectAll}
                                  title={`Select ${selectableCandidates.length} candidates who need feedback`}
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
                                <TableRow key={candidate.id}>
                                 <TableCell>
                                          <Checkbox
                                            checked={selectedCandidates.includes(candidate.id)}
                                            onCheckedChange={(checked) => handleSelectCandidate(candidate.id, checked as boolean)}
                                            disabled={!canCandidateBeSelected(candidate)}
                                            title={
                                              canCandidateBeSelected(candidate)
                                                ? viewMode === 'current' ? "Select for feedback" : "Select for onboarding"
                                                : candidate.feedback && candidate.rating 
                                                  ? "Already has feedback and rating - use individual actions"
                                                  : isCandidateAlreadyOnboarded(candidate)
                                                    ? "Already onboarded"
                                                    : "Cannot be selected"
                                            }
                                            className={!canCandidateBeSelected(candidate) ? "opacity-50" : ""}
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

                                        {/* Only show onboard option if candidate has feedback and rating and isn't already onboarded */}
                                        {canCandidateBeOnboarded(candidate) && !isCandidateAlreadyOnboarded(candidate) && (
                                          <DropdownMenuItem
                                            onClick={async () => {
                                              try {
                                                const result = await handleIndividualOnboard(candidate);

                                                if (result.success) {
                                                  toast.success(`${candidate.applicant_name} onboarded successfully`);
                                                } else if (result.alreadyOnboarded) {
                                                  toast.warning(`${candidate.applicant_name} is already onboarded`);
                                                } else {
                                                  toast.error(`Failed to onboard ${candidate.applicant_name}: ${result.message}`);
                                                }
                                              } catch (error) {
                                                toast.error(`Unexpected error occurred while onboarding ${candidate.applicant_name}`);
                                              }
                                            }}
                                            className="text-purple-600"
                                          >
                                            <Users className="h-4 w-4 mr-2" />
                                            Onboard Candidate
                                          </DropdownMenuItem>
                                        )}

                                        {/* Show message if candidate is already onboarded */}
                                        {isCandidateAlreadyOnboarded(candidate) && (
                                          <DropdownMenuItem disabled className="text-gray-400">
                                            <UserCheck className="h-4 w-4 mr-2" />
                                            Already Onboarded
                                          </DropdownMenuItem>
                                        )}

                                        {/* Show message if candidate needs feedback first */}
                                        {!canCandidateBeOnboarded(candidate) && !isCandidateAlreadyOnboarded(candidate) && (
                                          <DropdownMenuItem disabled className="text-gray-400">
                                            <Clock className="h-4 w-4 mr-2" />
                                            Needs Feedback & Rating First
                                          </DropdownMenuItem>
                                        )}

                                        {/* Only show move options if candidate has feedback and rating */}
                                        {nextStageForActive && canCandidateBeMoved(candidate) && (
                                          <>
                                            <DropdownMenuItem
                                              onClick={async () => {
                                                setCandidatesToSchedule([candidate])
                                                setIsSchedulingDialogOpen(true)
                                              }}
                                              className="text-green-600"
                                            >
                                              <Calendar className="h-4 w-4 mr-2" />
                                              Schedule & Move to {nextStageForActive.name}
                                            </DropdownMenuItem>
                                          </>
                                        )}

                                        {/* Show message if candidate can't be moved yet */}
                                        {nextStageForActive && !canCandidateBeMoved(candidate) && (
                                          <DropdownMenuItem disabled className="text-gray-400">
                                            <Clock className="h-4 w-4 mr-2" />
                                            Provide Feedback & Rating to Move
                                          </DropdownMenuItem>
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
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Complete Interview History
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      View all candidates and their complete interview journey across all stages
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search all candidates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Bulk Actions for History View */}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkOnboard}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Onboard Selected
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Table */}
                <div className="border rounded-lg max-h-[600px] overflow-auto">
                  {filteredHistoryCandidates.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? "No candidates match your search."
                          : "No candidates have applied for this position yet."}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                          <Checkbox
                            checked={
                              filteredHistoryCandidates.filter(canCandidateBeSelected).length > 0 &&
                              selectedCandidates.length === filteredHistoryCandidates.filter(canCandidateBeSelected).length
                            }
                            onCheckedChange={handleSelectAll}
                            title="Select candidates who can be onboarded"
                          />
                        </TableHead>
                           <TableHead>Candidate</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Current Stage</TableHead>
                          <TableHead>Overall Rating</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistoryCandidates.map((candidate) => (
                          <TableRow key={candidate.id}>
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
                              <div className="text-center">
                                {candidate.current_stage_level > 0 ? (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                    {candidate.current_stage_name}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                                    Not Started
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                {candidate.overall_rating > 0 ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <span className="font-semibold">{candidate.overall_rating}/10</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${candidate.completion_rate}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{candidate.completion_rate}%</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {candidate.interview_history.length} stages completed
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openHistoryDialog(candidate)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <History className="h-4 w-4 mr-1" />
                                  View History
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        try {
                                          const result = await handleIndividualOnboard(candidate);

                                          if (result.success) {
                                            toast.success(`${candidate.applicant_name} onboarded successfully`);
                                          } else if (result.alreadyOnboarded) {
                                            toast.warning(`${candidate.applicant_name} is already onboarded`);
                                          } else {
                                            toast.error(`Failed to onboard ${candidate.applicant_name}: ${result.message}`);
                                          }
                                        } catch (error) {
                                          toast.error(`Unexpected error occurred while onboarding ${candidate.applicant_name}`);
                                        }
                                      }}
                                      className="text-purple-600"
                                    >
                                      <Users className="h-4 w-4 mr-2" />
                                      Onboard Candidate
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Progress Indicator (only show in current view) */}
    {processedStages.length > 0 && viewMode === 'current' && (
  <div className="mt-6"> {/* Added margin-top to push it down */}
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Progress</h3>
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

      <CandidateHistoryDialog
        candidate={selectedCandidateWithHistory}
        isOpen={isHistoryDialogOpen}
        onClose={() => {
          setIsHistoryDialogOpen(false)
          setSelectedCandidateWithHistory(null)
        }}
        stages={processedStages}
      />
    </div>
  )
}
