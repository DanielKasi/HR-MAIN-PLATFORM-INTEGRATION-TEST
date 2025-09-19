"use client";

import { useState, useEffect } from "react";
import { Users, Clock, TrendingUp, UserCheck } from "lucide-react";
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
} from "recharts";
import DepartmentTreeMap from "./department-treemap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getEmployeeDashboard } from "@/lib/utils";
import { IEmployeeDashboard } from "@/types/types.utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Icon } from "@iconify/react";

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

export default function EmployeeDashboard() {
	const [data, setData] = useState<IEmployeeDashboard | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const dashboardData = await getEmployeeDashboard();

				setData(dashboardData);
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card className="bg-white p-4 rounded-2xl border border-gray-100">
						<CardContent className="flex items-start space-x-4 p-0">
							<div className="w-12 h-12 bg-[#FF3403]/10 rounded-2xl flex items-center justify-center">
								<Icon icon="hugeicons:user-multiple" color="#ff3403" strokeWidth={1.5} />
							</div>
							<div className="flex-1">
								<div className="flex justify-between items-start">
									<p className="text-sm font-medium text-gray-600">Total Employees</p>
									<Icon icon="hugeicons:arrow-up-right-01" color="#162032" strokeWidth={1.5} />
								</div>
								<p className="text-3xl font-bold text-gray-900 mt-4">{data?.total_employees}</p>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-white p-4 rounded-2xl border border-gray-100">
						<CardContent className="flex items-start space-x-4 p-0">
							<div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
								<Icon icon="hugeicons:calendar-02" color="#6366F1" strokeWidth={1.5} />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600">Average Tenure</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">
									{data?.average_tenure_years} Years
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-white p-4 rounded-2xl border border-gray-100">
						<CardContent className="flex items-start space-x-4 p-0">
							<div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
								<Icon icon="hugeicons:user-add-02" color="#3B82F6" strokeWidth={1.5} />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600">New Hires (30d)</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">{data?.recent_hires}</p>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-white p-4 rounded-2xl border border-gray-100">
						<CardContent className="flex items-start space-x-4 p-0">
							<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
								<Icon icon="hugeicons:user-minus-02" color="#3B82F6" strokeWidth={1.5} />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600">Turn Over Rate</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">2.1%</p>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Department Distribution Bar Chart */}
					<Card className="rounded-2xl border border-gray-200">
						<CardHeader>
							<CardTitle className="text-xl font-semibold">Department Distribution</CardTitle>
							<hr className="border-gray-200 border-t mt-2" />
						</CardHeader>
						<CardContent>
							<DepartmentTreeMap
								data={data?.employees_by_department || []}
								chartConfig={chartConfig.department}
							/>
						</CardContent>
					</Card>
					{/* Gender Distribution Pie Chart */}
					<Card className="rounded-2xl border border-gray-200">
						<CardHeader>
							<CardTitle className="text-xl font-semibold">Gender Distribution</CardTitle>
							<hr className="border-gray-200 border-t mt-2" />
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig.gender} className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={data?.employees_by_gender}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ gender, count, percent }) =>
												`${gender}: ${(percent * 100).toFixed(0)}%`
											}
											outerRadius={120}
											innerRadius={60}
											fill="#8884d8"
											dataKey="count"
											nameKey="gender"
										>
											{data?.employees_by_gender.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={
														Object.values(chartConfig.gender)[index]?.color || "hsl(var(--chart-1))"
													}
												/>
											))}
										</Pie>
										<text
											x="50%"
											y="45%"
											textAnchor="middle"
											dominantBaseline="middle"
											className="text-2xl font-bold"
										>
											{data?.total_employees}
										</text>
										<text
											x="50%"
											y="55%"
											textAnchor="middle"
											dominantBaseline="middle"
											className="text-sm text-muted-foreground"
										>
											Total Employees
										</text>
										<ChartTooltip content={<ChartTooltipContent />} />
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Marital Status Pie Chart */}
					<Card className="rounded-2xl border border-gray-200">
						<CardHeader>
							<CardTitle className="text-xl font-semibold">Marital Status</CardTitle>
							<hr className="border-gray-200 border-t mt-2" />
						</CardHeader>
						<CardContent>
							<ChartContainer config={chartConfig.maritalStatus} className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={data?.employees_by_marital_status}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ marital_status, count, percent }) =>
												`${marital_status}: ${(percent * 100).toFixed(0)}%`
											}
											outerRadius={120}
											fill="#8884d8"
											dataKey="count"
											nameKey="marital_status"
										>
											{data?.employees_by_marital_status.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={
														Object.values(chartConfig.maritalStatus)[index]?.color ||
														"hsl(var(--chart-1))"
													}
												/>
											))}
										</Pie>
										<ChartTooltip content={<ChartTooltipContent />} />
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

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
