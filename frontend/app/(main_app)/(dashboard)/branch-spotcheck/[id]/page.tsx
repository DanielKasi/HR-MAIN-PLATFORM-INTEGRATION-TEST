"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FileText, Calendar, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { spotcheckAPI, showErrorToast } from "@/lib/utils";
import type { IBranchSpotCheckSetting } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const SpotcheckDetailPage = () => {
	const [spotcheck, setSpotcheck] = useState<IBranchSpotCheckSetting | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const spotcheckId = params?.id as string;

	const fetchSpotcheckDetail = async () => {
		if (!spotcheckId) return;

		try {
			setLoading(true);
			const numericId = Number(spotcheckId);

			if (isNaN(numericId)) {
				throw new Error("Invalid branch ID format");
			}

			const spotcheckData = await spotcheckAPI.CONFIGS.BRANCH.getByBranch({
				branchId: numericId,
			});
			setSpotcheck(spotcheckData);
		} catch (error: any) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch spotcheck details.",
			});
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchSpotcheckDetail();
	}, [spotcheckId]);

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

	if (!spotcheck) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Spotcheck Configuration not found</h2>
					<p className="text-gray-600 mt-2">
						The spotcheck configuration you're looking for doesn't exist.
					</p>
					<Button onClick={() => router.back()} className="mt-4">
						<ArrowLeft className="mr-2 h-4 w-4" />
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
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Spotcheck Configuration</h1>
						<p className="text-muted-foreground">Branch: {spotcheck.branch.branch_name}</p>
					</div>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={spotcheck} onInstanceRefresh={fetchSpotcheckDetail}>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Threshold Configuration */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Settings className="mr-2 h-5 w-5" />
								Threshold Settings
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm font-medium text-gray-700">Lower Threshold:</span>
									<span className="text-sm font-semibold">{spotcheck.lower_threshold}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium text-gray-700">Upper Threshold:</span>
									<span className="text-sm font-semibold">{spotcheck.upper_threshold}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Timing Configuration */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								Timing Settings
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm font-medium text-gray-700">Expires After:</span>
									<span className="text-sm">{spotcheck.expires_after_minutes} minutes</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm font-medium text-gray-700">Late Starts After:</span>
									<span className="text-sm">{spotcheck.late_starts_after_minutes} minutes</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default SpotcheckDetailPage;
