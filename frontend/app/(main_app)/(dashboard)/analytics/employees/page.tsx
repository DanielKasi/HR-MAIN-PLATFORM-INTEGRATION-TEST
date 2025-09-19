"use client";

import { useState, useEffect } from "react";
import {
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getEmployeeDashboard } from "@/lib/utils";
import { IEmployeeDashboard } from "@/types/types.utils";
import { Icon } from "@iconify/react";
import StatsCard from "../components/stats-card";
import { Doughnut } from "../components/donut";
import Bargraph from "../components/bargraph";
import Piechart from "../components/piechart";
import colors from "../components/colors";

const chartConfig = {
	gender: {
		male: { label: "Male", color: "#ff4500" },
		female: { label: "Female", color: "#ff7f50" },
		other: { label: "Other", color: "#1e90ff" },
		unknown: { label: "Unknown", color: "#gray" },
	},
	department: {
		"Customer Service Department": {
			label: "Customer Service Department",
			color: "hsl(var(--chart-1))",
		},
		Engineering: { label: "Engineering", color: "hsl(var(--chart-2))" },
		Marketing: { label: "Marketing", color: "hsl(var(--chart-3))" },
		Sales: { label: "Sales", color: "hsl(var(--chart-4))" },
	},
	maritalStatus: {
		divorced: { label: "Divorced", color: "#ff4500" },
		married: { label: "Married", color: "#ff7f50" },
		single: { label: "Single", color: "#ff6347" },
		widowed: { label: "Widowed", color: "#ff5722" },
	},
};

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
		"2025": { total: 20, data: { Female: 12, Male: 8 } },
		"2024": { total: 6, data: { Female: 2, Male: 4 } },
	};

	const departments = {
		"2025": (data?.employees_by_department ?? []).map((x) => ({
			name: x.department,
			value: x.count,
		})),
		"2024": (data?.employees_by_department ?? []).map((x) => ({
			name: x.department,
			value: (x.count * Math.random()).toFixed(2),
		})),
	};

	const maritalStatus = {
		"2025": (data?.employees_by_marital_status ?? []).map((x) => ({
			name: x.marital_status,
			value: x.count,
		})),
		"2024": (data?.employees_by_marital_status ?? []).map((x) => ({
			name: x.marital_status,
			value: (x.count * Math.random()).toFixed(2),
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

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Department Distribution Bar Chart */}
					<Bargraph title="Department Distribution" data={departments as any} colors={colors} />

					{/* Gender Distribution Pie Chart */}
					<Doughnut
						groups={gender}
						title="Gender Distribution"
						totalStr="Total Employess"
						colors={["#415180", "#FF3403"]}
					/>

					<Bargraph title="Department Distribution" data={departments as any} colors={colors} />

					{/* Work Type Comparison */}
					<Card className="rounded-2xl border border-gray-200">
						<CardHeader>
							<CardTitle className="text-xl font-semibold">Work Type Distribution</CardTitle>
							<hr className="border-gray-200 border-t mt-2" />
						</CardHeader>
						<CardContent>
							<ChartContainer config={{}} className="h-[300px]">
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
							</ChartContainer>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
