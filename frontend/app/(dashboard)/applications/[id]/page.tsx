"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
  RefreshCw,
  Clock,
  Globe,
  UserCheck,
  Eye,
} from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Check } from "lucide-react"
import { createInterviewStage } from "@/lib/utils"
import type { IInterviewStageFormData } from "@/app/types/types.utils"
import { EmployeeSearchableSelect } from "@/components/ui/employee-searchable-select"


import {  selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobApplicationById, updateJobApplicationStatus, getInterviewStages, fetchEmployees,
   createInterview} from "@/lib/utils"
import type { JobApplication, IInterviewStage, IEmployee, IInterviewFormData } from "@/app/types/types.utils"
import { toast } from "sonner"
import { downloadFile } from "@/lib/helpers"
import { selectUser } from "@/store/auth/selectors"

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  shortlisted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  passed: "bg-purple-100 text-purple-800",
}

const sourceLabels = {
  website: "Website",
  referral: "Referral",
  job_board: "Job Board",
  social_media: "Social Media",
  head_hunt: "Head Hunt",
  other: "Other",
}

export default function ApplicationViewPage() {
  const [showShortlistConfirm, setShowShortlistConfirm] = useState(false);
  // ...
  // Handler for shortlisting
  const handleShortlist = async () => {
    if (!application) return;
    try {
      const updateData: {
        applicationId: number;
        status: string;
        shortlisted_by?: number;
      } = {
        applicationId: application.id,
        status: "shortlisted"
      };

      // Add the current user as the one who shortlisted
      if (currentUser?.id) {
        updateData.shortlisted_by = currentUser.id;
      }

      await updateJobApplicationStatus(updateData);
      setApplication({ ...application, status: "shortlisted" });
      toast.success("Application shortlisted successfully");

      // Refresh the application data to get updated user details
      await fetchApplication();
    } catch (error) {
      toast.error("Failed to shortlist application");
    }
  }

  const [application, setApplication] = useState<JobApplication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const router = useRouter()
  const params = useParams()
  const applicationId = Number.parseInt(params?.id as string)
  const currentUser = useSelector(selectUser)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([])
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false)
  const [showCreateStageDialog, setShowCreateStageDialog] = useState(false)
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
  name: "",
  level: 1,
  interviewers: [],
  job_position_advert: 0,
})

const updateStageFormData = (field: string, value: any) => {
  setStageFormData((prev) => ({ ...prev, [field]: value }))
  if (stageErrors[field]) {
    setStageErrors((prev: any) => ({ ...prev, [field]: undefined }))
  }
}
const [stageErrors, setStageErrors] = useState<any>({})
  const [interviewFormData, setInterviewFormData] = useState({
    interview_stage: 0,
    interview_date: "",
    location: "",
    interview_type: "",
    status: "scheduled",
    feedback: "",
    rating: undefined,
  })
  const [interviewErrors, setInterviewErrors] = useState<any>({})

  const handleCreateInterviewStage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedInstitution || !application) {
      toast.error("Missing organization or application information")
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
      // Set the job position advert ID
      const stageDataWithJobAdvert = {
        ...stageFormData,
        job_position_advert: application.job_position_advert,
        level: interviewStages.length + 1, // Auto-assign next level
      }

      const newStage = await createInterviewStage({
        institutionId: selectedInstitution.id,
        stageData: stageDataWithJobAdvert,
      })

      if (newStage) {
        // Reset form
        setStageFormData({
          name: "",
          level: 1,
          interviewers: [],
          job_position_advert: application.job_position_advert,
        })
        setStageErrors({})
        setShowCreateStageDialog(false)

        // Refresh interview stages
        await fetchInterviewData()

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

  const handleIndividualAction = async (
    applicationId: number,
    action: "reviewed" | "rejected"
  ) => {
    try {
      // Prepare the update data with user tracking - just like created_by works
      const updateData: {
        applicationId: number;
        status: string;
        reviewed_by?: number;
        rejected_by?: number;
      } = {
        applicationId,
        status: action
      };

      // Add the appropriate user field based on the action - automatically populate like created_by
      if (action === "reviewed" && currentUser?.id) {
        updateData.reviewed_by = currentUser.id;
      } else if (action === "rejected" && currentUser?.id) {
        updateData.rejected_by = currentUser.id;
      }

      await updateJobApplicationStatus(updateData);
      setApplication(prev => prev ? { ...prev, status: action } : null);
      toast.success(`Application ${action} successfully`);

      await fetchApplication();


      // Refresh the application
    } catch (error) {
      toast.error(`Failed to ${action} application`);
    }
  }

const fetchInterviewData = async (app?: JobApplication) => {
  const applicationToUse = app || application
  if (!selectedInstitution || !applicationToUse) return

  try {
    const [stagesResponse, employeesResponse] = await Promise.all([
      getInterviewStages({ institutionId: selectedInstitution.id }),
      fetchEmployees({ institutionId: selectedInstitution.id })
    ])

    let stagesArray: IInterviewStage[] = []
    if (stagesResponse && "results" in stagesResponse && Array.isArray(stagesResponse.results)) {
      stagesArray = stagesResponse.results
    } else if (Array.isArray(stagesResponse)) {
      stagesArray = stagesResponse
    }

    // Filter stages for this job position
    const filteredStages = stagesArray.filter(
      stage => stage.job_position_advert === applicationToUse.job_position_advert
    )
    setInterviewStages(filteredStages)

    let employeesArray: IEmployee[] = []
    if (employeesResponse && "results" in employeesResponse && Array.isArray(employeesResponse.results)) {
      employeesArray = employeesResponse.results
    } else if (Array.isArray(employeesResponse)) {
      employeesArray = employeesResponse
    }
    setEmployees(employeesArray)

    // Set default interview date to tomorrow at 10 AM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    setInterviewFormData(prev => ({
      ...prev,
      interview_date: tomorrow.toISOString().slice(0, 16)
    }))
  } catch (error) {
    console.error("Error fetching interview data:", error)
    toast.error("Failed to load interview data")
  }
}
  const handleScheduleInterview = async () => {
    if (!application || !selectedInstitution) return

    // Validate form
    const errors: any = {}
    if (!interviewFormData.interview_stage || interviewFormData.interview_stage === 0) {
      errors.interview_stage = "Please select an interview stage"
    }
    if (!interviewFormData.interview_date) {
      errors.interview_date = "Interview date and time is required"
    } else {
      const interviewDate = new Date(interviewFormData.interview_date)
      const now = new Date()
      if (interviewDate <= now) {
        errors.interview_date = "Interview date must be in the future"
      }
    }
    if (!interviewFormData.location || interviewFormData.location.trim() === "") {
      errors.location = "Interview location is required"
    }

    if (Object.keys(errors).length > 0) {
      setInterviewErrors(errors)
      return
    }

    if (!currentUser?.id) {
      toast.error("User information not available. Please refresh and try again.")
      return
    }

    setIsSchedulingInterview(true)

    try {
      let interviewTime = ""
      if (interviewFormData.interview_date) {
        const dateTime = new Date(interviewFormData.interview_date)
        const hours = dateTime.getHours().toString().padStart(2, "0")
        const minutes = dateTime.getMinutes().toString().padStart(2, "0")
        interviewTime = `${hours}:${minutes}`
      }

      const createData: IInterviewFormData = {
        job_position_application: application.id,
        interview_stage: interviewFormData.interview_stage,
        interview_date: interviewFormData.interview_date,
        location: interviewFormData.location,
        interview_time: interviewTime,
        interview_type: interviewFormData.interview_type,
        status: interviewFormData.status || "scheduled",
        feedback: interviewFormData.feedback || undefined,
        rating: interviewFormData.rating || undefined,
        // Add the current user as the one who created/scheduled the interview
        created_by: currentUser.id,

      }

      const result = await createInterview({
        institutionId: selectedInstitution.id,
        interviewData: createData,
      })

      if (result) {
        toast.success("Interview scheduled successfully!")
        setShowScheduleDialog(false)
        // Reset form
        setInterviewFormData({
          interview_stage: 0,
          interview_date: "",
          location: "",
          interview_type: "",
          status: "scheduled",
          feedback: "",
          rating: undefined,
        })
        setInterviewErrors({})
      } else {
        toast.error("Failed to schedule interview")
      }
    } catch (error) {
      console.error("Error scheduling interview:", error)
      toast.error("Failed to schedule interview")
    } finally {
      setIsSchedulingInterview(false)
    }
  }

  const updateInterviewFormData = (field: string, value: any) => {
    setInterviewFormData(prev => ({ ...prev, [field]: value }))
    setInterviewErrors((prev: any) => ({ ...prev, [field]: undefined }))
  }

useEffect(() => {
  if (selectedInstitution?.id) {
    console.log("Interview stages:", getInterviewStages({ institutionId: selectedInstitution.id }));
  }
}, [selectedInstitution?.id]);


  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    if (!applicationId) {
      router.push("/applications")
      return
    }

    fetchApplication()
  }, [selectedBranch, selectedInstitution, router, applicationId])

  const fetchApplication = async () => {
    try {
      setIsLoading(true)
      setError("")

      const fetchedApplication = await getJobApplicationById({ applicationId })

      if (fetchedApplication) {
        setApplication(fetchedApplication)
        await fetchInterviewData(fetchedApplication)
      } else {
        setError("Application not found")
        toast.error("Application not found")
      }
    } catch (err) {
      setError("Failed to fetch application details")
      toast.error("Failed to load application details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/applications/${applicationId}/edit`)
  }

  const handleDelete = () => {
    // TODO: Implement delete functionality with confirmation
    toast.success("Application deletion would be implemented here")
  }

  const handleGoBack = () => {
    router.push("/applications")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "shortlisted":
        return <UserCheck className="h-5 w-5 text-blue-500" />
      case "reviewed":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "passed":
        return "default"
      case "shortlisted":
        return "secondary"
      case "reviewed":
        return "outline"
      case "rejected":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }



  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="w-full h-full p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Application Not Found</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <Button variant="outline" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
      </Button>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Application from {application.applicant_name}</h1>
            <p className="text-muted-foreground">
              {application.job_position_advert_job_details?.name || `Job Advert #${application.job_position_advert}`} •
              Applied {formatDate(application.application_date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchApplication}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(application.status)}
              <div>
                <p className="font-medium">Application Status</p>
                <Badge className="mt-1 bg-green-500 text-white">
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </Badge>

              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Source</p>
              <Badge variant="outline" className="mt-1">
                {sourceLabels[application.source]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="job-details">Job Details</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Applicant Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Applicant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg">{getInitials(application.applicant_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{application.applicant_name}</h3>
                      <p className="text-muted-foreground capitalize">{application.gender}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${application.applicant_email}`} className="hover:underline">
                            {application.applicant_email}
                          </a>
                        </div>
                        {application.applicant_phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${application.applicant_phone}`} className="hover:underline">
                              {application.applicant_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p className="text-sm mt-1">{application.address}</p>
                    </div>
                    {application.state && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">State</label>
                        <p className="text-sm mt-1">{application.state}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Country</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{application.country}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Application Date</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{formatDate(application.application_date)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Interviewers - MOVED TO CORRECT LOCATION */}
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Interviewers</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {interviewStages.length > 0 ? (
        <div className="space-y-3">
          {interviewStages
            .sort((a, b) => a.level - b.level)
            .filter(stage => stage.interviewers_details && stage.interviewers_details.length > 0)
            .map((stage) => (
              <div key={stage.id} className="p-3 border rounded-lg bg-muted/30">
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Level {stage.level}
                    </Badge>
                    <span className="font-medium text-sm">{stage.name}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {stage.interviewers_details?.map((interviewer) => (
                    <Badge 
                      key={interviewer.id} 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {interviewer.user?.fullname || interviewer.user?.email || `Employee ${interviewer.id}`}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No interviewers assigned</p>
        </div>
      )}
    </CardContent>
  </Card>
            </TabsContent>

            <TabsContent value="job-details" className="space-y-6">
              {/* Job Position/ Title  Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Job Position/ Title  Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Position Name</label>
                      <p className="text-sm mt-1 font-medium">
                        {application.job_position_advert_job_details?.name || "N/A"}
                      </p>
                    </div>
                    {/* <div>
                      <label className="text-sm font-medium text-muted-foreground">Department</label>
                      <p className="text-sm mt-1">
                        {application.job_position_advert_job_details. || "N/A"}
                      </p>
                    </div> */}
                    {/* <div>
                      <label className="text-sm font-medium text-muted-foreground">Job Advert ID</label>
                      <p className="text-sm mt-1">#{application.job_position_advert}</p>
                    </div> */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Available Positions</label>
                      <p className="text-sm mt-1">{application.positions || "N/A"}</p>
                    </div>
                  </div>

                  {application.job_position_advert_job_details?.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Job Description</label>
                      <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm leading-relaxed">
                          {application.job_position_advert_job_details.description}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              {/* Application Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Application Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {application.resume && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium">Resume</p>
                          <p className="text-sm text-muted-foreground">{application.resume.split("/").pop()}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => downloadFile(application.resume, "Resume")}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}

                  {application.cover_letter && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="font-medium">Cover Letter</p>
                          <p className="text-sm text-muted-foreground">{application.cover_letter.split("/").pop()}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(application.cover_letter!, "Cover Letter")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}

                  {!application.resume && !application.cover_letter && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No documents available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
         {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Application
              </Button>

              {/* Review Button - only show for new applications */}
              {application?.status === "new" && (
                <Button
                  className="w-full justify-start text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                  variant="outline"
                  onClick={() => handleIndividualAction(application.id, "reviewed")}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mark as Reviewed
                </Button>
              )}

              {/* Shortlist Button - only show for reviewed applications */}
              {application?.status === "reviewed" && (
                <Button
                  className="w-full justify-start text-green-600 border-green-200 hover:bg-green-50"
                  variant="outline"
                  onClick={() => setShowShortlistConfirm(true)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Shortlist
                </Button>
              )}

              {/* Schedule Interview Button - only show for shortlisted applications */}
              {application?.status === "shortlisted" && (
                <Button
                  className="w-full justify-start text-blue-600 border-blue-200 hover:bg-blue-50"
                  variant="outline"
                  onClick={() => {
                    fetchInterviewData()
                    setShowScheduleDialog(true)
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Interview
                </Button>
              )}

              {/* Schedule Call - show for reviewed and shortlisted */}
              {(application?.status === "reviewed" || application?.status === "shortlisted") && (
                <Button className="w-full justify-start" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Schedule Call
                </Button>
              )}

              <Separator />

              {/* Reject Button - show for new and reviewed (not shortlisted) */}
              {(application?.status === "new" || application?.status === "reviewed") && (
                <Button
                  className="justify-start text-destructive h-4 w-4 mr-2"
                  variant="outline"
                  onClick={() => handleIndividualAction(application.id, "rejected")}
                >
                  Reject Application
                </Button>
              )}

              <Button className="w-full justify-start text-destructive" variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Application
              </Button>
            </CardContent>
          </Card>
           {/* Application Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(application.status)}>
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                  {/* Show next step indicator */}
                  {application.status === "new" && (
                    <span className="text-xs text-muted-foreground">→ Needs Review</span>
                  )}
                  {application.status === "reviewed" && (
                    <span className="text-xs text-muted-foreground">→ Can Shortlist</span>
                  )}
                  {application.status === "shortlisted" && (
                    <span className="text-xs text-muted-foreground">→ Ready for Interview</span>
                  )}
                </div>
              </div>

              {/* Show who performed each action */}
              {application.reviewed_by && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reviewed by</span>
              <span className="text-sm font-medium">
                {application.reviewed_by.fullname || application.reviewed_by.email}
                {application.reviewed_by.id === currentUser?.id}
              </span>
            </div>
          )}

          {application.shortlisted_by && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Shortlisted by</span>
              <span className="text-sm font-medium">
                {application.shortlisted_by.fullname || application.shortlisted_by.email}
                {application.shortlisted_by.id === currentUser?.id}
              </span>
            </div>
          )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Source</span>
                <Badge variant="outline">{sourceLabels[application.source]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents</span>
                <span className="text-sm font-medium">
                  {[application.resume, application.cover_letter].filter(Boolean).length}
                </span>
              </div>

              {/* Application workflow progress */}
              <div className="pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">Application Flow</span>
                <div className="mt-2 flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${application.status !== "new" ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-xs">New</span>
                  <div className="w-4 h-px bg-gray-300" />
                  <div className={`w-3 h-3 rounded-full ${["reviewed", "shortlisted"].includes(application.status) ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-xs">Reviewed</span>
                  <div className="w-4 h-px bg-gray-300" />
                  <div className={`w-3 h-3 rounded-full ${application.status === "shortlisted" ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-xs">Shortlisted</span>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>
          <Dialog open={showShortlistConfirm} onOpenChange={setShowShortlistConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Shortlist Application</DialogTitle>
              <DialogDescription>
                Are you sure you want to shortlist the application from{" "}
                <strong>{application?.applicant_name}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowShortlistConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleShortlist();
                  setShowShortlistConfirm(false);
                }}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Shortlist
              </Button>
            </div>
          </DialogContent>

    </Dialog>

  


{/* Create Interview Stage Dialog */}
<Dialog open={showCreateStageDialog} onOpenChange={setShowCreateStageDialog}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Create Interview Stage</DialogTitle>
      <DialogDescription>
        Create a new interview stage for {application?.job_position_advert_job_details?.name || 'this position'}.
      </DialogDescription>
    </DialogHeader>

    <div onClick={(e) => e.stopPropagation()}>
      <form onSubmit={handleCreateInterviewStage} className="space-y-4">
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

          {/* Show selected interviewers as chips */}
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

          <p className="text-xs text-muted-foreground">
            Search and select multiple interviewers for this stage
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setShowCreateStageDialog(false)
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
      {/* Schedule Interview Dialog */}
<Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Schedule Interview</DialogTitle>
      <DialogDescription>
        Schedule an interview for {application?.applicant_name}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Interview Stage */}
      <div className="space-y-2">
  <Label htmlFor="interview_stage" className="text-sm font-medium">
    Interview Stage *
  </Label>
  <div className="flex items-center gap-2">
    <Select
      value={interviewFormData.interview_stage.toString()}
      onValueChange={(value) => updateInterviewFormData("interview_stage", Number(value))}
    >
      <SelectTrigger className={`flex-1 ${interviewErrors.interview_stage ? "border-destructive" : ""}`}>
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
        {interviewStages.length === 0 && (
          <SelectItem value="no-stages" disabled>
            No interview stages available for this position
          </SelectItem>
        )}
      </SelectContent>
    </Select>

    {/* Plus icon button to create new stage */}
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setShowCreateStageDialog(true)}
      className="flex-shrink-0"
      title="Create new interview stage"
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>

  {interviewErrors.interview_stage && (
    <p className="text-sm text-destructive">{interviewErrors.interview_stage}</p>
  )}

  {interviewStages.length === 0 && (
    <p className="text-xs text-muted-foreground">
      No interview stages available. Click the + button to create one.
    </p>
  )}
</div>


      {/* Interview Date */}
      <div className="space-y-2">
        <Label htmlFor="interview_date" className="text-sm font-medium">
          Interview Date & Time *
        </Label>
        <Input
          id="interview_date"
          type="datetime-local"
          value={interviewFormData.interview_date}
          onChange={(e) => updateInterviewFormData("interview_date", e.target.value)}
          className={interviewErrors.interview_date ? "border-destructive" : ""}
          min={new Date().toISOString().slice(0, 16)}
        />
        {interviewErrors.interview_date && (
          <p className="text-sm text-destructive">{interviewErrors.interview_date}</p>
        )}
      </div>

      {/* Interview Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-sm font-medium">
          Interview Location *
        </Label>
        <Input
          id="location"
          type="text"
          value={interviewFormData.location}
          onChange={(e) => updateInterviewFormData("location", e.target.value)}
          className={interviewErrors.location ? "border-destructive" : ""}
          placeholder="e.g., Conference Room A, or Zoom meeting"
        />
        {interviewErrors.location && (
          <p className="text-sm text-destructive">{interviewErrors.location}</p>
        )}
      </div>

      {/* Interview Type */}
      <div className="space-y-2">
        <Label htmlFor="interview_type" className="text-sm font-medium">
          Interview Type
        </Label>
        <Select
          value={interviewFormData.interview_type}
          onValueChange={(value) => updateInterviewFormData("interview_type", value)}
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

    <div className="flex justify-end space-x-2 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowScheduleDialog(false)}
        disabled={isSchedulingInterview}
      >
        Cancel
      </Button>
      <Button
        onClick={handleScheduleInterview}
        disabled={isSchedulingInterview}
      >
        {isSchedulingInterview ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Scheduling...
          </>
        ) : (
          <>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Interview
          </>
        )}
      </Button>
    </div>
  </DialogContent>
</Dialog>

    </div>
  )
}
