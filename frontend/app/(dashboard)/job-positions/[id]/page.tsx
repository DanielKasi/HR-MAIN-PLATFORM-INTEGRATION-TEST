"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Briefcase, ArrowLeft, Edit, DollarSign, Users, Building2, FileText, Download, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPosition } from "@/lib/utils"
import type { IJobPosition } from "@/app/types/types.utils"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/helpers"

export default function JobPositionDetailsPage() {
  const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const router = useRouter()
  const params = useParams()
  const jobPositionId = Number.parseInt(params.id as string)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    if (isNaN(jobPositionId)) {
      toast.error("Invalid job position ID")
      router.push("/job-positions")
      return
    }

    fetchJobPosition()
  }, [selectedInstitution, selectedBranch, jobPositionId, router])

  const fetchJobPosition = async () => {
    try {
      setIsLoading(true)
      setError("")
      const fetchedJobPosition = await getJobPosition({ jobPositionId })

      if (fetchedJobPosition) {
        setJobPosition(fetchedJobPosition)
      } else {
        setError("Job position not found")
        toast.error("Job position not found")
      }
    } catch (err) {
      setError("Failed to fetch job position details")
      toast.error("Failed to load job position details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleEdit = () => {
    router.push(`/job-positions/${jobPositionId}/edit`)
  }

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    // Create a temporary link to download the file
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-6">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>

          {/* Main Card Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-20 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !jobPosition) {
    return (
      <div className="w-full h-full p-6">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Job Positions
            </Button>
          </div>
          <Card className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Job Position Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleBack}>Go Back</Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Positions
          </Button>
          <Button onClick={handleEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Position
          </Button>
        </div>

        {/* Main Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{jobPosition.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">ID: {jobPosition.id}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {jobPosition.department_details?.name}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(jobPosition.salary.toLocaleString())}
                </div>
                <p className="text-sm text-muted-foreground">Salary</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Job Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Job Description</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {jobPosition.description || "No description provided"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Department Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Department Name</p>
                    <p className="text-sm text-muted-foreground">{jobPosition.department_details?.name}</p>
                  </div>
                  {/* <div>
                    <p className="text-sm font-medium">Department description</p>
                    <p className="text-sm text-muted-foreground">{jobPosition.departmentDetails?.description}</p>
                  </div> */}
                  {jobPosition.department_details?.description && (
                    <div>
                      <p className="text-sm font-medium">Department Description</p>
                      <p className="text-sm text-muted-foreground">{jobPosition.department_details?.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reporting Structure */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Reporting Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {jobPosition.reportsToDetails ? (
                    <>
                      <div>
                        <p className="text-sm font-medium">Reports To</p>
                        <p className="text-sm text-muted-foreground">{jobPosition.reportsToDetails.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Manager Email</p>
                        <p className="text-sm text-muted-foreground">{jobPosition.reportsToDetails.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Manager Department</p>
                        <p className="text-sm text-muted-foreground">{jobPosition.reportsToDetails.department}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No direct reporting manager</p>
                      <p className="text-xs text-muted-foreground">This is likely a senior position</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Templates Section */}
            {(jobPosition.contractTemplate || jobPosition.offerLetterTemplate) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Document Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobPosition.contractTemplate && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-primary" />
                              <div>
                                <p className="font-medium">Contract Template</p>
                                <p className="text-xs text-muted-foreground">Employment contract template</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadFile(jobPosition.contractTemplate!, "contract-template")}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {jobPosition.offerLetterTemplate && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-primary" />
                              <div>
                                <p className="font-medium">Offer Letter Template</p>
                                <p className="text-xs text-muted-foreground">Job offer letter template</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDownloadFile(jobPosition.offerLetterTemplate!, "offer-letter-template")
                              }
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Organization Context */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-3">Organization Context</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <p>
                    <span className="font-medium text-foreground">Organization:</span>{" "}
                    {selectedInstitution.institution_name}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Branch:</span> {selectedBranch.branch_name}
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium text-foreground">Institution :</span> {jobPosition.department_details?.institution_details?.institution_name}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Branch :</span> {selectedBranch.branch_name}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
