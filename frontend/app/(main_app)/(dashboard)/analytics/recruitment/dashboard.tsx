"use client";

import type { IRecruitmentDashboard } from "@/types/types.utils";

import { useState, useEffect } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Legend,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	LineChart,
	Line,
	Label,
	LabelList,
	LabelProps,
	Sector,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecruitmentDashboard } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import OverviewCard from "./overview-card";
import { formatDate } from "@/lib/helpers";
import { PieSectorDataItem } from "recharts/types/polar/Pie";
import RecentHiresTable from "./recent-hires";

export function RecruitmentDashboard() {
	const [data, setData] = useState<IRecruitmentDashboard | null>({
		total_job_positions: 0,
		active_job_positions: 0,
		total_adverts: 0,
		active_adverts: 0,
		total_applications: 0,
		applications_by_status: [
			{ status: "applied", count: 20 },
			{ status: "screened", count: 17 },
			{ status: "interviewed", count: 14 },
			{ status: "offered", count: 11 },
			{ status: "hired", count: 9 },
		],
		total_interviews: 0,
		interviews_by_status: [],
		upcoming_interviews: 0,
		total_onboardings: 0,
		onboardings_by_status: [],
		average_time_to_hire_days: 0,
		applications_sources: [
			{ source: "online", count: 12 },
			{ source: "newspaper", count: 2 },
			{ source: "referral", count: 20 },
			{ source: "internal", count: 20 },
			{ source: "schools", count: 10 },
		],
		applications_over_time: [
			{ date: new Date().toString(), count: 20 },
			{ date: new Date().toString(), count: 30 },
			{ date: new Date().toString(), count: 20 },
			{ date: new Date().toString(), count: 50 },
			{ date: new Date().toString(), count: 50 },
			{ date: new Date().toString(), count: 50 },
			{ date: new Date().toString(), count: 50 },
			{ date: new Date().toString(), count: 50 },
			{ date: new Date().toString(), count: 40 },
			{ date: new Date().toString(), count: 10 },
			{ date: new Date().toString(), count: 50 },
			{ date: new Date().toString(), count: 30 },
			{ date: new Date().toString(), count: 20 },
			{ date: new Date().toString(), count: 50 },
			{ date: new Date().toString(), count: 40 },
		],
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const result = await getRecruitmentDashboard();

				// setData(result);
			} catch (error) {
				console.error("Failed to fetch recruitment data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-slate-500">Failed to load recruitment data</p>
			</div>
		);
	}

	const activeJobRate =
		data.total_job_positions > 0 ? (data.active_job_positions / data.total_job_positions) * 100 : 0;
	const activeAdvertRate =
		data.total_adverts > 0 ? (data.active_adverts / data.total_adverts) * 100 : 0;

	const cards = [
		{
			title: "Open Positions",
			value: data.active_job_positions,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:megaphone-02",
			link: "#",
		},
		{
			title: "Applications Recieved",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.total_applications,
			icon: "hugeicons:inbox-download",
			link: "#",
		},
		{
			title: "Offers Made",
			value: data.total_onboardings,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:safe-delivery-01",
			link: "#",
		},
		{
			title: "Time Of Hire",
			value: `${data.average_time_to_hire_days} days`,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:time-04",
		},
	];

	const COLORS = {
		Applications: "#FFBBAB",
		Hired: "#FF3403",
	};

	const applicationOverTimeData = data.applications_over_time.map((d) => {
		const month = formatDate(d.date);
		return {
			name: month,
			applications: d.count,
			hired: d.count / 2,
			amt: d.count,
		};
	});

	const STATUS_COLORS: Record<string, string> = {
		applied: "#FFD6CD",
		screened: "#FF9A81",
		interviewed: "#FF3403",
		offered: "#AA2302",
		hired: "#551101",
	};
	const applicationsByStatus = data.applications_by_status.map((d) => {
		return { name: d.status[0].toUpperCase() + d.status.slice(1), count: d.count };
	});

	const SOURCE_COLORS: Record<string, string> = {
		online: "#FFBBAB",
		newspaper: "#FF9A81",
		referral: "#FF7857",
		internal: "#FF562D",
		schools: "#FF3403",
	};
	const applicationsSources = data.applications_sources.map((d) => {
		return { name: d.source[0].toUpperCase() + d.source.slice(1), count: d.count };
	});

	function renderActiveShape(props: PieSectorDataItem) {
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

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex gap-2 items-center w-full">
				<h1 className="flex-grow text-3xl font-bold tracking-tight text-slate-900">
					Recruitment Analytics
				</h1>
			</div>

			{/* Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{cards.map((card) => (
					<OverviewCard className="shadow-sm !rounded-2xl !border" {...card} />
				))}
			</div>

			{/* Charts Row */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Applications by Status */}
				<Card className="md:col-span-2 shadow-sm !rounded-2xl !border-none">
					<CardHeader>
						<div className="flex items-center gap-4">
							<CardTitle className="text-xl">Applications vs Hires Over Time</CardTitle>
							<div className="flex-grow flex gap-4 items-center justify-center">
								{Object.entries(COLORS).map((c) => (
									<div className="flex gap-2 items-center">
										<div className="p-2 rounded-full" style={{ backgroundColor: c[1] }}></div>
										<div className="text-slate-900">{c[0]}</div>
									</div>
								))}
							</div>
							<div>
								<Select>
									<SelectTrigger className="text-slate-900">
										<SelectValue placeholder="2025" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="current">2025</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{data.applications_over_time.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<BarChart data={applicationOverTimeData} cx="50%" cy="50%" outerRadius={80}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis dataKey="name" />
									<YAxis
										domain={[0, 2.5 * Math.max(...data.applications_over_time.map((x) => x.count))]}
									/>
									<Tooltip />
									<Bar legendType="circle" dataKey="hired" stackId="a" fill="#FF3403" />
									<Bar
										legendType="circle"
										dataKey="applications"
										stackId="a"
										fill="#FFBBAB"
										radius={[12, 12, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-[300px] text-slate-500">
								No application data available
							</div>
						)}
					</CardContent>
				</Card>

				{/* candidates by stage */}
				<Card className="shadow-sm !rounded-2xl !border-none">
					<CardHeader>
						<div className="flex items-center gap-4">
							<CardTitle className="text-xl flex-grow">Candidates by Stage</CardTitle>
							<div className="flex items-center gap-4">
								<Select>
									<SelectTrigger className="text-slate-900">
										<SelectValue placeholder="All Positions" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="current">All Positions</SelectItem>
									</SelectContent>
								</Select>
								<Select>
									<SelectTrigger className="text-slate-900">
										<SelectValue placeholder="2025" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="current">2025</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{data.applications_by_status.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<BarChart
									data={applicationsByStatus}
									cx="50%"
									cy="50%"
									barGap={0}
									barCategoryGap={0}
									outerRadius={80}
								>
									<CartesianGrid strokeDasharray="1 1 0" horizontal={false} />
									<XAxis hide dataKey="name" />
									<YAxis
										hide
										domain={[
											0,
											1.25 * Math.max(...data.applications_by_status.map((x) => x.count)),
										]}
									/>
									<Tooltip />
									<Bar dataKey="count">
										<LabelList dataKey="name" position="top"></LabelList>
										{data.applications_by_status.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-[300px] text-slate-500">
								No application data available
							</div>
						)}
					</CardContent>
				</Card>

				{/* Source of Hire */}
				<Card className="shadow-sm !rounded-2xl !border-none">
					<CardHeader>
						<div className="flex items-center gap-4">
							<CardTitle className="text-xl flex-grow">Source of Hire</CardTitle>
							<div className="flex items-center gap-4">
								<Select>
									<SelectTrigger className="text-slate-900">
										<SelectValue placeholder="2025" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="current">2025</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{data.applications_sources.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<PieChart cx="50%" cy="50%" outerRadius={80} margin={{ bottom: 10, top: 10 }}>
									<Pie activeShape={renderActiveShape} data={applicationsSources} dataKey="count">
										{data.applications_sources.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={SOURCE_COLORS[entry.source]} />
										))}
									</Pie>
									<Tooltip active={false} />
								</PieChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-[300px] text-slate-500">
								No application data available
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Bottom Row */}
			{data.applications_over_time.length > 0 && <RecentHiresTable className="!border-none" />}
		</div>
	);
}
