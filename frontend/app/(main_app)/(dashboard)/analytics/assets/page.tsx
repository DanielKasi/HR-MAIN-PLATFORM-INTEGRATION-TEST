"use client";

import { useState, useEffect } from "react";
import { getAssetDashboard, showErrorToast } from "@/lib/utils";
import { AssetsData } from "@/types/assets.types";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import RecentAssetsTable from "./assets.table";
import LoadingComponent from "@/components/LoadingComponent";
import BarHChart from "../_components/barh.chart";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/dialogs/reports-dialog";

export default function AssetsDashboard() {
	const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);

	const getCards = (data: AssetsData) => [
		{
			title: "Total Assets",
			value: data.asset_counts.total,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:laptop",
			link: "#",
		},
		{
			title: "Allocated Assets",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.asset_counts.allocated,
			icon: "hugeicons:safe-delivery-01",
			link: "#",
		},
		{
			title: "Unallocated Assets",
			value: data.asset_counts.available,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:laptop-issue",
			link: "#",
		},
		{
			title: "Decomissioned ",
			value: data.asset_counts.decommissioned,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:laptop-remove",
		},
	];

	return (
		<LoadingComponent
			fetchData={getAssetDashboard}
			//fetchData={() => Promise.resolve(initialData)}
			content={(data) => (
				<div className="min-h-screen bg-background p-6">
					<div className="space-y-6">
						{/* Header */}
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold text-balance">Assets Dashboard</h1>
								<p className="text-muted-foreground">Manage and track your company assets</p>
							</div>
							<div className="flex items-center justify-end gap-8">
								<Button className="rounded-xl" onClick={() => setIsReportsDialogOpen(true)}>
									Generate Reports
								</Button>
							</div>
						</div>

						{/* Key Metrics Cards */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getCards(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						{/* Charts Section */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Asset Status Distribution */}
							<Piechart
								totalStr={""}
								title={"Asset Status Distribution"}
								label={""}
								data={{
									"2025": Object.entries(data.asset_counts || {}).reduce((p, c) => {
										if (c[0] !== "total") p.push({ name: c[0], count: c[1] });
										return p;
									}, [] as any),
								}}
								dataKey={"count"}
								nameKey={"name"}
								colors={colors}
								donut
								labelList
								select={false}
							/>

							{/* Category Breakdown */}
							<BarHChart
								title={"Assets by Category"}
								data={{
									categories: Object.entries(data.category_counts).map(([category, count]) => ({
										category,
										count,
									})),
								}}
								dataKey={"count"}
								nameKey={"category"}
								color={colors[4]}
								rounded
								select={false}
							/>

							{/* Category Breakdown */}
							<BarHChart
								title={"Assets Allocation by Department"}
								data={{
									"All Assets": [
										{ department: "Accounting", count: 12 },
										{ department: "IT / Technology", count: 42 },
										{ department: "Sales", count: 20 },
										{ department: "Marketing", count: 14 },
									],
								}}
								dataKey={"count"}
								nameKey={"department"}
								color={colors[5]}
								rounded
							/>

							{/* Recent Assets */}
							{data?.recent_assets?.length && <RecentAssetsTable data={data.recent_assets} />}
						</div>
					</div>
					<ReportDialog
						isOpen={isReportsDialogOpen}
						onClose={() => setIsReportsDialogOpen(false)}
						app="assets"
					/>
				</div>
			)}
		></LoadingComponent>
	);
}
