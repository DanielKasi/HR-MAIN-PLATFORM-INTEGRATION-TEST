"use client";

import React from "react";
import {useState, useEffect, useMemo} from "react";
import {useRouter} from "next/navigation";
import {useSelector} from "react-redux";
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
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Skeleton} from "@/components/ui/skeleton";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Checkbox} from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {selectSelectedInstitution, selectSelectedBranch} from "@/store/auth/selectors";
import {getInterviews, bulkCreateOnBoarding} from "@/lib/utils";
import type {IInterview} from "@/app/types/types.utils";
import {PERMISSION_CODES} from "@/app/types/types.utils";
import {toast} from "sonner";
import ProtectedComponent from "@/components/ProtectedComponent";
import {formatCurrency} from "@/lib/helpers";
import {useDocumentTitle} from "@/hooks/use-document-title";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

// Status options for filtering
const STATUS_OPTIONS = [
  {value: "all", label: "All Statuses"},
  {value: "scheduled", label: "Scheduled"},
  {value: "completed", label: "Completed"},
  {value: "cancelled", label: "Cancelled"},
];

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [selectedInterviews, setSelectedInterviews] = useState<number[]>([]);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [expandedApplicants, setExpandedApplicants] = useState<string[]>([]);
  // Filter and pagination states
  const [statusFilter, setStatusFilter] = useState("all");
  const [interviewerFilter, setInterviewerFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{from: string | null; to: string | null}>({
    from: null,
    to: null,
  });
  const [jobPositionFilter, setJobPositionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  useDocumentTitle("JOB INTERVIEWS");

  // Get unique interviewers for filter
  const interviewers = useMemo(() => {
    const uniqueInterviewers = new Set<string>();
    interviews.forEach((interview) => {
      interview.interview_stage_details?.interviewers_details?.forEach((employee) => {
        uniqueInterviewers.add(`${employee.first_name} ${employee.last_name}`);
      });
    });
    return [
      {value: "all", label: "All Interviewers"},
      ...Array.from(uniqueInterviewers).map((name) => ({value: name, label: name})),
    ];
  }, [interviews]);

  // Get unique job positions for filter
  const jobPositions = useMemo(() => {
    const uniquePositions = new Set<string>();
    interviews.forEach((interview) => {
      const positionName =
        interview.job_position_application_details?.job_position_advert_job_details?.name;
      if (positionName) {
        uniquePositions.add(positionName);
      }
    });
    return [
      {value: "all", label: "All Positions"},
      ...Array.from(uniquePositions).map((name) => ({value: name, label: name})),
    ];
  }, [interviews]);

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard");
      return;
    }

    fetchInterviews();
  }, [selectedBranch, selectedInstitution, router]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, interviewerFilter, jobPositionFilter, dateRange]);
  const fetchInterviews = async (showRefreshLoader = false) => {
    if (!selectedInstitution) return;

    try {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      const fetchedInterviews = await getInterviews({institutionId: selectedInstitution.id});

      if (fetchedInterviews) {
        setInterviews(fetchedInterviews);
      } else {
        setError("Failed to fetch interviews. Please try again.");
        toast.error("Failed to load interviews");
      }
    } catch (err) {
      setError("Failed to fetch interviews. Please try again.");
      toast.error("Failed to load interviews");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchInterviews(true);
  };

  // Enhanced filtering logic
  const filteredInterviews = useMemo(() => {
    let filtered = interviews;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (interview) =>
          interview.job_position_application_details?.applicant_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.job_position_application_details?.applicant_email
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.interview_stage_details?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          interview.interview_stage_details?.interviewers_details?.some(
            (employee) =>
              employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((interview) => interview.status === statusFilter);
    }

    // Apply interviewer filter
    if (interviewerFilter && interviewerFilter !== "all") {
      filtered = filtered.filter((interview) =>
        interview.interview_stage_details?.interviewers_details?.some(
          (employee) => `${employee.first_name} ${employee.last_name}` === interviewerFilter,
        ),
      );
    }

    // Apply job position filter
    if (jobPositionFilter && jobPositionFilter !== "all") {
      filtered = filtered.filter(
        (interview) =>
          interview.job_position_application_details?.job_position_advert_job_details?.name ===
          jobPositionFilter,
      );
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((interview) => {
        const interviewDate = new Date(interview.interview_date).getTime();
        const fromDate = dateRange.from ? new Date(dateRange.from).getTime() : -Infinity;
        const toDate = dateRange.to ? new Date(dateRange.to).getTime() : Infinity;
        return interviewDate >= fromDate && interviewDate <= toDate;
      });
    }

    return filtered;
  }, [interviews, searchTerm, statusFilter, interviewerFilter, dateRange]);

  // Pagination logic
  const paginatedInterviews = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredInterviews.slice(startIndex, endIndex);
  }, [filteredInterviews, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredInterviews.length / pageSize);

  const handleCreateInterview = () => {
    router.push("/job-interviews/create");
  };

  const handleEditInterview = (interviewId: number) => {
    router.push(`/job-interviews/${interviewId}/edit`);
  };

  const handleDeleteInterview = (interviewId: number) => {
    // TODO: Implement delete functionality
    toast.success("Interview deletion would be implemented here");
  };

  const handleViewInterview = (interviewId: number) => {
    router.push(`/job-interviews/${interviewId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "scheduled":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRatingStars = (rating: number) => {
    return Array.from({length: 5}, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const completedInterviews = paginatedInterviews
        .filter((interview) => interview.status === "completed")
        .map((interview) => interview.id);
      setSelectedInterviews((prev) => [...new Set([...prev, ...completedInterviews])]);
    } else {
      const completedInterviewIds = paginatedInterviews
        .filter((interview) => interview.status === "completed")
        .map((interview) => interview.id);
      setSelectedInterviews((prev) => prev.filter((id) => !completedInterviewIds.includes(id)));
    }
  };

  const handleSelectInterview = (interviewId: number, checked: boolean) => {
    if (checked) {
      setSelectedInterviews((prev) => [...prev, interviewId]);
    } else {
      setSelectedInterviews((prev) => prev.filter((id) => id !== interviewId));
    }
  };

  const handleBulkOnboard = async () => {
    const selectedInterviewsData = interviews.filter((interview) =>
      selectedInterviews.includes(interview.id),
    );

    const applicationIds = selectedInterviewsData
      .map((interview) => interview.job_position_application_details?.id)
      .filter((id) => id !== undefined) as number[];

    if (applicationIds.length === 0) {
      toast.error("No valid applications found for selected interviews");
      return;
    }

    setIsOnboarding(true);
    try {
      const result = await bulkCreateOnBoarding({applicationIds});
      if (result) {
        toast.success(`Successfully onboarded ${applicationIds.length} candidates`);
        setSelectedInterviews([]);
        router.push("/on-boarding");
      } else {
        toast.error("Failed to onboard candidates");
      }
    } catch (error) {
      toast.error("Failed to onboard candidates");
    } finally {
      setIsOnboarding(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setInterviewerFilter("all");
    setJobPositionFilter("all");
    setDateRange({from: null, to: null});
    setCurrentPage(1);
  };

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full h-full p-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interviews</h1>
          <p className="text-muted-foreground">
            Manage interviews for {selectedBranch.branch_name} -{" "}
            {selectedInstitution.institution_name}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("job-interviews/interview-pipeline")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600"
          >
            <Briefcase className="h-4 w-4" />
            Interview Pipeline
          </Button>
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_SCHEDULE_INTERVIEWS}>
            <Button onClick={handleCreateInterview} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Schedule Interview
            </Button>
          </ProtectedComponent>
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
              <div className="text-2xl font-bold">
                {interviews.filter((i) => i.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {interviews.filter((i) => i.status === "scheduled").length}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              {(() => {
                const ratedInterviews = interviews.filter((i) => i.rating);
                const averageRating =
                  ratedInterviews.reduce((sum, i) => sum + (i.rating || 0), 0) /
                    ratedInterviews.length || 0;
                const roundedAverage = Math.round(averageRating);
                return (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(roundedAverage)}</div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

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
          <Select value={jobPositionFilter} onValueChange={setJobPositionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jobPositions.map((position) => (
                <SelectItem key={position.value} value={position.value}>
                  {position.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={interviewerFilter} onValueChange={setInterviewerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by interviewer" />
            </SelectTrigger>
            <SelectContent>
              {interviewers.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="From date"
              value={dateRange.from || ""}
              onChange={(e) => setDateRange((prev) => ({...prev, from: e.target.value}))}
              className="w-[140px]"
            />
            <Input
              type="date"
              placeholder="To date"
              value={dateRange.to || ""}
              onChange={(e) => setDateRange((prev) => ({...prev, to: e.target.value}))}
              className="w-[140px]"
            />
          </div>
          {(searchTerm ||
            statusFilter !== "all" ||
            interviewerFilter !== "all" ||
            dateRange.from ||
            dateRange.to) && (
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {!isLoading && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>
            Showing {filteredInterviews.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredInterviews.length)} of{" "}
            {filteredInterviews.length} interviews
            {(searchTerm ||
              statusFilter !== "all" ||
              interviewerFilter !== "all" ||
              dateRange.from ||
              dateRange.to) &&
              ` (filtered from ${interviews.length} total)`}
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
              {searchTerm ||
              statusFilter !== "all" ||
              interviewerFilter !== "all" ||
              dateRange.from ||
              dateRange.to
                ? "No interviews match your search criteria."
                : "Get started by scheduling your first interview."}
            </p>
            {searchTerm ||
            statusFilter !== "all" ||
            interviewerFilter !== "all" ||
            dateRange.from ||
            dateRange.to ? (
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
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(
                  paginatedInterviews.reduce(
                    (groups, interview) => {
                      const applicantName =
                        interview.job_position_application_details?.applicant_name || "Unknown";
                      if (!groups[applicantName]) {
                        groups[applicantName] = {
                          interviews: [],
                          contact: {
                            email: interview.job_position_application_details?.applicant_email,
                            phone: interview.job_position_application_details?.applicant_phone,
                            address: interview.job_position_application_details?.address,
                            state: interview.job_position_application_details?.state,
                          },
                        };
                      }
                      groups[applicantName].interviews.push(interview);
                      return groups;
                    },
                    {} as Record<string, {interviews: IInterview[]; contact: any}>,
                  ),
                ).map(([applicantName, data]) => (
                  <React.Fragment key={applicantName}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setExpandedApplicants((prev) =>
                              prev.includes(applicantName)
                                ? prev.filter((a) => a !== applicantName)
                                : [...prev, applicantName],
                            );
                          }}
                        >
                          {expandedApplicants.includes(applicantName) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(applicantName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{applicantName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          <div>{data.contact.email}</div>
                          <div>{data.contact.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{data.interviews.length} interviews</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(data.interviews[data.interviews.length - 1].status)}
                          <Badge
                            variant={getStatusBadgeVariant(
                              data.interviews[data.interviews.length - 1].status,
                            )}
                          >
                            {data.interviews[data.interviews.length - 1].status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() =>
                            handleViewInterview(data.interviews[data.interviews.length - 1].id)
                          }
                        >
                          View Latest
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedApplicants.includes(applicantName) &&
                      data.interviews.map((interview) => (
                        <TableRow key={interview.id} className="bg-muted/30">
                          <TableCell />
                          <TableCell className="pl-11">
                            <div className="font-medium">
                              {
                                interview.job_position_application_details
                                  ?.job_position_advert_job_details?.name
                              }
                            </div>
                            <Badge variant="outline" className="mt-1">
                              {interview.interview_stage_details?.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(interview.interview_date)}
                            </div>
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(interview.status)}
                                <Badge variant={getStatusBadgeVariant(interview.status)}>
                                  {interview.status}
                                </Badge>
                              </div>
                              {interview.rating && (
                                <div className="flex items-center gap-1">
                                  <div className="flex">
                                    {getRatingStars(Math.round(interview.rating / 2))}
                                  </div>
                                  <span className="text-xs ml-1">{interview.rating}/10</span>
                                </div>
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
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewInterview(interview.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditInterview(interview.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteInterview(interview.id)}
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
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredInterviews.length)} of{" "}
                  {filteredInterviews.length} interviews
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Select
                    value={currentPage.toString()}
                    onValueChange={(value) => handlePageChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                        <SelectItem key={page} value={page.toString()}>
                          {page}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
