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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobApplicationById, updateJobApplicationStatus } from "@/lib/utils"
import type { JobApplication } from "@/app/types/types.utils"
import { toast } from "sonner"
import { downloadFile } from "@/lib/helpers"

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
  other: "Other",
}

export default function ApplicationViewPage() {
  const [showShortlistConfirm, setShowShortlistConfirm] = useState(false);
  // ...
  // Handler for shortlisting
  const handleShortlist = async () => {
    if (!application) return;
    try {
      await updateJobApplicationStatus({ applicationId: application.id, status: "shortlisted" });
      setApplication({ ...application, status: "shortlisted" });
      toast.success("Application shortlisted successfully");
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

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

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
                <Badge variant={getStatusBadgeVariant(application.status)} className="mt-1">
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
            </TabsContent>

            <TabsContent value="job-details" className="space-y-6">
              {/* Job Position Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Job Position Details
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
              {/* <Button className="w-full justify-start" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button> */}
              {application?.status !== "shortlisted" && (
                <Button className="w-full justify-start" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Schedule Call
                </Button>
              )}
              {application?.status !== "shortlisted" && (
                <>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setShowShortlistConfirm(true)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Shortlist
                  </Button>
                  <ConfirmationDialog
                    isOpen={showShortlistConfirm}
                    onClose={() => setShowShortlistConfirm(false)}
                    onConfirm={async () => {
                      setShowShortlistConfirm(false);
                      await handleShortlist();
                    }}
                    title="Shortlist Application"
                    description="Are you sure you want to shortlist this application? This action cannot be undone."
                    confirmText="Shortlist"
                    cancelText="Cancel"
                  />
                </>
              )}
              <Separator />
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
                <Badge variant={getStatusBadgeVariant(application.status)}>{application.status}</Badge>
              </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
