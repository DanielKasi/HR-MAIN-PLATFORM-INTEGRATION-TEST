"use client";

import React, {useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {showErrorToast, shiftsAPI} from "@/lib/utils";
import type {IEmployee, IEmployeeShift} from "@/types/types.utils";

interface ShiftsTableProps {
  searchTerm?: string;
  className?: string;
  footerClassName?: string;
  refreshTableRef?: React.RefObject<() => void>;
  scope:
    | {type: "default"}
    | {type: "employee"; employee: IEmployee}
    | {type: "branch"; branch: {id: number; name?: string}};
}

export default function ShiftsTable({searchTerm, refreshTableRef, scope}: ShiftsTableProps) {
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const localRefreshRef = refreshTableRef || useRef<(() => void) | null>(null);

  return (
    <PaginatedTableWrapper<IEmployeeShift>
      fetchFirstPage={async () => {
        if (!selectedInstitution) throw new Error("No institution selected");
        if (scope.type === "employee") {
          return await shiftsAPI.EMPLOYEE.getPaginatedForEmployee({
            search: searchTerm,
            page: 1,
            employee_id: scope.employee.id,
          });
        }
        if (scope.type === "default") {
          return await shiftsAPI.EMPLOYEE.getPaginatedForInstitution({search: searchTerm, page: 1});
        }
        if (scope.type === "branch") {
          return await shiftsAPI.BRANCH.getAll({branch_id:scope.branch.id});
        }
        return {results: [], count: 0} as any;
      }}
      onError={(error) => showErrorToast({error, defaultMessage: "Failed to fetch shifts"})}
      fetchFromUrl={async (args: {url: string}) =>
        shiftsAPI.EMPLOYEE.getPaginatedFromUrl({
          url: args.url,
          is_employee_specific: scope.type === "employee",
          employee_id: scope.type === "employee" ? scope.employee.id : undefined,
        })
      }
      deps={[selectedInstitution?.id, searchTerm]}
      className="space-y-4"
      footerClassName="pt-4"
    >
      {({data, loading, refresh}) => {
        useEffect(() => {
          // store refresh
          if (localRefreshRef && typeof localRefreshRef !== "function") {
            (localRefreshRef as any).current = refresh;
          }
        }, [refresh]);

        if (loading) return <TableSkeleton rows={8} columns={5} />;

        if (!data || data.results.length === 0) {
          return <div className="text-center py-8 text-gray-500">No shifts found</div>;
        }

        return (
          <>
            <div className="hidden sm:block rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.shift.name}</TableCell>
                      <TableCell>{(s.shift.shift_day as any)?.day_name || "-"}</TableCell>
                      <TableCell>{s.shift.start_time}</TableCell>
                      <TableCell>{s.shift.end_time}</TableCell>
                      <TableCell>{s.shift_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden space-y-3">
              {data.results.map((s) => (
                <div key={s.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{s.shift.name}</h3>
                      <p className="text-sm text-gray-600">
                        Day: {(s.shift.shift_day as any)?.day_name || "-"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {s.shift.start_time} - {s.shift.end_time}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">{s.shift_status}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }}
    </PaginatedTableWrapper>
  );
}
