"use client";

import { getEmployeeDashboard } from "@/lib/utils";
import { IEmployeeDashboard } from "@/types/employee.types";
import StatsCard from "../_components/stats.card";
import colors from "../_components/colors";
import DonutChart from "../_components/pie.chart";
import BarHChart from "../_components/barh.chart";
import BarVChart from "../_components/barv.chart";
import LoadingComponent from "@/components/LoadingComponent";
import DepartmentTreeMap from "./department.treemap";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ReportDialog } from "@/components/dialogs/reports-dialog";

export default function EmployeePage() {
	const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);
	const initialData: IEmployeeDashboard = {
		total_employees: 0,
		employees_by_gender: [
			{
				gender: "string",
				count: 0,
			},
		],
		employees_by_employee_type: [
			{
				employee_type: "string",
				count: 0,
			},
		],
		employees_by_work_type: [
			{
				work_type: "string",
				count: 0,
			},
		],
		employees_by_department: [],
		shift_statuses: [
			{
				status: "string",
				count: 0,
			},
		],
		average_age: 0,
		average_tenure_years: 0,
		recent_hires: 0,
		employees_by_marital_status: [],
	};

	const getCards = (data: IEmployeeDashboard) => [
		{
			title: "Total Employees",
			value: data?.total_employees ?? 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:megaphone-02",
			link: "#",
		},
		{
			title: "Average Tenure",
			value: `${data?.average_tenure_years ?? 0} years`,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:calendar-02",
			link: "#",
		},
		{
			title: "New Hires (30d)",
			value: data?.total_employees ?? 0,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:megaphone-02",
			link: "#",
		},
		{
			title: "Turn Over Rate",
			value: data?.total_employees ?? 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:user-minus-02",
			link: "#",
		},
	];

	return (
		<LoadingComponent
			initialData={initialData}
			fetchData={getEmployeeDashboard}
			content={(data) => (
				<div className="bg-background p-6 min-h-screen">
					<div className="space-y-8">
						{/* Header */}
						<div className="flex flex-col md:flex-row items-center justify-between gap-8">
							<div className="space-y-2">
								<h1 className="text-4xl font-bold text-foreground">Employee Analytics Dashboard</h1>
								<p className="text-lg text-muted-foreground">
									Comprehensive workforce insights and metrics
								</p>
							</div>
							<div className="flex items-center justify-end gap-8">
								<Button className="rounded-xl" onClick={() => setIsReportsDialogOpen(true)}>
									Generate Reports
								</Button>
							</div>
						</div>

						{/* Key Metrics */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getCards(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							{/* Department Distribution Bar Chart */}
							<DepartmentTreeMap
								data={data.employees_by_department}
								title={"Employees per Department"}
							/>

							{/* Gender Distribution Pie Chart */}
							<DonutChart
								title="Gender Distribution"
								totalStr="Total Employees"
								data={data.employees_by_gender}
								colors={["#415180", "#FF3403"]}
								label={"Gender"}
								dataKey={"count"}
								nameKey={"gender"}
								labelList
								donut
							/>

							{/* employee count by department */}
							<BarVChart
								title={"Employee By department"}
								label={""}
								data={{
									"2021-2025": [
										{ year: "2021", count: 12 },
										{ year: "2022", count: 20 },
										{ year: "2023", count: 40 },
										{ year: "2024", count: 30 },
										{ year: "2025", count: 50 },
									],
								}}
								dataKey={"count"}
								nameKey={"year"}
								colors={colors}
								gap
								rounded
							/>

							{/* Work Type Comparison */}
							<BarVChart
								title={"Work Type Distribution"}
								label={""}
								data={{
									"2025": [
										{ worktype: "full-time", count: 12 },
										{ worktype: "part-time", count: 20 },
										{ worktype: "internship", count: 4 },
										{ worktype: "contract", count: 5 },
									],
								}}
								dataKey={"count"}
								nameKey={"worktype"}
								colors={colors}
								gap
								rounded
							/>
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
