"use client";

import type { IAttendanceDashboard } from "@/types/types.utils";

import { useState, useEffect } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	LineChart,
	Line,
} from "recharts";
import { Clock, AlertTriangle, CheckCircle, Calendar } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/helpers";
import { getAttendanceDashboard } from "@/lib/utils";

const statusColors = {
	on_time: "#10b981",
	late: "#f59e0b",
	absent: "#ef4444",
	early_checkout: "#8b5cf6",
	RESPONDED: "#10b981",
	MISSED: "#ef4444",
	NOT_CHECKED_AT_PREMISES: "#f59e0b",
};

const formatTime = (minutes: number): string => {
	if (minutes < 60) {
		return `${minutes.toFixed(1)}m`;
	}
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	return `${hours}h ${remainingMinutes.toFixed(0)}m`;
};

const formatHours = (hours: number): string => {
	return `${hours.toFixed(1)}h`;
};

export default function AttendanceDashboard() {
	const [data, setData] = useState<IAttendanceDashboard | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const dashboardData = await getAttendanceDashboard();

				setData(dashboardData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch data");
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, []);

	const attendanceRate = data?.attendance_by_status.find((s) => s.status === "on_time")?.count || 0;
	const totalRecords = data?.total_attendance_records || 0;
	const onTimePercentage = totalRecords > 0 ? (attendanceRate / totalRecords) * 100 : 0;

	return (
		<div className="min-h-screen  p-6">
			<div className="space-y-8">
				{/* Header */}
				<div className="space-y-4">
					<h1 className="text-4xl font-bold text-slate-900 text-balance">
						Attendance Analytics Dashboard
					</h1>
					<p className="text-lg text-slate-600 max-w-2xl text-pretty">
						Comprehensive insights into employee attendance patterns, punctuality metrics, and spot
						check compliance
					</p>
				</div>

				{/* Key Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
							<Calendar className="h-4 w-4 text-emerald-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-slate-900">
								{formatCurrency(data?.total_attendance_records ?? 0)}
							</div>
							<p className="text-xs text-slate-500 mt-1">Attendance entries</p>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-slate-600">On-Time Rate</CardTitle>
							<CheckCircle className="h-4 w-4 text-emerald-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-emerald-600">
								{onTimePercentage.toFixed(1)}%
							</div>
							<Progress value={onTimePercentage} className="mt-2 h-2" />
						</CardContent>
					</Card>

					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-slate-600">Avg Overtime</CardTitle>
							<Clock className="h-4 w-4 text-emerald-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-slate-900">
								{formatHours(data?.average_overtime_hours ?? 0)}
							</div>
							<p className="text-xs text-slate-500 mt-1">Per employee</p>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-slate-600">Spot Check Rate</CardTitle>
							<AlertTriangle className="h-4 w-4 text-emerald-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-slate-900">
								{(data?.spot_check_response_rate ?? 0).toFixed(1)}%
							</div>
							<Progress value={data?.spot_check_response_rate ?? 0} className="mt-2 h-2" />
						</CardContent>
					</Card>
				</div>

				{/* Time Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader>
							<CardTitle className="text-lg font-semibold text-slate-900">
								Average Late Time
							</CardTitle>
							<CardDescription>When employees arrive late</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-amber-600">
								{formatTime(data?.average_late_minutes ?? 0)}
							</div>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader>
							<CardTitle className="text-lg font-semibold text-slate-900">Early Checkout</CardTitle>
							<CardDescription>Average early departure time</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-purple-600">
								{formatTime(data?.average_early_checkout_minutes ?? 0)}
							</div>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader>
							<CardTitle className="text-lg font-semibold text-slate-900">Overtime Hours</CardTitle>
							<CardDescription>Average additional work time</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-emerald-600">
								{formatHours(data?.average_overtime_hours ?? 0)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Attendance by Status */}
					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader>
							<CardTitle className="text-lg font-semibold text-slate-900">
								Attendance by Status
							</CardTitle>
							<CardDescription>Distribution of attendance records</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									count: {
										label: "Count",
										color: "hsl(var(--chart-1))",
									},
								}}
								className="h-[300px]"
							>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={data?.attendance_by_status ?? []}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ status, count, percent }) =>
												`${status}: ${(percent * 100).toFixed(0)}%`
											}
											outerRadius={80}
											fill="#8884d8"
											dataKey="count"
										>
											{(data?.attendance_by_status ?? []).map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={
														statusColors[entry.status as keyof typeof statusColors] || "#8884d8"
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

					{/* Spot Check Status */}
					<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
						<CardHeader>
							<CardTitle className="text-lg font-semibold text-slate-900">
								Spot Check Status
							</CardTitle>
							<CardDescription>Employee response to spot checks</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									count: {
										label: "Count",
										color: "hsl(var(--chart-2))",
									},
								}}
								className="h-[300px]"
							>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data?.spot_checks_by_status ?? []}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="status" />
										<YAxis />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" fill="#10b981" />
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>

				{/* Attendance Trend */}
				<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
					<CardHeader>
						<CardTitle className="text-lg font-semibold text-slate-900">
							Attendance Over Time
						</CardTitle>
						<CardDescription>Daily attendance trends</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={{
								count: {
									label: "Attendance Count",
									color: "hsl(var(--chart-1))",
								},
							}}
							className="h-[400px]"
						>
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data?.attendance_over_time ?? []}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="date" />
									<YAxis />
									<ChartTooltip content={<ChartTooltipContent />} />
									<Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
								</LineChart>
							</ResponsiveContainer>
						</ChartContainer>
					</CardContent>
				</Card>

				{/* Status Summary */}
				<Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
					<CardHeader>
						<CardTitle className="text-lg font-semibold text-slate-900">
							Attendance Summary
						</CardTitle>
						<CardDescription>Detailed breakdown by status</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							{(data?.attendance_by_status ?? []).map((status) => (
								<div
									key={status.status}
									className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
								>
									<div>
										<Badge
											variant="secondary"
											className="mb-2"
											style={{
												backgroundColor: `${statusColors[status.status as keyof typeof statusColors]}20`,
												color: statusColors[status.status as keyof typeof statusColors],
											}}
										>
											{status.status.replace("_", " ").toUpperCase()}
										</Badge>
										<div className="text-2xl font-bold text-slate-900">
											{formatCurrency(status.count)}
										</div>
										<div className="text-sm text-slate-500">
											{totalRecords > 0 ? ((status.count / totalRecords) * 100).toFixed(1) : 0}% of
											total
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
