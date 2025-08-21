"use client";

import {useState, useEffect, useCallback, useMemo} from "react";
import {useSelector} from "react-redux";
import {Clock, CheckCircle, XCircle, AlertCircle, Package} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {assetsAPI} from "@/lib/utils";
import type {IAssetAllocation} from "@/types/types.utils";
import {toast} from "sonner";

interface EmployeeAssetAllocationsProps {
  employeeId: string;
  institutionId?: number;
  showHeader?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

// Memoized utility functions to prevent recreation on every render
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "allocated":
      return "bg-green-100 text-green-800 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "cancelled":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "allocated":
      return "Allocated";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "allocated":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const EmployeeAssetAllocations: React.FC<EmployeeAssetAllocationsProps> = ({
  employeeId,
  institutionId,
  showHeader = true,
  showStats = true,
  compact = false,
}) => {
  const [allocations, setAllocations] = useState<IAssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionToUse = institutionId || selectedInstitution?.id;

  // Memoized fetch function to prevent unnecessary recreation
  const fetchEmployeeAllocations = useCallback(async () => {
    if (!institutionToUse || !employeeId) {
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous requests
    if (loading && hasInitialized) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching asset allocations with params:", {
        institutionId: institutionToUse,
        page: 1,
        employeeId: employeeId,
      });

      const response = await assetsAPI.getPaginatedAssetAllocations({
        institutionId: institutionToUse,
        page: 1,
        employeeId: employeeId,
      });

      console.log("Asset allocations response:", response);

      // Ensure response.results is an array
      const results = Array.isArray(response?.results) ? response.results : [];
      setAllocations(results);
      setHasInitialized(true);
    } catch (error: any) {
      console.error("Asset allocations error details:", {
        message: error?.message,
        status: error?.status,
        data: error?.response?.data,
        error: error,
      });

      const errorMessage = error?.message || error?.detail || "Failed to fetch asset allocations";
      setError(errorMessage);

      // Only show toast if component is still mounted and error is significant
      if (errorMessage !== "Failed to fetch asset allocations") {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [institutionToUse, employeeId, loading, hasInitialized]);

  // Optimized effect with proper dependencies
  useEffect(() => {
    if (institutionToUse && employeeId && !hasInitialized) {
      fetchEmployeeAllocations();
    }
  }, [institutionToUse, employeeId, hasInitialized, fetchEmployeeAllocations]);

  // Memoized stats calculation to prevent recalculation on every render
  const stats = useMemo(() => {
    if (!Array.isArray(allocations)) {
      return {total: 0, allocated: 0, pending: 0, rejected: 0};
    }

    return {
      total: allocations.length,
      allocated: allocations.filter((a) => a?.allocation_status === "allocated").length,
      pending: allocations.filter((a) => a?.allocation_status === "pending").length,
      rejected: allocations.filter((a) => a?.allocation_status === "rejected").length,
    };
  }, [allocations]);

  // Memoized status badge component to prevent recreation
  const StatusBadge = useCallback(
    ({status}: {status: string}) => (
      <div className="flex items-center space-x-2">
        {getStatusIcon(status)}
        <Badge className={getStatusColor(status)}>{getStatusDisplay(status)}</Badge>
      </div>
    ),
    [],
  );

  // Early returns for loading and error states
  if (loading && !hasInitialized) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#162032]" />
            <h3 className="text-lg font-semibold text-[#162032]">Asset Allocations</h3>
          </div>
        )}
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#162032]" />
            <h3 className="text-lg font-semibold text-[#162032]">Asset Allocations</h3>
          </div>
        )}
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
          <button
            onClick={() => {
              setError(null);
              setHasInitialized(false);
            }}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Safe check for allocations array
  const safeAllocations = Array.isArray(allocations) ? allocations : [];

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[#162032]" />
          <h3 className="text-lg font-semibold text-[#162032]">Asset Allocations</h3>
        </div>
      )}

      {showStats && safeAllocations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
            <CardContent className={compact ? "p-3" : "p-4"}>
              <div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Total</div>
              <div className={`text-${compact ? "lg" : "2xl"} font-bold text-[#162032]`}>
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
            <CardContent className={compact ? "p-3" : "p-4"}>
              <div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Allocated</div>
              <div className={`text-${compact ? "lg" : "2xl"} font-bold text-[#3cb371]`}>
                {stats.allocated}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
            <CardContent className={compact ? "p-3" : "p-4"}>
              <div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Pending</div>
              <div className={`text-${compact ? "lg" : "2xl"} font-bold text-[#f59e0b]`}>
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
            <CardContent className={compact ? "p-3" : "p-4"}>
              <div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Rejected</div>
              <div className={`text-${compact ? "lg" : "2xl"} font-bold text-[#e21732]`}>
                {stats.rejected}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {safeAllocations.length === 0 ? (
        <div className="text-center py-8 text-[#848496]">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No asset allocations found for this employee</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <div className="bg-white rounded-lg overflow-hidden border border-[#e8e8f2]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f7f7fb] hover:bg-[#f7f7fb]">
                    <TableHead className="font-semibold text-[#162032]">Allocation Code</TableHead>
                    <TableHead className="font-semibold text-[#162032]">Asset</TableHead>
                    <TableHead className="font-semibold text-[#162032]">Allocated By</TableHead>
                    <TableHead className="font-semibold text-[#162032]">Date</TableHead>
                    <TableHead className="font-semibold text-[#162032]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeAllocations.map((allocation) => (
                    <TableRow key={allocation.id} className="hover:bg-[#f7f7fb]/50">
                      <TableCell className="font-mono text-sm">
                        {allocation.alloc_code || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {allocation.asset?.asset_name || "Unknown Asset"}
                      </TableCell>
                      <TableCell>
                        {allocation.allocated_by?.user?.fullname || "Unknown User"}
                      </TableCell>
                      <TableCell className="text-[#848496]">
                        {allocation.created_at ? formatDate(allocation.created_at) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={allocation.allocation_status || "unknown"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {safeAllocations.map((allocation) => (
              <Card key={allocation.id} className="bg-gray-50 border-[#e8e8f2]">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#162032] mb-1">
                          {allocation.asset?.asset_name || "Unknown Asset"}
                        </h4>
                        <p className="text-sm text-[#848496] font-mono mb-2">
                          Code: {allocation.alloc_code || "N/A"}
                        </p>
                      </div>
                      <StatusBadge status={allocation.allocation_status || "unknown"} />
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-[#848496]">
                        <span className="text-[#162032] font-medium">Allocated by:</span>{" "}
                        {allocation.allocated_by?.user?.fullname || "Unknown User"}
                      </p>
                      <p className="text-[#848496]">
                        <span className="text-[#162032] font-medium">Date:</span>{" "}
                        {allocation.created_at ? formatDate(allocation.created_at) : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {loading && hasInitialized && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4426da] mx-auto"></div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAssetAllocations;
