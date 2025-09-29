"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, History, Calendar, User, Package, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { assetHistoriesAPI } from "@/lib/utils";
import { IAssetHistory } from "@/types/assets.types";

const getEventTypeColor = (eventType: IAssetHistory["event_type"]) => {
	const colors: Record<IAssetHistory["event_type"], string> = {
		allocated: "bg-green-100 text-green-800 border-green-200",
		returned: "bg-blue-100 text-blue-800 border-blue-200",
		maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200",
		decommissioned: "bg-red-100 text-red-800 border-red-200",
		created: "bg-purple-100 text-purple-800 border-purple-200",
		reassigned: "bg-orange-100 text-orange-800 border-orange-200",
	};
	return colors[eventType] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getEventTypeDisplay = (eventType: IAssetHistory["event_type"]) => {
	const displays: Record<IAssetHistory["event_type"], string> = {
		allocated: "Asset Allocated",
		returned: "Asset Returned",
		maintenance: "Under Maintenance",
		decommissioned: "Decommissioned",
		created: "Asset Created",
		reassigned: "Asset Reassigned",
	};
	return displays[eventType] || eventType.charAt(0).toUpperCase() + eventType.slice(1);
};

const formatDate = (dateString: string) => {
	if (!dateString) return "-";

	try {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	} catch (error) {
		return dateString;
	}
};

const AssetHistoryDetailPage = () => {
	const params = useParams();
	const router = useRouter();

	const [assetHistory, setAssetHistory] = useState<IAssetHistory | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const historyId = params.id as string;

	const fetchAssetHistoryDetails = async () => {
		try {
			setIsLoading(true);
			const response = await assetHistoriesAPI.getById(Number.parseInt(historyId));
			setAssetHistory(response);
		} catch (error) {
			console.error("Error fetching asset history details:", error);
			toast.error("Failed to load asset history details");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (historyId) {
			fetchAssetHistoryDetails();
		}
	}, [historyId]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="flex items-center space-x-2">
					<RefreshCw className="h-6 w-6 animate-spin text-primary" />
					<span className="text-lg text-gray-600">Loading asset history details...</span>
				</div>
			</div>
		);
	}

	if (!assetHistory) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Asset History Not Found</h2>
					<p className="text-gray-600 mb-4">
						The asset history record you're looking for doesn't exist or has been removed.
					</p>
					<Button onClick={() => router.push("/asset-histories")}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Asset Histories
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-full bg-white">
			<div className="px-4 sm:px-6 lg:px-8 py-6">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-6">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/assets/asset-histories")}
							className="p-2 hover:bg-gray-100 rounded-full border -mt-4"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div className="flex-1">
							<h1 className="text-2xl font-bold text-gray-900">Asset History Details</h1>
							<div className="flex items-center gap-3 mt-2">
								<Badge className={getEventTypeColor(assetHistory.event_type)}>
									{getEventTypeDisplay(assetHistory.event_type)}
								</Badge>
								{assetHistory.is_active && (
									<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
										Active Record
									</Badge>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Event Information Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<History className="h-5 w-5 text-primary" />
								Event Information
							</CardTitle>
							<CardDescription>Details about this asset history event</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-700">Event Type</label>
									<div className="mt-1">
										<Badge className={getEventTypeColor(assetHistory.event_type)}>
											{getEventTypeDisplay(assetHistory.event_type)}
										</Badge>
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-3">
								<div>
									<label className="text-sm font-medium text-gray-700 flex items-center gap-1">
										<Calendar className="h-4 w-4" />
										Event Date
									</label>
									<p className="text-sm text-gray-900 mt-1">
										{formatDate(assetHistory.created_at)}
									</p>
								</div>

								{assetHistory.updated_at && assetHistory.updated_at !== assetHistory.created_at && (
									<div>
										<label className="text-sm font-medium text-gray-700">Last Updated</label>
										<p className="text-sm text-gray-900 mt-1">
											{formatDate(assetHistory.updated_at)}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Asset Information Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-5 w-5 text-primary" />
								Asset Information
							</CardTitle>
							<CardDescription>Information about the asset involved in this event</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div>
									<label className="text-sm font-medium text-gray-700">Asset</label>
									<p className="text-sm text-gray-900 mt-1">
										{typeof assetHistory.asset === "string"
											? assetHistory.asset
											: assetHistory.asset?.asset_name || "N/A"}
									</p>
								</div>

								{typeof assetHistory.asset === "object" && assetHistory.asset?.serial_number && (
									<div>
										<label className="text-sm font-medium text-gray-700">Serial Number</label>
										<p className="text-sm text-gray-900 mt-1">{assetHistory.asset.serial_number}</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* People Involved Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5 text-primary" />
								People Involved
							</CardTitle>
							<CardDescription>Users who performed or were affected by this event</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label className="text-sm font-medium text-gray-700">Performed By</label>
								<div className="flex items-center gap-3 mt-1">
									<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
										<User className="h-4 w-4 text-gray-600" />
									</div>
									<div>
										<p className="text-sm font-medium text-gray-900">
											{typeof assetHistory.performed_by === "string"
												? assetHistory.performed_by
												: assetHistory.performed_by?.fullname || "N/A"}
										</p>
									</div>
								</div>
							</div>

							<Separator />

							<div>
								<label className="text-sm font-medium text-gray-700">Affected User</label>
								<div className="flex items-center gap-3 mt-1">
									<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
										<User className="h-4 w-4 text-gray-600" />
									</div>
									<div>
										<p className="text-sm font-medium text-gray-900">
											{assetHistory.affected_user
												? typeof assetHistory.affected_user === "string"
													? assetHistory.affected_user
													: assetHistory.affected_user?.fullname || "N/A"
												: "No affected user"}
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Additional Details Card */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5 text-primary" />
								Additional Details
							</CardTitle>
							<CardDescription>Notes and additional information about this event</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<label className="text-sm font-medium text-gray-700">Notes</label>
									<div className="mt-1 p-3 bg-gray-50 rounded-md border">
										<p className="text-sm text-gray-900">
											{assetHistory.notes || "No additional notes provided for this event."}
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};

export default AssetHistoryDetailPage;
