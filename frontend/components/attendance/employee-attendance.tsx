"use client";

import React, { RefObject } from "react";
import { useSelector } from "react-redux";

import { IEmployee } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { AttendanceRecordsTable } from "@/components/attendance/_components/attendance-records-table";

interface EmployeeAttendanceProps {
	searchTerm?: string;
	scope: { type: "default" } | { type: "employee"; employee: IEmployee };
	attendanceRefreshRef?: RefObject<(() => Promise<void>) | null>;
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
		<>
			{selectedInstitution ? (
				<AttendanceRecordsTable
					showingOnDashboard={showingOnDashboard}
					searchTerm={searchTerm}
					attendanceRefreshRef={attendanceRefreshRef}
					scope={scope}
				/>
			) : (
				<></>
			)}
		</>
	);
};

export default EmployeeAttendance;
