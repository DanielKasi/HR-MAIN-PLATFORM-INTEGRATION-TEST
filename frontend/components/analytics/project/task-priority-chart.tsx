"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TasksAnalytics } from "@/types/types.utils";

interface TaskPriorityChartProps {
	data: TasksAnalytics;
}

const chartConfig = {
	count: {
		label: "Tasks",
		color: "hsl(var(--chart-2))",
	},
};

const priorityOrder = ["low", "medium", "high", "urgent"];

export function TaskPriorityChart({ data }: TaskPriorityChartProps) {
	const chartData = priorityOrder.map((priority) => {
		const item = data.by_priority.find((p) => p.priority === priority);
		return {
			priority: priority.charAt(0).toUpperCase() + priority.slice(1),
			count: item?.count || 0,
		};
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tasks by Priority</CardTitle>
				<CardDescription>Priority distribution of all tasks</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={chartData}>
							<XAxis dataKey="priority" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
							<YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
							<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
							<Bar dataKey="count" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
