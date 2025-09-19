"use strict";

import {
	Cell,
	Sector,
	ResponsiveContainer,
	Tooltip,
	PieChart as Piechart,
	Pie,
	Legend,
} from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useMobile } from "@/hooks/use-mobile";

type Entry = { name: string; value: number };
interface Props {
	title: string;
	data: Record<string, Entry[]>;
	label?: boolean;
	colors: string[];
}

function ActiveShape(props: PieSectorDataItem) {
	const {
		cx,
		cy,
		fill,
		payload,
		midAngle,
		outerRadius,
		percent,
		innerRadius,
		startAngle,
		endAngle,
	} = props;
	const RADIAN = Math.PI / 180;
	const sin = Math.sin(-RADIAN * (midAngle ?? 1));
	const cos = Math.cos(-RADIAN * (midAngle ?? 1));
	const sx = (cx ?? 0) + ((outerRadius ?? 0) + 10) * cos;
	const sy = (cy ?? 0) + ((outerRadius ?? 0) + 10) * sin;
	const mx = (cx ?? 0) + ((outerRadius ?? 0) + 30) * cos;
	const my = (cy ?? 0) + ((outerRadius ?? 0) + 30) * sin;
	const ex = mx + (cos >= 0 ? 1 : -1) * 22;
	const ey = my;
	const textAnchor = cos >= 0 ? "start" : "end";
	const dx = ((cx ?? 0) + sx) / 2;
	const dy = ((cy ?? 0) + sy) / 2;
	const tx = ex + (cos >= 0 ? 1 : -1) * 12;
	const ty = ey + 10;
	const textWidth = 5 + payload.name.length * 10;
	const rx = cos >= 0 ? ex : tx + 10 - textWidth;
	const ry = ey - 20;
	return (
		<g>
			<Sector
				cx={cx}
				cy={cy}
				innerRadius={innerRadius}
				outerRadius={outerRadius}
				startAngle={startAngle}
				endAngle={endAngle}
				fill={fill}
			/>
			<path d={`M${tx},${ty}L${dx},${dy}`} stroke={"#162032"} fill="none" />
			<circle cx={dx} cy={dy} r={5} fill={"#162032"} stroke="none" />
			<rect
				rx={10}
				ry={10}
				x={rx}
				y={ry}
				width={textWidth}
				height={50}
				stroke={"#162032"}
				fill={"#162032"}
				strokeLinecap="round"
			></rect>
			<text x={tx - 5} y={ty - 10} textAnchor={textAnchor} fill="white">
				{payload.name}
			</text>
			<text
				x={tx - 5}
				y={ty + 10}
				textAnchor={textAnchor}
				fill="white"
				fontWeight="bold"
			>{`${((percent ?? 1) * 100).toFixed(2)}%`}</text>
		</g>
	);
}

export default function PieChart(props: Props) {
	const { data, title, label, colors } = props;
	const currentYear = new Date().getFullYear().toString();
	const [keys] = useState(Object.keys(data));
	const [category, setCategory] = useState(currentYear);
	const [items, setItems] = useState([] as Entry[]);
	useEffect(() => {
		if (category) setItems(data[category] || []);
	}, [category, data]);
	const isMobile = useMobile();
	const total = items.reduce((p, x) => p + x.value, 0);
	return (
		<Card className="shadow-none border">
			<CardHeader>
				<div className="flex items-center gap-4">
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
				</div>
			</CardHeader>
			<CardContent>
				{items.length > 0 ? (
					<div className="">
						<ResponsiveContainer width="100%" height={400}>
							<Piechart
								cx="50%"
								cy="50%"
								outerRadius={isMobile ? 60 : 80}
								margin={{ bottom: 10, top: 10 }}
							>
								<Pie activeShape={ActiveShape} data={items} dataKey="value">
									{items.map((_, index) => (
										<Cell key={`cell-${index}`} fill={colors[index]} />
									))}
								</Pie>
								<Tooltip active={false} />
								{label && <Legend verticalAlign="bottom" height={10} />}
							</Piechart>
						</ResponsiveContainer>
						<div className="gap-2 flex md:flex-row md:justify-center flex-col">
							{items.map((item, i) => (
								<div key={`item-${i}`} className="flex items-center gap-1 md:gap-3">
									<div
										style={{ backgroundColor: colors[i] }}
										className="w-2 md:size-4 !aspect-square !inline-block rounded-full"
									/>
									<p className="text-xs md:text-sm text-gray-600 inline-block">
										<span> {item.name[0].toLocaleUpperCase() + item.name.slice(1)} </span>
										<span className="!text-xs font-bold">
											{((100 * item.value) / total).toFixed(2)}%
										</span>
									</p>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center h-[300px] text-slate-500">
						No application data available
					</div>
				)}
			</CardContent>
		</Card>
	);
}
