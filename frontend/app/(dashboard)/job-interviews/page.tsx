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
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getInterviews } from "@/lib/utils"
import type { IInterview } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<IInterview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")

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

  const filteredInterviews = interviews.filter(
    (interview) =>
      interview.job_position_application_details?.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.job_position_application_details?.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.interview_stage_details?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.interview_stage_details?.interviewer_details?.first_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      interview.interview_stage_details?.interviewer_details?.last_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  )

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

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interviews</h1>
          <p className="text-muted-foreground">
            Manage interviews for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
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
          <Button onClick={handleCreateInterview} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Interview
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search interviews by applicant, interviewer, or stage..."
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
              {searchTerm
                ? "No interviews match your search criteria."
                : "Get started by scheduling your first interview."}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateInterview} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Schedule First Interview
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Interview Date</TableHead>
                <TableHead>Interviewer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInterviews.map((interview) => (
                <TableRow
                  key={interview.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewInterview(interview.id)}
                >
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
                    <div className="text-sm">
                      {interview.interview_stage_details?.interviewer_details?.first_name}{" "}
                      {interview.interview_stage_details?.interviewer_details?.last_name}
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
        )}
      </Card>
    </div>
  )
}
