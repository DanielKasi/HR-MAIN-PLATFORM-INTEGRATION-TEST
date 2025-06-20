"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  Eye,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getOnBoardings } from "@/lib/utils"
import type { IOnBoarding } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function OnboardPage() {
  const [onboardings, setOnboardings] = useState<IOnBoarding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  // Helper function to safely get string values from potentially nested objects
  const getStringValue = (obj: any, ...keys: string[]): string => {
    if (!obj) return ""

    for (const key of keys) {
      const value = obj[key]
      if (typeof value === "string" && value.trim()) {
        return value
      }
    }
    return ""
  }

  // Helper function to get applicant name
  const getApplicantName = (applicantData: any): string => {
    if (!applicantData) return "N/A"
    return getStringValue(applicantData, "name", "applicant_name") || "N/A"
  }

  // Helper function to get applicant email
  const getApplicantEmail = (applicantData: any): string => {
    if (!applicantData) return "N/A"
    return getStringValue(applicantData, "email", "applicant_email") || "N/A"
  }

  // Helper function to get job description
  const getJobDescription = (applicantData: any): string => {
    if (!applicantData) return "N/A"
    return getStringValue(applicantData, "description", "job_position_advert_job_details") || "N/A"
  }

  // Helper function to get phone
  const getApplicantPhone = (applicantData: any): string => {
    if (!applicantData) return "N/A"
    return getStringValue(applicantData, "phone", "applicant_phone") || "N/A"
  }

  // Helper function to get address
  const getApplicantAddress = (applicantData: any): string => {
    if (!applicantData) return "N/A"
    return getStringValue(applicantData, "address") || "N/A"
  }

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    fetchOnboardings()
  }, [selectedBranch, selectedInstitution, router])

  const fetchOnboardings = async (showRefreshLoader = false) => {
    if (!selectedInstitution) return

    try {
      if (showRefreshLoader) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError("")

      const fetchedOnboardings = await getOnBoardings({ institutionId: selectedInstitution.id })

      if (fetchedOnboardings) {
        setOnboardings(fetchedOnboardings)
      } else {
        setError("Failed to fetch onboarding records. Please try again.")
        toast.error("Failed to load onboarding records")
      }
    } catch (err) {
      setError("Failed to fetch onboarding records. Please try again.")
      toast.error("Failed to load onboarding records")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchOnboardings(true)
  }

  const filteredOnboardings = onboardings.filter((onboarding) => {
    const name = getApplicantName(onboarding.applicant_name).toLowerCase()
    const email = getApplicantEmail(onboarding.applicant_name).toLowerCase()
    const jobDesc = getJobDescription(onboarding.applicant_name).toLowerCase()
    const status = (onboarding.status || "").toLowerCase()
    const searchLower = searchTerm.toLowerCase()

    return (
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      jobDesc.includes(searchLower) ||
      status.includes(searchLower)
    )
  })

  const handleCreateOnboarding = () => {
    router.push("/onboarding/create")
  }

  const handleEditOnboarding = (onboardingId: number) => {
    router.push(`/on-boarding/${onboardingId}/edit`)
  }

  const handleDeleteOnboarding = async (onboardingId: number) => {
    setDeletingId(onboardingId)
    try {
      // TODO: Implement actual delete API call
      // await deleteOnBoarding({ onboardingId })

      // For now, just remove from local state
      setOnboardings((prev) => prev.filter((o) => o.id !== onboardingId))
      toast.success("Onboarding record deleted successfully")
    } catch (error) {
      toast.error("Failed to delete onboarding record")
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewOnboarding = (onboardingId: number) => {
    router.push(`/onboarding/${onboardingId}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "default"
      case "in_progress":
        return "secondary"
      case "pending":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const getInitials = (name: string) => {
    if (!name || name === "N/A") return "NA"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full h-full p-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-muted-foreground">
            {`Manage onboarding records for ${selectedBranch.branch_name} - ${selectedInstitution.institution_name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search onboarding records by name, email, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{onboardings.length}</div>
              <p className="text-xs text-muted-foreground">Total Onboardings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {onboardings.filter((o) => o.status?.toLowerCase() === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {onboardings.filter((o) => o.status?.toLowerCase() === "in_progress").length}
              </div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {onboardings.filter((o) => o.status?.toLowerCase() === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      {/* Onboarding Table */}
      <Card>
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredOnboardings.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No onboarding records found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "No onboarding records match your search criteria."
                : "Get started by creating your first onboarding record."}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateOnboarding} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Onboarding
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOnboardings.map((onboarding) => {
                const applicantName = getApplicantName(onboarding.applicant_name)
                const applicantEmail = getApplicantEmail(onboarding.applicant_name)
                const jobDescription = getJobDescription(onboarding.applicant_name)
                const applicantPhone = getApplicantPhone(onboarding.applicant_name)
                const applicantAddress = getApplicantAddress(onboarding.applicant_name)

                return (
                  <TableRow
                    key={onboarding.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewOnboarding(onboarding.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(applicantName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{applicantName}</div>
                          <div className="text-sm text-muted-foreground">{applicantEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{jobDescription}</div>
                          <div className="text-xs text-muted-foreground">
                            {getStringValue(onboarding.applicant_name, "positions") || "N/A"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(onboarding.status || "")}
                        <Badge variant={getStatusBadgeVariant(onboarding.status || "")}>
                          {(onboarding.status || "Unknown").replace("_", " ")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(onboarding.created_at || "")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-[150px] truncate">{onboarding.remarks || "No remarks"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(onboarding.created_at || "")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {applicantPhone}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{applicantAddress}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewOnboarding(onboarding.id)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditOnboarding(onboarding.id)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onClick={(e) => e.stopPropagation()}
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {`This action cannot be undone. This will permanently delete the onboarding record for ${applicantName}.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteOnboarding(onboarding.id)}
                                  disabled={deletingId === onboarding.id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingId === onboarding.id ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
