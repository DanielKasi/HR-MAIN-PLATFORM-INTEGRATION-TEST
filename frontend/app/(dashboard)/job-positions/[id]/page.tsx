"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import apiRequest from "@/lib/apiRequest"
import { Briefcase, ArrowLeft, Edit, Users, Building2, CheckCircle, XCircle, Search, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"


import { selectSelectedInstitution, selectSelectedBranch, selectUser } from "@/store/auth/selectors"
import { getJobPosition } from "@/lib/utils"
import type { IJobPosition } from "@/app/types/types.utils"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/helpers"

export default function JobPositionDetailsPage() {
  const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("");


  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState<string>("");
  const [showApproveDialog, setShowApproveDialog] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);

  const router = useRouter()
  const params = useParams()
  const jobPositionId = Number.parseInt(params.id as string)

  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)
  const currentUser = useSelector(selectUser)

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

  // Helper for employee initials
  const getInitials = (name: string) => {
    if (!name) return "NA"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Filtered employees
  const employees = Array.isArray(jobPosition?.employees) ? jobPosition.employees : []
  const filteredEmployees = employees.filter((emp: any) => {
    const fullName = emp.user?.fullname || emp.email || ""
    return (
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

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


  const handleStatusUpdate = async (taskId: string, status: "completed" | "rejected") => {
    try {
      status === "rejected" ? setRejectingTaskId(taskId) : setApprovingTaskId(taskId);
      await apiRequest.patch(`/workflow/task/${taskId}/status/`, {
        status,
        comment: approvalComment,
      });
      // Reset comment after submission
      setApprovalComment("");
      // Refresh data after status update
      await fetchJobPosition();

      toast.success(`Position ${status === "rejected" ? "rejected" : "approved"} successfully`);
    } catch (err: any) {
      console.error(`${status === "rejected" ? "Rejection" : "Approval"} failed:`, err);
      toast.error(`Failed to ${status === "rejected" ? "reject" : "approve"} position`);
    } finally {
      status === "rejected" ? setRejectingTaskId(null) : setApprovingTaskId(null);
    }
  };

  return (
    <div className="w-full h-full p-4">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button onClick={handleEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Position
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details - Left Column (2/3 width) */}
          <div className="lg:col-span-2">
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
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {jobPosition.department_details?.name}
                    </Badge>
                    {/* Employee count */}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {employees.length} Employees
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
                  UGX
                  {formatCurrency(jobPosition.salary.toLocaleString())}
                </div>
                <p className="text-sm text-muted-foreground">Salary</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:w-[300px] mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="employees">Employees</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
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
                      {jobPosition.reports_to_details ? (
                        <>
                          <div>
                            <p className="text-sm font-medium">Reports To</p>
                            <p className="text-sm text-muted-foreground">{jobPosition.reports_to_details.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Manager Email</p>
                            <p className="text-sm text-muted-foreground">{jobPosition.reports_to_details.email}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Manager Department</p>
                            <p className="text-sm text-muted-foreground">{jobPosition.reports_to_details.department}</p>
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
              </TabsContent>

              {/* Employees Tab */}
              <TabsContent value="employees" className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[250px]"
                    />
                  </div>
                </div>
                {filteredEmployees.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No employees found</h3>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Join Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((emp: any) => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={emp.employee_profile_picture || ""} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(emp.user?.fullname || emp.email || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{emp.user?.fullname || emp.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{emp.email}</TableCell>
                            <TableCell className="text-sm">{emp.phone_number}</TableCell>
                            <TableCell className="text-sm">{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : "-"}</TableCell>
                            <TableCell>
                              {emp.is_active ? (
                                <Badge className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-50 text-gray-700 border-gray-200">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
              <Separator />
            </CardContent>
          </Card>
        </div>

        {/* Approval Steps - Right Column (1/3 width) */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Approval Steps</CardTitle>
              <CardDescription>Position approval workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {jobPosition.tasks && jobPosition.tasks.map((task, index) => {
                  const isCompleted = task.status === "completed";
                  const isPending = task.status === "pending";
                  const isRejected = task.status === "rejected";
                  const isTerminated = task.status === "terminated";
                  const userHasRole = currentUser && (
                    // Check if user has any of the required roles
                    task.step.roles_details?.some(role => 
                      currentUser.roles.some(userRole => userRole.name === role.name)
                    ) ||
                    // Or check if user is an explicit approver
                    task.step.approvers_details?.some(approver => 
                      approver.approver_user.user.id === currentUser.id
                    ) ||
                    // Or check if user is the institution owner
                    currentUser.id === selectedInstitution?.institution_owner_id
                  );
                  const isCurrentStep = isPending && index === jobPosition.tasks.findIndex((t) => t.status === "pending");

                  return (
                    <div key={task.step.level} className="relative">
                      {/* Timeline connector */}
                      {index < jobPosition.tasks.length - 1 && (
                        <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200 z-0" />
                      )}

                      <div className="flex gap-4 relative z-10">
                        {/* Status indicator */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                            isCompleted
                              ? "bg-green-100 text-green-600 border border-green-600"
                              : isRejected
                                ? "bg-red-100 text-red-600 border border-red-600"
                                : isTerminated
                                  ? "bg-red-100 text-red-600 border border-red-600"
                                  : isCurrentStep
                                    ? "bg-amber-100 text-amber-600 border border-amber-600"
                                    : "bg-gray-100 text-gray-400 border border-gray-400"
                          }`}
                        >
                          {isCompleted ? "✓" : isRejected || isTerminated ? "✕" : index + 1}
                        </div>

                        {/* Step details */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-sm">{task.step.step_name}</h4>
                              <p className="text-xs text-gray-500">
                                Approver Roles:{" "}
                                {task.step.roles_details.length > 0
                                  ? task.step.roles_details.map((role) => role.name).join(", ")
                                  : "No roles, It's User-Based"}
                              </p>
                            </div>

                            <div>
                              {isCompleted ? (
                                <Badge className="text-xs" variant="success">
                                  Approved
                                </Badge>
                              ) : isRejected ? (
                                <Badge className="text-xs" variant="destructive">
                                  Rejected
                                </Badge>
                              ) : isTerminated ? (
                                <Badge
                                  className="text-xs bg-red-50 text-red-600 border-red-200"
                                  variant="destructive"
                                >
                                  Terminated
                                </Badge>
                              ) : isPending ? (
                                <Badge
                                  className="text-xs bg-amber-50 text-amber-600 border-amber-200"
                                  variant="outline"
                                >
                                  Pending
                                </Badge>
                              ) : (
                                <Badge className="text-xs" variant="outline">
                                  Waiting
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Approval button - only show for current user's role and pending tasks */}
                          {isPending && userHasRole && (
                            <div className="mt-2 space-y-2">
                              <textarea
                                className="w-full p-2 text-sm border rounded-md"
                                placeholder="Add a comment (optional)"
                                rows={2}
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button
                                  className="flex-1"
                                  disabled={approvingTaskId === task.id || rejectingTaskId === task.id}
                                  size="sm"
                                  onClick={() => setShowApproveDialog(task.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  className="flex-1"
                                  disabled={approvingTaskId === task.id || rejectingTaskId === task.id}
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setShowRejectDialog(task.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Show terminated info if task was terminated */}
                          {isTerminated && (
                            <div className="text-xs text-gray-500 mt-2">
                              <div className="mt-1 p-2 bg-red-50 rounded-md">
                                <p className="font-medium text-red-600">
                                  This step was terminated because another step was rejected.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Show approved/rejected by info if completed/rejected */}
                          {(isCompleted || isRejected) && (
                            <div className="text-xs text-gray-500 mt-2">
                              <p>
                                {isCompleted ? "Approved" : "Rejected"} by:{" "}
                                {task.approved_by?.user.fullname}
                              </p>
                              {task.comment && (
                                <div className="mt-1 p-2 bg-gray-50 rounded-md">
                                  <p className="font-medium">Comment:</p>
                                  <p>{task.comment}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog !== null} onOpenChange={() => setShowApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this position? This action will move the workflow to
              the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            {approvalComment && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-sm">Your comment:</p>
                <p className="text-sm">{approvalComment}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={approvingTaskId !== null}
              onClick={() => {
                if (showApproveDialog !== null) {
                  handleStatusUpdate(showApproveDialog, "completed");
                  setShowApproveDialog(null);
                }
              }}
            >
              {approvingTaskId !== null ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog !== null} onOpenChange={() => setShowRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this position? This action will terminate all other
              pending approval steps.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            {approvalComment ? (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-sm">Your comment:</p>
                <p className="text-sm">{approvalComment}</p>
              </div>
            ) : (
              <div className="text-amber-600 text-sm">
                It's recommended to provide a comment explaining the reason for rejection.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={rejectingTaskId !== null}
              variant="destructive"
              onClick={() => {
                if (showRejectDialog !== null) {
                  handleStatusUpdate(showRejectDialog, "rejected");
                  setShowRejectDialog(null);
                }
              }}
            >
              {rejectingTaskId !== null ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
