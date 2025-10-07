"use client";

import LoadingComponent from "@/components/LoadingComponent";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import BarHChart from "../_components/barh.chart";
import { IProjectDashboard } from "@/types/project.type";
import BarVChart from "../_components/barv.chart";
import ProjectsTable from "./projects.table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/dialogs/reports-dialog";

export default function PayrollDashboard() {
	const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);

	const initialData: IProjectDashboard = {
		projects: {
			total: 5,
			by_status: [
				{
					status: "not_started",
					count: 2,
				},
				{
					status: "in_progress",
					count: 2,
				},
				{
					status: "completed",
					count: 1,
				},
				{
					status: "on_hold",
					count: 4,
				},
				{
					status: "cancelled",
					count: 9,
				},
			],
		},
		tasks: {
			total: 15,
			by_status: [
				{
					status: "not_started",
					count: 6,
				},
				{
					status: "in_progress",
					count: 5,
				},
				{
					status: "completed",
					count: 3,
				},
				{
					status: "on_hold",
					count: 1,
				},
			],
			by_priority: [
				{
					priority: "low",
					count: 3,
				},
				{
					priority: "medium",
					count: 7,
				},
				{
					priority: "high",
					count: 4,
				},
				{
					priority: "urgent",
					count: 1,
				},
			],
		},
		active_projects: 4,
		overdue_tasks: 2,
	};

	const getGroupCards = (data: IProjectDashboard) => [
		{
			title: "Total Projects",
			value: data.projects.total,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:folder-02",
			link: "#",
		},
		{
			title: "Total Tasks",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.tasks.total,
			icon: "hugeicons:check-list",
			link: "#",
		},
		{
			title: "Average Duration",
			value: "32 Days",
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:calendar-03",
			link: "#",
		},
		{
			title: "Employees Assigned",
			value: "21",
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:user-multiple",
		},
	];

	return (
		<LoadingComponent
			initialData={initialData}
			// fetchData={getProjectDashboard}
			fetchData={() => Promise.resolve(initialData)}
			content={(data: IProjectDashboard) => (
				<div className="min-h-screen bg-gray-50 p-6">
					<div className="space-y-8">
						{/* Header */}
						<div className="flex flex-col items-center justify-between gap-8 ">
							<h1 className="flex-grow text-4xl font-bold text-slate-900 text-balance">
								Projects Analytics
							</h1>
							<div className="flex items-center justify-end gap-8">
								<Button className="rounded-xl" onClick={() => setIsReportsDialogOpen(true)}>
									Generate Reports
								</Button>
							</div>
						</div>

						{/* Key Metrics */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getGroupCards(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						{/* Charts Section */}
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							{/* project status overview */}
							<BarVChart
								title={"Project Status Overview"}
								label={""}
								data={{
									"2025": data.projects.by_status as any,
								}}
								dataKey={"count"}
								nameKey={"status"}
								colors={colors}
								select={false}
								gap
								rounded
							/>

							{/* project progress */}
							<BarHChart
								title={"Projects Progress"}
								data={{
									"2025": [
										{ project: "Project A", count: 90 },
										{ project: "Project B", count: 20 },
										{ project: "Project C", count: 50 },
										{ project: "Project D", count: 70 },
									],
								}}
								dataKey={"count"}
								nameKey={"project"}
								color={colors[3]}
								select={false}
								rounded
							/>

							{/* tasks overview */}
							<Piechart
								title={"Tasks Overview"}
								label={""}
								data={{
									"2025": data.tasks.by_status as any,
								}}
								dataKey={"count"}
								nameKey={"status"}
								colors={colors}
								donut
								labelList
							/>

							{/* employees involved */}
							<BarHChart
								title={"Employees Involved"}
								data={{
									"2025": [
										{ project: "Project A", count: 90 },
										{ project: "Project B", count: 20 },
										{ project: "Project C", count: 50 },
										{ project: "Project D", count: 70 },
									],
								}}
								dataKey={"count"}
								nameKey={"project"}
								color={colors[3]}
								select={false}
								rounded
							/>
						</div>

						<ProjectsTable />
					</div>
					<ReportDialog
						isOpen={isReportsDialogOpen}
						onClose={() => setIsReportsDialogOpen(false)}
						app="project"
					/>
				</div>
			)}
		></LoadingComponent>
	);
}
