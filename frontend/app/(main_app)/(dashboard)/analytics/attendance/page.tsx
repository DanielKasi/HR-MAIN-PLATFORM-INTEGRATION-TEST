"use client";

import type { IAttendanceDashboard } from "@/types/types.utils";

import { useState, useEffect, ReactNode } from "react";
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
import LoadingComponent from "@/components/LoadingComponent";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import BarVChart from "../_components/barv.chart";

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
	const initialData: IAttendanceDashboard = {
		total_attendance_records: 1,
		attendance_by_status: [{ status: "sdf", count: 3 }],
		average_overtime_hours: 3,
		average_late_minutes: 3,
		average_early_checkout_minutes: 4,
		spot_check_response_rate: 5,
		spot_checks_by_status: [{ status: "232", count: 1231 }],
		attendance_over_time: [{ month: "JAN", count: 12 }],
	};
	const getCards = (data: IAttendanceDashboard) => [
		{
			title: "Average Late Time",
			value: data.average_late_minutes,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:laptop",
			link: "#",
		},
		{
			title: "Average Late Time",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.average_late_minutes,
			icon: "hugeicons:safe-delivery-01",
			link: "#",
		},
		{
			title: "Average Late Time",
			value: data.average_late_minutes,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:laptop-issue",
			link: "#",
		},
		{
			title: "Average Late Time",
			value: data.average_overtime_hours,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:laptop-remove",
		},
	];
	return (
		<LoadingComponent
			initialData={initialData}
			// fetchData={getAttendanceDashboard}
			fetchData={() => Promise.resolve(initialData)}
			content={(data) => (
				<div className="min-h-screen  p-6">
					<div className="space-y-8">
						{/* Header */}
						<div className="space-y-4">
							<h1 className="text-4xl font-bold text-slate-900 text-balance">
								Attendance Analytics Dashboard
							</h1>
							<p className="text-lg text-slate-600 max-w-2xl text-pretty">
								Comprehensive insights into employee attendance patterns, punctuality metrics, and
								spot check compliance
							</p>
						</div>

						{/* Key Metrics */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getCards(data).map((card, i) => (
								<StatsCard key={i} {...card} />
							))}
						</div>

						{/* Time Metrics */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getCards(data).map((card, i) => (
								<StatsCard key={i} {...card} />
							))}
							{getCards(data).map((card, i) => (
								<StatsCard key={i} {...card} />
							))}
						</div>

						{/* Charts Section */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Attendance by Status */}
							<Piechart
								totalStr={""}
								title={"Attendance by Status"}
								label={""}
								data={{
									"2025": data.attendance_by_status,
								}}
								dataKey={"count"}
								nameKey={"status"}
								colors={colors}
							/>

							{/* Spot Check Status */}
							<BarVChart
								title={"Spot Check Status"}
								label={""}
								data={{
									"2025": data.spot_checks_by_status,
								}}
								dataKey={"count"}
								nameKey={"status"}
								colors={colors}
							/>
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
													{totalRecords > 0 ? ((status.count / totalRecords) * 100).toFixed(1) : 0}%
													of total
												</div>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			)}
		></LoadingComponent>
	);
}
