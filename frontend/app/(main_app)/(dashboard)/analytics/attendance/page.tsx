"use client";

import type { IAttendanceDashboard } from "@/types/types.utils";
import { getAttendanceDashboard } from "@/lib/utils";
import LoadingComponent from "@/components/LoadingComponent";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import BarVChart from "../_components/barv.chart";
import LatecomersTable from "./latecomers.table";
import SpotchecksTable from "./spotchecks.table";
import Linechart from "../_components/line.chart";
import BarHChart from "../_components/barh.chart";
import OvertimeTable from "./overtime.table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ReportDialog } from "@/components/dialogs/reports-dialog";

export default function AttendanceDashboard() {
	const initialData: IAttendanceDashboard = {
		total_attendance_records: 1,
		attendance_by_status: [],
		average_overtime_hours: 3,
		average_late_minutes: 3,
		average_early_checkout_minutes: 4,
		spot_check_response_rate: 5,
		attendance_over_time: [],
		spot_checks_by_status: {},
		late_comers_today: [],
		failed_spotchecks_today: [],
	};
	const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);
	const getGroupCards1 = (data: IAttendanceDashboard) => [
		{
			title: "Absenteeism Rate",
			value: data.average_late_minutes,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:calendar-user",
			link: "#",
		},
		{
			title: "Late Arrivals (Avg)",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.average_late_minutes,
			icon: "hugeicons:time-04",
			link: "#",
		},
		{
			title: "Spotcheck Fail Rate",
			value: data.average_late_minutes,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:location-user-02",
			link: "#",
		},
		{
			title: "Overtime Hours",
			value: data.average_overtime_hours,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:time-04",
		},
	];
	const getGroupCards2 = (data: IAttendanceDashboard) => [
		{
			title: "Employees Expected",
			value: data.average_late_minutes || 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:user-multiple",
			link: "#",
		},
		{
			title: "Present Today",
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			value: data.average_late_minutes || 0,
			icon: "hugeicons:calendar-user",
			link: "#",
		},
		{
			title: "Late Arrivals",
			value: data.average_late_minutes || 0,
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			icon: "hugeicons:clock-05",
			link: "#",
		},
		{
			title: "Absent Today",
			value: data.average_overtime_hours || 0,
			color: "text-red-600",
			bg: "bg-red-100",
			icon: "hugeicons:user-minus-01",
		},
		{
			title: "On Leave",
			value: data.average_overtime_hours || 0,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:beach",
			link: "#",
		},
		{
			title: "Spotchecks Today",
			value: data.average_overtime_hours || 0,
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			icon: "hugeicons:location-user-02",
		},
		{
			title: "Spotcheck Pass Rate",
			value: data.average_overtime_hours || 0,
			color: "text-green-600",
			bg: "bg-green-100",
			icon: "hugeicons:location-user-02",
		},
		{
			title: "Overtime Hours",
			value: data.average_overtime_hours || 0,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:time-04",
		},
	];
	return (
		<LoadingComponent
			initialData={initialData}
			fetchData={getAttendanceDashboard}
			content={(data) => (
				<div className="min-h-screen p-4 sm:p-6 lg:p-6">
					<div className="space-y-6 sm:space-y-8">
						{/* Header */}
						<div className="space-y-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 text-balance">
								Attendance Analytics
							</h1>
							<div className="flex items-center justify-start sm:justify-end">
								<Button
									className="rounded-xl w-full sm:w-auto"
									onClick={() => setIsReportsDialogOpen(true)}
								>
									Generate Reports
								</Button>
							</div>
						</div>

						{/* Key Metrics */}
						<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
							{getGroupCards1(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						{/* Header */}
						<div className="space-y-4">
							<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 text-balance">
								Today's Attendance Summary
							</h1>
						</div>

						{/* Time Metrics */}
						<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
							{getGroupCards2(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
							{/* latecomers today */}
							<LatecomersTable data={data.late_comers_today || []} />

							{/*failed spotchecks today */}
							<SpotchecksTable data={data.failed_spotchecks_today || []} />
						</div>

						<Linechart
							title={"Attendance Over Time"}
							label={""}
							data={{
								"This Year": [
									{ month: "JAN", late: 2, early: 5, leave: 1 },
									{ month: "FEB", late: 1, early: 6, leave: 1 },
									{ month: "MAR", late: 3, early: 5, leave: 0 },
									{ month: "APR", late: 0, early: 7, leave: 1 },
									{ month: "JUN", late: 1, early: 5, leave: 2 },
								],
							}}
							dataKey={["late", "early", "leave"]}
							nameKey={"month"}
							colors={["#3CB371", "#FF1B1C", "#0CA0F5"]}
						/>

						{/* Charts Section */}
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-6">
							{/* spotcheck by Status */}
							<Piechart
								totalStr={""}
								title={"Spotcheck Rate"}
								label={""}
								data={{
									"2025": Array.isArray(data.spot_checks_by_status)
										? data.spot_checks_by_status
										: Object.entries(data.spot_checks_by_status).map(([status, count]) => ({
												status,
												count,
											})),
								}}
								dataKey={"count"}
								nameKey={"status"}
								colors={colors}
							/>

							{/* department-wise attendance */}
							<Piechart
								totalStr={""}
								title={"Department-wise Attendance"}
								label={""}
								data={{
									"This Week": [
										{ department: "On Time", count: 20 },
										{ department: "Absent", count: 30 },
										{ department: "Late coming", count: 40 },
										{ department: "On Leave", count: 60 },
									],
								}}
								dataKey={"count"}
								nameKey={"department"}
								colors={colors}
								donut
								labelList
							/>

							{/* department-wise overtime */}
							<BarHChart
								title={"Department-wise Overtime"}
								data={{
									"This week": [
										{ department: "Technology", count: 20 },
										{ department: "Sales", count: 16 },
										{ department: "Marketing", count: 12 },
										{ department: "Operations", count: 10 },
									],
								}}
								dataKey={"count"}
								nameKey={"department"}
								color={colors[3]}
								rounded
							/>

							{/* overtime employees table */}
							<OvertimeTable />
						</div>
					</div>
					<ReportDialog
						isOpen={isReportsDialogOpen}
						onClose={() => setIsReportsDialogOpen(false)}
						app="employee"
					/>
				</div>
			)}
		></LoadingComponent>
	);
}
