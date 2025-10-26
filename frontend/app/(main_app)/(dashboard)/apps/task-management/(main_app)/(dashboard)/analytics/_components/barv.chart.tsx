"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/platform/v1/components";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/platform/v1/components";
import { sentenceCase } from "@/lib/helpers/index";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/platform/v1/components";

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
			<CardHeader className="flex flex-row items-center justify-between pb-0">
				<CardTitle className="text-xl flex-grow">{title}</CardTitle>
				{headerSlot || null}
				<div className="flex items-center gap-4">
					{select && category && (
						<Select
							defaultValue={category}
							onValueChange={(d) => {
								setCategory(d);
								setItems(data[d]);
							}}
						>
							<SelectTrigger className="text-slate-900">
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
			<CardContent className="flex-1 flex items-center">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square w-full h-full max-h-[400px]"
				>
					<BarChart
						accessibilityLayer
						data={items}
						barCategoryGap={gap ? 10 : 0}
						margin={{ top: 10, bottom: 10 }}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							dataKey={nameKey}
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) => sentenceCase(value)}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							domain={[0, 1.25 * Math.max(...items.map((x) => x[dataKey] as number))]}
						/>
						<ChartTooltip
							active
							cursor={false}
							content={<ChartTooltipContent hideLabel hideIndicator />}
						/>
						<Bar dataKey={dataKey} radius={rounded ? [10, 10, 0, 0] : 0}>
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
