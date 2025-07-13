"use client"

import { useState, useEffect, use } from "react"
import type React from "react"
import { useSelector } from "react-redux"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, Phone, Code, MessageSquare, CheckCircle, Plus, Check, User, X, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { JobPositionAdvert, IInterviewStage, IInterviewStageFormData, IEmployee, IInterview } from "@/app/types/types.utils"
import { getJobPositionAdvertById, createInterviewStage, fetchEmployees, getInterviews } from "@/lib/utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { toast } from "sonner"
import { EmployeeSearchableSelect } from "@/components/ui/employee-searchable-select"

interface InterviewStagePageProps {
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
}

// Add this function to recalculate candidate counts properly
const recalculateStageCandidateCounts = (
  stages: IInterviewStage[],
  interviews: IInterview[]
): IInterviewStage[] => {
  // Create a map to track the latest stage for each candidate
  const candidateLatestStage = new Map<number, number>();

  // Find the latest/highest stage for each candidate based on interviews
  interviews.forEach((interview: IInterview) => {
    const candidateId = interview.job_position_application;
    const currentStage = interview.interview_stage;

    // Keep track of the highest stage this candidate has reached
    if (!candidateLatestStage.has(candidateId) ||
        candidateLatestStage.get(candidateId)! < currentStage) {
      candidateLatestStage.set(candidateId, currentStage);
    }
  });

  console.log('Candidate latest stages:', Array.from(candidateLatestStage.entries()));

  return stages.map((stage: IInterviewStage) => {
    // Get all candidates originally assigned to this stage
    const originalCandidates = (stage as any).candidates || [];

    // Count candidates currently in this stage
    let currentStageCandidates: any[] = [];

    // 1. Check original candidates who haven't moved to a later stage
    originalCandidates.forEach((candidate: any) => {
      const latestStage = candidateLatestStage.get(candidate.id);

      // If no interview recorded yet, or latest interview is for this stage
      if (!latestStage || latestStage === stage.id) {
        currentStageCandidates.push(candidate);
      }
    });

    // 2. Find candidates who have interviews in this stage and this is their current stage
    const candidatesInThisStage = interviews.filter((interview: IInterview) => {
      const candidateId = interview.job_position_application;
      const latestStage = candidateLatestStage.get(candidateId);

      // Only count if this stage is their latest/current stage
      return latestStage === stage.id;
    });

    // Create unique list of candidates in this stage
    const uniqueCandidateIds = new Set();

    // Add original candidates
    currentStageCandidates.forEach((candidate: any) => {
      uniqueCandidateIds.add(candidate.id);
    });

    // Add candidates from interviews
    candidatesInThisStage.forEach((interview: IInterview) => {
      uniqueCandidateIds.add(interview.job_position_application);
    });

    const totalCount = uniqueCandidateIds.size;

    console.log(`Stage ${stage.id} (${stage.name}):`, {
      originalCandidates: originalCandidates.length,
      candidatesFromInterviews: candidatesInThisStage.length,
      uniqueCount: totalCount,
      candidateIds: Array.from(uniqueCandidateIds)
    });

    return {
      ...stage,
      candidates_count: totalCount,
      candidates: currentStageCandidates
    };
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

// Loading component
const LoadingState = () => (
  <div className="p-6">
    <Card className="p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview stages...</p>
        </div>
      </div>
    </Card>
  </div>
)

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

const NoStagesState = ({ onAddStage }: { onAddStage: () => void }) => (
  <div className="p-6">
    <Card className="p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No interview stages configured yet</p>
          <Button onClick={onAddStage} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Add First Interview Stage
          </Button>
        </div>
      </div>
    </Card>
  </div>
)

const InterviewStagesContent = ({
  jobPositionAdvert,
  onStageCreated
}: {
  jobPositionAdvert: JobPositionAdvert;
  onStageCreated: () => void;
}) => {
  const router = useRouter()
  const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false)
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [interviews, setInterviews] = useState<IInterview[]>([]) // Add this state
  const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
    name: "",
    level: 1,
    interviewer: 0,
    job_position_advert: jobPositionAdvert.id,
  })
  const [stageErrors, setStageErrors] = useState<any>({})
  const selectedInstitution = useSelector(selectSelectedInstitution)

  // Add this useEffect to fetch interviews
  useEffect(() => {
    const fetchInterviews = async () => {
      if (selectedInstitution?.id) {
        try {
          const fetchedInterviews = await getInterviews({
            institutionId: selectedInstitution.id,
          });
          setInterviews(fetchedInterviews || []);
        } catch (error) {
          console.warn("Error fetching interviews:", error);
        }
      }
    };

    fetchInterviews();
  }, [selectedInstitution, jobPositionAdvert]); // Add jobPositionAdvert as dependency

  const handleBack = () => {
    router.push('/job-adverts')
  }

  const handleStageClick = (stage: ProcessedStage, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (stage.count > 0) {
      router.push(`/job-adverts/${jobPositionAdvert.id}/interview-stages/stage/${stage.id}/candidates`)
    } else {
      toast.info('No candidates in this stage yet')
    }
  }

  useEffect(() => {
    if (isCreateStageDialogOpen && selectedInstitution) {
      fetchEmployeesList()

      // Auto-fill the next level based on existing stages
      const existingStages = jobPositionAdvert.interview_stages as unknown as IInterviewStage[]
      if (existingStages && existingStages.length > 0) {
        const maxLevel = Math.max(...existingStages.map(stage => stage.level))
        const nextLevel = maxLevel + 1
        setStageFormData(prev => ({ ...prev, level: nextLevel }))
      } else {
        // If no stages exist, start with level 1
        setStageFormData(prev => ({ ...prev, level: 1 }))
      }
    }
  }, [isCreateStageDialogOpen, selectedInstitution, jobPositionAdvert.interview_stages])

  const fetchEmployeesList = async () => {
    if (!selectedInstitution) return

    try {
      const fetchedEmployees = await fetchEmployees({ institutionId: selectedInstitution.id })
      if (fetchedEmployees) {
        setEmployees(fetchedEmployees)
      }
    } catch (error) {
      console.warn("Error fetching employees:", error)
      toast.error("Failed to load employees")
    }
  }

  const updateStageFormData = (field: string, value: any) => {
    setStageFormData((prev) => ({ ...prev, [field]: value }))
    if (stageErrors[field]) {
      setStageErrors((prev: any) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedInstitution) {
      toast.error("Missing organization information")
      return
    }

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
        // Reset stage form
        setStageFormData({
          name: "",
          level: 1,
          interviewer: 0,
          job_position_advert: jobPositionAdvert.id
        })
        setStageErrors({})
        setIsCreateStageDialogOpen(false)

        toast.success("Interview stage created successfully!")
        onStageCreated() // Refresh the parent data
      } else {
        toast.error("Failed to create interview stage")
      }
    } catch (error) {
      console.warn("Error creating interview stage:", error)
      toast.error("Failed to create interview stage")
    } finally {
      setIsCreatingStage(false)
    }
  }

  if (!jobPositionAdvert.interview_stages || !Array.isArray(jobPositionAdvert.interview_stages) || jobPositionAdvert.interview_stages.length === 0) {
    return (
      <>
        <div className="p-6">
          {/* Back button at the top */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Job Adverts
            </Button>
          </div>
          <NoStagesState onAddStage={() => setIsCreateStageDialogOpen(true)} />
        </div>

        {/* Shared dialog for both empty and populated states */}
        <Dialog open={isCreateStageDialogOpen} onOpenChange={setIsCreateStageDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Interview Stage</DialogTitle>
              <DialogDescription>
                Create a new interview stage for {jobPositionAdvert.job_position_details?.name || 'this position'}.
              </DialogDescription>
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
                    disabled
                  />
                  {stageErrors.level && <p className="text-sm text-destructive">{stageErrors.level}</p>}
                  <p className="text-xs text-muted-foreground">
                    Auto-assigned based on existing stages (Level {stageFormData.level})
                  </p>
                </div>

               <div className="space-y-2">
                <Label htmlFor="stage_interviewer">Interviewer *</Label>
                <EmployeeSearchableSelect
                  employees={employees as any}
                  value={stageFormData.interviewer === 0 ? undefined : stageFormData.interviewer.toString()}
                  onValueChange={(value) => updateStageFormData("interviewer", Number(value))}
                  disabled={isCreatingStage}
                  placeholder="Search and select interviewer"
                  showEmployeeId={false}
                  showDepartment={false}
                />
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
      </>
    )
  }

  const interviewStages = jobPositionAdvert.interview_stages as unknown as IInterviewStage[]

  // Add debugging
  console.log('Raw interview stages:', interviewStages.map(s => ({ id: s.id, name: s.name, original_count: s.candidates_count })));
  console.log('All interviews:', interviews);

  // Recalculate candidate counts with proper logic
  const stagesWithCorrectCounts = recalculateStageCandidateCounts(interviewStages, interviews);

  console.log('Recalculated stages:', stagesWithCorrectCounts.map(s => ({ id: s.id, name: s.name, new_count: s.candidates_count })));

  const processedStages: ProcessedStage[] = stagesWithCorrectCounts
    .sort((a, b) => a.level - b.level) // Sort by level
    .map((stage, index) => {
      const colors = getStageColors(index)

      return {
        id: stage.id.toString(),
        name: stage.name,
        count: stage.candidates_count || 0, // Now using the recalculated count
        level: stage.level,
        interviewer: stage.interviewer_details?.user?.fullname || 'Not assigned',
        icon: getStageIcon(stage.name, index),
        ...colors
      }
    })

  const totalApplicants = jobPositionAdvert.applications?.length || 0
  const totalStages = processedStages.length
  const totalCandidatesInPipeline = processedStages.reduce((sum, stage) => sum + stage.count, 0)
  const finalStageCount = processedStages[processedStages.length - 1]?.count || 0

  return (
    <div className="p-6">
      {/* Back button at the top */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Job Adverts
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Pipeline</h1>
            <p className="text-gray-600">
              Overview of candidates for {jobPositionAdvert.job_position_details?.name || 'Position'}
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div></div>
            <Dialog open={isCreateStageDialogOpen} onOpenChange={setIsCreateStageDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4" />
                  Add Interview Stage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Interview Stage</DialogTitle>
                  <DialogDescription>
                    Create a new interview stage for {jobPositionAdvert.job_position_details?.name || 'this position'}.
                  </DialogDescription>
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
                        disabled
                      />
                      {stageErrors.level && <p className="text-sm text-destructive">{stageErrors.level}</p>}
                      <p className="text-xs text-muted-foreground">
                        Auto-assigned based on existing stages (Level {stageFormData.level})
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stage_interviewer">Interviewer *</Label>
                      <EmployeeSearchableSelect
                        employees={employees as any }
                        value={stageFormData.interviewer === 0 ? undefined : stageFormData.interviewer.toString()}
                        onValueChange={(value) => updateStageFormData("interviewer", Number(value))}
                        disabled={isCreatingStage}
                        placeholder="Search and select interviewer"
                        showEmployeeId={false}
                        showDepartment={false}
                      />
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

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

          {/* Interview Stages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedStages.map((stage) => (
              <Card
                key={stage.id}
                className={`transition-all duration-200 ${
                  stage.count > 0
                    ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer border-l-4 border-l-blue-500'
                    : 'hover:shadow-md cursor-default opacity-75'
                }`}
                onClick={(e) => handleStageClick(stage, e)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${stage.bgColor}`}>
                        <div className={stage.color}>{stage.icon}</div>
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{stage.name}</CardTitle>
                        <p className="text-sm text-gray-500">Level {stage.level}</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-lg font-bold px-3 py-1 ${
                        stage.count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {stage.count}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 ml-11">
                    Interviewer: {stage.interviewer}
                  </div>
                  {stage.count > 0 ? (
                    <div className="text-xs text-blue-600 ml-11 mt-1 flex items-center gap-1">
                      <span>Click to view candidates</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 ml-11 mt-1">
                      No candidates at this stage
                    </div>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Progress Indicator */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Progress</h3>
            <div className="flex items-center space-x-2 overflow-x-auto">
              {processedStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center flex-shrink-0">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    stage.count > 0
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-gray-50 text-gray-400'
                  }`}>
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
                    <span className="text-xs text-gray-600 font-medium truncate block">{stage.name}</span>
                  </div>
                  {index < processedStages.length - 1 && (
                    <div className="w-8 mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Debug info - remove this after testing */}
            <div className="mt-4 text-xs text-gray-500">
              <p>Total in pipeline: {totalCandidatesInPipeline}</p>
              <p>Stage counts: {processedStages.map(s => `${s.name}: ${s.count}`).join(', ')}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Main Page Component
export default function InterviewStagesPage({ params }: InterviewStagePageProps) {
  const resolvedParams = use(params)
  const [jobPositionAdvert, setJobPositionAdvert] = useState<JobPositionAdvert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobPositionAdvert = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Fetching job position advert with ID:', resolvedParams.id)

      const data = await getJobPositionAdvertById({ advertId: parseInt(resolvedParams.id) })

      console.log('Received data:', data)

      if (!data) {
        throw new Error('No data returned from API')
      }

      setJobPositionAdvert(data as JobPositionAdvert)
    } catch (err) {
      console.warn('Error fetching job position advert:', err)
      setError(`Failed to load interview stages: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (resolvedParams.id) {
      fetchJobPositionAdvert()
    }
  }, [resolvedParams.id])

  const handleStageCreated = () => {
    // Refresh the data when a new stage is created
    fetchJobPositionAdvert()
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  if (!jobPositionAdvert) {
    return <ErrorState message="Job position advert not found." />
  }

  return <InterviewStagesContent jobPositionAdvert={jobPositionAdvert} onStageCreated={handleStageCreated} />
}
