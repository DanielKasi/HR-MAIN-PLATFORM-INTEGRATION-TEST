"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
	dataKey1: string;
	dataKey2?: string;
	nameKey: string;
	colors: string[];
	rounded?: boolean;
	headerSlot?: React.ReactElement;
	className?: string;
	select?: boolean;
}

export default function BarSChart({
	title,
	label,
	dataKey1,
	dataKey2,
	nameKey,
	colors,
	data,
	rounded,
	headerSlot,
	className,
	select = true,
}: Props) {
	const [groups] = React.useState(Object.keys(data).sort().reverse());

	const [category, setCategory] = React.useState(groups[0]);

	const [items, setItems] = React.useState(data[groups[0]] || ([] as Entry[]));

	const chartConfig = React.useMemo(() => {
		return items.reduce((acc, curr, index) => {
			if (index == 0) acc[dataKey1] = { color: "hsl(var(--primary))" };
			if (index == 1 && dataKey2) acc[dataKey2] = { label, color: "hsl(var(--primary))" };
			acc[curr[nameKey]] = {
				label: sentenceCase(curr[nameKey] as string),
				color: "hsl(var(--primary))",
			};
			return acc;
		}, {} as any);
	}, [dataKey2]);

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
								{groups.map((k) => (
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
					<BarChart accessibilityLayer data={items}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey={nameKey}
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) => sentenceCase(value)}
						/>
						<YAxis axisLine={false} tickLine={false} />
						<ChartTooltip
							active
							cursor={false}
							content={<ChartTooltipContent hideLabel hideIndicator />}
						/>
						<Bar legendType="circle" dataKey={dataKey1} stackId="a" fill="hsl(var(--primary))" />
						{dataKey2 && (
							<Bar
								legendType="circle"
								dataKey={dataKey2}
								stackId="a"
								fill="hsl(var(--primary))"
								radius={rounded ? [10, 10, 0, 0] : 0}
							/>
						)}
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
