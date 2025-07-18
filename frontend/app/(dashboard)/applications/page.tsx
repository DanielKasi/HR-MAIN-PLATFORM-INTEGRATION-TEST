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
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  createJobApplication,
  getJobApplications,
  getJobPositionAdverts,
  updateJobApplicationStatus,
} from "@/lib/utils"
import type { JobApplication, JobApplicationFormData, JobPositionAdvert, PaginatedResponse } from "@/app/types/types.utils"
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { LocationAutocomplete } from "@/components/location-autocomplete"

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
  const [jobFilter, setJobFilter] = useState<string>("all")
  const [isBulkShortlisting, setIsBulkShortlisting] = useState(false)
  const [individualLoadingStates, setIndividualLoadingStates] = useState<Record<number, boolean>>({})
  
  const [sortField, setSortField] = useState<'application_date' | 'posted_date' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean
    applicationId: number | null
    applicantName: string
    action: 'shortlisted' | 'rejected' | null
  }>({
    isOpen: false,
    applicationId: null,
    applicantName: '',
    action: null
  })

  const [confirmBulkAction, setConfirmBulkAction] = useState<{
    isOpen: boolean
    action: 'shortlisted' | 'reviewed' | 'rejected' | null
    count: number
  }>({
    isOpen: false,
    action: null,
    count: 0
  })

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  const [formData, setFormData] = useState<
    Omit<JobApplicationFormData, "resume"> & { 
      resume: File | null
      cover_letter?: File
      address_latitude?: string
      address_longitude?: string
    }
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
    address_latitude: "",
    address_longitude: "",
    country: "",
    source: "website",
    application_date: new Date().toISOString().split('T')[0],
  })

  const [jobPositionAdverts, setJobPositionAdverts] = useState<JobPositionAdvert[]>([])
  const [isLoadingAdverts, setIsLoadingAdverts] = useState(false)

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
    
    if (jobFilter !== "all") {
      filtered = filtered.filter((app) => app.job_position_advert.toString() === jobFilter)
    }
    
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string, bValue: string
        
        if (sortField === 'application_date') {
          aValue = a.application_date
          bValue = b.application_date
        } else { 
          aValue = a.job_position_advert_job_details?.job_posted_date || ''
          bValue = b.job_position_advert_job_details?.job_posted_date || ''
        }
        
        const comparison = new Date(aValue).getTime() - new Date(bValue).getTime()
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }
    
    setFilteredApplications(filtered)
    setCurrentPage(1)
  }, [applications, searchTerm, statusFilter, jobFilter, sortField, sortDirection])

  const loadApplications = async () => {
    if (!selectedInstitution) return

    setIsLoading(true)
    setError(null)

    try {
      console.log("Loading applications for institution:", selectedInstitution.id)
      const response = await getJobApplications({ institutionId: selectedInstitution.id })
      console.log("Applications response:", response)
      console.log("Response type:", typeof response)
      
      // Handle paginated response
      let applicationsArray: JobApplication[] = []
      
      if (response && 'results' in response && Array.isArray(response.results)) {
        console.log("Setting applications from paginated response:", response.results)
        applicationsArray = response.results
      } else if (Array.isArray(response)) {
        console.log("Setting applications from direct array:", response)
        applicationsArray = response
      } else if (response === null) {
        console.log("Response is null - API call failed")
        applicationsArray = []
        setError("Failed to load applications")
      } else {
        console.log("Unexpected response structure:", response)
        applicationsArray = []
        setError("Failed to load applications - unexpected response format")
      }
      
      console.log("Final applications array:", applicationsArray)
      setApplications(applicationsArray)
    } catch (err: any) {
      console.error("Error loading applications:", err)
      setApplications([]) // Ensure it's always an array
      setError(err?.message || "Failed to load applications")
    } finally {
      setIsLoading(false)
    }
  }

  const loadJobPositionAdverts = async () => {
    if (!selectedInstitution) return

    setIsLoadingAdverts(true)
    try {
      console.log("Loading job position adverts for institution:", selectedInstitution.id)
      const response = await getJobPositionAdverts({ institutionId: selectedInstitution.id })
      console.log("Job adverts response:", response)
      
      // Handle paginated response
      let advertsArray: JobPositionAdvert[] = []
      
      if (response && 'results' in response && Array.isArray(response.results)) {
        advertsArray = response.results
      } else if (Array.isArray(response)) {
        advertsArray = response
      } else {
        advertsArray = []
      }
      
      setJobPositionAdverts(advertsArray)
    } catch (err: any) {
      console.error("Error loading job adverts:", err)
      setJobPositionAdverts([]) // Ensure it's always an array
      setError(err?.message || "Failed to load job position adverts")
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

  const handleAddressCoordinatesChange = (lat: string, lon: string) => {
    setFormData((prev) => ({
      ...prev,
      address_latitude: lat,
      address_longitude: lon,
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
        application_date: formData.application_date,
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
          address_latitude: "",
          address_longitude: "",
          country: "",
          source: "website",
          application_date: new Date().toISOString().split('T')[0],
        })
      } else {
        setError("Failed to create application - API returned null")
      }
    } catch (err: any) {
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
      setSelectedApplications(safeFilteredApplications.map((app) => app.id))
    } else {
      setSelectedApplications([])
    }
  }

  const handleBulkAction = async (action: "shortlisted" | "reviewed" | "rejected") => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications first")
      return
    }

    // Show confirmation for shortlist and reject actions
    if (action === "shortlisted" || action === "rejected") {
      setConfirmBulkAction({
        isOpen: true,
        action,
        count: selectedApplications.length
      })
      return
    }

    // Execute directly for "reviewed" action (no confirmation needed)
    await executeBulkAction(action)
  }

  const executeBulkAction = async (action: "shortlisted" | "reviewed" | "rejected") => {
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

  const handleConfirmBulkAction = async () => {
    if (confirmBulkAction.action) {
      await executeBulkAction(confirmBulkAction.action)
      setConfirmBulkAction({
        isOpen: false,
        action: null,
        count: 0
      })
    }
  }

  const handleSort = (field: 'application_date' | 'posted_date') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Ensure filteredApplications is always an array before using slice
  const safeFilteredApplications = Array.isArray(filteredApplications) ? filteredApplications : []
  const totalPages = Math.ceil(safeFilteredApplications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentApplications = safeFilteredApplications.slice(startIndex, endIndex)

  const handleIndividualAction = async (
    applicationId: number,
    action: "new" | "reviewed" | "shortlisted" | "rejected" | "passed",
  ) => {
    if (action === "shortlisted" || action === "rejected") {
      const application = applications.find(app => app.id === applicationId)
      if (application) {
        setConfirmAction({
          isOpen: true,
          applicationId,
          applicantName: application.applicant_name,
          action: action as 'shortlisted' | 'rejected'
        })
        return
      }
    }

    await executeAction(applicationId, action)
  }

  const executeAction = async (applicationId: number, action: "new" | "reviewed" | "shortlisted" | "rejected" | "passed") => {
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

  const handleConfirmAction = async () => {
    if (confirmAction.applicationId && confirmAction.action) {
      await executeAction(confirmAction.applicationId, confirmAction.action)
      setConfirmAction({
        isOpen: false,
        applicationId: null,
        applicantName: '',
        action: null
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
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
                  <Label htmlFor="application_date">Application Date *</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <Input
                      id="application_date"
                      type="date"
                      value={formData.application_date}
                      onChange={(e) => handleInputChange("application_date", e.target.value)}
                      className="pl-10"
                      min={new Date().toISOString().split('T')[0]} // Restrict to today
                      max={new Date().toISOString().split('T')[0]} // Restrict to today
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicant_name">Applicant Name *</Label>
                  <Input
                    id="applicant_name"
                    value={formData.applicant_name}
                    onChange={(e) => handleInputChange("applicant_name", e.target.value)}
                    required
                  />
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <LocationAutocomplete
                    value={formData.address}
                    onChange={(value) => handleInputChange("address", value)}
                    onCoordinatesChange={handleAddressCoordinatesChange}
                    placeholder="Search for applicant's address..."
                    showCurrentLocationButton={true}
                  />
                  {formData.address_latitude && formData.address_longitude && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Coordinates: {formData.address_latitude}, {formData.address_longitude}
                    </div>
                  )}
                </div>
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
                <Label htmlFor="resume">Curriculum Vitae /Resume *</Label>
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
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobPositionAdverts.map((advert) => (
              <SelectItem key={advert.id} value={advert.id.toString()}>
                {advert.job_position_details?.name || `Job Advert #${advert.id}`}
              </SelectItem>
            ))}
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
                  onClick={() => handleBulkAction("rejected")}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
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
            Applications ({safeFilteredApplications.length})
          </CardTitle>
          <CardDescription>
            All job applications submitted to your organization
            {safeFilteredApplications.length !== applications.length && 
              ` (${applications.length} total)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {safeFilteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No applications match your current filters."
                  : isLoading 
                    ? "Loading applications..." 
                    : "No applications have been submitted yet."}
              </p>
              {applications.length > 0 && !isLoading && (
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
                          currentApplications.length > 0 && 
                          selectedApplications.length === currentApplications.length &&
                          currentApplications.every(app => selectedApplications.includes(app.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newSelections = currentApplications
                              .filter(app => app.status !== "shortlisted")
                              .map(app => app.id)
                            setSelectedApplications(prev => [...new Set([...prev, ...newSelections])])
                          } else {
                            const currentIds = currentApplications.map(app => app.id)
                            setSelectedApplications(prev => prev.filter(id => !currentIds.includes(id)))
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Job Position</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('posted_date')}
                    >
                      <div className="flex items-center gap-1">
                        Posted Date
                        {sortField === 'posted_date' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('application_date')}
                    >
                      <div className="flex items-center gap-1">
                        Applied
                        {sortField === 'application_date' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        {application.status !== "shortlisted" ? (
                          <Checkbox
                            checked={selectedApplications.includes(application.id)}
                            onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                          />
                        ) : (
                          <div className="w-4 h-4" /> 
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
            
          {/* Pagination */}
          {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, safeFilteredApplications.length)} of {safeFilteredApplications.length} applications
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmAction.isOpen} onOpenChange={(open) => {
        if (!open) {
          setConfirmAction({
            isOpen: false,
            applicationId: null,
            applicantName: '',
            action: null
          })
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.action === 'shortlisted' ? 'Shortlist Application' : 'Reject Application'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction.action === 'shortlisted' ? 'shortlist' : 'reject'} the application from{' '}
              <strong>{confirmAction.applicantName}</strong>? 
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmAction.action === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmAction.action === 'shortlisted' ? 'Shortlist' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={confirmBulkAction.isOpen} onOpenChange={(open) => {
        if (!open) {
          setConfirmBulkAction({
            isOpen: false,
            action: null,
            count: 0
          })
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulkAction.action === 'shortlisted' ? 'Shortlist Applications' : 'Reject Applications'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmBulkAction.action === 'shortlisted' ? 'shortlist' : 'reject'}{' '}
              <strong>{confirmBulkAction.count}</strong> selected application{confirmBulkAction.count !== 1 ? 's' : ''}?
              {confirmBulkAction.action === 'rejected' && (
                <span className="block mt-2 text-red-600 font-medium">
                  This action cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkAction}
              className={confirmBulkAction.action === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmBulkAction.action === 'shortlisted' ? 'Shortlist' : 'Reject'} {confirmBulkAction.count} Application{confirmBulkAction.count !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}