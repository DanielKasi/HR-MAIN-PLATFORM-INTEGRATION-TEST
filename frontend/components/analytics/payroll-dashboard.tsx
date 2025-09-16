"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LineChart,
	Line,
} from "recharts";
import { formatCurrency } from "@/lib/helpers";
import { Users, DollarSign, TrendingUp, AlertTriangle, Calendar, Building2 } from "lucide-react";
import { getPayrollDashboard } from "@/lib/utils";
import { useEffect, useState } from "react";
import { IPayrollDashboard } from "@/types/types.utils";

const COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
];

export default function PayrollDashboard() {
	const [data, setData] = useState<IPayrollDashboard | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const dashboardData = await getPayrollDashboard();
				setData(dashboardData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	// Show loading state
	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
					<p className="mt-4 text-muted-foreground">Loading payroll data...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<div className="text-center">
					<AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-foreground mb-2">Error Loading Data</h2>
					<p className="text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	// Show message if no data
	if (!data) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">No payroll data available</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-foreground">Payroll Dashboard</h1>
						<p className="text-muted-foreground">
							Latest Period: {data.payroll_periods_summary.latest_period}
						</p>
					</div>
					<Badge variant="secondary" className="text-sm">
						{data.payroll_periods_summary.processed_periods} of{" "}
						{data.payroll_periods_summary.total_periods} Periods Processed
					</Badge>
				</div>

				{/* Key Metrics Cards */}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Net Payroll</CardTitle>
							<DollarSign className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-primary">
								{formatCurrency(data.total_payroll_amount)}
							</div>
							<p className="text-xs text-muted-foreground">
								Gross: {formatCurrency(data.total_gross_payroll)}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Average Net Salary</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-primary">
								{formatCurrency(data.average_net_salary)}
							</div>
							<p className="text-xs text-muted-foreground">
								Gross Avg: {formatCurrency(data.average_gross_salary)}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Net Difference</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-primary">
								{formatCurrency(data.allowances_vs_deductions.net_difference)}
							</div>
							<p className="text-xs text-muted-foreground">Allowances - Deductions</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
							<AlertTriangle className="h-4 w-4 text-destructive" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-destructive">
								{formatCurrency(data.total_penalties_amount)}
							</div>
							<p className="text-xs text-muted-foreground">
								{data.total_penalties_count} penalty instances
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Charts Section */}
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Payroll Over Time */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Payroll Trends Over Time
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={data.payroll_over_time}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="month" />
									<YAxis tickFormatter={(value) => `${formatCurrency(value)}`} />
									<Tooltip
										formatter={(value: string | number) => [`${formatCurrency(value)}`, ""]}
									/>

									<Line
										type="monotone"
										dataKey="total_net"
										stroke="hsl(var(--primary))"
										strokeWidth={2}
										name="Net Payroll"
									/>
									<Line
										type="monotone"
										dataKey="total_gross"
										stroke="hsl(var(--chart-2))"
										strokeWidth={2}
										name="Gross Payroll"
									/>
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* Department Breakdown */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								Payroll by Department
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={data.payroll_by_department}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="department" />
									<YAxis tickFormatter={(value) => `${formatCurrency(value)}`} />
									<Tooltip
										formatter={(value: string | number) => [`${formatCurrency(value)}`, ""]}
									/>

									<Bar dataKey="total_net" fill="hsl(var(--primary))" name="Net Payroll" />
									<Bar dataKey="total_gross" fill="hsl(var(--chart-2))" name="Gross Payroll" />
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</div>

				{/* Department Details & Allowances vs Deductions */}
				<div className="grid gap-6 lg:grid-cols-3">
					{/* Department Employee Count */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle>Department Overview</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{data.payroll_by_department.map((dept, index) => (
									<div key={dept.department} className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div
												className="h-3 w-3 rounded-full"
												style={{ backgroundColor: COLORS[index % COLORS.length] }}
											/>
											<div>
												<p className="font-medium">{dept.department}</p>
												<p className="text-sm text-muted-foreground">
													{dept.employee_count} employees
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className="font-medium">{formatCurrency(dept.total_net)}</p>
											<p className="text-sm text-muted-foreground">Net Payroll</p>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Allowances vs Deductions */}
					<Card>
						<CardHeader>
							<CardTitle>Allowances vs Deductions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm">Total Allowances</span>
									<span className="font-medium text-primary">
										{formatCurrency(data.allowances_vs_deductions.total_allowances)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm">Total Deductions</span>
									<span className="font-medium text-destructive">
										{formatCurrency(data.allowances_vs_deductions.total_deductions)}
									</span>
								</div>
								<div className="border-t pt-2">
									<div className="flex justify-between">
										<span className="font-medium">Net Difference</span>
										<span className="font-bold text-primary">
											{formatCurrency(data.allowances_vs_deductions.net_difference)}
										</span>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span>Deduction Rate</span>
									<span>
										{data.allowances_vs_deductions.total_allowances > 0
											? (
													(data.allowances_vs_deductions.total_deductions /
														data.allowances_vs_deductions.total_allowances) *
													100
												).toFixed(1)
											: "0.0"}
										%
									</span>
								</div>
								<Progress
									value={
										data.allowances_vs_deductions.total_allowances > 0
											? (data.allowances_vs_deductions.total_deductions /
													data.allowances_vs_deductions.total_allowances) *
												100
											: 0
									}
									className="h-2"
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Penalty Breakdown */}
				{data.penalty_breakdown && data.penalty_breakdown.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<AlertTriangle className="h-5 w-5 text-destructive" />
								Penalty Breakdown
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{data.penalty_breakdown.map((penalty, index) => (
									<div
										key={index}
										className="flex items-center justify-between rounded-lg border p-4"
									>
										<div>
											<p className="font-medium">{penalty.penalty_type}</p>
											<p className="text-sm text-muted-foreground">{penalty.count} instances</p>
										</div>
										<div className="text-right">
											<p className="font-bold text-destructive">
												{formatCurrency(penalty.total_amount)}
											</p>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
