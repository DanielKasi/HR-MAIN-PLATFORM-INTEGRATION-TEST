"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
	ArrowLeft,
	Settings,
	Calendar,
	FileText,
	CheckCircle,
	XCircle,
	Package,
	Hash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IAssetCategory } from "@/types/assets.types";
import { IAsset } from "@/types/types.utils";
import { assetCategoriesAPI, assetsAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const AssetCategoryView = () => {
	const params = useParams();
	const router = useRouter();
	const [assetCategory, setAssetCategory] = useState<IAssetCategory | null>(null);
	const [assets, setAssets] = useState<IAsset[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const selectedInstitution = useSelector(selectSelectedInstitution);

	const assetCategoryId = parseInt(params.id as string);

	const getAssetCount = useCallback(() => {
		return assets.filter((asset) => asset.category?.id === assetCategoryId).length;
	}, [assets, assetCategoryId]);

	const fetchAssetCategory = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await assetCategoriesAPI.getById(assetCategoryId);
			setAssetCategory(data);
		} catch (err) {
			setError("Failed to fetch asset category details");
		} finally {
			setLoading(false);
		}
	};

	const fetchAssets = useCallback(async () => {
		if (!selectedInstitution?.id) return;

		try {
			const data = await assetsAPI.getAll();
			setAssets(data);
		} catch (error) {
			console.warn("Error fetching assets:", error);
			setAssets([]);
		}
	}, [selectedInstitution?.id]);

	useEffect(() => {
		if (assetCategoryId && !isNaN(assetCategoryId)) {
			fetchAssetCategory();
			fetchAssets();
		} else {
			setError("Invalid asset category ID");
			setLoading(false);
		}
	}, [assetCategoryId, fetchAssets]);

	if (loading) {
		return (
			<div className="space-y-6 p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<div className="w-16 h-8 bg-muted/20 rounded animate-pulse" />
						<div className="space-y-2">
							<div className="w-48 h-8 bg-muted/20 rounded animate-pulse" />
							<div className="w-32 h-4 bg-muted/20 rounded animate-pulse" />
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<div className="w-full h-96 bg-muted/10 rounded-lg animate-pulse" />
					</div>
					<div className="w-full h-96 bg-muted/10 rounded-lg animate-pulse" />
				</div>
				<div className="w-full h-48 bg-muted/10 rounded-lg animate-pulse" />
			</div>
		);
	}

	if (error || !assetCategory) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-4">
				<Settings className="h-16 w-16 text-muted-foreground" />
				<h2 className="text-2xl font-semibold text-gray-900">
					{error || "Asset category not found"}
				</h2>
				<p className="text-muted-foreground text-center max-w-md">
					The asset category you're looking for doesn't exist or you don't have permission to view
					it.
				</p>
				<Button onClick={() => router.push("/assets/asset-categories")} className="mt-4">
					<ArrowLeft className="h-4 w-4 mr-2" />
				</Button>
			</div>
		);
	}
	return (
		<div
			className={`p-6 bg-white ${assetCategory?.approval_status !== "active" && assetCategory?.approvals?.length ? "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6" : ""}`}
		>
			{/* ApprovalWorkflow - will appear on the right */}
			{assetCategory?.approvals && assetCategory.approvals.length > 0 && (
				<div className="order-1 lg:order-2">
					<ApprovalWorkflow
						approvals={assetCategory.approvals}
						instance_approval_status={assetCategory.approval_status}
						onRefresh={fetchAssetCategory}
					/>
				</div>
			)}

			{/* Main content - will take up remaining space on the left */}
			<div
				className={`${assetCategory?.approval_status !== "active" && assetCategory?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""} space-y-6`}
			>
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<Button
							variant="outline"
							className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0 -mt-4"
							size="sm"
							onClick={() => router.push("/assets/asset-categories")}
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
						</Button>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">{assetCategory.category_name}</h1>
							<p className="text-muted-foreground">Asset Category Details</p>
						</div>
					</div>
				</div>

				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<FileText className="h-5 w-5 mr-2" />
							Basic Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">Category Name</label>
								<p className="text-base font-medium">{assetCategory.category_name}</p>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">Status</label>
								<div>
									<Badge className={getStatusColor(assetCategory.is_active)}>
										{assetCategory.is_active ? (
											<>
												<CheckCircle className="h-3 w-3 mr-1" />
												Active
											</>
										) : (
											<>
												<XCircle className="h-3 w-3 mr-1" />
												Inactive
											</>
										)}
									</Badge>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">Assets Count</label>
								<div className="flex items-center">
									<Package className="h-4 w-4 mr-2 text-muted-foreground" />
									<span className="text-base font-medium">
										{getAssetCount()} Asset{getAssetCount() !== 1 ? "s" : ""}
									</span>
								</div>
							</div>
						</div>

						{assetCategory.category_description && (
							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">Description</label>
								<div className="p-4">
									<p className="text-base text-gray-700 leading-relaxed">
										{assetCategory.category_description}
									</p>
								</div>
							</div>
						)}

						{!assetCategory.category_description && (
							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">Description</label>
								<div className="p-4 bg-gray-50 rounded-lg border">
									<p className="text-base text-gray-400 italic">No description provided</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Category Statistics */}
				<Card>
					<CardHeader>
						<CardTitle>Category Statistics</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="flex items-center space-x-3 p-4 rounded-lg bg-muted/30">
								<div
									className={`p-2 rounded-full ${
										assetCategory.is_active
											? "bg-green-100 text-green-600"
											: "bg-gray-100 text-gray-600"
									}`}
								>
									{assetCategory.is_active ? (
										<CheckCircle className="h-4 w-4" />
									) : (
										<XCircle className="h-4 w-4" />
									)}
								</div>
								<div>
									<p className="font-medium">Status</p>
									<p className="text-sm text-muted-foreground">
										{assetCategory.is_active ? "Currently active" : "Currently inactive"}
									</p>
								</div>
							</div>

							<div className="flex items-center space-x-3 p-4 rounded-lg bg-muted/30">
								<div className="p-2 rounded-full bg-blue-100 text-blue-600">
									<Package className="h-4 w-4" />
								</div>
								<div>
									<p className="font-medium">Assets</p>
									<p className="text-sm text-muted-foreground">
										{getAssetCount()} asset{getAssetCount() !== 1 ? "s" : ""} in this category
									</p>
								</div>
							</div>

							<div className="flex items-center space-x-3 p-4 rounded-lg bg-muted/30">
								<div className="p-2 rounded-full bg-purple-100 text-purple-600">
									<Calendar className="h-4 w-4" />
								</div>
								<div>
									<p className="font-medium">Created</p>
									<p className="text-sm text-muted-foreground">
										{formatDate(assetCategory.created_at)}
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default AssetCategoryView;
