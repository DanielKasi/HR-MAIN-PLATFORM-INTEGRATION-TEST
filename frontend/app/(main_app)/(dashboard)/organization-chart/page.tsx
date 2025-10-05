"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, Users, Building2, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/use-document-title";
import apiRequest from "@/lib/apiRequest";

import type { IOrganizationNode, IOrganizationChart } from "@/types/types.utils";

export default function OrganizationChartPage() {
	const [chartData, setChartData] = useState<IOrganizationChart | null>(null);
	const [loading, setLoading] = useState(true);
	const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

	useDocumentTitle("ORGANIZATION CHART");

	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const fetchOrganizationChart = async () => {
		if (!selectedInstitution) {
			toast.error("No organization selected");
			return;
		}

		setLoading(true);
		try {
			const response = await apiRequest.get("/institution/organization-chart/");
			setChartData(response.data as IOrganizationChart);

			// Auto-expand first level
			if (response.data?.root?.subordinates) {
				const firstLevelIds = response.data.root.subordinates.map(
					(node: IOrganizationNode) => node.id,
				);
				setExpandedNodes(new Set(firstLevelIds));
			}
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load organization chart" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOrganizationChart();
	}, [selectedInstitution?.id]);

	const toggleNode = (nodeId: number) => {
		setExpandedNodes((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(nodeId)) {
				newSet.delete(nodeId);
			} else {
				newSet.add(nodeId);
			}
			return newSet;
		});
	};

	const expandAll = () => {
		const allIds = new Set<number>();
		const collectIds = (node: IOrganizationNode) => {
			allIds.add(node.id);
			node.subordinates?.forEach(collectIds);
		};
		if (chartData?.root) {
			collectIds(chartData.root);
		}
		setExpandedNodes(allIds);
	};

	const collapseAll = () => {
		setExpandedNodes(new Set());
	};

	const renderNode = (node: IOrganizationNode, level: number = 0) => {
		const hasSubordinates = node.subordinates && node.subordinates.length > 0;
		const isExpanded = expandedNodes.has(node.id);

		return (
			<div key={node.id} className="relative">
				{/* Node Card */}
				<Card
					className={`
						shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
						${level === 0 ? "border-2 border-primary" : ""}
					`}
					onClick={() => hasSubordinates && toggleNode(node.id)}
				>
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							{/* Avatar */}
							<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
								{node.profile_picture ? (
									<img
										src={node.profile_picture}
										alt={node.name}
										className="w-full h-full rounded-full object-cover"
									/>
								) : (
									<Users className="h-6 w-6 text-primary" />
								)}
							</div>

							{/* Details */}
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-sm truncate">{node.name}</h3>
								{node.position && (
									<p className="text-xs text-muted-foreground truncate">{node.position}</p>
								)}
								{node.department && (
									<p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1">
										<Building2 className="h-3 w-3" />
										{node.department}
									</p>
								)}
								{hasSubordinates && (
									<p className="text-xs text-primary font-medium mt-2">
										{node.subordinate_count || node.subordinates?.length} direct report
										{(node.subordinate_count || node.subordinates?.length) !== 1 ? "s" : ""}
									</p>
								)}
							</div>

							{/* Expand/Collapse Indicator */}
							{hasSubordinates && (
								<div className="flex-shrink-0">
									<div
										className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
									>
										▶
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Subordinates */}
				{hasSubordinates && isExpanded && (
					<div className="ml-8 mt-4 space-y-4 border-l-2 border-muted pl-4">
						{node.subordinates?.map((subordinate) => renderNode(subordinate, level + 1))}
					</div>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg">
				<div className="flex items-center gap-2 mb-6">
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="space-y-2">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-64" />
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						className="rounded-full aspect-square"
						variant="outline"
						onClick={() => router.push("/admin")}
					>
						<ArrowLeft />
					</Button>
					<div className="ml-2">
						<h1 className="text-2xl font-bold">Organization Chart</h1>
						{selectedInstitution && (
							<p className="text-muted-foreground">
								{selectedInstitution.institution_name} - Hierarchical Structure
							</p>
						)}
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={fetchOrganizationChart} disabled={loading}>
						<RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>
			</div>

			{/* Stats Cards */}
			{chartData && (
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					<Card className="shadow-sm">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">{chartData.total_employees}</div>
									<p className="text-sm text-muted-foreground">Total Employees</p>
								</div>
								<Users className="h-8 w-8 text-primary" />
							</div>
						</CardContent>
					</Card>
					<Card className="shadow-sm">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">{chartData.total_departments}</div>
									<p className="text-sm text-muted-foreground">Departments</p>
								</div>
								<Building2 className="h-8 w-8 text-primary" />
							</div>
						</CardContent>
					</Card>
					<Card className="shadow-sm">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">{chartData.levels}</div>
									<p className="text-sm text-muted-foreground">Hierarchy Levels</p>
								</div>
								<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
									<span className="text-primary font-bold">#{chartData.levels}</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Controls */}
			<div className="flex gap-2 mb-6">
				<Button variant="outline" size="sm" onClick={expandAll}>
					Expand All
				</Button>
				<Button variant="outline" size="sm" onClick={collapseAll}>
					Collapse All
				</Button>
			</div>

			{/* Organization Chart */}
			<div className="bg-muted/30 rounded-lg p-6 overflow-auto">
				{chartData?.root ? (
					<div className="max-w-4xl mx-auto">{renderNode(chartData.root)}</div>
				) : (
					<div className="text-center py-12">
						<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">No organization data</h3>
						<p className="text-muted-foreground">
							No organizational structure found for this institution.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
