"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import {
  ArrowLeft,
  Save,
  RefreshCw,
  User,
  Building,
  MapPin,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { selectSelectedInstitution, selectSelectedBranch, selectUser } from "@/store/auth/selectors"
import { getJobApplicationById, updateJobApplication, getJobPositionAdverts } from "@/lib/utils"
import type { JobApplication, JobApplicationFormData, JobPositionAdvert } from "@/app/types/types.utils"
import { toast } from "sonner"
import { useDocumentTitle } from "@/hooks/use-document-title"

const statusOptions = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "passed", label: "Passed" },
]

const sourceOptions = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "job_board", label: "Job Board" },
  { value: "social_media", label: "Social Media" },
  { value: "other", label: "Other" },
]

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

export default function EditApplicationPage() {
  const [application, setApplication] = useState<JobApplication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [jobPositionAdverts, setJobPositionAdverts] = useState<JobPositionAdvert[]>([])

  const router = useRouter()
  const params = useParams()
  const applicationId = Number.parseInt(params?.id as string)
  const userData = useSelector(selectUser);
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  // Form state
  const [formData, setFormData] = useState<
    Omit<JobApplicationFormData, "resume" | "cover_letter"> & {
      resume?: File | null
      cover_letter?: File | null
      currentResumeUrl?: string
      currentCoverLetterUrl?: string
    }
  >({
    job_position_advert: 0,
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    status: "new",
    gender: "male",
    state: "",
    address: "",
    country: "",
    source: "website",
    application_date: "",
    created_by: userData?.id || 0,
  })

  useDocumentTitle("EDIT A JOB APPLICATION")

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
    loadJobPositionAdverts()
  }, [selectedBranch, selectedInstitution, router, applicationId])

  const fetchApplication = async () => {
    try {
      setIsLoading(true)
      setError("")

      const fetchedApplication = await getJobApplicationById({ applicationId })

      if (fetchedApplication) {
        setApplication(fetchedApplication)
        // Populate form with existing data
        setFormData({
          job_position_advert: fetchedApplication.job_position_advert,
          applicant_name: fetchedApplication.applicant_name,
          applicant_email: fetchedApplication.applicant_email,
          applicant_phone: fetchedApplication.applicant_phone || "",
          status: fetchedApplication.status,
          gender: fetchedApplication.gender,
          state: fetchedApplication.state || "",
          address: fetchedApplication.address,
          country: fetchedApplication.country,
          source: fetchedApplication.source,
          created_by: fetchedApplication.created_by,
          application_date: fetchedApplication.application_date,
          currentResumeUrl: fetchedApplication.resume,
          currentCoverLetterUrl: fetchedApplication.cover_letter || undefined,
        })
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

  const loadJobPositionAdverts = async () => {
    if (!selectedInstitution) return

    try {
      const response = await getJobPositionAdverts({ institutionId: selectedInstitution.id })


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
    } catch (err) {
      setJobPositionAdverts([]) // Ensure it's always an array
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution || !selectedBranch) {
      setError("Missing organization or branch information")
      return
    }

    if (formData.job_position_advert === 0) {
      setError("Please select a job position")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const updateData: Partial<JobApplicationFormData> = {
        job_position_advert: formData.job_position_advert,
        applicant_name: formData.applicant_name,
        applicant_email: formData.applicant_email,
        applicant_phone: formData.applicant_phone || undefined,
        status: formData.status,
        gender: formData.gender,
        state: formData.state || undefined,
        address: formData.address,
        country: formData.country,
        source: formData.source,
      }

      // Only include files if new ones are selected
      if (formData.resume) {
        updateData.resume = formData.resume
      }
      if (formData.cover_letter) {
        updateData.cover_letter = formData.cover_letter
      }

      const updatedApplication = await updateJobApplication({
        applicationId,
        applicationData: updateData,
      })

      if (updatedApplication) {
        toast.success("Application updated successfully")
        router.push(`/applications/${applicationId}`)
      } else {
        setError("Failed to update application")
      }
    } catch (err: any) {
      let errorMessage = "An error occurred while updating the application"
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoBack = () => {
    router.push(`/applications`)
  }

  // Ensure jobPositionAdverts is always an array for safe filtering
  const safeJobPositionAdverts = Array.isArray(jobPositionAdverts) ? jobPositionAdverts : []

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
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div className="w-full h-full p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Application Not Found</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6"> {/* Add padding here */}
      {/* Header */}
      <div className="mb-6"> {/* Add margin bottom */}
        <Button variant="outline" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"> {/* Add margin bottom */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Edit Application</h1>
            <p className="text-muted-foreground">Update application details for {application?.applicant_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchApplication}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Make this container take full width */}
      <div className="w-full">
        {/* Main Form - Remove the grid layout to make it full width */}
        <form onSubmit={handleSubmit} className="space-y-6 max-w-none"> {/* Remove max-width constraints */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Applicant Information */}
          <Card className="w-full"> {/* Ensure full width */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicant_name">Full Name *</Label>
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
                      {genderOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Job Information */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_position_advert">Job Position/ Title  *</Label>
                  <Select
                    value={formData.job_position_advert.toString()}
                    onValueChange={(value) => handleInputChange("job_position_advert", Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a job advert" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeJobPositionAdverts
                        .filter((advert) => advert.job_position_advert_status === "active")
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
                  <div className="text-xs text-muted-foreground">
                    Available job adverts: {safeJobPositionAdverts.length}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={formData.source} onValueChange={(value) => handleInputChange("source", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resume">Resume</Label>
                <div className="space-y-2">
                  {formData.currentResumeUrl && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Current resume</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(formData.currentResumeUrl, "_blank")}
                      >
                        View
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileChange("resume", e.target.files?.[0] || null)}
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {formData.resume && (
                    <p className="text-sm text-muted-foreground flex items-center">
                      <FileText className="mr-1 h-3 w-3" />
                      New file: {formData.resume.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_letter">Cover Letter</Label>
                <div className="space-y-2">
                  {formData.currentCoverLetterUrl && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Current cover letter</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(formData.currentCoverLetterUrl!, "_blank")}
                      >
                        View
                      </Button>
                    </div>
                  )}
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
                      New file: {formData.cover_letter.name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-6">
            <Button type="button" variant="outline" onClick={handleGoBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Updating..." : "Update Application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
