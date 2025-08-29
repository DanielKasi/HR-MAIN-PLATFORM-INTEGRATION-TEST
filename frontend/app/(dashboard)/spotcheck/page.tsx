"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { 
  MapPin,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { useRouter } from "next/navigation";
import { spotcheckAPI } from "@/lib/utils";
import type { ISpotCheck, ISpotCheckStatus } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";
import { Icon } from "@iconify/react"
import ProtectedPage from "@/components/ProtectedPage";

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "missed":
      return "bg-red-100 text-red-800 border-red-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    default:
      return status;
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

const formatDuration = (duration: string) => {
  const minutes = parseInt(duration);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const SpotcheckComponent = () => {
  const router = useRouter();
  const isMobile = useMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [spotcheckStatuses, setSpotcheckStatuses] = useState<Array<ISpotCheckStatus>>([]);
  const [summaryData, setSummaryData] = useState({
    totalSpotChecks: 0,
    totalMissed: 0,
    missedThisMonth: 0,
    missedThisWeek: 0,
    missedToday: 0,
  });
  const refreshTableRef = useRef<(() => void) | null>(null);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Fetch summary data
  useEffect(() => {
    const fetchSummary = async () => {
      if (!selectedInstitution?.id) return;
      try {
        const summary = await spotcheckAPI.getSummary(selectedInstitution.id);
        setSummaryData(summary);
      } catch (error) {
        console.error("Error fetching spotcheck summary:", error);
      }
    };

    fetchSummary();
  }, [selectedInstitution?.id]);

  // Fetch spotcheck statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const statuses = await spotcheckAPI.getStatuses();
        setSpotcheckStatuses(statuses);
      } catch (error) {
        console.error("Error fetching spotcheck statuses:", error);
      }
    };

    fetchStatuses();
  }, []);

  const handleViewSpotcheckDetails = (spotcheck: ISpotCheck) => {
    router.push(`/spotcheck/${spotcheck.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Spot Checks */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spot Checks</p>
              <p className="text-2xl font-bold text-gray-900">{summaryData.totalSpotChecks}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Missed */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Missed</p>
              <p className="text-2xl font-bold text-red-600">{summaryData.totalMissed}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Missed This Month */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Missed(This Month)</p>
              <p className="text-2xl font-bold text-orange-600">{summaryData.missedThisMonth}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Missed This Week */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Missed(This Week)</p>
              <p className="text-2xl font-bold text-yellow-600">{summaryData.missedThisWeek}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Missed Today */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Missed(Today)</p>
              <p className="text-2xl font-bold text-purple-600">{summaryData.missedToday}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm min-h-screen">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Spot Checks</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Icon icon="hugeicons:search-01" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5" />
                <Input
                  placeholder="Search spot checks"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {
                    spotcheckStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.code}>
                        {status.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<ISpotCheck>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await spotcheckAPI.getPaginated({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={spotcheckAPI.getPaginatedFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              // Store refresh function in ref when component mounts/updates
              useEffect(() => {
                refreshTableRef.current = refresh;
              }, [refresh]);

              if (loading) {
                return <TableSkeleton rows={10} columns={6} />;
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No spot checks found matching your search criteria" : "No spot checks found"}
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data.results.filter((spotcheck) => {
                const matchesStatus = statusFilter === "all" || spotcheck.status.code === statusFilter;
                return matchesStatus;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No spot checks found matching the selected status filter.
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          
                          <TableHead>Time</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((spotcheck) => (
                          <TableRow key={spotcheck.id}>
                            
                            <TableCell className="font-medium">{formatDate(spotcheck.time)}</TableCell>
                            <TableCell className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {spotcheck.location.lat.toFixed(4)}, {spotcheck.location.lon.toFixed(4)}
                              </span>
                            </TableCell>
                            <TableCell>{formatDuration(spotcheck.duration)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(spotcheck.status.code)}>
                                {getStatusDisplay(spotcheck.status.code)}
                              </Badge>
                            </TableCell>
                           
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-3">
                    {filteredResults.map((spotcheck) => (
                      <div key={spotcheck.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <h3 className="font-semibold text-gray-900">Spot Check #{spotcheck.id}</h3>
                            </div>
                            <div className="space-y-1 mb-2">
                              <p className="text-sm text-gray-600">
                                Time: {formatDate(spotcheck.time)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Location: {spotcheck.location.lat.toFixed(4)}, {spotcheck.location.lon.toFixed(4)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Duration: {formatDuration(spotcheck.duration)}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(spotcheck.status.code)}>
                                  {getStatusDisplay(spotcheck.status.code)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                       
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>
    </div>
  );
};

export default SpotcheckComponent;

