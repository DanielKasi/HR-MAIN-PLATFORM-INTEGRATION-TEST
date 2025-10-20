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
	const [groups, setGroups] = React.useState<string[]>([]);

	const [category, setCategory] = React.useState(groups[0]);

	const [items, setItems] = React.useState(data[groups[0]] || ([] as Entry[]));

	React.useEffect(() => {
		if (data) {
			setGroups(Object.keys(data).sort().reverse());
		}
	}, [data]);

	React.useEffect(() => {
		if (groups) {
			setCategory(groups[0]);
		}
	}, [groups]);

	const chartConfig = React.useMemo(() => {
		return items.reduce((acc, curr, index) => {
			if (index == 0) acc.label = "#0CA0F5";
			acc[curr[nameKey]] = { label: sentenceCase(curr[nameKey] as string), color: "#0CA0F5" };
			return acc;
		}, {} as any);
	}, []);

	return (
		<Card className={`flex flex-col shadow-none border w-full ${className}`}>
			<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-0 space-y-0 gap-3 sm:gap-4">
				<CardTitle className="text-lg sm:text-xl lg:text-2xl flex-grow">{title}</CardTitle>
				{select && groups?.length && (
					<div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto">
						<Select
							defaultValue={category}
							onValueChange={(d) => {
								setCategory(d);
								setItems(data[d]);
							}}
						>
							<SelectTrigger className="text-slate-900 w-full sm:min-w-[120px] lg:min-w-[140px]">
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
			<CardContent className="flex-1 flex items-center pt-3 sm:pt-4 lg:pt-6">
				<ChartContainer
					config={chartConfig}
					className="mx-auto w-full h-full min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] max-h-[500px]"
				>
					<BarChart
						accessibilityLayer
						data={items}
						layout="vertical"
						barCategoryGap={16}
						margin={{
							top: 12,
							left: 12,
							right: 12,
							bottom: 8,
						}}
					>
						<CartesianGrid horizontal={false} />
						<XAxis
							type="number"
							dataKey={dataKey}
							axisLine={false}
							tickFormatter={(v) => sentenceCase(v)}
							domain={[0, 1.25 * Math.max(...items.map((x) => x[dataKey] as number))]}
							tick={{ fontSize: 10, className: "text-xs sm:text-sm" }}
						/>
						<YAxis dataKey={nameKey} type="category" axisLine={false} hide />
						<ChartTooltip
							active
							cursor={false}
							content={<ChartTooltipContent hideLabel indicator="dot" nameKey={nameKey} />}
						/>
						<Bar
							dataKey={dataKey}
							radius={rounded ? 8 : 0}
							fill="#0CA0F5"
							background={{ fill: "hsl(var(--accent))" }}
						>
							<LabelList
								position="right"
								offset={6}
								className="fill-slate-600 text-xs sm:text-sm"
								fontSize={12}
							/>
							<LabelList
								dataKey={nameKey}
								position="insideTopLeft"
								offset={-12}
								className="fill-slate-600 text-xs sm:text-sm lg:text-base"
								fontSize={12}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
