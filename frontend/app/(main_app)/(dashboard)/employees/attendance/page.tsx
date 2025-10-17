"use client";
import React, { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

import EmployeeAttendance from "../../../../../components/attendance/employee-attendance";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";

const AttendancePage = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();

	useEffect(() => {
		setLoading(false);
	}, [selectedInstitution]);

	const handleViewAttendance = () => {
		router.push("/employees/attendance/work-records");
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-gray-900 mx-auto" />
					<p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Loading employees...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex items-center justify-center">
				<div className="text-center max-w-md mx-auto">
					<p className="text-red-600 mb-4 text-sm sm:text-base">{error}</p>
					<button
						onClick={() => window.location.reload()}
						className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm sm:text-base"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
				<Card className="h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] shadow-lg">
					<CardHeader className="border-b p-4 sm:p-6">
						<div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-8 items-start sm:items-center">
							<div className="flex items-center justify-start gap-3 sm:gap-4 w-full sm:w-auto">
								<div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full animate-pulse" />
								<div className="space-y-2 flex-1 sm:flex-none">
									<div className="h-5 sm:h-6 bg-gray-200 rounded w-40 sm:w-64 animate-pulse" />
									<div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-48 animate-pulse" />
								</div>
							</div>
							<div className="flex gap-2 w-full sm:w-auto justify-start sm:justify-end">
								<div className="h-8 sm:h-10 w-20 sm:w-32 bg-gray-200 rounded animate-pulse" />
								<div className="h-8 sm:h-10 w-24 sm:w-36 bg-gray-200 rounded animate-pulse" />
								<div className="h-8 sm:h-10 w-16 sm:w-28 bg-gray-200 rounded animate-pulse" />
							</div>
						</div>
					</CardHeader>
					<TableSkeleton rows={8} columns={6} />
				</Card>
			</div>
		);
	}

	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ATTENDANCE_RECORDS}>
			<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-4 sm:py-6 md:py-8 min-h-screen">
				<div className="w-full">
					<div className="mb-6 sm:mb-8">
						<div className="flex flex-col w-full">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4 sm:gap-8">
								<div className="flex-1">
									<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
										Employee Attendance
									</h1>
									<p className="text-muted-foreground text-sm sm:text-base">
										Manage daily attendance for your organization
									</p>
								</div>
								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_WORK_RECORDS}>
									<Button
										onClick={handleViewAttendance}
										className="w-full sm:w-auto flex items-center gap-2"
										size="sm"
									>
										<Eye className="h-4 w-4" />
										<span>View Work Records</span>
									</Button>
								</ProtectedComponent>
							</div>
						</div>
					</div>
					<EmployeeAttendance scope={{ type: "default" }} />
				</div>
			</div>
		</ProtectedPage>
	);
};

export default AttendancePage;
