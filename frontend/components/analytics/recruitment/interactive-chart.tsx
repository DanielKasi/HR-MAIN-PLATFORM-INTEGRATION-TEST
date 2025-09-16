"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart, TrendingUp, Eye } from "lucide-react";

interface InteractiveChartProps {
	data: any;
	type: "status" | "interviews" | "timeline" | "sources" | "onboarding";
}

export function InteractiveChart({ data, type }: InteractiveChartProps) {
	const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
	const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

	const getChartIcon = () => {
		switch (type) {
			case "timeline":
				return <TrendingUp className="h-4 w-4" />;
			case "sources":
			case "status":
			case "interviews":
			case "onboarding":
				return <PieChart className="h-4 w-4" />;
			default:
				return <BarChart3 className="h-4 w-4" />;
		}
	};

	const getInsights = () => {
		switch (type) {
			case "status":
				return "68% of applications progress to screening stage";
			case "interviews":
				return "Interview success rate increased by 15% this quarter";
			case "timeline":
				return "Peak application periods: March, June, September";
			case "sources":
				return "LinkedIn generates highest quality candidates";
			case "onboarding":
				return "95% onboarding completion rate with 4.8/5 satisfaction";
			default:
				return "Performance trending upward";
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button
						variant={viewMode === "chart" ? "default" : "outline"}
						size="sm"
						onClick={() => setViewMode("chart")}
						className="h-8"
					>
						{getChartIcon()}
						Chart
					</Button>
					<Button
						variant={viewMode === "table" ? "default" : "outline"}
						size="sm"
						onClick={() => setViewMode("table")}
						className="h-8"
					>
						<Eye className="h-4 w-4" />
						Data
					</Button>
				</div>
				<Badge variant="secondary" className="text-xs">
					Interactive
				</Badge>
			</div>

			{viewMode === "chart" ? (
				<div className="space-y-4">
					<div className="h-64 bg-gradient-to-br from-muted/20 to-muted/40 rounded-lg flex items-center justify-center">
						<div className="text-center space-y-2">
							{getChartIcon()}
							<p className="text-sm text-muted-foreground">Interactive {type} visualization</p>
							<p className="text-xs text-muted-foreground">Click segments for detailed insights</p>
						</div>
					</div>

					<Card className="p-4 bg-accent/5 border-accent/20">
						<div className="flex items-start gap-3">
							<div className="p-2 bg-accent/10 rounded-lg">
								<TrendingUp className="h-4 w-4 text-accent" />
							</div>
							<div>
								<h4 className="font-semibold text-sm">Key Insight</h4>
								<p className="text-sm text-muted-foreground">{getInsights()}</p>
							</div>
						</div>
					</Card>
				</div>
			) : (
				<div className="space-y-2">
					<div className="grid grid-cols-3 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide p-3 bg-muted/20 rounded-lg">
						<div>Category</div>
						<div>Count</div>
						<div>Percentage</div>
					</div>
					{Array.isArray(data) ? (
						data.map((item: any, index: number) => (
							<div
								key={index}
								className="grid grid-cols-3 gap-4 p-3 hover:bg-muted/20 rounded-lg transition-colors cursor-pointer"
							>
								<div className="font-medium">{item.name || item.status || `Item ${index + 1}`}</div>
								<div className="text-muted-foreground">{item.count || item.value || 0}</div>
								<div className="text-muted-foreground">
									{(((item.count || item.value || 0) / 100) * 100).toFixed(1)}%
								</div>
							</div>
						))
					) : (
						<div className="p-4 text-center text-muted-foreground">No data available</div>
					)}
				</div>
			)}
		</div>
	);
}
