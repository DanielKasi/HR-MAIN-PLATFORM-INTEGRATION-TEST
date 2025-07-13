"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Upload,
  FileText,
  AlertCircle,
  MoreVertical,
  Edit,
  Eye,
  X,
  Users,
  Check,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  createJobApplication,
  getJobApplications,
  getJobPositionAdverts,
  updateJobApplicationStatus,
} from "@/lib/utils"
import type { JobApplication, JobApplicationFormData, JobPositionAdvert } from "@/app/types/types.utils"
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([])
  const [selectedApplications, setSelectedApplications] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isBulkShortlisting, setIsBulkShortlisting] = useState(false)
  const [individualLoadingStates, setIndividualLoadingStates] = useState<Record<number, boolean>>({})

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  // Form state
  const [formData, setFormData] = useState<
    Omit<JobApplicationFormData, "resume"> & { resume: File | null; cover_letter?: File }
  >({
    job_position_advert: 0,
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    resume: null,
    status: "new",
    gender: "male",
    state: "",
    address: "",
    country: "",
    source: "website",
  })

  const [jobPositionAdverts, setJobPositionAdverts] = useState<JobPositionAdvert[]>([])
  const [isLoadingAdverts, setIsLoadingAdverts] = useState(false)

  // Check if institution is selected and redirect if not
  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    loadApplications()
    loadJobPositionAdverts()
  }, [selectedInstitution, selectedBranch, router])

  useEffect(() => {
    let filtered = applications
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (app.applicant_phone && app.applicant_phone.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter)
    }
    setFilteredApplications(filtered)
  }, [applications, searchTerm, statusFilter])

  const loadApplications = async () => {
    if (!selectedInstitution) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await getJobApplications({ institutionId: selectedInstitution.id })
      console.log("Apps", data)
      if (data) {
        setApplications(data)
      } else {
        setError("Failed to load applications")
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while loading applications")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadJobPositionAdverts = async () => {
    if (!selectedInstitution) return

    setIsLoadingAdverts(true)
    try {
      const data = await getJobPositionAdverts({ institutionId: selectedInstitution.id })
      console.log("Adverts", data)
      if (data) {
        setJobPositionAdverts(data)
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load job position adverts")
      console.error("Failed to load job position adverts:", err)
    } finally {
      setIsLoadingAdverts(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number | File | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFileChange = (field: "resume" | "cover_letter", file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }))
  }

  const handleViewApplication = (applicationId: number) => {
    router.push(`/applications/${applicationId}`)
  }

  const handleEditApplication = (applicationId: number) => {
    router.push(`/applications/${applicationId}/edit`)
  }

  const resetFiltersAndShowNewApplication = () => {
    setStatusFilter("all")
    setSearchTerm("")
    setSelectedApplications([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution || !selectedBranch) {
      setError("Missing organization or branch information")
      return
    }

    if (!formData.resume) {
      setError("Resume is required")
      return
    }

    if (formData.job_position_advert === 0) {
      setError("Please select a job position")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const applicationData: JobApplicationFormData = {
        ...formData,
        resume: formData.resume,
        cover_letter: formData.cover_letter || undefined,
        applicant_phone: formData.applicant_phone || undefined,
        state: formData.state || undefined,
        application_date: new Date().toISOString(),
        address: formData.address || "",
        country: formData.country || "",
      }

      const newApplication = await createJobApplication({
        institutionId: selectedInstitution.id,
        applicationData,
      })

      if (newApplication) {
        setApplications((prev) => [newApplication, ...prev])
        setIsCreateDialogOpen(false)
        resetFiltersAndShowNewApplication()
        // Reset form
        setFormData({
          job_position_advert: 0,
          applicant_name: "",
          applicant_email: "",
          applicant_phone: "",
          resume: null,
          cover_letter: undefined,
          status: "new",
          gender: "male",
          state: "",
          address: "",
          country: "",
          source: "website",
        })
      } else {
        setError("Failed to create application - API returned null")
      }
    } catch (err: any) {
      console.error("Full error object:", err)
      console.error("Error response:", err?.response?.data)
      console.error("Error status:", err?.response?.status)

      // More detailed error message
      let errorMessage = "An error occurred while creating the application"
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err?.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
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

  const handleBulkAction = async (action: "shortlisted" | "reviewed") => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications first")
      return
    }

    if (action === "shortlisted") {
      setIsBulkShortlisting(true)
    }

    try {
      const promises = selectedApplications.map((applicationId) =>
        updateJobApplicationStatus({ applicationId, status: action }),
      )
      await Promise.all(promises)
      setApplications((prev) =>
        prev.map((app) => (selectedApplications.includes(app.id) ? { ...app, status: action } : app)),
      )
      setSelectedApplications([])
      toast.success(`${selectedApplications.length} applications updated to ${action}`)
    } catch (error) {
      toast.error("Failed to update applications")
    } finally {
      if (action === "shortlisted") {
        setIsBulkShortlisting(false)
      }
    }
  }

  const handleIndividualAction = async (
    applicationId: number,
    action: "new" | "reviewed" | "shortlisted" | "rejected" | "passed",
  ) => {
    if (action === "shortlisted") {
      setIndividualLoadingStates((prev) => ({ ...prev, [applicationId]: true }))
    }

    try {
      await updateJobApplicationStatus({ applicationId, status: action })
      setApplications((prev) => prev.map((app) => (app.id === applicationId ? { ...app, status: action } : app)))
      toast.success(`Application ${action} successfully`)
    } catch (error) {
      toast.error(`Failed to ${action} application`)
    } finally {
      if (action === "shortlisted") {
        setIndividualLoadingStates((prev) => ({ ...prev, [applicationId]: false }))
      }
    }
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

  // Show loading if institution/branch not selected
  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="w-full py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Applications</h1>
          <p className="text-muted-foreground">
            Manage and track all job applications for {selectedBranch.branch_name} -{" "}
            {selectedInstitution.institution_name}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Application</DialogTitle>
              <DialogDescription>Fill in the details to create a new job application.</DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_position_advert">Job Position *</Label>
                  <Select
                    value={formData.job_position_advert.toString()}
                    onValueChange={(value) => handleInputChange("job_position_advert", Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAdverts ? "Loading job adverts..." : "Select a job advert"} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobPositionAdverts
                        .filter((advert) => advert.status === "active") // Only show active adverts
                        .map((advert) => (
                          <SelectItem key={advert.id} value={advert.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {advert.job_position_details?.name || `Job Advert #${advert.id}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicant_name">Applicant Name *</Label>
                  <Input
                    id="applicant_name"
                    value={formData.applicant_name}
                    onChange={(e) => handleInputChange("applicant_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicant_email">Email *</Label>
                  <Input
                    id="applicant_email"
                    type="email"
                    value={formData.applicant_email}
                    onChange={(e) => handleInputChange("applicant_email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicant_phone">Phone</Label>
                  <Input
                    id="applicant_phone"
                    value={formData.applicant_phone}
                    onChange={(e) => handleInputChange("applicant_phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select value={formData.source} onValueChange={(value) => handleInputChange("source", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="job_board">Job Board</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume">Resume *</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange("resume", e.target.files?.[0] || null)}
                    required
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {formData.resume && (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <FileText className="mr-1 h-3 w-3" />
                    {formData.resume.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_letter">Cover Letter</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="cover_letter"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange("cover_letter", e.target.files?.[0] || null)}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {formData.cover_letter && (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <FileText className="mr-1 h-3 w-3" />
                    {formData.cover_letter.name}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Application"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
                  disabled={isBulkShortlisting}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  {isBulkShortlisting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2" />
                      Shortlisting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Shortlist
                    </>
                  )}
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

      {error && !isCreateDialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Applications ({filteredApplications.length})
          </CardTitle>
          <CardDescription>All job applications submitted to your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No applications match your current filters."
                  : "No applications have been submitted yet."}
              </p>
              {applications.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredApplications.length > 0 && selectedApplications.length === filteredApplications.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Job Position</TableHead>
                    <TableHead>Posted Date</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        {application.status !== "shortlisted" ? (
                          <Checkbox
                            checked={selectedApplications.includes(application.id)}
                            onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                          />
                        ) : (
                          <div className="w-4 h-4" /> // Empty space to maintain table alignment
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{application.applicant_name}</div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="mr-1 h-3 w-3" />
                            {application.gender}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {application.job_position_advert_job_details?.name ||
                              `Advert #${application.job_position_advert}`}
                          </div>
                          <div className="text-xs text-muted-foreground">{application.positions} positions</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(application.job_position_advert_job_details.job_posted_date)}
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
                        <div className="space-y-1">
                          <Button variant="link" size="sm" className="h-auto p-0" asChild>
                            <a
                              href={`${process.env.NEXT_PUBLIC_URL || "http://127.0.0.1:8000"}${application.resume}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Resume
                            </a>
                          </Button>
                          {application.cover_letter && (
                            <Button variant="link" size="sm" className="h-auto p-0" asChild>
                              <a
                                href={`${process.env.NEXT_PUBLIC_URL || "http://127.0.0.1:8000"}${application.cover_letter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Cover Letter
                              </a>
                            </Button>
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
                          <DropdownMenuContent
                            align="end"
                            className="!bg-white shadow-md shadow-black/20 rounded-md border border-black/20"
                          >
                            <DropdownMenuItem onClick={() => handleViewApplication(application.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditApplication(application.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Application
                            </DropdownMenuItem>
                            {application.status !== "shortlisted" && application.status !== "rejected" && (
                              <DropdownMenuItem
                                onClick={() => handleIndividualAction(application.id, "shortlisted")}
                                disabled={individualLoadingStates[application.id]}
                              >
                                {individualLoadingStates[application.id] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2" />
                                    Shortlisting...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Shortlist
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {application.status !== "rejected" && (
                              <DropdownMenuItem onClick={() => handleIndividualAction(application.id, "rejected")}>
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            )}
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
    </div>
  )
}
