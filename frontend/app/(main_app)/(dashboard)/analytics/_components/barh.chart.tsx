"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { sentenceCase } from "@/lib/helpers/index";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Entry = Record<string, string | number>;

interface Props {
	title: string;
	label: string;
	data: Record<string, Entry[]>;
	dataKey: string;
	nameKey: string;
	color: string;
	rounded?: boolean;
	className?: string;
}

export default function BarHChart({
	title,
	label,
	dataKey,
	nameKey,
	color,
	data,
	rounded,
	className,
}: Props) {
	const years = Object.keys(data).sort().reverse();

	const currentYear = years[0] || new Date().getFullYear().toString();
	const [category, setCategory] = React.useState(currentYear);

	const [items, setItems] = React.useState(data[currentYear] || ([] as Entry[]));

	const chartConfig = React.useMemo(() => {
		return items.reduce((acc, curr, index) => {
			if (index == 0) acc.label = color;
			acc[curr[nameKey]] = { label: sentenceCase(curr[nameKey] as string), color };
			return acc;
		}, {} as any);
	}, []);

	console.log(chartConfig);

	return (
		<Card className={`flex flex-col shadow-none border ${className}`}>
			<CardHeader className="flex flex-row items-center justify-between pb-0">
				<CardTitle className="text-xl flex-grow">{title}</CardTitle>
				<div className="flex items-center gap-4">
					<Select
						defaultValue={category}
						onValueChange={(d) => {
							setCategory(d);
							setItems(data[d]);
						}}
					>
						<SelectTrigger className="text-slate-900">
							<SelectValue placeholder={currentYear} />
						</SelectTrigger>
						<SelectContent>
							{years.map((k) => (
								<SelectItem key={k} value={k}>
									{sentenceCase(k)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex items-center">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square w-full h-full max-h-[400px]"
				>
					<BarChart
						accessibilityLayer
						data={items}
						layout="vertical"
						barCategoryGap={20}
						margin={{
							top: 10,
							left: 20,
						}}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							type="number"
							dataKey={dataKey}
							axisLine={false}
							tickFormatter={(v) => sentenceCase(v)}
						/>
						<YAxis dataKey={nameKey} type="category" axisLine={false} hide />
						<ChartTooltip
							active
							cursor={false}
							content={<ChartTooltipContent hideLabel indicator="dot" nameKey={nameKey} />}
						/>
						<Bar
							dataKey={dataKey}
							radius={rounded ? 5 : 0}
							fill={color}
							background={{ fill: "hsl(var(--accent))" }}
						>
							<LabelList
								dataKey={nameKey}
								position="insideTopLeft"
								offset={-20}
								width="300"
								className="text-base fill-slate-600 -ml-4 w-full"
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
