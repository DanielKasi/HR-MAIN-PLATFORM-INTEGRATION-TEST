"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Mail, Phone, MapPin, Calendar, User, Upload, FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createJobApplication, getJobApplications } from "@/lib/utils"
import type { JobApplication, JobApplicationFormData } from "@/app/types/types.utils"

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

interface ApplicationsPageProps {
  institutionId?: number
}

export default function ApplicationsPage({ institutionId = 1 }: ApplicationsPageProps) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<
    Omit<JobApplicationFormData, "resume"> & { resume: File | null; cover_letter: File | null }
  >({
    job_position_advert: 0,
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    resume: null,
    cover_letter: null,
    status: "new",
    gender: "male",
    state: "",
    address: "",
    country: "",
    source: "website",
  })

  // Load applications
  useEffect(() => {
    loadApplications()
  }, [institutionId])

  const loadApplications = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getJobApplications({ institutionId })
      if (data) {
        setApplications(data)
      } else {
        setError("Failed to load applications")
      }
    } catch (err) {
      setError("An error occurred while loading applications")
      console.error(err)
    } finally {
      setIsLoading(false)
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

    if (!formData.resume) {
      setError("Resume is required")
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
      }

      const newApplication = await createJobApplication({ applicationData })

      if (newApplication) {
        setApplications((prev) => [newApplication, ...prev])
        setIsCreateDialogOpen(false)

        // Reset form
        setFormData({
          job_position_advert: 0,
          applicant_name: "",
          applicant_email: "",
          applicant_phone: "",
          resume: null,
          cover_letter: null,
          status: "new",
          gender: "male",
          state: "",
          address: "",
          country: "",
          source: "website",
        })
      } else {
        setError("Failed to create application")
      }
    } catch (err) {
      setError("An error occurred while creating the application")
      console.error(err)
    } finally {
      setIsSubmitting(false)
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
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
          <p className="text-muted-foreground">Manage and track all job applications</p>
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
                  <Label htmlFor="job_position_advert">Job Position ID *</Label>
                  <Input
                    id="job_position_advert"
                    type="number"
                    value={formData.job_position_advert}
                    onChange={(e) => handleInputChange("job_position_advert", Number.parseInt(e.target.value) || 0)}
                    required
                  />
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

      {error && !isCreateDialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Applications ({applications.length})</CardTitle>
          <CardDescription>All job applications submitted to your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No applications found.</p>
              <Button variant="outline" onClick={loadApplications} className="mt-2">
                Refresh
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
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
                            <a href={application.resume} target="_blank" rel="noopener noreferrer">
                              Resume
                            </a>
                          </Button>
                          {application.cover_letter && (
                            <Button variant="link" size="sm" className="h-auto p-0" asChild>
                              <a href={application.cover_letter} target="_blank" rel="noopener noreferrer">
                                Cover Letter
                              </a>
                            </Button>
                          )}
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
  )
}
