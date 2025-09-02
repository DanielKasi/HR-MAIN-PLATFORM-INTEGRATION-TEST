"use client";

import React, {RefObject} from "react";

import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {getPaginatedEmployees, getPaginatedEmployeesFromUrl} from "@/lib/utils";
import {IEmployee} from "@/types/types.utils";

import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {AttendanceRecordsTable} from "@/components/attendance/attendance-records-table";

interface EmployeeAttendanceProps {
  searchTerm?: string;
  scope: {type: "default"} | {type: "employee"; employee: IEmployee};
  attendanceRefreshRef?: RefObject<() => void | null>;
  showingOnDashboard?: boolean;
}

const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({
  scope,
  searchTerm,
  attendanceRefreshRef,
  showingOnDashboard,
}) => {
  const selectedInstitution = useSelector(selectSelectedInstitution);

  return (
    <PaginatedTableWrapper<IEmployee>
      fetchFirstPage={
        scope.type === "default"
          ? async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await getPaginatedEmployees({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm,
              });
            }
          : null
      }
      fetchFromUrl={scope.type === "default" ? getPaginatedEmployeesFromUrl : null}
      deps={[selectedInstitution?.id, searchTerm]}
      className=""
      footerClassName="pt-4"
    >
      {({data: employeesData, loading: employeesLoading, refresh: refreshEmployees}) => {
        const employees = employeesData?.results || [];

        return (
          <>
            {selectedInstitution ? (
              <AttendanceRecordsTable
                showingOnDashboard={showingOnDashboard}
                employeesLoading={employeesLoading}
                institutionId={selectedInstitution.id}
                searchTerm={searchTerm}
                attendanceRefreshRef={attendanceRefreshRef}
                scope={
                  scope.type === "default"
                    ? {type: "default", employees, employees_count: employeesData?.count || 0}
                    : {type: "employee", employee: scope.employee}
                }
              />
            ) : (
              <></>
            )}
          </>
        );
      }}
    </PaginatedTableWrapper>
  );
};

export default EmployeeAttendance;
