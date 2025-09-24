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

export default function AttendanceDashboard() {
	const initialData: ILeaveDashboard = {
		total_leave_applications: 3,
		applications_by_status: [
			{
				status: "",
				count: 1,
			},
		],
		applications_by_leave_type: [
			{ leave_type: "annual", count: 20 },
			{ leave_type: "sick", count: 30 },
			{ leave_type: "maternity", count: 10 },
		],
		leave_balances_by_type: [
			{
				leave_type: "annual",
				total_allocated_days: 3,
				total_used_days: 1,
				total_available_days: 2,
			},
		],
		average_leave_days_taken: 3,
		pending_approvals: 4,
		applications_over_time: [
			{ month: "JAN", count: 2 },
			{ month: "FEB", count: 21 },
			{ month: "MAR", count: 32 },
			{ month: "APR", count: 25 },
			{ month: "JUN", count: 12 },
			{ month: "JUL", count: 2 },
			{ month: "AUG", count: 52 },
			{ month: "SEP", count: 7 },
			{ month: "OCT", count: 23 },
			{ month: "NOV", count: 12 },
			{ month: "DEC", count: 23 },
		],
	};
	const getGroupCards = (data: ILeaveDashboard) => [
		{
			title: "Leave Requests",
			value: data.total_leave_applications,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:beach",
			link: "#",
		},
		{
			title: "Approved Requests",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.total_leave_applications,
			icon: "hugeicons:calendar-01",
			link: "#",
		},
		{
			title: "Pending Requests",
			value: data.total_leave_applications,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:calendar-04",
			link: "#",
		},
		{
			title: "Leave Utilization Rate",
			value: data.total_leave_applications + "%",
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:sailboat-coastal",
		},
	];

	return (
		<LoadingComponent
			initialData={initialData}
			// fetchData={getAttendanceDashboard}
			fetchData={() => Promise.resolve(initialData)}
			content={(data) => (
				<div className="min-h-screen bg-gray-50 p-6">
					<div className="space-y-8">
						{/* Header */}
						<div className="gap-4 flex">
							<h1 className="flex-grow text-4xl font-bold text-slate-900 text-balance">
								Leave Analytics
							</h1>
							<div className="text-right">
								<Select>
									<SelectTrigger className="text-slate-900">
										<SelectValue placeholder="This Year" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="This Year">This Year</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Key Metrics */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getGroupCards(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						{/* leaves over time */}
						<Linechart
							title={"Leaves Over Time"}
							label={""}
							data={{
								"2025": [
									{ month: "JAN", count: 12 },
									{ month: "FEB", count: 21 },
									{ month: "MAR", count: 43 },
									{ month: "APR", count: 20 },
									{ month: "JUN", count: 12 },
									{ month: "JUL", count: 30 },
									{ month: "AUG", count: 12 },
									{ month: "SEP", count: 32 },
									{ month: "OCT", count: 52 },
									{ month: "NOV", count: 72 },
									{ month: "DEC", count: 12 },
								],
							}}
							dataKey={["count"]}
							nameKey={"month"}
							colors={["#3CB371", "#FF1B1C", "#0CA0F5"]}
						/>

						{/* Charts Section */}
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							{/* leaves taken by type */}
							<Piechart
								totalStr={""}
								title={"Most Taken Leaves"}
								label={""}
								data={{
									"2025": data.applications_by_leave_type,
								}}
								dataKey={"count"}
								nameKey={"leave_type"}
								colors={colors}
							/>

							{/* department-wise leave usage */}
							<BarHChart
								title={"Department-wise Leave Usage"}
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
						</div>

						<LeaveTable />
					</div>
				</div>
			)}
		></LoadingComponent>
	);
}
