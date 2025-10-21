"use client";

import LoadingComponent from "@/components/LoadingComponent";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import Linechart from "../_components/line.chart";
import BarHChart from "../_components/barh.chart";
import { ILeaveDashboard } from "@/types/leave.types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import LeaveTable from "./leave.table";
import { getLeaveDashboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ReportDialog } from "@/components/dialogs/reports-dialog";

export default function AttendanceDashboard() {
	const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);
	const initialData: ILeaveDashboard = {
		total_leave_applications: 0,
		applications_by_status: [],
		applications_by_leave_type: [],
		leave_balances_by_type: [],
		average_leave_days_taken: 0,
		pending_approvals: 0,
		applications_over_time: [],
	};

	const getGroupCards = (data: ILeaveDashboard) => [
		{
			title: "Leave Requests",
			value: data.total_leave_applications || 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:beach",
			link: "#",
		},
		{
			title: "Pending Approvals",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.pending_approvals || 0,
			icon: "hugeicons:calendar-01",
			link: "#",
		},
		{
			title: "Avg Leave Days",
			value: `${data.average_leave_days_taken || 0} days`,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:calendar-04",
			link: "#",
		},
		{
			title: "Leave Utilization",
			value: `${calculateUtilizationRate(data.leave_balances_by_type)}%`,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:sailboat-coastal",
		},
	];

	// Helper function to calculate utilization rate from leave balances
	const calculateUtilizationRate = (leaveBalances: any[]): number => {
		if (!leaveBalances || !Array.isArray(leaveBalances)) return 0;

		const totalUsed = leaveBalances.reduce(
			(sum, balance) => sum + (balance.total_used_days || 0),
			0,
		);
		const totalAllocated = leaveBalances.reduce(
			(sum, balance) => sum + (balance.total_allocated_days || 0),
			0,
		);

		if (totalAllocated === 0) return 0;
		return Math.round((totalUsed / totalAllocated) * 100);
	};

	// Helper to transform applications by status for bar chart
	const transformApplicationsByStatus = (applicationsData: any[]) => {
		if (!applicationsData || !Array.isArray(applicationsData)) return [];

		return applicationsData.map((item) => ({
			department: item.status || "Unknown",
			count: item.count || 0,
		}));
	};

	return (
		<LoadingComponent
			initialData={initialData}
			fetchData={getLeaveDashboard}
			content={(data) => (
				<div className="min-h-screen bg-gray-50 p-4 sm:p-6">
					<div className="space-y-6 sm:space-y-8">
						{/* Header */}
						<div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
							<div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
								<h1 className="flex-grow text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 text-balance">
									Leave Analytics
								</h1>
								<div className="w-full sm:w-auto">
									<Select>
										<SelectTrigger className="text-slate-900 w-full sm:w-[140px]">
											<SelectValue placeholder="This Year" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="This Year">This Year</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex items-center justify-start sm:justify-end w-full sm:w-auto">
								<Button
									className="rounded-xl w-full sm:w-auto"
									onClick={() => setIsReportsDialogOpen(true)}
									size="sm"
								>
									Generate Reports
								</Button>
							</div>
						</div>

						{/* Key Metrics */}
						<div className="grid gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
							{getGroupCards(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						{/* leaves over time - NOW USING REAL DATA */}
						<Linechart
							title={"Leaves Over Time"}
							label={""}
							data={{
								"2025": data.applications_over_time || [],
							}}
							dataKey={["count"]}
							nameKey={"month"}
							colors={["#3CB371"]}
							className="w-full"
						/>

						{/* Charts Section */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
							{/* leaves taken by type - USING REAL DATA */}
							<Piechart
								totalStr={""}
								title={"Most Taken Leaves"}
								label={""}
								data={{
									"2025": data.applications_by_leave_type || [],
								}}
								dataKey={"count"}
								nameKey={"leave_type"}
								colors={colors}
								className="w-full"
							/>

							{/* applications by status - USING REAL DATA */}
							<BarHChart
								title={"Applications by Status"}
								data={{
									Current: transformApplicationsByStatus(data.applications_by_status),
								}}
								dataKey={"count"}
								nameKey={"department"}
								color={colors[3]}
								rounded
								className="w-full"
							/>
						</div>

						{/* <LeaveTable /> */}
					</div>
					<ReportDialog
						isOpen={isReportsDialogOpen}
						onClose={() => setIsReportsDialogOpen(false)}
						app="leave_mgt"
					/>
				</div>
			)}
		></LoadingComponent>
	);
}
