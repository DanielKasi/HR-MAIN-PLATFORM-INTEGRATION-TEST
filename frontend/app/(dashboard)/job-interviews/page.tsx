"use client"

import { useState, useEffect, useMemo } from "react"
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
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getInterviews, bulkCreateOnBoarding } from "@/lib/utils"
import type { IInterview } from "@/app/types/types.utils"
import { PERMISSION_CODES } from "@/app/types/types.utils"
import { toast } from "sonner"
import ProtectedComponent from "@/components/ProtectedComponent"

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 10

// Status options for filtering
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<IInterview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [selectedInterviews, setSelectedInterviews] = useState<number[]>([])
  const [isOnboarding, setIsOnboarding] = useState(false)

  // Filter and pagination states
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    fetchInterviews()
  }, [selectedBranch, selectedInstitution, router])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const fetchInterviews = async (showRefreshLoader = false) => {
    if (!selectedInstitution) return

    try {
      if (showRefreshLoader) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError("")

      const fetchedInterviews = await getInterviews({ institutionId: selectedInstitution.id })

      if (fetchedInterviews) {
        setInterviews(fetchedInterviews)
      } else {
        setError("Failed to fetch interviews. Please try again.")
        toast.error("Failed to load interviews")
      }
    } catch (err) {
      setError("Failed to fetch interviews. Please try again.")
      toast.error("Failed to load interviews")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchInterviews(true)
  }

  // Enhanced filtering logic
  const filteredInterviews = useMemo(() => {
    let filtered = interviews

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (interview) =>
          interview.job_position_application_details?.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.job_position_application_details?.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.interview_stage_details?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.interview_stage_details?.interviewers_details?.[0]?.first_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.interview_stage_details?.interviewers_details?.[0]?.last_name

            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.job_position_application_details?.job_position_advert_job_details?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.job_position_application_details?.job_position_advert_job_details?.department
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      )
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((interview) => interview.status === statusFilter)
    }

    return filtered
  }, [interviews, searchTerm, statusFilter])

  // Pagination logic
  const paginatedInterviews = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredInterviews.slice(startIndex, endIndex)
  }, [filteredInterviews, currentPage, pageSize])

  const totalPages = Math.ceil(filteredInterviews.length / pageSize)

  const handleCreateInterview = () => {
    router.push("/job-interviews/create")
  }

  const handleEditInterview = (interviewId: number) => {
    router.push(`/job-interviews/${interviewId}/edit`)
  }

  const handleDeleteInterview = (interviewId: number) => {
    // TODO: Implement delete functionality
    toast.success("Interview deletion would be implemented here")
  }

  const handleViewInterview = (interviewId: number) => {
    router.push(`/job-interviews/${interviewId}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "scheduled":
        return "secondary"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
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

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-3 w-3 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
    ))
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const completedInterviews = paginatedInterviews
        .filter((interview) => interview.status === "completed")
        .map((interview) => interview.id)
      setSelectedInterviews((prev) => [...new Set([...prev, ...completedInterviews])])
    } else {
      const completedInterviewIds = paginatedInterviews
        .filter((interview) => interview.status === "completed")
        .map((interview) => interview.id)
      setSelectedInterviews((prev) => prev.filter((id) => !completedInterviewIds.includes(id)))
    }
  }

  const handleSelectInterview = (interviewId: number, checked: boolean) => {
    if (checked) {
      setSelectedInterviews((prev) => [...prev, interviewId])
    } else {
      setSelectedInterviews((prev) => prev.filter((id) => id !== interviewId))
    }
  }

  const handleBulkOnboard = async () => {
    const selectedInterviewsData = interviews.filter((interview) => selectedInterviews.includes(interview.id))

    const applicationIds = selectedInterviewsData
      .map((interview) => interview.job_position_application_details?.id)
      .filter((id) => id !== undefined) as number[]

    if (applicationIds.length === 0) {
      toast.error("No valid applications found for selected interviews")
      return
    }

    setIsOnboarding(true)
    try {
      const result = await bulkCreateOnBoarding({ applicationIds })
      if (result) {
        toast.success(`Successfully onboarded ${applicationIds.length} candidates`)
        setSelectedInterviews([])
        router.push("/on-boarding")
      } else {
        toast.error("Failed to onboard candidates")
      }
    } catch (error) {
      toast.error("Failed to onboard candidates")
    } finally {
      setIsOnboarding(false)
    }
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full h-full p-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interviews</h1>
          <p className="text-muted-foreground">
            Manage interviews for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedInterviews.length > 0 && (
            <Button
              onClick={handleBulkOnboard}
              disabled={isOnboarding}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Users className="h-4 w-4" />
              {isOnboarding
                ? "Onboarding..."
                : `Onboard ${selectedInterviews.length} Candidate${selectedInterviews.length > 1 ? "s" : ""}`}
            </Button>
          )}
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
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_SCHEDULE_INTERVIEWS}>
          <Button onClick={handleCreateInterview} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Interview
          </Button>
          </ProtectedComponent>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search interviews by applicant, job position, interviewer, or stage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchTerm || statusFilter !== "all") && (
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{interviews.length}</div>
              <p className="text-xs text-muted-foreground">Total Interviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{interviews.filter((i) => i.status === "completed").length}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{interviews.filter((i) => i.status === "scheduled").length}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {interviews.filter((i) => i.rating).reduce((sum, i) => sum + (i.rating || 0), 0) /
                  interviews.filter((i) => i.rating).length || 0}
                /10
              </div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>
            Showing {filteredInterviews.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredInterviews.length)} of {filteredInterviews.length} interviews
            {(searchTerm || statusFilter !== "all") && ` (filtered from ${interviews.length} total)`}
          </div>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      {/* Interviews Table */}
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
        ) : filteredInterviews.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No interviews found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all"
                ? "No interviews match your search criteria."
                : "Get started by scheduling your first interview."}
            </p>
            {searchTerm || statusFilter !== "all" ? (
              <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2">
                Clear Filters
              </Button>
            ) : (
              <Button onClick={handleCreateInterview} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Schedule First Interview
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        paginatedInterviews.filter((i) => i.status === "completed").length > 0 &&
                        paginatedInterviews
                          .filter((i) => i.status === "completed")
                          .every((i) => selectedInterviews.includes(i.id))
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all completed interviews on this page"
                    />
                  </TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Job Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Interview Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInterviews.map((interview) => (
                  <TableRow
                    key={interview.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selectedInterviews.includes(interview.id) ? "bg-muted/30" : ""}`}
                    onClick={() => handleViewInterview(interview.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {interview.status === "completed" ? (
                        <Checkbox
                          checked={selectedInterviews.includes(interview.id)}
                          onCheckedChange={(checked) => handleSelectInterview(interview.id, checked as boolean)}
                          aria-label={`Select interview for ${interview.job_position_application_details?.applicant_name}`}
                        />
                      ) : (
                        <div className="w-4 h-4" /> // Empty space to maintain table alignment
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(interview.job_position_application_details?.applicant_name || "NA")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{interview.job_position_application_details?.applicant_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {interview.job_position_application_details?.applicant_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {interview.job_position_application_details?.job_position_advert_job_details?.name || "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {interview.job_position_application_details?.job_position_advert_job_details?.department || ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(interview.status)}
                        <Badge variant={getStatusBadgeVariant(interview.status)}>{interview.status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{interview.interview_stage_details?.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(interview.interview_date)}
                      </div>
                    </TableCell>

                    <TableCell>
                      {interview.rating ? (
                        <div className="flex items-center gap-1">
                          <div className="flex">{getRatingStars(Math.round(interview.rating / 2))}</div>
                          <span className="text-xs ml-1">{interview.rating}/10</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        <div>{interview.job_position_application_details?.applicant_phone}</div>
                        <div className="truncate max-w-[120px]">
                          {interview.job_position_application_details?.address},{" "}
                          {interview.job_position_application_details?.state}
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
                              handleViewInterview(interview.id)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditInterview(interview.id)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteInterview(interview.id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredInterviews.length)} of {filteredInterviews.length} interviews
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}