"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { sentenceCase } from "@/lib/helpers/index";
import { formatNumberByMagnitude } from "@/lib/helpers";

interface PayrollByDepartmentProps {
	data?: Array<{ dept: string; payroll: number }>;
	onRefresh: () => void;
	loading: boolean;
}

export function PayrollByDepartment({ data, onRefresh, loading }: PayrollByDepartmentProps) {
	// Transform data to match BarHChart format
	const chartData = React.useMemo(() => {
		if (!data) return [];
		return data.map((item) => ({
			department: item.dept,
			count: item.payroll,
		}));
	}, [data]);

	const chartConfig = React.useMemo(() => {
		return chartData.reduce((acc, curr, index) => {
			if (index === 0) acc.label = "Payroll Amount";
			acc[curr.department] = {
				label: sentenceCase(curr.department),
				color: "#f97316", // orange-500
			};
			return acc;
		}, {} as any);
	}, [chartData]);

	if (!data || data.length === 0) {
		return (
			<Card className="shadow-sm border-none rounded-xl">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base font-medium">Payroll by Department</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center h-80 text-gray-500">
						No data available
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="shadow-sm border-none rounded-xl">
			<CardHeader className="flex flex-row items-center justify-between pb-0">
				<CardTitle className="text-base font-medium">Payroll by Department</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 flex items-center">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square w-full h-full max-h-[320px]"
				>
					<BarChart
						accessibilityLayer
						data={chartData}
						layout="vertical"
						barCategoryGap={20}
						margin={{
							top: 20,
							left: 20,
							bottom: 10,
						}}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							type="number"
							dataKey="count"
							axisLine={false}
							tickFormatter={(v) => formatNumberByMagnitude(v)}
							domain={[0, 1.25 * Math.max(...chartData.map((x) => x.count))]}
						/>
						<YAxis dataKey="department" type="category" axisLine={false} hide />
						<ChartTooltip
							active
							cursor={false}
							content={<ChartTooltipContent hideLabel indicator="dot" nameKey="department" />}
						/>
						<Bar
							dataKey="count"
							height={24}
							radius={5}
							fill="#f97316"
							background={{ fill: "hsl(var(--accent))" }}
						>
							<ChartTooltipContent
								formatter={(value) => [formatNumberByMagnitude(Number(value)), "Payroll"]}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
