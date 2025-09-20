"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAssetDashboard } from "@/lib/utils";
import { AssetsData } from "@/types/assets.types";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import BarVChart from "../_components/barv.chart";
import RecentAssetsTable from "./assets.table";
import LoadingComponent from "@/components/LoadingComponent";

export default function AssetsDashboard() {
	const initialData: AssetsData = {
		asset_counts: {
			available: 1,
			allocated: 2,
			maintenance: 3,
			decommissioned: 4,
			total: 10,
		},
		category_counts: {
			additionalProp1: 1,
			additionalProp2: 2,
			additionalProp3: 3,
		},
		pending_counts: {
			requests: 1,
			allocations: 2,
			returns: 3,
			total: 6,
		},
		recent_assets: [
			{
				id: 1,
				institution: 1,
				asset_name: "sdfsdf",
				batch_number: "sdfsdf",
				serial_number: "sdfsdf",
				category: null,
				description: "sdfsdfds",
				status: "available",
				is_active: true,
				created_at: "01-JAN-2020",
				updated_at: "02-JUL-2024",
				created_by: 1,
				current_holder: 1,
			},
		],
	};

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
			value: data.category_counts.total,
			icon: "hugeicons:safe-delivery-01",
			link: "#",
		},
		{
			title: "Unallocated Assets",
			value: data.pending_counts.total,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:laptop-issue",
			link: "#",
		},
		{
			title: "Decomissioned ",
			value: data.recent_assets.length,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:laptop-remove",
		},
	];

	return (
		<LoadingComponent
			initialData={initialData}
			// fetchData={getAssetDashboard}
			fetchData={() => Promise.resolve(initialData)}
			content={(data) => (
				<div className="min-h-screen bg-background p-6">
					<div className="space-y-6">
						{/* Header */}
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold text-balance">Assets Dashboard</h1>
								<p className="text-muted-foreground">Manage and track your company assets</p>
							</div>
							{/* <Button className="bg-primary hover:bg-primary/90">
            <Package className="h-4 w-4 mr-2" />
            Add Asset
          </Button> */}
						</div>

						{/* Key Metrics Cards */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getCards(data).map((card, i) => (
								<StatsCard key={i} {...card} />
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
							/>

							{/* Category Breakdown */}
							<BarVChart
								title={"Assets by Category"}
								label={""}
								data={{
									"2025": [],
								}}
								dataKey={""}
								nameKey={""}
								colors={colors}
							/>
						</div>

						{/* Pending Actions and Recent Assets */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Pending Actions */}
							<Card>
								<CardHeader>
									<CardTitle>Pending Actions</CardTitle>
									<CardDescription>Items requiring attention</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-sm">Asset Requests</span>
										<Badge variant="secondary">{data.pending_counts.requests}</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Pending Allocations</span>
										<Badge variant="secondary">{data.pending_counts.allocations}</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Pending Returns</span>
										<Badge variant="secondary">{data.pending_counts.returns}</Badge>
									</div>
									{/* <Button className="w-full mt-4 bg-transparent" variant="outline">
                                View All Pending
                            </Button> */}
								</CardContent>
							</Card>

							{/* Recent Assets */}
							{data?.recent_assets?.length && <RecentAssetsTable />}
						</div>
					</div>
				</div>
			)}
		></LoadingComponent>
	);
}
