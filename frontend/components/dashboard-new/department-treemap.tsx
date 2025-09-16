"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DepartmentTreemapProps {
	data?: Array<{ dept_name: string; count: number; year: number }>;
	onRefresh: (year?: number) => void;
	loading: boolean;
}

export function DepartmentTreemap({ data, onRefresh, loading }: DepartmentTreemapProps) {
	const [year, setYear] = useState<number>(new Date().getFullYear());
	const [primaryColor, setPrimaryColor] = useState<string>("#ff7530"); // Fallback to orange
	const colorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (colorRef.current) {
			const computedStyle = getComputedStyle(colorRef.current);
			const bgColor = computedStyle.backgroundColor;

			if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
				setPrimaryColor(bgColor);
			}
		}
	}, []);

	// Sort by count descending and take top 10
	const sortedData = [...(data || [])].sort((a, b) => b.count - a.count).slice(0, 10);

	const chartOptions = {
		chart: {
			height: 250,
			type: "treemap" as
				| "area"
				| "line"
				| "treemap"
				| "bar"
				| "pie"
				| "donut"
				| "radialBar"
				| "scatter"
				| "bubble"
				| "heatmap"
				| "candlestick"
				| "boxPlot"
				| "radar"
				| "polarArea"
				| "rangeBar"
				| "rangeArea"
				| undefined,
			toolbar: {
				show: false,
			},
		},
		colors: [primaryColor],
		plotOptions: {
			treemap: {
				distributed: false,
				enableShades: true,
				shadeIntensity: 0.6,
				reverse: false,
			},
		},
		dataLabels: {
			enabled: true,
			style: {
				fontSize: "14px",
			},
			formatter: function (text: string, op: any) {
				return op.value;
			},
			offsetY: -4,
		},
		tooltip: {
			y: {
				formatter: (val: number) => `${val}`,
			},
		},
	};

	const chartSeries = [
		{
			data: sortedData.map((dept) => ({
				x: dept.dept_name,
				y: dept.count,
			})),
		},
	];

	return (
		<Card className="shadow-sm border-none">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-base font-medium">Employees Per Department</CardTitle>
				<div className="flex items-center gap-2">
					<Select
						value={year.toString()}
						onValueChange={(e) => {
							const newTime = new Date();

							newTime.setFullYear(Number(e));
							setYear(newTime.getFullYear());
							onRefresh(newTime.getFullYear());
						}}
					>
						<SelectTrigger className="py-0 px-3 rounded-lg !ring-0">
							{year.toString()}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={new Date().getFullYear().toString()}>
								{new Date().getFullYear()}
							</SelectItem>
							<SelectItem value={(new Date().getFullYear() - 1).toString()}>
								{new Date().getFullYear() - 1}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				<div ref={colorRef} className="bg-primary hidden" />
				{loading ? (
					<div className="h-48 flex items-center justify-center text-muted-foreground">
						Loading...
					</div>
				) : sortedData.length === 0 ? (
					<div className="h-48 flex items-center justify-center text-muted-foreground">
						No data available
					</div>
				) : (
					<ApexChart options={chartOptions} series={chartSeries} type="treemap" height={250} />
				)}
			</CardContent>
		</Card>
	);
}
