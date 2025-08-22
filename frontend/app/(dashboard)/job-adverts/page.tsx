"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Megaphone, Plus, MoreVertical, Edit, Trash2, RefreshCw, Eye, Calendar, Users, Briefcase, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Filter } from 'lucide-react';

import { Button } from "@/components/ui/button";
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
import { getJobPositionAdverts, updateJobPositionAdvert, getPaginatedJobAdverts, getPaginatedJobAdvertsFromUrl } from "@/lib/utils";
import type { JobPositionAdvert, JobAdvertStatus } from "@/types/types.utils";
import { toast } from "sonner";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/types/types.utils";
import { useDocumentTitle } from "@/hooks/use-document-title";
import RichTextDisplay from "@/components/common/rich-text-display";
import { formatCurrency } from "@/lib/helpers";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/table-skeleton";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;


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
  // const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [error, setError] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [closingAdvertId, setClosingAdvertId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const refreshTableRef = useRef<(() => void) | null>(null);

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  useDocumentTitle("JOB OPENINGS")






  const handleEditJobAdvert = useCallback(
    (advertId: number) => {
      router.push(`/job-adverts/${advertId}/edit`);
    },
    [router]
  );



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
          refreshTableRef.current?.(); // Add refresh call
        } else {
          toast.error("Failed to close job openings");
        }
      } catch (error) {
        toast.error("Failed to close job openings");
      } finally {
        setIsClosing(false);
        setClosingAdvertId(null);
      }
    },
    []
  );

  const handleViewJobAdvert = useCallback(
    (advertId: number) => {
      router.push(`/job-adverts/${advertId}`);
    },
    [router]
  );







  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>;
  }


 
  

  function handleRefresh(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    setIsRefreshing(true);
    setError("");
    refreshTableRef.current?.(); // Use the ref instead of router.refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg min-h-screen">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Openings</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search job advertisements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as "all" | "active" | "inactive" | "expired" | "draft")}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/job-adverts/create")}
                disabled={!selectedInstitution?.id}
                className=""
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Job Advert
              </Button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<JobPositionAdvert>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await getPaginatedJobAdverts({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
                branch: selectedBranch?.id?.toString() || undefined,
              });
            }}
            fetchFromUrl={getPaginatedJobAdvertsFromUrl}
            deps={[selectedInstitution?.id, selectedBranch?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              // Store refresh function in ref when component mounts/updates
              useEffect(() => {
                refreshTableRef.current = refresh;
              }, [refresh]);

              if (((!data || data.results.length === 0) && !loading)) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm 
                      ? "No job advertisements found matching your search" 
                      : "No job advertisements found"}
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data?.results.filter((advert) => {
                const matchesStatus = statusFilter === "all" || advert.job_position_advert_status === statusFilter;
                return matchesStatus;
              });

              if (filteredResults?.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No job advertisements match the selected status filter
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  { !loading ?
                  (<Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
                    <TableHeader className="bg-gray-50/50">
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
                      {filteredResults?.map((advert) => (
                        <TableRow key={advert.id}>
                          <TableCell className="font-medium">
                            <div className="font-medium text-gray-900">
                              {advert.job_position_details?.name || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(advert.job_position_advert_status)} className="whitespace-nowrap">
                              {advert.job_position_advert_status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(advert.published_date)}</TableCell>
                          <TableCell>
                            <span className={`whitespace-nowrap ${isExpired(advert.expiry_date) ? "text-red-600 font-medium" : ""}`}>
                              {formatDate(advert.expiry_date)}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(advert.number_of_employees_expected ?? 0) || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              {advert.interview_stages?.length || 0} stages
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                              <RichTextDisplay htmlContent={advert.extra_information || "-"} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
                                  <MoreVertical className="h-5 w-5 text-gray-600" />
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
                                    onOpenChange={(open: boolean) => setClosingAdvertId(open ? advert.id : null)}
                                  >
                                    {
                                      advert.job_position_advert_status !== "closed" &&
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
                                    }
                                    <DialogContent className="sm:max-w-[425px]">
                                      <DialogHeader>
                                        <DialogTitle>Are you sure you want to close <span className="ml-2">"{advert.job_position_details.name}"?</span> </DialogTitle>
                                        <DialogDescription>
                                          Closing this job advert will change its status to "closed" and prevent further applications. This action cannot be undone.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter className="flex-col sm:flex-row gap-2">
                                        <Button
                                          variant="outline"
                                          onClick={() => setClosingAdvertId(null)}
                                          className="w-full sm:w-auto"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleCloseJobAdvert(advert.id)}
                                          disabled={isClosing}
                                          className="w-full sm:w-auto"
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
                  </Table>):
                   <TableSkeleton hasHeader={false} columns={8} rows={5} />
                  }
                </div>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>

     
  
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



   

    </div>
  );
}