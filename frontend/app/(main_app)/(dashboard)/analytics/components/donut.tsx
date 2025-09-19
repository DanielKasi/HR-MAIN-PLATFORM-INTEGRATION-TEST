"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMobile } from "@/hooks/use-mobile";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

type Entry = { data: Record<string, number>; total: number };
interface Props {
	groups: Record<string, Entry>;
	title: string;
	totalStr: string;
	colors: string[];
}

export function Doughnut({ groups, title, totalStr, colors }: Props) {
	const currentYear = new Date().getFullYear().toString();
	const [keys] = useState(Object.keys(groups));
	const [category, setCategory] = useState(currentYear);
	const [items, setItems] = useState<Entry>();
	useEffect(() => {
		if (category) setItems(groups[category]);
	}, [category, groups]);
	const isMobile = useMobile();
	return (
		<Card className="shadow-none border">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-xl flex-grow">{title}</CardTitle>
				<div className="flex items-center gap-4">
					<Select onValueChange={(d) => setCategory(d)}>
						<SelectTrigger className="text-slate-900">
							<SelectValue placeholder={currentYear} />
						</SelectTrigger>
						<SelectContent>
							{keys
								.sort()
								.reverse()
								.map((k, i) => (
									<SelectItem key={`item-${i}`} value={k}>
										{k}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent className="flex items-center justify-center">
				<div className="relative w-32 md:w-48 lg:w-64 aspect-square">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={Object.entries(items?.data ?? {}).map((e) => ({ name: e[0], value: e[1] }))}
								cx="50%"
								cy="50%"
								innerRadius={isMobile ? 50 : 60}
								outerRadius={isMobile ? 90 : 120}
								cornerRadius={5}
								paddingAngle={0}
								dataKey="value"
								legendType="circle"
							>
								{Object.keys(items?.data ?? {}).map((_, index) => (
									<Cell key={`cell-${index}`} fill={colors[index]} />
								))}
							</Pie>
						</PieChart>
					</ResponsiveContainer>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-2xl font-bold">{items?.total ?? 0}</span>
						<span className="text-xs text-gray-500">{totalStr}</span>
					</div>
				</div>

				<div className="gap-2 flex flex-col">
					{Object.entries(items?.data ?? {}).map((item, i) => (
						<div key={`item-${i}`} className="flex items-center gap-1 md:gap-3">
							<div
								style={{ backgroundColor: colors[i] }}
								className="w-2 md:size-4 !aspect-square !inline-block rounded-full"
							/>
							<p className="text-base text-gray-600 inline-block">
								<span className="font-bold "> {item[0]} </span>
								<span className="text-gray-500">({item[1]})</span>
							</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
