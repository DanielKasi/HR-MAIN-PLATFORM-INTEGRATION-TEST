"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Clock, User, FileText, Activity, RefreshCw, History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IAsset, IAssetHistory } from "@/types/types.utils";

interface AssetHistoryProps {
	asset: IAsset;
	onRefresh?: () => void;
}

export function AssetHistory({ asset, onRefresh }: AssetHistoryProps) {
	const [history, setHistory] = useState<IAssetHistory[]>([]);
	const [loading, setLoading] = useState(false);

	// Use the asset_histories data from the asset prop
	useEffect(() => {
		if (asset.asset_histories) {
			setHistory(asset.asset_histories);
		}
	}, [asset.asset_histories]);

	const handleRefresh = async () => {
		if (onRefresh) {
			setLoading(true);
			try {
				await onRefresh();
				toast.success("Asset history refreshed successfully");
			} catch (error) {
				toast.error("Failed to refresh asset history");
			} finally {
				setLoading(false);
			}
		}
	};

	const getEventTypeDisplay = (eventType: string) => {
		switch (eventType) {
			case "allocated":
				return "Allocated";
			case "returned":
				return "Returned";
			case "maintenance":
				return "Maintenance";
			case "decommissioned":
				return "Decommissioned";
			case "created":
				return "Created";
			case "reassigned":
				return "Reassigned";
			default:
				return eventType;
		}
	};

	const getEventTypeIcon = (eventType: string) => {
		switch (eventType) {
			case "allocated":
				return <User className="h-4 w-4 text-blue-500" />;
			case "returned":
				return <FileText className="h-4 w-4 text-green-500" />;
			case "maintenance":
				return <Activity className="h-4 w-4 text-yellow-500" />;
			case "decommissioned":
				return <FileText className="h-4 w-4 text-red-500" />;
			case "created":
				return <FileText className="h-4 w-4 text-purple-500" />;
			case "reassigned":
				return <User className="h-4 w-4 text-indigo-500" />;
			default:
				return <Activity className="h-4 w-4 text-gray-500" />;
		}
	};

	const getEventTypeColor = (eventType: string) => {
		switch (eventType) {
			case "allocated":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "returned":
				return "bg-green-100 text-green-800 border-green-200";
			case "maintenance":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "decommissioned":
				return "bg-red-100 text-red-800 border-red-200";
			case "created":
				return "bg-purple-100 text-purple-800 border-purple-200";
			case "reassigned":
				return "bg-indigo-100 text-indigo-800 border-indigo-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	if (!history || history.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<History className="h-5 w-5" />
						<span>Asset History</span>
						{onRefresh && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleRefresh}
								disabled={loading}
								className="ml-auto"
							>
								<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
							</Button>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8">
						<History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-500 text-sm">No history available for this asset</p>
						<p className="text-gray-400 text-xs mt-1">
							Asset history will appear here when actions are performed
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center space-x-2">
					<History className="h-5 w-5" />
					<span>Asset History</span>
					{onRefresh && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleRefresh}
							disabled={loading}
							className="ml-auto"
						>
							<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						</Button>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{history.map((item, index) => (
						<div
							key={item.id}
							className={`flex items-start space-x-3 p-3 rounded-lg border ${
								index === 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
							}`}
						>
							<div className="flex-shrink-0 mt-1">{getEventTypeIcon(item.event_type)}</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center space-x-2 mb-1">
									<Badge variant="outline" className={getEventTypeColor(item.event_type)}>
										{getEventTypeDisplay(item.event_type)}
									</Badge>
									{index === 0 && (
										<Badge variant="secondary" className="text-xs">
											Latest
										</Badge>
									)}
								</div>
								<p className="text-sm text-gray-900 font-medium">
									{item.notes || `Asset ${getEventTypeDisplay(item.event_type).toLowerCase()}`}
								</p>
								<div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
									<div className="flex items-center space-x-1">
										<Clock className="h-3 w-3" />
										<span>{format(new Date(item.created_at), "MMM dd, yyyy 'at' h:mm a")}</span>
									</div>
									{item.performed_by && (
										<div className="flex items-center space-x-1">
											<User className="h-3 w-3" />
											<span>by {item.performed_by.user.fullname}</span>
										</div>
									)}
									{item.affected_user && (
										<div className="flex items-center space-x-1">
											<User className="h-3 w-3" />
											<span>to {item.affected_user.user.fullname}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
