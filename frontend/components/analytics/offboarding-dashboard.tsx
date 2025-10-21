"use client";

import type { OffboardingData } from "@/types/types.utils";

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
import { Users, Clock, CheckCircle, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getOffboardingDashboard } from "@/lib/utils";
import { ReportDialog } from "../dialogs/reports-dialog";

const statusColors = {
	Completed: "bg-green-100 text-green-800 border-green-200",
	Planned: "bg-blue-100 text-blue-800 border-blue-200",
	Cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function OffboardingDashboard() {
	const [data, setData] = useState<OffboardingData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);

	useEffect(() => {
		async function fetchData() {
			try {
				const dashboardData = await getOffboardingDashboard();

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
			<div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Loading dashboard...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
				<div className="text-center">
					<p className="text-red-500 mb-4">Error: {error}</p>
					<Button onClick={() => window.location.reload()}>Retry</Button>
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
				<p className="text-muted-foreground">No data available</p>
			</div>
		);
	}

	const separationStatusData = [
		{ name: "Planned", value: data.separation_counts.planned, fill: "hsl(var(--chart-1))" },
		{ name: "Completed", value: data.separation_counts.completed, fill: "hsl(var(--chart-2))" },
		{ name: "Cancelled", value: data.separation_counts.cancelled, fill: "hsl(var(--chart-3))" },
	];

	const categoryData = Object.entries(data.category_counts).map(([category, count]) => ({
		category: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " "),
		count,
	}));

	const pendingRequestsData = Object.entries(data.pending_requests)
		.filter(([key]) => key !== "total")
		.map(([type, count]) => ({
			type: type.charAt(0).toUpperCase() + type.slice(1),
			count,
		}));

	return (
		<div className="min-h-screen bg-background p-4 sm:p-6 overflow-x-hidden">
			<div className="space-y-4 sm:space-y-6 max-w-full">
				{/* Header */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div className="text-center sm:text-left w-full sm:w-auto">
						<h1 className="text-2xl sm:text-3xl font-bold text-foreground text-balance">
							HR Offboarding Dashboard
						</h1>
						<p className="text-muted-foreground mt-1 text-sm sm:text-base">
							Track employee separations and manage offboarding processes
						</p>
					</div>
					<div className="flex items-center justify-center sm:justify-end w-full sm:w-auto">
						<Button
							className="rounded-xl w-full sm:w-auto"
							onClick={() => setIsReportsDialogOpen(true)}
						>
							Generate Reports
						</Button>
					</div>
				</div>

				{/* Key Metrics Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
					<Card className="bg-card border-border">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-card-foreground">
								Total Separations
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-card-foreground">
								{data.separation_counts.total}
							</div>
							<p className="text-xs text-muted-foreground">All time separations</p>
						</CardContent>
					</Card>

					<Card className="bg-card border-border">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-card-foreground">
								Pending Requests
							</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-card-foreground">
								{data.pending_requests.total}
							</div>
							<p className="text-xs text-muted-foreground">Awaiting approval</p>
						</CardContent>
					</Card>

					<Card className="bg-card border-border">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-card-foreground">Completed</CardTitle>
							<CheckCircle className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-card-foreground">
								{data.separation_counts.completed}
							</div>
							<p className="text-xs text-muted-foreground">Successfully processed</p>
						</CardContent>
					</Card>

					<Card className="bg-card border-border">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-card-foreground">Planned</CardTitle>
							<Calendar className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-card-foreground">
								{data.separation_counts.planned}
							</div>
							<p className="text-xs text-muted-foreground">Future separations</p>
						</CardContent>
					</Card>
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
					{/* Separation Status Distribution */}
					<Card className="bg-card border-border">
						<CardHeader>
							<CardTitle className="text-card-foreground text-lg sm:text-xl">
								Separation Status Distribution
							</CardTitle>
							<CardDescription className="text-sm sm:text-base">
								Breakdown of separation statuses
							</CardDescription>
						</CardHeader>
						<CardContent className="overflow-hidden">
							<ChartContainer
								config={{
									planned: { label: "Planned", color: "hsl(var(--chart-1))" },
									completed: { label: "Completed", color: "hsl(var(--chart-2))" },
									cancelled: { label: "Cancelled", color: "hsl(var(--chart-3))" },
								}}
								className="h-[250px] sm:h-[300px] w-full"
							>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={separationStatusData}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
											outerRadius={70}
											fill="#8884d8"
											dataKey="value"
										>
											{separationStatusData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.fill} />
											))}
										</Pie>
										<ChartTooltip content={<ChartTooltipContent />} />
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Category Breakdown */}
					<Card className="bg-card border-border">
						<CardHeader>
							<CardTitle className="text-card-foreground text-lg sm:text-xl">
								Separation Categories
							</CardTitle>
							<CardDescription className="text-sm sm:text-base">
								Types of employee separations
							</CardDescription>
						</CardHeader>
						<CardContent className="overflow-hidden">
							<ChartContainer
								config={{
									count: { label: "Count", color: "hsl(var(--chart-1))" },
								}}
								className="h-[250px] sm:h-[300px] w-full"
							>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={categoryData} margin={{ left: 20, right: 20 }}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis
											dataKey="category"
											fontSize={12}
											angle={-45}
											textAnchor="end"
											height={70}
										/>
										<YAxis fontSize={12} />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" fill="hsl(var(--chart-1))" />
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>

				{/* Pending Requests Chart */}
				<Card className="bg-card border-border">
					<CardHeader>
						<CardTitle className="text-card-foreground text-lg sm:text-xl">
							Pending Requests by Type
						</CardTitle>
						<CardDescription className="text-sm sm:text-base">
							Current requests awaiting approval
						</CardDescription>
					</CardHeader>
					<CardContent className="overflow-hidden">
						<ChartContainer
							config={{
								count: { label: "Count", color: "hsl(var(--chart-1))" },
							}}
							className="h-[200px] sm:h-[250px] w-full"
						>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={pendingRequestsData}
									layout="horizontal"
									margin={{ left: 20, right: 20 }}
								>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis type="number" fontSize={12} />
									<YAxis dataKey="type" type="category" width={70} fontSize={12} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="hsl(var(--chart-1))" />
								</BarChart>
							</ResponsiveContainer>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>
			<ReportDialog
				isOpen={isReportsDialogOpen}
				onClose={() => setIsReportsDialogOpen(false)}
				app="offboarding"
			/>
		</div>
	);
}
