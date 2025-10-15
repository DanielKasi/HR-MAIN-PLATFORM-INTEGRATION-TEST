"use client";

import { Treemap, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DepartmentData {
	department: string;
	count: number;
}

interface DepartmentTreeMapProps {
	title: string;
	data: DepartmentData[];
	chartConfig?: any;
}

const CustomTreemapContent = (props: any) => {
	const { children } = props;

	if (!children || children.length === 0) return null;

	return (
		<g>
			{children.map((child: any, index: number) => {
				const { x, y, width, height, department, count } = child;

				const colors = ["#0CA0F5", "#3DB3F7", "#5DC2F9", "#7DD1FB", "#9DE0FD"];
				const fillColor = colors[index % colors.length];

				return (
					<g key={index}>
						<rect
							x={x}
							y={y}
							width={width}
							height={height}
							fill={fillColor}
							stroke="white"
							strokeWidth={2}
						/>
						<text
							x={x + width / 2}
							y={y + height / 2 - 8}
							textAnchor="middle"
							fill="white"
							fontSize="9"
							fontWeight="bold"
						>
							{department}
						</text>
						<text
							x={x + width / 2}
							y={y + height / 2 + 8}
							textAnchor="middle"
							fill="white"
							fontSize="10"
						>
							Count: {count}
						</text>
					</g>
				);
			})}
		</g>
	);
};

export default function DepartmentTreeMap({ data, chartConfig, title }: DepartmentTreeMapProps) {
	const departmentConfig = React.useMemo(() => {
		const config: Record<string, { label: string; color: string }> = {};
		const colors = [
			"#0CA0F5",
			"#3DB3F7",
			"#5DC2F9",
			"#7DD1FB",
			"#9DE0FD",
			"#0A8AD6",
			"#2BA7F6",
			"#4CBAF8",
			"#6DCBFA",
			"#0890E8",
		];
		data.forEach((item, index) => {
			config[item.department] = {
				label: item.department,
				color: colors[index % colors.length],
			};
		});

		return config;
	}, [data]);

	return (
		<Card className="shadow-none border rounded-xl">
			<CardHeader className="flex flex-row items-center justify-between pb-0">
				<CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={departmentConfig} className="w-full h-full max-h-[400px]">
					<Treemap
						data={data}
						dataKey="count"
						nameKey="department"
						content={<CustomTreemapContent />}
					>
						<ChartTooltip content={<ChartTooltipContent />} />
					</Treemap>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
