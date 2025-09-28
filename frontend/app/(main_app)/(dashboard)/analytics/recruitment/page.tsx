"use client";

import type { IRecruitmentDashboard } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { getRecruitmentDashboard } from "@/lib/utils";
import StatsCard from "../_components/stats.card";
import PieChart from "../_components/pie.chart";
import RecentHiresTable from "./recent-hires";
import colors from "../_components/colors";
import BarSChart from "../_components/bars.chart";
import BarVChart from "../_components/barv.chart";

export default function RecruitmentDashboard() {
	const [data, setData] = useState<IRecruitmentDashboard | null>({
		total_job_positions: 0,
		active_job_positions: 0,
		total_adverts: 0,
		active_adverts: 0,
		total_applications: 0,
		applications_by_status: [],
		total_interviews: 0,
		interviews_by_status: [],
		upcoming_interviews: 0,
		total_onboardings: 0,
		onboardings_by_status: [],
		average_time_to_hire_days: 0,
		applications_sources: [],
		applications_over_time: [],
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const result = await getRecruitmentDashboard();

				setData(result);
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
	return (
		<main className="space-y-6 p-6 min-h-screen bg-background">
			{/* Header */}
			<div className="flex gap-2 items-center w-full">
				<h1 className="flex-grow text-3xl font-bold tracking-tight text-slate-900">
					Recruitment Analytics
				</h1>
			</div>

			{/* Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{cards.map((card, i) => (
					<StatsCard key={i} index={i} {...card} />
				))}
			</div>

			{/* Charts Row */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Applications by Status */}
				<BarSChart
					title={"Applications Over Time"}
					label={""}
					data={{
						"2025": data.applications_over_time,
					}}
					dataKey1={"count"}
					nameKey={"date"}
					colors={colors}
					rounded
				/>

				{/* candidates by stage */}
				<BarVChart
					title={"Candidates by Stage"}
					label={""}
					data={{
						"2025": data.applications_by_status,
					}}
					dataKey={"count"}
					nameKey={"status"}
					colors={colors}
				/>

				{/* Source of Hire */}
				<PieChart
					colors={colors}
					data={{ "2025": data.applications_sources }}
					title="Sources of Hire"
					totalStr={""}
					label={""}
					dataKey={"count"}
					nameKey={"source"}
					labelList
				/>
			</div>

			{/* Bottom Row */}
			{data.applications_over_time.length > 0 && <RecentHiresTable className="!border-none" />}
		</main>
	);
}
