"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";

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
	dataKey: string[];
	nameKey: string;
	colors: string[];
	headerSlot?: React.ReactElement;
	className?: string;
	select?: boolean;
}

export default function Linechart({
	title,
	label,
	dataKey,
	nameKey,
	colors,
	data,
	headerSlot,
	className,
	select = true,
}: Props) {
	const [years] = React.useState(Object.keys(data).sort().reverse());

	const [category, setCategory] = React.useState(years[0]);

	const [items, setItems] = React.useState(data[years[0]] || ([] as Entry[]));

	const chartConfig = React.useMemo(() => {
		return items.reduce((acc, curr, index) => {
			if (index == 0) {
				dataKey.forEach((key, i) => {
					acc[key] = { label, color: colors[i] };
				});
			}
			acc[curr[nameKey]] = { label: sentenceCase(curr[nameKey] as string), color: colors[index] };
			return acc;
		}, {} as any);
	}, []);

	return (
		<Card className={`flex flex-col shadow-none border w-full ${className}`}>
			<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-0 gap-3 sm:gap-4">
				<CardTitle className="text-lg sm:text-xl lg:text-2xl flex-grow">{title}</CardTitle>
				<div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
					{headerSlot || null}
					{select && category && (
						<Select
							defaultValue={category}
							onValueChange={(d) => {
								setCategory(d);
								setItems(data[d]);
							}}
						>
							<SelectTrigger className="text-slate-900 w-full sm:w-[140px]">
								<SelectValue placeholder={category} />
							</SelectTrigger>
							<SelectContent>
								{years.map((k) => (
									<SelectItem key={k} value={k}>
										{sentenceCase(k)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex items-center pt-3 sm:pt-4 lg:pt-6">
				<ChartContainer
					config={chartConfig}
					className="mx-auto w-full h-full min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] max-h-[500px]"
				>
					<LineChart
						accessibilityLayer
						data={items}
						margin={{
							left: 8,
							right: 8,
							top: 8,
							bottom: 8,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey={nameKey}
							tickLine={false}
							axisLine={false}
							tickMargin={6}
							tickFormatter={(value) => value}
							tick={{ fontSize: 10, className: "text-xs sm:text-sm" }}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tickMargin={6}
							tick={{ fontSize: 10, className: "text-xs sm:text-sm" }}
						/>
						<ChartTooltip active cursor={false} content={<ChartTooltipContent hideLabel />} />
						{dataKey.map((key, i) => (
							<Line
								key={key}
								dataKey={key}
								type="monotone"
								stroke={colors[i]}
								strokeWidth={1.5}
								dot={{
									r: 4,
								}}
								activeDot={{
									r: 6,
								}}
							/>
						))}
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
