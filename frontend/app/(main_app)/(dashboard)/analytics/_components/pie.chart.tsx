"use client";

import * as React from "react";
import { Cell, Label, LabelList, Pie, PieChart } from "recharts";

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
	labelList?: boolean;
	data: Record<string, Entry[]> | Entry[];
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
	const isArrayData = Array.isArray(data);

	const [groups] = React.useState(
		isArrayData
			? []
			: Object.keys(data as Record<string, Entry[]>)
					.sort()
					.reverse(),
	);

	const [category, setCategory] = React.useState(groups[0] || "");

	const [items, setItems] = React.useState(() => {
		if (isArrayData) {
			return data as Entry[];
		}
		const dataObj = data as Record<string, Entry[]>;
		return dataObj[groups[0]] || [];
	});

	const total = React.useMemo(() => {
		if (!Array.isArray(items)) return 0;
		return items.reduce((acc, curr) => acc + (curr[dataKey] as number), 0);
	}, [items, dataKey]);

	const chartConfig = React.useMemo(() => {
		if (!Array.isArray(items)) return {};
		return items.reduce((acc, curr, index) => {
			if (index == 0) acc[dataKey] = { label };
			acc[curr[nameKey]] = {
				...curr,
				label: sentenceCase(curr[nameKey] as string),
				color: colors[index],
			};
			return acc;
		}, {} as any);
	}, [items, dataKey, nameKey, label, colors]);

	return (
		<Card className={`flex flex-col shadow-none border ${className}`}>
			<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-0 gap-2 sm:gap-4">
				<CardTitle className="text-base sm:text-lg font-semibold text-slate-900 text-center sm:text-left">
					{title}
				</CardTitle>
				{select && groups?.length > 0 && !isArrayData && (
					<div className="flex items-center justify-center sm:justify-end w-full sm:w-auto">
						<Select
							defaultValue={category}
							onValueChange={(d) => {
								setCategory(d);
								setItems((data as Record<string, Entry[]>)[d]);
							}}
						>
							<SelectTrigger className="text-slate-900 w-full sm:w-[140px] text-sm">
								<SelectValue placeholder={category} />
							</SelectTrigger>
							<SelectContent>
								{groups.map((k) => (
									<SelectItem key={k} value={k} className="text-sm">
										{sentenceCase(k)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</CardHeader>
			<CardContent className="flex-1 flex items-center justify-center p-2 sm:p-6">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square w-full h-full max-h-[180px] sm:max-h-[200px] md:max-h-[250px]"
				>
					<PieChart
						margin={{
							top: 10,
							bottom: 5,
							left: 5,
							right: 5,
						}}
					>
						<ChartTooltip active cursor={false} content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={items}
							dataKey={dataKey}
							nameKey={nameKey}
							outerRadius={!donut ? "80%" : "90%"}
							innerRadius={!donut ? "0%" : "50%"}
							strokeWidth={4}
							paddingAngle={!donut ? 0 : 1}
							legendType="circle"
							cornerRadius={!donut ? 0 : 4}
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
														className="fill-foreground text-xl sm:text-2xl md:text-3xl font-bold"
													>
														{total.toLocaleString()}
													</tspan>
													<tspan
														x={viewBox.cx}
														y={(viewBox.cy || 0) + 20}
														className="fill-muted-foreground text-xs sm:text-sm"
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
									className="fill-background text-xs sm:text-sm"
									stroke="none"
									formatter={(v: number) => ((100 * v) / total).toFixed(1) + "%"}
								/>
							) : null}
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
