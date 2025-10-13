"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FileText, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { penaltyConfigAPI, showErrorToast } from "@/lib/utils";
import type { IBranchPenaltyConfig } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const PenaltyDetailPage = () => {
	const [penalty, setPenalty] = useState<IBranchPenaltyConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const penaltyId = params?.id as string;

	const fetchBranchPenaltyDetail = async () => {
		if (!penaltyId) {
			return;
		}

		try {
			setLoading(true);

			const numericId = Number(penaltyId);
			if (isNaN(numericId)) {
				throw new Error("Invalid penalty ID format");
			}

			const penaltyData = await penaltyConfigAPI.getBranchPenaltyConfigId(numericId);

			setPenalty(penaltyData);
		} catch (error: any) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch penalty details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBranchPenaltyDetail();
	}, [penaltyId]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (loading) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
					<div className="grid gap-6 md:grid-cols-2">
						<div className="h-64 bg-gray-200 rounded"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!penalty) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Penalty not found</h2>
					<p className="text-gray-600 mt-2">The penalty you're looking for doesn't exist.</p>
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
					<div className="mt-4">
						<h1 className="text-2xl font-semibold tracking-tight">Penalty Configuration</h1>
						<p className="text-muted-foreground">Penalty Details</p>
					</div>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={penalty} onInstanceRefresh={fetchBranchPenaltyDetail}>
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
									<span className="text-sm font-medium text-gray-700">Penalty Type:</span>
									<span className="text-sm font-semibold">{penalty.penalty_type}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium text-gray-700">Penalty Value:</span>
									<span className="text-sm text-gray-700">{penalty.penalty_value}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Penalty Value Type:</span>
									<span className="text-sm capitalize">{penalty.penalty_value_type}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Percentage:</span>
									<span className="text-sm">{penalty.percentage}%</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium">Approval Status:</span>
									<span className="text-sm capitalize">
										{penalty.approval_status?.replace("_", " ")}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* System Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								System Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="space-y-2">
									<span className="text-sm font-medium">Created Date:</span>
									<p className="text-sm">
										{penalty.created_at ? formatDate(penalty.created_at) : "Unknown"}
									</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Last Updated:</span>
									<p className="text-sm">
										{penalty.updated_at ? formatDate(penalty.updated_at) : "Unknown"}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default PenaltyDetailPage;
