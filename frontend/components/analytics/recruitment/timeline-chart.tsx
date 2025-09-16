"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface TimelineData {
	date: string;
	count: number;
}

interface TimelineChartProps {
	data: TimelineData[];
}

const chartConfig = {
	count: {
		label: "Applications",
		color: "hsl(var(--chart-1))",
	},
};

export function TimelineChart({ data }: TimelineChartProps) {
	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[300px] text-muted-foreground">
				No data available
			</div>
		);
	}

	return (
		<ChartContainer config={chartConfig} className="h-[300px]">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
					<XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
					<YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<Line
						type="monotone"
						dataKey="count"
						stroke="var(--color-count)"
						strokeWidth={3}
						dot={{ fill: "var(--color-count)", strokeWidth: 2, r: 4 }}
						activeDot={{ r: 6, stroke: "var(--color-count)", strokeWidth: 2 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</ChartContainer>
	);
}
