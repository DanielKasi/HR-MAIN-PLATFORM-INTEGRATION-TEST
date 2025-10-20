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
import { Users, Clock, CheckCircle, AlertCircle, FileText, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getOffboardingDashboard, getCurrentUser } from "@/lib/utils";
import { ReportDialog } from "../dialogs/reports-dialog";
import { Badge } from "@/components/ui/badge";

// Status colors for badges
const statusColors = {
	planned: "bg-blue-100 text-blue-800 border-blue-200",
	completed: "bg-green-100 text-green-800 border-green-200",
	cancelled: "bg-red-100 text-red-800 border-red-200",
};

// Category colors for consistent styling
const categoryColors = {
	resignation: "hsl(var(--chart-1))",
	termination: "hsl(var(--chart-2))",
	retirement: "hsl(var(--chart-3))",
	layoff: "hsl(var(--chart-4))",
	other: "hsl(var(--chart-5))",
};

// User interface
interface CurrentUser {
	id: string;
	institution_id?: string;
	institution_name?: string;
	email: string;
	full_name?: string;
	fullname?: string;
	roles?: Array<{ institution: number | string }>;
}

export default function OffboardingDashboard() {
	const [data, setData] = useState<OffboardingData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

	useEffect(() => {
		async function fetchUserAndData() {
			try {
				setLoading(true);

				// Get current user
				const userData = await getCurrentUser();

				// Set current user with full name from either full_name or fullname
				const userWithFullName = {
					...userData,
					full_name: userData.full_name || userData.fullname || "User",
				};
				setCurrentUser(userWithFullName as CurrentUser);

				// Fetch dashboard data - backend returns data for authenticated user's institution
				const dashboardData = await getOffboardingDashboard();
				setData(dashboardData);
			} catch (err) {
				console.error("Error fetching data:", err);
				setError(err instanceof Error ? err.message : "Failed to fetch data");
			} finally {
				setLoading(false);
			}
		}

		fetchUserAndData();
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Loading dashboard...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<div className="text-center max-w-md">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<p className="text-red-500 mb-4">{error}</p>
					<Button onClick={() => window.location.reload()}>Retry</Button>
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<p className="text-muted-foreground">No data available</p>
			</div>
		);
	}

	// Prepare chart data for separation status
	const separationStatusData = [
		{ name: "Planned", value: data.separation_counts.planned, fill: "hsl(var(--chart-1))" },
		{ name: "Completed", value: data.separation_counts.completed, fill: "hsl(var(--chart-2))" },
		{ name: "Cancelled", value: data.separation_counts.cancelled, fill: "hsl(var(--chart-3))" },
	];

	// Prepare category data - handle the dynamic properties from API
	const categoryData = [
		{
			category: "Resignation",
			count: data.category_counts.resignation || data.category_counts.additionalProp1 || 0,
			fill: categoryColors.resignation,
		},
		{
			category: "Termination",
			count: data.category_counts.termination || data.category_counts.additionalProp2 || 0,
			fill: categoryColors.termination,
		},
		{
			category: "Retirement",
			count: data.category_counts.retirement || data.category_counts.additionalProp3 || 0,
			fill: categoryColors.retirement,
		},
		{ category: "Layoff", count: data.category_counts.layoff || 0, fill: categoryColors.layoff },
		{ category: "Other", count: data.category_counts.other || 0, fill: categoryColors.other },
	].filter((item) => item.count > 0);

	// Prepare pending requests data - use the correct property names from API
	const pendingRequestsData = [
		{
			type: "Resignations",
			count: data.pending_requests.resignations || 0,
			fill: "hsl(var(--chart-1))",
		},
		{
			type: "Terminations",
			count: data.pending_requests.terminations || 0,
			fill: "hsl(var(--chart-2))",
		},
		{
			type: "Retirements",
			count: data.pending_requests.retirements || 0,
			fill: "hsl(var(--chart-3))",
		},
	].filter((item) => item.count > 0);

	// Format date for display
	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return dateString; // Return original string if date parsing fails
		}
	};

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex flex-col md:flex-row items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-foreground text-balance">
							HR Offboarding Dashboard
						</h1>
						<p className="text-muted-foreground mt-1">
							Track employee separations and manage offboarding processes
							{currentUser?.institution_name && (
								<span className="text-sm ml-2 text-blue-600">• {currentUser.institution_name}</span>
							)}
							{data.date_range && (
								<span className="text-sm ml-2 text-muted-foreground">
									({formatDate(data.date_range.start_date)} - {formatDate(data.date_range.end_date)}
									)
								</span>
							)}
						</p>
					</div>
					<div className="flex items-center gap-4">
						{currentUser && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<User className="h-4 w-4" />
								<span>{currentUser.full_name || currentUser.fullname || currentUser.email}</span>
							</div>
						)}
						<Button className="rounded-xl" onClick={() => setIsReportsDialogOpen(true)}>
							Generate Reports
						</Button>
					</div>
				</div>

				{/* Key Metrics Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
							<p className="text-xs text-muted-foreground">All separations</p>
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
							<p className="text-xs text-muted-foreground">Processed</p>
						</CardContent>
					</Card>

					<Card className="bg-card border-border">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-card-foreground">Active</CardTitle>
							<AlertCircle className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-card-foreground">
								{data.separation_counts.planned}
							</div>
							<p className="text-xs text-muted-foreground">In progress</p>
						</CardContent>
					</Card>

					<Card className="bg-card border-border">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-card-foreground">Cancelled</CardTitle>
							<FileText className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-card-foreground">
								{data.separation_counts.cancelled}
							</div>
							<p className="text-xs text-muted-foreground">Cancelled separations</p>
						</CardContent>
					</Card>
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<Card className="bg-card border-border">
						<CardHeader>
							<CardTitle className="text-card-foreground">Separation Status</CardTitle>
							<CardDescription>Current status of all separations</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									planned: { label: "Planned", color: "hsl(var(--chart-1))" },
									completed: { label: "Completed", color: "hsl(var(--chart-2))" },
									cancelled: { label: "Cancelled", color: "hsl(var(--chart-3))" },
								}}
								className="h-[300px]"
							>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={separationStatusData}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
											outerRadius={80}
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

					<Card className="bg-card border-border">
						<CardHeader>
							<CardTitle className="text-card-foreground">Separation Categories</CardTitle>
							<CardDescription>Types of employee separations</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									count: { label: "Count", color: "hsl(var(--chart-1))" },
								}}
								className="h-[300px]"
							>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={categoryData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="category" />
										<YAxis />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" fill="hsl(var(--chart-1))" />
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>

				{/* Pending Requests Chart */}
				{pendingRequestsData.length > 0 && (
					<Card className="bg-card border-border">
						<CardHeader>
							<CardTitle className="text-card-foreground">Pending Requests by Type</CardTitle>
							<CardDescription>Breakdown of requests awaiting approval</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									count: { label: "Count", color: "hsl(var(--chart-1))" },
								}}
								className="h-[250px]"
							>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={pendingRequestsData} layout="horizontal">
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" />
										<YAxis dataKey="type" type="category" width={100} />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" fill="hsl(var(--chart-1))" />
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
				)}

				{/* Recent Separations Table */}
				{data.recent_separations.length > 0 &&
					data.recent_separations.some((sep) => sep.employee_name !== "string") && (
						<Card className="bg-card border-border">
							<CardHeader>
								<CardTitle className="text-card-foreground">Recent Separations</CardTitle>
								<CardDescription>Latest separation activities</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{data.recent_separations
										.filter((separation) => separation.employee_name !== "string")
										.map((separation) => (
											<div
												key={separation.id}
												className="flex items-center justify-between p-4 border rounded-lg"
											>
												<div className="flex-1">
													<div className="flex items-center gap-4">
														<div>
															<p className="font-medium text-foreground">
																{separation.employee_name}
															</p>
															<p className="text-sm text-muted-foreground">
																{separation.separation_type} • {separation.category} •{" "}
																{formatDate(separation.effective_date)}
															</p>
														</div>
													</div>
													{separation.additional_notes &&
														separation.additional_notes !== "string" && (
															<p className="text-sm text-muted-foreground mt-1">
																{separation.additional_notes}
															</p>
														)}
												</div>
												<div className="flex items-center gap-4">
													<Badge
														className={
															statusColors[
																separation.separation_status as keyof typeof statusColors
															] || "bg-gray-100 text-gray-800 border-gray-200"
														}
													>
														{separation.separation_status.charAt(0).toUpperCase() +
															separation.separation_status.slice(1)}
													</Badge>
												</div>
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					)}

				{/* Empty State for Recent Separations */}
				{data.recent_separations.length === 0 ||
					(data.recent_separations.every((sep) => sep.employee_name === "string") && (
						<Card className="bg-card border-border">
							<CardHeader>
								<CardTitle className="text-card-foreground">Recent Separations</CardTitle>
								<CardDescription>No recent separation activities</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="text-center py-8 text-muted-foreground">
									<FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
									<p>No separation activities in the current period</p>
								</div>
							</CardContent>
						</Card>
					))}
			</div>
			<ReportDialog
				isOpen={isReportsDialogOpen}
				onClose={() => setIsReportsDialogOpen(false)}
				app="offboarding"
			/>
		</div>
	);
}
