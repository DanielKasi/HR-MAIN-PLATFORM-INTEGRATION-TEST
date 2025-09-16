"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { useState } from "react";
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
				<div className="bg-gray-900 text-white p-2 rounded shadow-lg">
					<p className="text-sm">{`${label}: ${payload[0].value.toLocaleString()}`}</p>
				</div>
			);
		}
		return null;
	};

	return (
		<Card className="shadow-sm border-none bg-white rounded-3xl">
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base font-medium text-gray-600">Payroll Over Years</CardTitle>
					<div className="flex items-center gap-4 mt-2">
						<p className="text-2xl font-bold">{formatNumberByMagnitude(totalCurrentYear)}</p>
						<span className="text-sm text-green-600 font-medium">
							{growthPercentage > 0 ? "+" : ""}
							{growthPercentage.toFixed(0)}% VS LAST YEAR
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
						<SelectTrigger className="py-0 px-3 rounded-lg !ring-0">
							{payrollYear.toString()}
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
			<CardContent>
				<div className="h-64">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={data?.current || []}>
							<XAxis
								dataKey="month"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: "#6B7280" }}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 12, fill: "#6B7280" }}
								tickFormatter={formatNumberByMagnitude}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Line
								type="monotone"
								dataKey="payroll"
								stroke="#EF4444"
								strokeWidth={2}
								dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
								activeDot={{ r: 6, fill: "#EF4444" }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
