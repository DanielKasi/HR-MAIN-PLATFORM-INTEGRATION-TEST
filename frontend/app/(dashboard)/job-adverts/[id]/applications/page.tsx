"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Eye,
  Edit,
  X,
  Check,
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositionAdvertById, updateJobApplicationStatus } from "@/lib/utils"
import type { JobApplication, JobPositionAdvert } from "@/app/types/types.utils"
import { toast } from "sonner"
import { downloadFile } from "@/lib/helpers"

const statusColors = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  reviewed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  shortlisted: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  passed: "bg-purple-100 text-purple-800 border-purple-200",
}

const sourceLabels = {
  website: "Website",
  referral: "Referral",
  job_board: "Job Board",
  social_media: "Social Media",
  other: "Other",
}

export default function JobAdvertApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobAdvert, setJobAdvert] = useState<JobPositionAdvert | null>(null)
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([])
  const [selectedApplications, setSelectedApplications] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState("")

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
      toast.error("Invalid job advert ID")
      router.push("/job-adverts")
      return
    }

    fetchData()
  }, [selectedInstitution, selectedBranch, jobAdvertId, router])

  useEffect(() => {
    filterApplications()
  }, [applications, searchTerm, statusFilter])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError("")

      const fetchedJobAdvert = await getJobPositionAdvertById({ advertId: jobAdvertId });


      if (!fetchedJobAdvert) {
        setError("Job advert not found")
        toast.error("Job advert not found");
        return}
        setApplications(fetchedJobAdvert.applications)
        setJobAdvert(fetchedJobAdvert) 
    } catch (err) {
      setError("Failed to fetch applications")
      toast.error("Failed to load applications")
    } finally {
      setIsLoading(false)
    }
  }

  const filterApplications = () => {
    let filtered = applications

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.applicant_phone?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }

  const handleSelectApplication = (applicationId: number, checked: boolean) => {
    if (checked) {
      setSelectedApplications((prev) => [...prev, applicationId])
    } else {
      setSelectedApplications((prev) => prev.filter((id) => id !== applicationId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(filteredApplications.map((app) => app.id))
    } else {
      setSelectedApplications([])
    }
  }

  const handleBulkAction = async (action: "shortlisted"|"reviewed") => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications first")
      return
    }

    try {
      const promises = selectedApplications.map((applicationId) =>
        updateJobApplicationStatus({ applicationId, status: action }),
      )

      await Promise.all(promises)

      // Update local state
      setApplications((prev) =>
        prev.map((app) => (selectedApplications.includes(app.id) ? { ...app, status: action as any } : app)),
      )

      setSelectedApplications([])
      toast.success(`${selectedApplications.length} applications updated to ${action}`)
    } catch (error) {
      toast.error("Failed to update applications")
    }
  }

  const handleIndividualAction = async (applicationId: number, action: string) => {
    try {
      await updateJobApplicationStatus({ applicationId, status: action })

      // Update local state
      setApplications((prev) => prev.map((app) => (app.id === applicationId ? { ...app, status: action as any } : app)))

      toast.success(`Application ${action} successfully`)
    } catch (error) {
      toast.error(`Failed to ${action} application`)
    }
  }

  const handleViewApplication = (applicationId: number) => {
    router.push(`/applications/${applicationId}`)
  }

  const handleEditApplication = (applicationId: number) => {
    router.push(`/applications/${applicationId}/edit`)
  }

  const handleBack = () => {
    router.push(`/job-adverts/${jobAdvertId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
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
  }

  if (error) {
    return (
      <div className="w-full h-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Advert
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full space-y-6">
        {/* Header */}
      <div className="space-y-4">
            {/* Back button on top */}
            <div>
              <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Job Advert
              </Button>
            </div>
            
            {/* Header content below */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Applications</h1>
                <p className="text-muted-foreground">
                  {jobAdvert?.job_position_details?.name || `Job Advert #${jobAdvertId}`} • {applications.length} total
                  applications
                </p>
              </div>
            </div>
          </div>

        {/* Filters and Search */}
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedApplications.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {selectedApplications.length} application(s) selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("shortlisted")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Shortlist
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("reviewed")}
                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedApplications([])}
                    className="text-gray-600"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Applications ({filteredApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "No applications match your current filters."
                    : "No applications have been submitted for this job advert yet."}
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
                            filteredApplications.length > 0 &&
                            selectedApplications.length === filteredApplications.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedApplications.includes(application.id)}
                            onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Button
                              variant="link"
                              className="h-auto p-0 font-medium text-left justify-start"
                              onClick={() => handleViewApplication(application.id)}
                            >
                              {application.applicant_name}
                            </Button>
                            <div className="text-xs text-muted-foreground capitalize">{application.gender}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Mail className="mr-1 h-3 w-3" />
                              {application.applicant_email}
                            </div>
                            {application.applicant_phone && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="mr-1 h-3 w-3" />
                                {application.applicant_phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <MapPin className="mr-1 h-3 w-3" />
                              {application.country}
                            </div>
                            {application.state && (
                              <div className="text-sm text-muted-foreground">{application.state}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[application.status]}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{sourceLabels[application.source]}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-1 h-3 w-3" />
                            {formatDate(application.application_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => downloadFile(application.resume, "Resume")}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Resume
                            </Button>
                            {application.cover_letter && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => downloadFile(application.cover_letter!, "Cover Letter")}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Cover Letter
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {application.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIndividualAction(application.id, "rejected")}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewApplication(application.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditApplication(application.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Application
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
