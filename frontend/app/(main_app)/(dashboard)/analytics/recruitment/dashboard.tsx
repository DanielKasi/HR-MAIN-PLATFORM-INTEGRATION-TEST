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
import StatsCard from "../components/stats-card";
import PieChart from "../components/piechart";
import { formatDate } from "@/lib/helpers";
import { PieSectorDataItem } from "recharts/types/polar/Pie";
import RecentHiresTable from "./recent-hires";
import colors from "../components/colors";

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

	const applicationsSources = data.applications_sources.map((d) => {
		return { name: d.source[0].toUpperCase() + d.source.slice(1), value: d.count };
	});
	const applicationsSources2 = data.applications_sources.map((d) => {
		return {
			name: d.source[0].toUpperCase() + d.source.slice(1),
			value: d.count * Math.random() * 100,
		};
	});
	console.log(applicationsSources2);

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
				{cards.map((card, i) => (
					<StatsCard key={i} {...card} />
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
								{Object.entries(COLORS).map((c, i) => (
									<div key={i} className="flex gap-2 items-center">
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
				<PieChart
					colors={colors}
					data={{ "2025": applicationsSources, "2024": applicationsSources2 }}
					title="Sources of Hire"
				/>
			</div>

			{/* Bottom Row */}
			{data.applications_over_time.length > 0 && <RecentHiresTable className="!border-none" />}
		</div>
	);
}
