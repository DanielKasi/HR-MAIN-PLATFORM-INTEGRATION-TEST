"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeDashboard } from "@/lib/utils";
import { IEmployeeDashboard } from "@/types/types.utils";
import StatsCard from "../_components/stats.card";
import colors from "../_components/colors";
import DonutChart from "../_components/pie.chart";
import BarHChart from "../_components/barh.chart";
import BarVChart from "../_components/barv.chart";

export default function EmployeePage() {
	const [data, setData] = useState<IEmployeeDashboard | null>({
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
		employees_by_department: [
			{ department: "Accounting 1", count: 23 },
			{ department: "Accounting 2", count: 43 },
			{ department: "Accounting 3", count: 11 },
			{ department: "Accounting 4", count: 5 },
			{ department: "Accounting 5", count: 32 },
			{ department: "Accounting 6", count: 10 },
		],
		shift_statuses: [
			{
				status: "string",
				count: 0,
			},
		],
		average_age: 0,
		average_tenure_years: 0,
		recent_hires: 0,
		employees_by_marital_status: [
			{ marital_status: "single", count: 17 },
			{ marital_status: "married", count: 23 },
			{ marital_status: "divorced", count: 5 },
		],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const dashboardData = await getEmployeeDashboard();

				// setData(dashboardData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch data");
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-lg text-muted-foreground">Loading employee dashboard...</div>
			</div>
		);
	}

	const cards = [
		{
			title: "Total Employees",
			value: data?.total_employees ?? 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:megaphone-02",
			link: "#",
		},
		{
			title: "Total Employees",
			value: data?.total_employees ?? 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:megaphone-02",
			link: "#",
		},
		{
			title: "Total Employees",
			value: data?.total_employees ?? 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:megaphone-02",
			link: "#",
		},
		{
			title: "Total Employees",
			value: data?.total_employees ?? 0,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:megaphone-02",
			link: "#",
		},
	];

	const gender = {
		"2025": [
			{ gender: "Female", count: 12 },
			{ gender: "Male", count: 8 },
		],
		"2024": [
			{ gender: "Female", count: 10 },
			{ gender: "Male", count: 18 },
		],
	};

	const departments = {
		"2025": (data?.employees_by_department ?? []).map((x) => x),
		"2024": (data?.employees_by_department ?? []).map((x) => ({
			...x,
			count: (x.count * Math.random()).toFixed(2),
		})),
	};

	return (
		<div className="bg-background p-6 min-h-screen">
			<div className="space-y-8">
				{/* Header */}
				<div className="space-y-2">
					<h1 className="text-4xl font-bold text-foreground">Employee Analytics Dashboard</h1>
					<p className="text-lg text-muted-foreground">
						Comprehensive workforce insights and metrics
					</p>
				</div>

				{/* Key Metrics */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{cards.map((card, i) => (
						<StatsCard key={i} {...card} />
					))}
				</div>

				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
					{/* Department Distribution Bar Chart */}
					<BarHChart
						title={"Department Distribution"}
						label={"Departments"}
						data={departments}
						dataKey={"count"}
						nameKey={"department"}
						color={colors[4]}
						rounded
					/>
					<BarVChart
						title={"Department Distribution"}
						label={"Departments"}
						data={departments}
						dataKey={"count"}
						nameKey={"department"}
						colors={colors}
					/>

					{/* Gender Distribution Pie Chart */}
					<DonutChart
						title="Gender Distribution"
						totalStr="Total Employees"
						data={gender}
						colors={["#415180", "#FF3403"]}
						label={"Gender"}
						dataKey={"count"}
						nameKey={"gender"}
						labelList
					/>

					<DonutChart
						title="Gender 2 "
						totalStr="Total Employees"
						data={gender}
						colors={["#415180", "#FF3403"]}
						label={"Gender"}
						dataKey={"count"}
						nameKey={"gender"}
						labelList
						donut
					/>

					{/* Work Type Comparison */}
					<Card className="rounded-2xl border border-gray-200">
						<CardHeader>
							<CardTitle className="text-xl font-semibold">Work Type Distribution</CardTitle>
							<hr className="border-gray-200 border-t mt-2" />
						</CardHeader>
						<CardContent>
							{/* <ChartContainer config={{}} className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={data?.employees_by_work_type}
										margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
										maxBarSize={60}
									>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="work_type" />
										<YAxis />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" radius={[4, 4, 0, 0]}>
											{data?.employees_by_work_type.map((entry, index) => {
												const colors = ["#ff4500", "#ff7f50", "#ff6347", "#ff5722"];
												return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
											})}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer> */}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
