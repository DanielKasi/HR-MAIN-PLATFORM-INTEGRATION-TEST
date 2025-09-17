"use client";

import type { ProjectsAnalytics } from "@/types/types.utils";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ProjectStatusChartProps {
	data: ProjectsAnalytics;
}

const chartConfig = {
	count: {
		label: "Projects",
		color: "hsl(var(--chart-1))",
	},
};

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
	const chartData = data.by_status.map((item) => ({
		status: item.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
		count: item.count,
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Projects by Status</CardTitle>
				<CardDescription>Distribution of projects across different statuses</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={chartData}>
							<XAxis dataKey="status" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
							<YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
							<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
							<Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
