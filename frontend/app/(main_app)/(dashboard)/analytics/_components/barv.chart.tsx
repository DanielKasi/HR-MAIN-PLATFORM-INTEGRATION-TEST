"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

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
	colors: string[];
	rounded?: boolean;
	headerSlot?: React.ReactElement;
	className?: string;
	gap?: boolean;
	select?: boolean;
}

export default function BarVChart({
	title,
	label,
	dataKey,
	nameKey,
	colors,
	data,
	rounded,
	headerSlot,
	className,
	gap,
	select = true,
}: Props) {
	const [years] = React.useState(Object.keys(data).sort().reverse());

	const [category, setCategory] = React.useState(years[0]);

	const [items, setItems] = React.useState(data[years[0]] || ([] as Entry[]));

	const chartConfig = React.useMemo(() => {
		return items.reduce((acc, curr, index) => {
			if (index == 0) acc[dataKey] = { label, color: colors[index] };
			acc[curr[nameKey]] = { label: sentenceCase(curr[nameKey] as string), color: colors[index] };
			return acc;
		}, {} as any);
	}, []);

	return (
		<Card className={`flex flex-col shadow-none border ${className}`}>
			<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-0 gap-2 sm:gap-4">
				<CardTitle className="text-lg sm:text-xl flex-grow text-center sm:text-left">
					{title}
				</CardTitle>
				<div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
					{headerSlot || null}
					{select && category && (
						<Select
							defaultValue={category}
							onValueChange={(d) => {
								setCategory(d);
								setItems(data[d]);
							}}
						>
							<SelectTrigger className="text-slate-900 w-full sm:w-[140px] text-sm">
								<SelectValue placeholder={category} />
							</SelectTrigger>
							<SelectContent>
								{years.map((k) => (
									<SelectItem key={k} value={k} className="text-sm">
										{sentenceCase(k)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex items-center p-2 sm:p-6">
				<ChartContainer
					config={chartConfig}
					className="mx-auto w-full h-full max-h-[300px] sm:max-h-[350px] md:max-h-[400px] min-h-[250px]"
				>
					<BarChart
						accessibilityLayer
						data={items}
						barCategoryGap={gap ? (window.innerWidth < 768 ? 8 : 10) : 0}
						margin={{
							top: 10,
							bottom: 10,
							left: window.innerWidth < 768 ? 5 : 10,
							right: window.innerWidth < 768 ? 5 : 10,
						}}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							dataKey={nameKey}
							tickLine={false}
							tickMargin={window.innerWidth < 768 ? 5 : 10}
							axisLine={false}
							tickFormatter={(value) => {
								const formatted = sentenceCase(value);
								// Truncate long labels on mobile
								return window.innerWidth < 768 && formatted.length > 8
									? formatted.substring(0, 7) + "..."
									: formatted;
							}}
							interval={window.innerWidth < 768 ? "preserveStartEnd" : 0}
							fontSize={window.innerWidth < 768 ? 10 : 12}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							domain={[0, 1.25 * Math.max(...items.map((x) => x[dataKey] as number))]}
							fontSize={window.innerWidth < 768 ? 10 : 12}
							width={window.innerWidth < 768 ? 30 : 40}
						/>
						<ChartTooltip
							active
							cursor={false}
							content={<ChartTooltipContent hideLabel hideIndicator />}
						/>
						<Bar dataKey={dataKey} radius={rounded ? [8, 8, 0, 0] : 0}>
							{items.map((_, index) => (
								<Cell key={`cell-${index}`} fill={colors[index]} />
							))}
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
