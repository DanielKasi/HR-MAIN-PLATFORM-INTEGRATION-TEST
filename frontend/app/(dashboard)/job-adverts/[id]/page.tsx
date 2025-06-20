"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Megaphone, ArrowLeft, Edit, Calendar, Briefcase, Building2, DollarSign, User, FileText, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositionAdvertById, getJobPosition, updateJobPositionAdvert } from "@/lib/utils"
import type { JobPositionAdvert, IJobPosition, JobAdvertStatus } from "@/app/types/types.utils"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/helpers"

const getStatusColor = (status: JobAdvertStatus) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200"
    case "expired":
      return "bg-red-100 text-red-800 border-red-200"
    case "closed":
      return "bg-blue-100 text-blue-800 border-blue-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const isExpired = (expiryDate: string) => {
  return new Date(expiryDate) < new Date()
}

export default function JobAdvertDetailsPage() {
  const [jobAdvert, setJobAdvert] = useState<JobPositionAdvert | null>(null)
  const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [applicationsCount, setApplicationsCount] = useState<number>(0)
  const [isClosing, setIsClosing] = useState(false)

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

    fetchJobAdvertDetails()
  }, [selectedInstitution, selectedBranch, jobAdvertId, router])

  const fetchJobAdvertDetails = async () => {
    try {
      setIsLoading(true)
      setError("")

      const fetchedJobAdvert = await  getJobPositionAdvertById({ advertId:jobAdvertId })

      if(!fetchedJobAdvert){
        return null
      }

      const fetchedApplications = fetchedJobAdvert.applications

        setJobAdvert(fetchedJobAdvert)

        // Fetch job position details
        const fetchedJobPosition = await getJobPosition({ jobPositionId: fetchedJobAdvert.job_position })
        if (fetchedJobPosition) {
          setJobPosition(fetchedJobPosition)
      } else {
        setError("Job advert not found")
        toast.error("Job advert not found")
      }

      if (fetchedApplications) {
        setApplicationsCount(fetchedApplications.length)
      }
    } catch (err) {
      setError("Failed to fetch job advert details")
      toast.error("Failed to load job advert details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleEdit = () => {
    router.push(`/job-adverts/${jobAdvertId}/edit`)
  }

  const handleViewApplications = () => {
    router.push(`/job-adverts/${jobAdvertId}/applications`)
  }

  const handleCloseAdvert = async () => {
    if (!jobAdvert) return

    try {
      setIsClosing(true)

      const updatedAdvert = await updateJobPositionAdvert({
        advertId: jobAdvert.id,
        advertData: { status: "closed" },
      })

      if (updatedAdvert) {
        setJobAdvert(updatedAdvert)
        toast.success("Job advert closed successfully!")
      } else {
        toast.error("Failed to close job advert")
      }
    } catch (error) {
      console.error("Error closing job advert:", error)
      toast.error("Failed to close job advert")
    } finally {
      setIsClosing(false)
    }
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

  if (error || !jobAdvert) {
    return (
      <div className="w-full h-full p-6">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Job Adverts
            </Button>
          </div>
          <Card className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Job Advert Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleBack}>Go Back</Button>
          </Card>
        </div>
      </div>
    )
  }

  const expired = isExpired(jobAdvert.expiry_date)

  return (
    <div className="w-full h-full p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Job Adverts
          </Button>
          <div className="flex items-center gap-2">
            {jobAdvert.status !== "closed" && (
              <Button
                variant="outline"
                onClick={handleCloseAdvert}
                disabled={isClosing}
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                {isClosing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    Close Advert
                  </>
                )}
              </Button>
            )}
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Advert
            </Button>
          </div>
        </div>

        {/* Main Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{jobPosition?.name || "Job Advertisement"}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewApplications}
                    className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <User className="h-4 w-4" />
                    {applicationsCount} Applications
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${getStatusColor(jobAdvert.status)}`}>{jobAdvert.status.toUpperCase()}</Badge>
                  {expired && <Badge variant="destructive">EXPIRED</Badge>}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-lg font-bold">
                  <Calendar className="h-4 w-4" />
                  {formatDate(jobAdvert.expiry_date)}
                </div>
                <p className="text-sm text-muted-foreground">Expiry Date</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Job Position Information */}
            {jobPosition && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Job Position Details
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-semibold">{jobPosition.name}</h4>
                      <div className="flex items-center gap-1 text-lg font-bold text-green-600">
                        UGX {" "}
                        {formatCurrency(jobPosition.salary)}
                      </div>
                    </div>
                    {jobPosition.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{jobPosition.description}</p>
                    )}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Advert Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Advert Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Advertisement Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge className={`text-xs ${getStatusColor(jobAdvert.status)}`}>
                      {jobAdvert.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Published Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(jobAdvert.published_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Expiry Date</p>
                    <p className={`text-sm ${expired ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {formatDate(jobAdvert.expiry_date)}
                      {expired && " (EXPIRED)"}
                    </p>
                  </div>
                  {jobAdvert.number_of_employees_expected && (
                    <div>
                      <p className="text-sm font-medium">Expected Employees</p>
                      <p className="text-sm text-muted-foreground">{jobAdvert.number_of_employees_expected}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Department & Reporting */}
              {jobPosition && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Department & Reporting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Department</p>
                      <p className="text-sm text-muted-foreground">{jobPosition.department_details?.name}</p>
                    </div>
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
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No direct reporting manager</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Extra Information */}
            {jobAdvert.extra_information && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{jobAdvert.extra_information}</p>
                  </div>
                </div>
              </>
            )}

            {/* Document Templates */}
            {jobPosition && (jobPosition.contractTemplate || jobPosition.offerLetterTemplate) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobPosition.contractTemplate && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-primary" />
                            <div>
                              <p className="font-medium">Contract Template</p>
                              <p className="text-xs text-muted-foreground">Employment contract template</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {jobPosition.offerLetterTemplate && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-primary" />
                            <div>
                              <p className="font-medium">Offer Letter Template</p>
                              <p className="text-xs text-muted-foreground">Job offer letter template</p>
                            </div>
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
                    <span className="font-medium text-foreground">Applications:</span> {applicationsCount}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Expected Employees:</span>{" "}
                    {jobAdvert.number_of_employees_expected || "Not specified"}
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
