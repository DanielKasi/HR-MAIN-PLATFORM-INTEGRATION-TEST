"use client";

import type { ILeaveDashboard } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { CalendarDays, Clock, Users, TrendingUp } from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	LineChart,
	Line,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/helpers";
import { getLeaveDashboard } from "@/lib/utils";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function LeaveDashboard() {
	const [data, setData] = useState<ILeaveDashboard | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const result = await getLeaveDashboard();

				setData(result);
			} catch (error) {
				console.error("Failed to fetch leave dashboard:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-slate-500">Failed to load leave dashboard data</p>
			</div>
		);
	}

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "approved":
				return "bg-emerald-100 text-emerald-800";
			case "pending":
				return "bg-amber-100 text-amber-800";
			case "rejected":
				return "bg-red-100 text-red-800";
			default:
				return "bg-slate-100 text-slate-800";
		}
	};

	const getLeaveTypeColor = (type: string) => {
		switch (type.toLowerCase()) {
			case "annual":
				return "bg-blue-100 text-blue-800";
			case "sick":
				return "bg-red-100 text-red-800";
			case "maternity":
				return "bg-pink-100 text-pink-800";
			case "paternity":
				return "bg-indigo-100 text-indigo-800";
			default:
				return "bg-slate-100 text-slate-800";
		}
	};

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-3xl font-bold text-slate-900">Leave Management Dashboard</h1>
				<p className="text-slate-600">Monitor leave applications, balances, and trends</p>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="border-l-4 border-l-emerald-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-slate-600">Total Applications</CardTitle>
						<CalendarDays className="h-4 w-4 text-emerald-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-slate-900">
							{formatCurrency(data.total_leave_applications)}
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-amber-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-slate-600">Pending Approvals</CardTitle>
						<Clock className="h-4 w-4 text-amber-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-slate-900">
							{formatCurrency(data.pending_approvals)}
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-blue-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-slate-600">Avg Days Taken</CardTitle>
						<TrendingUp className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-slate-900">
							{data.average_leave_days_taken.toFixed(1)}
						</div>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-purple-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-slate-600">Leave Types</CardTitle>
						<Users className="h-4 w-4 text-purple-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-slate-900">
							{data.applications_by_leave_type.length}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Applications by Status */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg font-semibold text-slate-900">
							Applications by Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						{data.applications_by_status.length > 0 ? (
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={data.applications_by_status}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={({ status, count }) => `${status}: ${count}`}
										outerRadius={80}
										fill="#8884d8"
										dataKey="count"
									>
										{data.applications_by_status.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-[300px] text-slate-500">
								No status data available
							</div>
						)}
					</CardContent>
				</Card>

				{/* Applications by Leave Type */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg font-semibold text-slate-900">
							Applications by Leave Type
						</CardTitle>
					</CardHeader>
					<CardContent>
						{data.applications_by_leave_type.length > 0 ? (
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={data.applications_by_leave_type}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="leave_type" />
									<YAxis />
									<Tooltip />
									<Bar dataKey="count" fill="#10b981" />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-[300px] text-slate-500">
								No leave type data available
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Leave Balances */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg font-semibold text-slate-900">
						Leave Balances by Type
					</CardTitle>
				</CardHeader>
				<CardContent>
					{data.leave_balances_by_type.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b border-slate-200">
										<th className="text-left py-3 px-4 font-medium text-slate-600">Leave Type</th>
										<th className="text-right py-3 px-4 font-medium text-slate-600">Allocated</th>
										<th className="text-right py-3 px-4 font-medium text-slate-600">Used</th>
										<th className="text-right py-3 px-4 font-medium text-slate-600">Available</th>
										<th className="text-right py-3 px-4 font-medium text-slate-600">Usage %</th>
									</tr>
								</thead>
								<tbody>
									{data.leave_balances_by_type.map((balance, index) => {
										const usagePercent =
											balance.total_allocated_days > 0
												? ((balance.total_used_days / balance.total_allocated_days) * 100).toFixed(
														1,
													)
												: "0.0";

										return (
											<tr key={index} className="border-b border-slate-100">
												<td className="py-3 px-4">
													<Badge className={getLeaveTypeColor(balance.leave_type)}>
														{balance.leave_type}
													</Badge>
												</td>
												<td className="text-right py-3 px-4 font-medium">
													{balance.total_allocated_days}
												</td>
												<td className="text-right py-3 px-4">{balance.total_used_days}</td>
												<td className="text-right py-3 px-4 text-emerald-600 font-medium">
													{balance.total_available_days}
												</td>
												<td className="text-right py-3 px-4">
													<span
														className={`font-medium ${Number.parseFloat(usagePercent) > 80 ? "text-red-600" : Number.parseFloat(usagePercent) > 60 ? "text-amber-600" : "text-emerald-600"}`}
													>
														{usagePercent}%
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<div className="flex items-center justify-center h-[200px] text-slate-500">
							No leave balance data available
						</div>
					)}
				</CardContent>
			</Card>

			{/* Applications Over Time */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg font-semibold text-slate-900">
						Leave Applications Over Time
					</CardTitle>
				</CardHeader>
				<CardContent>
					{data.applications_over_time.length > 0 ? (
						<ResponsiveContainer width="100%" height={300}>
							<LineChart data={data.applications_over_time}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="date" />
								<YAxis />
								<Tooltip />
								<Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
							</LineChart>
						</ResponsiveContainer>
					) : (
						<div className="flex items-center justify-center h-[300px] text-slate-500">
							No timeline data available
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// Add default export
export default LeaveDashboard;
