"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Badge, Calendar, CheckCircle, FileText, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { branchLocationComparisonConfigAPI, showErrorToast } from "@/lib/utils";
import type { IBranchLocationComparisonConfig } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function LocationComparisonConfigDetailPage() {
	const [config, setConfig] = useState<IBranchLocationComparisonConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();

	const branchId = params?.branchId as string;
	const configId = params?.configId as string;

	const getStatusIcon = (isActive: boolean) => {
		return isActive ? (
			<CheckCircle className="h-4 w-4 text-green-600" />
		) : (
			<XCircle className="h-4 w-4 text-red-600" />
		);
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

	const getStatusBadgeVariant = (isActive: boolean) => {
		return isActive ? "default" : "destructive";
	};

	const fetchConfig = async () => {
		try {
			setLoading(true);
			const configData =
				await branchLocationComparisonConfigAPI.getByIdBranchLocationComparisonConfig(
					parseInt(configId),
				);
			setConfig(configData);
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to fetch location comparison configuration",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (configId) {
			fetchConfig();
		}
	}, [configId]);

	if (loading) {
		return (
			<div className="space-y-6 p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-64 bg-gray-200 rounded"></div>
				</div>
			</div>
		);
	}

	if (!config) {
		return (
			<div className="space-y-6 p-6">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Configuration not found</h2>
					<Button onClick={() => router.back()} className="mt-4">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6 bg-white">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Button
						variant="outline"
						size="sm"
						className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
						onClick={() => router.back()}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
					</Button>
					<div className="mt-2">
						<p className="text-muted-foreground">Location Comparison configurations</p>
					</div>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={config} onInstanceRefresh={fetchConfig}>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="mr-2 h-5 w-5" />
								Basic Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm text-700">Branch Name:</span>
									<span className="text-sm text-700">{config.branch_name}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-tex-700">Radius in meters:</span>
									<span className="text-sm text-700">{config.radius_in_meters}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Status:</span>
									<span className="text-sm text-700">{config.is_active}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-tex-700">Approval Status:</span>
									<span className="text-sm capitalize">
										{config.approval_status?.replace("_", " ")}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Timeline Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								Timeline & System Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="space-y-2">
									<span className="text-sm font-medium">Created Date:</span>
									<p className="text-sm">
										{config.created_at ? formatDate(config.created_at) : "Unknown"}
									</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Last Updated:</span>
									<p className="text-sm">
										{config.updated_at ? formatDate(config.updated_at) : "Unknown"}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
