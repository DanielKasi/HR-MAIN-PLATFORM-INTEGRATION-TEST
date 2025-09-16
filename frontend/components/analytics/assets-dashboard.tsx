"use client";

import { useState, useEffect } from "react";
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { Loader2, Package, AlertCircle, Clock, CheckCircle, XCircle, Wrench } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getAssetDashboard } from "@/lib/utils";
import { AssetsData } from "@/types/types.utils";

export default function AssetsDashboard() {
	const [data, setData] = useState<AssetsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
			try {
				const dashboardData = await getAssetDashboard();

				setData(dashboardData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch data");
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="h-8 w-8 animate-spin" />
				<span className="ml-2">Loading assets dashboard...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
					<h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
					<p className="text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	if (!data) return null;

	// Prepare chart data
	const statusData = [
		{ name: "Available", value: data.asset_counts.available, color: "hsl(var(--chart-5))" },
		{ name: "Allocated", value: data.asset_counts.allocated, color: "hsl(var(--chart-1))" },
		{ name: "Maintenance", value: data.asset_counts.maintenance, color: "hsl(var(--chart-2))" },
		{
			name: "Decommissioned",
			value: data.asset_counts.decommissioned,
			color: "hsl(var(--chart-3))",
		},
	];

	const categoryData = Object.entries(data.category_counts).map(([name, value]) => ({
		name,
		value,
	}));

	const pendingData = [
		{ name: "Requests", value: data.pending_counts.requests, color: "hsl(var(--chart-1))" },
		{ name: "Allocations", value: data.pending_counts.allocations, color: "hsl(var(--chart-2))" },
		{ name: "Returns", value: data.pending_counts.returns, color: "hsl(var(--chart-3))" },
	];

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "available":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case "allocated":
				return <Package className="h-4 w-4 text-blue-600" />;
			case "maintenance":
				return <Wrench className="h-4 w-4 text-orange-600" />;
			case "decommissioned":
				return <XCircle className="h-4 w-4 text-red-600" />;
			default:
				return <Clock className="h-4 w-4 text-gray-600" />;
		}
	};

	const getStatusBadge = (status: string) => {
		const variants = {
			available: "bg-green-100 text-green-800 hover:bg-green-100",
			allocated: "bg-blue-100 text-blue-800 hover:bg-blue-100",
			maintenance: "bg-orange-100 text-orange-800 hover:bg-orange-100",
			decommissioned: "bg-red-100 text-red-800 hover:bg-red-100",
		};

		return (
			<Badge
				variant="secondary"
				className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}
			>
				{getStatusIcon(status)}
				<span className="ml-1 capitalize">{status}</span>
			</Badge>
		);
	};

	return (
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Assets</CardTitle>
							<Package className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{data.asset_counts.total}</div>
							<p className="text-xs text-muted-foreground">All registered assets</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Available</CardTitle>
							<CheckCircle className="h-4 w-4 text-green-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-green-600">{data.asset_counts.available}</div>
							<p className="text-xs text-muted-foreground">Ready for allocation</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Allocated</CardTitle>
							<Package className="h-4 w-4 text-blue-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-blue-600">{data.asset_counts.allocated}</div>
							<p className="text-xs text-muted-foreground">Currently in use</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Pending Actions</CardTitle>
							<CardDescription>Require attention</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-orange-600">{data.pending_counts.total}</div>
							<p className="text-xs text-muted-foreground">Items requiring attention</p>
						</CardContent>
					</Card>
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Asset Status Distribution */}
					<Card>
						<CardHeader>
							<CardTitle>Asset Status Distribution</CardTitle>
							<CardDescription>Current status of all assets</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={{}} className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={statusData}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={100}
											paddingAngle={5}
											dataKey="value"
										>
											{statusData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<ChartTooltip content={<ChartTooltipContent />} />
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Category Breakdown */}
					<Card>
						<CardHeader>
							<CardTitle>Assets by Category</CardTitle>
							<CardDescription>Distribution across asset categories</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={{}} className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={categoryData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="name" />
										<YAxis />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="value" fill="hsl(var(--chart-1))" />
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
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
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle>Recent Assets</CardTitle>
							<CardDescription>Latest asset activities and additions</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Asset Name</TableHead>
										<TableHead>Category</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Current Holder</TableHead>
										<TableHead>Serial Number</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.recent_assets.map((asset) => (
										<TableRow key={asset.id}>
											<TableCell className="font-medium">{asset.asset_name}</TableCell>
											<TableCell>{asset.category?.category_name}</TableCell>
											<TableCell>{getStatusBadge(asset.status)}</TableCell>
											<TableCell>
												{typeof asset.current_holder === "object"
													? asset.current_holder?.user?.fullname
													: "—"}
											</TableCell>

											<TableCell className="font-mono text-sm">{asset.batch_number}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
