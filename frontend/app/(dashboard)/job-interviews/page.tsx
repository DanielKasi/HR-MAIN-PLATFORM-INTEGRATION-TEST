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
import {Card, CardContent, CardHeader} from "@/components/ui/card";
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
import {getInterviews, bulkCreateOnBoarding, getPaginatedInterviews, getPaginatedInterviewsFromUrl} from "@/lib/utils";
import type {IInterview} from "@/types/types.utils";
import {PERMISSION_CODES} from "@/types/types.utils";
import {toast} from "sonner";
import ProtectedComponent from "@/components/ProtectedComponent";
import {formatCurrency} from "@/lib/helpers";
import {useDocumentTitle} from "@/hooks/use-document-title";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";

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
      const completedInterviews = filteredInterviews
        .filter((interview) => interview.status === "completed")
        .map((interview) => interview.id);
      setSelectedInterviews((prev) => [...new Set([...prev, ...completedInterviews])]);
    } else {
      const completedInterviewIds = filteredInterviews
        .filter((interview) => interview.status === "completed")
        .map((interview) => interview.id);
      setSelectedInterviews((prev) =>
        prev.filter((id) => !completedInterviewIds.includes(id)),
      );
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

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setInterviewerFilter("all");
    setJobPositionFilter("all");
    setDateRange({from: null, to: null});
  };

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col w-full h-auto p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interviews</h1>
          <p className="text-muted-foreground text-sm md:text-base">
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
            className="flex items-center gap-2 relative"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="text-xs hover:inline  py-1 px-3 rounded-2xl bg-gray-900/80 text-white shadow-sm z-70 absolute md:static -top-4 left-1/2 -translate-x-1/2 md:inline md:shadow-none md:text-inherit md:text-sm md:translate-x-0 md:rounded-none md:bg-transparent">
              Refresh
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("job-interviews/interview-pipeline")}
            className="md:flex items-center md:gap-2 bg-green-600 hover:bg-green-700 text-white hover:text-white border-green-600"
          >
            <Briefcase className="h-4 w-4" />
            <span className="hidden md:inline">Interview Pipeline</span>
          </Button>
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_SCHEDULE_INTERVIEWS}>
            <Button
              size="sm"
              onClick={handleCreateInterview}
              className="md:flex items-center md:gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">Schedule Interview</span>
            </Button>
          </ProtectedComponent>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-10">
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
      <div className="flex flex-col lg:flex-row gap-4 mt-10 mb-4">
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

      {/* Error Message */}
      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      {/* Interviews Table */}
      <div>
        {isLoading ? (
          <div className="p-2 space-y-6 mt-8">
            <Card className="h-[calc(100vh-2rem)] shadow-lg">
              <CardHeader className="border-b">
                <div className="flex justify-between gap-8 items-center">
                  <div className="flex items-center justify-start gap-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardHeader>
              <TableSkeleton rows={10} columns={6} />
            </Card>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto mt-8">
              <PaginatedTableWrapper<IInterview>
                fetchFirstPage={async () => {
                  if (!selectedInstitution) throw new Error("No institution selected");
                  return await getPaginatedInterviews({
                    institutionId: selectedInstitution.id,
                    page: 1,
                    search: searchTerm || undefined,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                  });
                }}
                fetchFromUrl={getPaginatedInterviewsFromUrl}
                deps={[selectedInstitution?.id, searchTerm, statusFilter, interviewerFilter, jobPositionFilter, dateRange.from, dateRange.to]}
                className="space-y-4"
                footerClassName="pt-4"
              >
                {({data, loading, refresh}: {data: any, loading: boolean, refresh: () => void}) => {
                  if (loading) {
                    return <TableSkeleton rows={10} columns={6} />;
                  }

                  // Handle both array and paginated response formats
                  let interviews: IInterview[] = [];
                  if (Array.isArray(data)) {
                    // Direct array response
                    interviews = data;
                  } else if (data?.results && Array.isArray(data.results)) {
                    // Paginated response format
                    interviews = data.results;
                  } else {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        Unexpected data format received from server.
                      </div>
                    );
                  }

                  if (!interviews || interviews.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        {searchTerm || statusFilter !== "all" || interviewerFilter !== "all" || jobPositionFilter !== "all" || dateRange.from || dateRange.to
                          ? "No interviews match your current filters."
                          : "No interviews have been scheduled yet."}
                      </div>
                    );
                  }

                  // Apply client-side filters (interviewer, job position, date range)
                  let filteredResults = interviews.filter((interview) => {
                    // Apply status filter
                    if (statusFilter !== "all") {
                      const interviewStatus = interview.status?.toLowerCase().trim();
                      const filterStatus = statusFilter.toLowerCase().trim();
                      if (interviewStatus !== filterStatus) {
                        return false;
                      }
                    }

                    // Apply interviewer filter
                    if (interviewerFilter !== "all") {
                      const hasInterviewer = interview.interview_stage_details?.interviewers_details?.some(
                        (employee: any) => `${employee.first_name} ${employee.last_name}` === interviewerFilter
                      );
                      if (!hasInterviewer) return false;
                    }

                    // Apply job position filter
                    if (jobPositionFilter !== "all") {
                      const positionName = interview.job_position_application_details?.job_position_advert_job_details?.name;
                      if (positionName !== jobPositionFilter) return false;
                    }

                    // Apply date range filter
                    if (dateRange.from || dateRange.to) {
                      const interviewDate = new Date(interview.interview_date).getTime();
                      const fromDate = dateRange.from ? new Date(dateRange.from).getTime() : -Infinity;
                      const toDate = dateRange.to ? new Date(dateRange.to).getTime() : Infinity;
                      if (interviewDate < fromDate || interviewDate > toDate) return false;
                    }

                    return true;
                  });

                  // Ensure filteredResults is always defined
                  if (!filteredResults) {
                    filteredResults = [];
                  }

                  // Group interviews by applicant
                  if (!filteredResults || filteredResults.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        {searchTerm || statusFilter !== "all" || interviewerFilter !== "all" || jobPositionFilter !== "all" || dateRange.from || dateRange.to
                          ? "No interviews match your current filters."
                          : "No interviews have been scheduled yet."}
                      </div>
                    );
                  }

                  // Fallback: If grouping fails, show raw data
                  let groupedInterviews: [string, {interviews: IInterview[]; contact: any}][];
                  try {
                    groupedInterviews = Object.entries(
                      filteredResults.reduce(
                        (groups, interview) => {
                          const applicantName =
                            interview.job_position_application_details?.applicant_name || "Unknown Applicant";
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
                        {} as Record<string, {interviews: IInterview[]; contact: any}>
                      )
                    );
                  } catch (error) {
                    console.error("Error grouping interviews:", error);
                    // Fallback: show raw data without grouping
                    return (
                      <div className="space-y-4">
                        <div className="text-center py-4 text-muted-foreground">
                          Showing raw interview data (grouping failed)
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Applicant</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredResults.map((interview) => (
                              <TableRow key={interview.id}>
                                <TableCell>{interview.id}</TableCell>
                                <TableCell>{interview.status}</TableCell>
                                <TableCell>{interview.interview_date}</TableCell>
                                <TableCell>
                                  {interview.job_position_application_details?.applicant_name || "Unknown"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="overflow-x-auto">
                        <Table className="min-w-full [&_th]:border-0 [&_td]:border-0">
                          <TableHeader className="bg-gray-50/50">
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
                            {groupedInterviews.map(([applicantName, data]) => (
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
                                      <ChevronDown className="h-4 w-4" />
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
                                      <TableCell className="pl-11">
                                        <div className="text-sm text-muted-foreground">
                                          {formatDate(interview.interview_date)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {interview.location}
                                        </div>
                                      </TableCell>
                                      <TableCell className="pl-11">
                                        <div className="flex items-center gap-2">
                                          {interview.rating && getRatingStars(interview.rating)}
                                        </div>
                                      </TableCell>
                                      <TableCell className="pl-11">
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon(interview.status)}
                                          <Badge variant={getStatusBadgeVariant(interview.status)}>
                                            {interview.status}
                                          </Badge>
                                        </div>
                                      </TableCell>
                                      <TableCell className="pl-11">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleViewInterview(interview.id)}>
                                              <Eye className="h-4 w-4 mr-2" />
                                              View
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
                      </div>
                    </>
                  );
                }}
              </PaginatedTableWrapper>
            </div>
          </>
        )}
      </div>
    </div>
  );
}