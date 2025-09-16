"use client";

import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TasksAnalytics } from "@/types/types.utils";

interface TaskStatusChartProps {
	data: TasksAnalytics;
}

const COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
];

const chartConfig = {
	count: {
		label: "Tasks",
		color: "hsl(var(--chart-1))",
	},
};

export function TaskStatusChart({ data }: TaskStatusChartProps) {
	const chartData = data.by_status.map((item, index) => ({
		status: item.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
		count: item.count,
		fill: COLORS[index % COLORS.length],
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tasks by Status</CardTitle>
				<CardDescription>Current status distribution of all tasks</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={chartData}
								cx="50%"
								cy="50%"
								labelLine={false}
								label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
								outerRadius={80}
								fill="#8884d8"
								dataKey="count"
							>
								{chartData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.fill} />
								))}
							</Pie>
							<ChartTooltip content={<ChartTooltipContent />} />
						</PieChart>
					</ResponsiveContainer>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
