"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface StatusData {
	status: string;
	count: number;
}

interface StatusChartProps {
	data: StatusData[];
}

const chartConfig = {
	count: {
		label: "Count",
		color: "hsl(var(--chart-1))",
	},
};

const statusColors = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
];

export function StatusChart({ data }: StatusChartProps) {
	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[200px] text-muted-foreground">
				No data available
			</div>
		);
	}

	return (
		<ChartContainer config={chartConfig} className="h-[200px]">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
					<XAxis dataKey="status" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
					<YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<Bar dataKey="count" radius={[4, 4, 0, 0]}>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</ChartContainer>
	);
}
