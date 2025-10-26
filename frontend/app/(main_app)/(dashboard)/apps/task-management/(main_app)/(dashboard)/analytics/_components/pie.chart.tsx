"use client";

import * as React from "react";
import { Cell, Label, LabelList, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/platform/v1/components";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
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
	labelList?: boolean;
	data: Record<string, Entry[]>;
	dataKey: string;
	nameKey: string;
	colors: string[];
	totalStr?: string;
	donut?: boolean;
	renderLegend?: (entry: Entry) => React.ReactElement;
	className?: string;
	select?: boolean;
}

export default function Piechart({
	title,
	label,
	labelList,
	dataKey,
	nameKey,
	totalStr,
	colors,
	data,
	donut,
	renderLegend,
	className,
	select = true,
}: Props) {
	const [groups] = React.useState(Object.keys(data).sort().reverse());

	const [category, setCategory] = React.useState(groups[0]);

	const [items, setItems] = React.useState(data[groups[0]] || ([] as Entry[]));

	const total = React.useMemo(() => {
		return items.reduce((acc, curr) => acc + (curr[dataKey] as number), 0);
	}, []);

	const chartConfig = React.useMemo(() => {
		return items.reduce((acc, curr, index) => {
			if (index == 0) acc[dataKey] = { label };
			acc[curr[nameKey]] = {
				...curr,
				label: sentenceCase(curr[nameKey] as string),
				color: colors[index],
			};
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
			<CardContent className="flex-1 flex items-center justify-center">
				<div className="flex-grow">
					<ChartContainer
						config={chartConfig}
						className="mx-auto aspect-square w-full h-full max-h-[250px]"
					>
						<PieChart
							margin={{
								top: 20,
								bottom: 10,
							}}
						>
							<ChartTooltip active cursor={false} content={<ChartTooltipContent hideLabel />} />
							<Pie
								data={items}
								dataKey={dataKey}
								nameKey={nameKey}
								outerRadius={!donut ? 100 : 120}
								innerRadius={!donut ? 0 : 60}
								strokeWidth={5}
								paddingAngle={!donut ? 0 : 1}
								legendType="circle"
								cornerRadius={!donut ? 0 : 5}
							>
								{items.map((_, index) => (
									<Cell key={`cell-${index}`} fill={colors[index]} />
								))}
								{donut && totalStr ? (
									<Label
										content={({ viewBox }) => {
											if (viewBox && "cx" in viewBox && "cy" in viewBox) {
												return (
													<text
														x={viewBox.cx}
														y={viewBox.cy}
														textAnchor="middle"
														dominantBaseline="middle"
													>
														<tspan
															x={viewBox.cx}
															y={viewBox.cy}
															className="fill-foreground text-3xl font-bold"
														>
															{total.toLocaleString()}
														</tspan>
														<tspan
															x={viewBox.cx}
															y={(viewBox.cy || 0) + 24}
															className="fill-muted-foreground"
														>
															{totalStr}
														</tspan>
													</text>
												);
											}
										}}
									/>
								) : null}
								{labelList ? (
									<LabelList
										className="fill-background text-sm"
										stroke="none"
										formatter={(v: number) => ((100 * v) / total).toFixed(1) + "%"}
									/>
								) : null}
							</Pie>
						</PieChart>
					</ChartContainer>
				</div>
				<div className="flex-grow gap-4 flex flex-col">
					{items.map((item, i) => (
						<div key={`item-${i}`} className="flex items-center gap-1 md:gap-3">
							<div
								style={{ backgroundColor: colors[i] }}
								className="w-2 md:size-4 !aspect-square !inline-block rounded-full"
							/>
							{renderLegend ? (
								renderLegend(item)
							) : (
								<p className="text-base text-gray-600 inline-block">
									<span> {sentenceCase(item[nameKey] as string)} </span>
								</p>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
