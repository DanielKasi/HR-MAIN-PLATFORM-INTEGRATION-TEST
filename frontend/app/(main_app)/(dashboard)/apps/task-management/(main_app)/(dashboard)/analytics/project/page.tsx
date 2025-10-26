"use client";

import LoadingComponent from "@/components/LoadingComponent";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import BarHChart from "../_components/barh.chart";
import { IProjectDashboard } from "@/types/project.type";
import { getProjectDashboard } from "@/lib/utils";
import BarVChart from "../_components/barv.chart";
import ProjectsTable from "./projects.table";

export default function PayrollDashboard() {
	const initialData: IProjectDashboard = {
		total_projects: 5,
		total_tasks: 15,
		average_duration: 32,
		employees_assigned: 21,
		project_status_overview: [
			{ status: "not_started", count: 2 },
			{ status: "in_progress", count: 2 },
			{ status: "completed", count: 1 },
			{ status: "on_hold", count: 4 },
			{ status: "cancelled", count: 9 },
		],
		project_progress: [
			{ project: "Project A", progress: 90 },
			{ project: "Project B", progress: 20 },
			{ project: "Project C", progress: 50 },
			{ project: "Project D", progress: 70 },
		],
		task_overview: [
			{ status: "not_started", count: 6 },
			{ status: "in_progress", count: 5 },
			{ status: "completed", count: 3 },
			{ status: "on_hold", count: 1 },
		],
		recent_projects: [],
	};
	const getGroupCards = (data: IProjectDashboard) => [
		{
			title: "Total Projects",
			value: data.total_projects,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:folder-02",
			link: "#",
		},
		{
			title: "Total Tasks",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.total_tasks,
			icon: "hugeicons:check-list",
			link: "#",
		},
		{
			title: "Average Duration",
			value: `${data.average_duration} Days`,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:calendar-03",
			link: "#",
		},
		{
			title: "Employees Assigned",
			value: data.employees_assigned,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:user-multiple",
		},
	];

	return (
		<LoadingComponent
			initialData={initialData}
			fetchData={getProjectDashboard}
			content={(data: IProjectDashboard) => (
				<div className="min-h-screen bg-gray-50 p-6">
					<div className="space-y-8">
						{/* Header */}
						<div className="gap-4 flex">
							<h1 className="flex-grow text-4xl font-bold text-slate-900 text-balance">
								Projects Analytics
							</h1>
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
							{/* project status overview */}
							<BarVChart
								title={"Project Status Overview"}
								label={""}
								data={{
									"2025": data.project_status_overview as any,
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
									"2025": data.project_progress as any,
								}}
								dataKey={"progress"}
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
									"2025": data.task_overview as any,
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

						<ProjectsTable projects={data.recent_projects} />
					</div>
				</div>
			)}
		></LoadingComponent>
	);
}
