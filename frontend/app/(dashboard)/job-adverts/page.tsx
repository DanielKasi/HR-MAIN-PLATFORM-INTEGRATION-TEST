"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  Megaphone,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Calendar,
  Users,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { getJobPositionAdverts, updateJobPositionAdvert } from "@/lib/utils";
import type { JobPositionAdvert, JobAdvertStatus, PaginatedResponse } from "@/app/types/types.utils";
import { toast } from "sonner";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/app/types/types.utils";
import { useDocumentTitle } from "@/hooks/use-document-title";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

type ApiResponse = PaginatedResponse<JobPositionAdvert> | null;

const getStatusColor = (status: JobAdvertStatus) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "archived":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "expired":
      return "bg-red-100 text-red-800 border-red-200";
    case "closed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusVariant = (status: JobAdvertStatus) => {
  switch (status) {
    case "active":
      return "success";
    case "archived":
      return "secondary";
    case "expired":
      return "destructive";
    case "closed":
      return "outline";
    default:
      return "secondary";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isExpired = (expiryDate: string) => {
  return new Date(expiryDate) < new Date();
};

export default function JobAdvertsPage() {
  const [jobAdverts, setJobAdverts] = useState<JobPositionAdvert[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
  }>({ count: 0, next: null, previous: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [error, setError] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [closingAdvertId, setClosingAdvertId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  useDocumentTitle("JOB OPENINGS")

  const fetchJobAdverts = useCallback(
    async (showRefreshLoader = false, page = 1, size = DEFAULT_PAGE_SIZE) => {
      if (!selectedInstitution) return;

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError("");

        const response: ApiResponse = await getJobPositionAdverts({
          institutionId: selectedInstitution.id,
        });

        let advertsArray: JobPositionAdvert[] = [];
        let pagination: { count: number; next: string | null; previous: string | null } = {
          count: 0,
          next: null,
          previous: null,
        };

        if (response && "results" in response && Array.isArray(response.results)) {
          advertsArray = response.results;
          pagination = {
            count: response.count || 0,
            next: response.next || null,
            previous: response.previous || null,
          };
        } else if (response === null) {
          advertsArray = [];
        }

        setJobAdverts(advertsArray);
        setPaginationInfo(pagination);
      } catch (err) {
        setJobAdverts([]);
        setError(`Failed to fetch job openings: ${err instanceof Error ? err.message : "Unknown error"}`);
        toast.error("Failed to load job openings");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedInstitution?.id]
  );

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard");
      return;
    }
    fetchJobAdverts(false, currentPage, pageSize);
  }, [selectedInstitution?.id, selectedBranch?.id, currentPage, pageSize, fetchJobAdverts]);

  const handleRefresh = useCallback(() => {
    fetchJobAdverts(true, 1, pageSize);
    setCurrentPage(1);
  }, [fetchJobAdverts, pageSize]);

  const filteredJobAdverts = useMemo(() => {
    if (!Array.isArray(jobAdverts)) {
      return [];
    }

    return jobAdverts.filter((advert) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : advert.job_position_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advert.extra_information?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || advert.job_position_advert_status === statusFilter;

      const matchesDateRange = !dateRange.from && !dateRange.to
        ? true
        : (() => {
          const publishedDate = new Date(advert.published_date).getTime();
          const fromDate = dateRange.from ? new Date(dateRange.from).getTime() : -Infinity;
          const toDate = dateRange.to ? new Date(dateRange.to).getTime() : Infinity;
          return publishedDate >= fromDate && publishedDate <= toDate;
        })();

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [jobAdverts, searchTerm, statusFilter, dateRange]);

  const publishedAdverts = useMemo(
    () => (Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "active") : []),
    [jobAdverts]
  );

  const draftAdverts = useMemo(
    () =>
      Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "archived") : [],
    [jobAdverts]
  );

  const expiredAdverts = useMemo(
    () =>
      Array.isArray(jobAdverts)
        ? jobAdverts.filter((advert) => advert.job_position_advert_status === "expired" || isExpired(advert.expiry_date))
        : [],
    [jobAdverts]
  );

  const handleCreateJobAdvert = useCallback(() => {
    router.push("/job-adverts/create");
  }, [router]);

  const handleEditJobAdvert = useCallback(
    (advertId: number) => {
      router.push(`/job-adverts/${advertId}/edit`);
    },
    [router]
  );

  const handleArchiveJobAdvert = useCallback((advertId: number) => {
    toast.success("Job advert archiving would be implemented here");
  }, []);

  const handleCloseJobAdvert = useCallback(
    async (advertId: number) => {
      if (!advertId) return;

      try {
        setIsClosing(true);
        const updatedAdvert = await updateJobPositionAdvert({
          advertId: advertId,
          advertData: { job_position_advert_status: "closed" },
        });

        if (updatedAdvert) {
          toast.success("Job advert closed successfully!");
          fetchJobAdverts(true, currentPage, pageSize);
        } else {
          toast.error("Failed to close job openings");
        }
      } catch (error) {
        toast.error("Failed to close job openings");
      } finally {
        setIsClosing(false);
        setClosingAdvertId(null); // Reset the closing advert ID
      }
    },
    [fetchJobAdverts, currentPage, pageSize]
  );

  const handleViewJobAdvert = useCallback(
    (advertId: number) => {
      router.push(`/job-adverts/${advertId}`);
    },
    [router]
  );

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
    setDateRange({ from: null, to: null });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(paginationInfo.count / pageSize);

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Openings</h1>
          <p className="text-muted-foreground">
            Manage job openings for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
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
          <Button onClick={handleCreateJobAdvert} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Job Opening
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search job openings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 min-w-80">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full px-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="From date"
            value={dateRange.from || ""}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            className="w-[200px]"
          />
          <Input
            type="date"
            placeholder="To date"
            value={dateRange.to || ""}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            className="w-[200px]"
          />
        </div>
      </div>

      {/* Rows per Page Selector */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
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

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{paginationInfo.count}</div>
              <p className="text-xs text-muted-foreground">Total Openings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{publishedAdverts.length}</div>
              <p className="text-xs text-muted-foreground">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{draftAdverts.length}</div>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{expiredAdverts.length}</div>
              <p className="text-xs text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-4 rounded-md border border-destructive/20">
          <div className="font-semibold mb-2">Error Loading Job Openings</div>
          <div className="text-sm">{error}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-3"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Try Again
          </Button>
        </div>
      )}

      {/* Job Adverts Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredJobAdverts.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No job adverts found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || dateRange.from || dateRange.to
              ? "No job adverts match your filter criteria."
              : "Get started by creating your first job opening."}
          </p>
          {searchTerm || statusFilter !== "all" || dateRange.from || dateRange.to ? (
            <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2">
              Clear Filters
            </Button>
          ) : (
            <Button onClick={handleCreateJobAdvert} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Job Opening
            </Button>
          )}
        </Card>
      ) : (
        <Card className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Employees Required</TableHead>
                <TableHead>Interview Stages</TableHead>
                <TableHead>Additional Info</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobAdverts.map((advert) => (
                <TableRow key={advert.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full ${advert.job_position_advert_status === "active"
                            ? "bg-green-50"
                            : advert.job_position_advert_status === "expired"
                              ? "bg-red-50"
                              : "bg-gray-50"
                          } flex items-center justify-center`}
                      >
                        <Megaphone
                          className={`h-4 w-4 ${advert.job_position_advert_status === "active"
                              ? "text-green-600"
                              : advert.job_position_advert_status === "expired"
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                        />
                      </div>
                      <span>{advert.job_position_details?.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(advert.job_position_advert_status)}>
                      {advert.job_position_advert_status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(advert.published_date)}</TableCell>
                  <TableCell>
                    <span className={`${isExpired(advert.expiry_date) ? "text-red-600 font-medium" : ""}`}>
                      {formatDate(advert.expiry_date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {advert.number_of_employees_expected || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {advert.interview_stages?.length || 0} stages
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">
                      {advert.extra_information || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_ADVERTS}>
                          <DropdownMenuItem onClick={() => handleViewJobAdvert(advert.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_JOB_ADVERTS}>
                          <DropdownMenuItem onClick={() => handleEditJobAdvert(advert.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_JOB_ADVERTS}>
                          <Dialog
                            open={closingAdvertId === advert.id}
                            onOpenChange={(open) => setClosingAdvertId(open ? advert.id : null)}
                          >
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive"
                                disabled={isClosing}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Close
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Are you sure you want to close this job opening?</DialogTitle>
                                <DialogDescription>
                                  Closing this job advert will change its status to "closed" and prevent further applications. This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setClosingAdvertId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleCloseJobAdvert(advert.id)}
                                  disabled={isClosing}
                                >
                                  {isClosing ? "Closing..." : "Close Job Opening"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </ProtectedComponent>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Clear Filters Button */}
      {(searchTerm || statusFilter !== "all" || dateRange.from || dateRange.to) && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            Clear Filters
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredJobAdverts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredJobAdverts.length)} of {filteredJobAdverts.length} job openings
          {(searchTerm || statusFilter !== "all" || dateRange.from || dateRange.to) && ` (filtered from ${paginationInfo.count} total)`}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
      )}
    </div>
  );
}