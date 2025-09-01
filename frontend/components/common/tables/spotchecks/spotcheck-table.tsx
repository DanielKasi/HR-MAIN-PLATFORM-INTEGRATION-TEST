"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { showErrorToast, spotcheckAPI } from "@/lib/utils";
import type { IEmployee, ISpotCheck, ISpotCheckStatus } from "@/types/types.utils";

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

interface SpotcheckTableProps {
  searchTerm?: string,
  className?: string,
  footerClassName?: string,
  refreshTableRef?: React.RefObject<() => void>;
  scope: { type: "default" } | { type: "employee", employee: IEmployee },
  statusFilter?: ISpotCheckStatus | null
}


export default function SpotchecksTable({ searchTerm, refreshTableRef, statusFilter, scope }: SpotcheckTableProps) {

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Ref to store the refresh function from PaginatedTableWrapper
  const localRefreshRef = refreshTableRef || useRef<(() => void) | null>(null);

  return (
    <PaginatedTableWrapper<ISpotCheck>
      fetchFirstPage={async () => {
        if (!selectedInstitution) throw new Error("No institution selected");
        return await spotcheckAPI.getPaginated({
          institutionId: selectedInstitution.id,
          scope,
          page: 1,
          search: searchTerm || undefined,
        });
      }}
      onError={(error) => showErrorToast({ error, defaultMessage: "Failed to fetch spotchecks !" })}
      fetchFromUrl={spotcheckAPI.getPaginatedFromUrl}
      deps={[selectedInstitution?.id, searchTerm]}
      className="space-y-4"
      footerClassName="pt-4"
    >
      {({ data, loading, refresh }) => {
        // Store refresh function in ref when component mounts/updates
        useEffect(() => {
          localRefreshRef.current = refresh;
        }, [refresh]);

        if (loading) {
          return <TableSkeleton rows={10} columns={6} />;
        }

        if (!data || data.results.length === 0) {
          return (
            <div className="text-center py-8 text-gray-500">
              {"No spot checks found"}
            </div>
          );
        }

        // Apply client-side filters (status filter)
        const filteredResults = data.results.filter((spotcheck) => {
          const matchesStatus = statusFilter === null || spotcheck.status.code === statusFilter?.code;
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
            <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>

                    <TableHead>Time</TableHead>
                    {/* <TableHead>Location</TableHead>
                    <TableHead>Duration</TableHead> */}
                    <TableHead className="text-right">Status</TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((spotcheck) => (
                    <TableRow key={spotcheck.id}>

                      <TableCell className="font-medium">{spotcheck?.spotcheck_time ? formatDate(spotcheck?.spotcheck_time) : "Not available"}</TableCell>
                      {/* <TableCell className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        {
                          spotcheck?.latitude ? (
                            <span className="text-sm">
                              {spotcheck?.latitude?.toFixed(4) || "Not available"}, {spotcheck?.longitude?.toFixed(4) || "Not available"}
                            </span>
                          ) :
                            <>{"Not available"}</>
                        }
                      </TableCell>
                      <TableCell>{spotcheck?.duration ? formatDuration(spotcheck?.duration) : "Not available"}</TableCell> */}
                      <TableCell className="text-right">
                        <Badge className={getStatusColor(spotcheck.status.code)}>
                          {spotcheck.status.status_name.replace("_", " ") || "Unknown"}
                        </Badge>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>


          </>
        );
      }}
    </PaginatedTableWrapper>
  );
}
