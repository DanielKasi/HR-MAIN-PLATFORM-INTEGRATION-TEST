"use client";

import { Treemap, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import React from "react";

interface DepartmentData {
	department: string;
	count: number;
}

interface DepartmentTreeMapProps {
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

				const colors = ["#ff4500", "#ff7f50", "#ff6347", "#ff5722", "#ffa07a"];
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

export default function DepartmentTreeMap({ data, chartConfig }: DepartmentTreeMapProps) {
	const departmentConfig = React.useMemo(() => {
		const config: Record<string, { label: string; color: string }> = {};
		const colors = [
			"#ff4500", 
			"#ff7f50", 
			"#ff6347",
			"#ff5722", 
			"#ffa07a", 
			"#ff6b35", 
			"#ff8a50", 
			"#ff9770", 
			"#ffab91", 
			"#d84315",
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
		<ChartContainer config={chartConfig} className="h-[300px]">
			<ResponsiveContainer width="100%" height="100%">
				<Treemap
					data={data}
					dataKey="count"
					nameKey="department"
					content={<CustomTreemapContent />}
				>
					<ChartTooltip content={<ChartTooltipContent />} />
				</Treemap>
			</ResponsiveContainer>
		</ChartContainer>
	);
}
