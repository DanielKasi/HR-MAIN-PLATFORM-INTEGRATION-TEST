"use client";

import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	ResponsiveContainer,
	Tooltip,
	CartesianGrid,
} from "recharts";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumberByMagnitude } from "@/lib/helpers";

interface PayrollChartProps {
	data?: {
		current: Array<{ month: string; payroll: number }>;
		past: { total: number };
	};
	totalCurrentYear: number;
	growthPercentage: number;
	onRefresh: (year?: number) => void;
	loading: boolean;
}

export function PayrollChart({
	data,
	totalCurrentYear,
	growthPercentage,
	onRefresh,
	loading,
}: PayrollChartProps) {
	const [payrollYear, setPayrollYear] = useState<number>(new Date().getFullYear());

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg">
					<p className="text-sm font-medium text-gray-900">{label}</p>
					<p className="text-sm text-gray-600">
						Payroll: <span className="font-semibold">{payload[0].value.toLocaleString()}</span>
					</p>
				</div>
			);
		}
		return null;
	};

	return (
		<Card className="shadow-sm border border-gray-200 bg-white rounded-2xl">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="space-y-1">
					<CardTitle className="text-lg font-semibold text-slate-900">Payroll Over Years</CardTitle>
					<div className="flex items-center gap-3 mt-2">
						<p className="text-3xl font-bold text-slate-900">
							{formatNumberByMagnitude(totalCurrentYear)}
						</p>
						<span
							className={`text-sm font-medium ${growthPercentage >= 0 ? "text-green-600" : "text-red-600"}`}
						>
							{growthPercentage > 0 ? "+" : ""}
							{growthPercentage.toFixed(0)}% vs last year
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={payrollYear.toString()}
						onValueChange={(e) => {
							const newTime = new Date();
							newTime.setFullYear(Number(e));
							setPayrollYear(newTime.getFullYear());
							onRefresh(newTime.getFullYear());
						}}
					>
						<SelectTrigger className="w-32 rounded-lg border-gray-300">
							<SelectValue placeholder={payrollYear.toString()} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={new Date().getFullYear().toString()}>
								{new Date().getFullYear()}
							</SelectItem>
							<SelectItem value={(new Date().getFullYear() - 1).toString()}>
								{new Date().getFullYear() - 1}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent className="pt-4">
				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={data?.current || []}
							margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
							<XAxis
								dataKey="month"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 13, fill: "#6B7280", fontWeight: 500 }}
								dy={10}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 13, fill: "#6B7280" }}
								tickFormatter={formatNumberByMagnitude}
								dx={-10}
							/>
							<Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }} />
							<Line
								type="monotone"
								dataKey="payroll"
								stroke="#0CA0F5"
								strokeWidth={3}
								dot={{ fill: "#0CA0F5", strokeWidth: 2, r: 5 }}
								activeDot={{ r: 7, fill: "#0CA0F5", strokeWidth: 2 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
