"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";

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
	data: Record<string, Entry[]>;
	dataKey: string;
	nameKey: string;
	color: string;
	rounded?: boolean;
	className?: string;
	select?: boolean;
}

export default function BarHChart({
	title,
	dataKey,
	nameKey,
	color,
	data,
	rounded,
	className,
	select = true,
}: Props) {
	const [groups] = React.useState(Object.keys(data).sort().reverse());

	const [category, setCategory] = React.useState(groups[0]);

	const [items, setItems] = React.useState(data[groups[0]] || ([] as Entry[]));

	const chartConfig = React.useMemo(() => {
		return items.reduce((acc, curr, index) => {
			if (index == 0) acc.label = color;
			acc[curr[nameKey]] = { label: sentenceCase(curr[nameKey] as string), color };
			return acc;
		}, {} as any);
	}, []);

	return (
		<Card className={`flex flex-col shadow-none border ${className}`}>
			<CardHeader className="flex flex-row items-center justify-between pb-0">
				<CardTitle className="text-xl flex-grow">{title}</CardTitle>
				{select && groups?.length && (
					<div className="flex items-center gap-4">
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
								{groups.map((k) => (
									<SelectItem key={k} value={k}>
										{sentenceCase(k)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
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
							top: 20,
							left: 20,
							bottom: 10,
						}}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							type="number"
							dataKey={dataKey}
							axisLine={false}
							tickFormatter={(v) => sentenceCase(v)}
							domain={[0, 1.25 * Math.max(...items.map((x) => x[dataKey] as number))]}
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
							<LabelList position="right" offset={8} className="text-sm fill-slate-600" />
							<LabelList
								dataKey={nameKey}
								position="insideTopLeft"
								offset={-20}
								className="text-base fill-slate-600"
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
