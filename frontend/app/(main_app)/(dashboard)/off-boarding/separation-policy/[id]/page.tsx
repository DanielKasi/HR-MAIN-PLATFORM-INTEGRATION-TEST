"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
	ArrowLeft,
	Edit,
	Trash2,
	Loader2,
	FileText,
	Calendar,
	Settings,
	AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import type { ISeparationType, ISeparationPolicy } from "@/types/types.utils";
import apiRequest from "@/lib/apiRequest";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

interface SeparationTypeDetails extends ISeparationType {
	policies_count?: number;
}

export default function SeparationPolicyDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const policyId = params.id as string;

	const [policy, setPolicy] = useState<ISeparationPolicy | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchPolicyDetails = async () => {
		try {
			const response = await apiRequest.get(`/on-boarding/separation-policies/${policyId}/`);

			if (response.status === 200) {
				const policyData = response.data;
				setPolicy(policyData);
			} else {
				throw new Error("Failed to fetch policy details");
			}
		} catch (error) {
			console.error("Error fetching policy details:", error);
			setError("Failed to load policy details");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (policyId) {
			fetchPolicyDetails();
		}
	}, [policyId]);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			const response = await apiRequest.delete(`/on-boarding/separation-policies/${policyId}/`);

			if (response.status === 204 || response.status === 200) {
				router.push("/off-boarding/separation-policy");
			} else {
				throw new Error("Failed to delete policy");
			}
		} catch (error: any) {
			console.error("Error deleting policy:", error);
			setError(error.response?.data?.message || "Failed to delete policy. Please try again.");
		} finally {
			setDeleting(false);
		}
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

	const getStatusBadge = (isActive: boolean) => {
		return (
			<Badge variant={isActive ? "default" : "secondary"} className="ml-2">
				{isActive ? "Active" : "Inactive"}
			</Badge>
		);
	};

	const getNoticePeriodText = (minDays: number, maxDays: number) => {
		if (minDays === maxDays) {
			return `${minDays} day${minDays !== 1 ? "s" : ""}`;
		}
		return `${minDays} - ${maxDays} days`;
	};

	if (loading) {
		return (
			<div className="container mx-auto py-6">
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="flex items-center gap-2">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span>Loading policy details...</span>
					</div>
				</div>
			</div>
		);
	}

	if (error || !policy) {
		return (
			<div className="container mx-auto py-6">
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>{error || "Policy not found"}</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/off-boarding/separation-policy">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="h-4 w-4 mr-2" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-3xl font-bold">Policy Details</h1>
							{getStatusBadge(policy.is_active)}
						</div>
						<p className="text-muted-foreground">Created {formatDate(policy.created_at)}</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Link href={`/off-boarding/separation-policy/edit/${policy.id}`}>
						<Button variant="outline">
							<Edit className="h-4 w-4 mr-2" />
							Edit Policy
						</Button>
					</Link>

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" disabled={deleting}>
								{deleting ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Trash2 className="h-4 w-4 mr-2" />
								)}
								Delete
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete the separation policy
									and remove all associated data.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
									Delete Policy
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div
				className={` gap-6 ${policy?.approval_status !== "active" && policy?.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
			>
				{policy?.approvals && policy.approvals.length > 0 && (
					<div className="order-1 lg:order-2">
						<ApprovalWorkflow
							approvals={policy.approvals}
							instance_approval_status={policy.approval_status}
							onRefresh={fetchPolicyDetails}
						/>
					</div>
				)}

				<div
					className={`${policy?.approval_status !== "active" && policy?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
				>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Main Content */}
						<div className="lg:col-span-2 space-y-6">
							{/* Basic Information */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<FileText className="h-5 w-5" />
										Basic Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<h3 className="font-medium text-sm text-muted-foreground mb-1">Policy Name</h3>
										<p className="text-lg">{policy.policy_name || "Unnamed Policy"}</p>
									</div>

									<Separator />

									<div>
										<h3 className="font-medium text-sm text-muted-foreground mb-1">Description</h3>
										<p className="text-sm leading-relaxed">{policy.description}</p>
									</div>

									{policy && (
										<>
											<Separator />
											<div>
												<h3 className="font-medium text-sm text-muted-foreground mb-2">
													Separation Type
												</h3>
												<div className="flex items-center gap-2 mb-2">
													<span className="font-medium">
														{policy.separation_type?.separation_type}
													</span>
													<Badge variant="outline" className="text-xs">
														{policy.separation_type?.category}
													</Badge>
												</div>
												{policy.separation_type?.description && (
													<p className="text-sm text-muted-foreground">
														{policy.separation_type.description}
													</p>
												)}
											</div>
										</>
									)}
								</CardContent>
							</Card>

							{/* Notice Period Requirements */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-5 w-5" />
										Notice Period Requirements
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="text-center p-4 bg-muted/50 rounded-lg">
											<div className="text-2xl font-bold text-primary mb-1">
												{policy.min_notice_days}
											</div>
											<div className="text-sm text-muted-foreground">Minimum Days</div>
										</div>
										<div className="text-center p-4 bg-muted/50 rounded-lg">
											<div className="text-2xl font-bold text-primary mb-1">
												{policy.max_notice_days}
											</div>
											<div className="text-sm text-muted-foreground">Maximum Days</div>
										</div>
									</div>
									<div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
										<p className="text-sm text-blue-800">
											<strong>Notice Period Range:</strong>{" "}
											{getNoticePeriodText(policy.min_notice_days, policy.max_notice_days)}
										</p>
									</div>
								</CardContent>
							</Card>

							{/* Policy Requirements */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Settings className="h-5 w-5" />
										Policy Requirements & Settings
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="flex items-center justify-between p-3 border rounded-lg">
											<div>
												<div className="font-medium text-sm">Separation Letter</div>
												<div className="text-xs text-muted-foreground">
													Formal letter requirement
												</div>
											</div>
											<Badge variant={policy.require_separation_letter ? "default" : "secondary"}>
												{policy.require_separation_letter ? "Required" : "Optional"}
											</Badge>
										</div>

										<div className="flex items-center justify-between p-3 border rounded-lg">
											<div>
												<div className="font-medium text-sm">All Stages</div>
												<div className="text-xs text-muted-foreground">
													Complete all offboarding stages
												</div>
											</div>
											<Badge variant={policy.require_all_stages ? "default" : "secondary"}>
												{policy.require_all_stages ? "Required" : "Optional"}
											</Badge>
										</div>

										<div className="flex items-center justify-between p-3 border rounded-lg">
											<div>
												<div className="font-medium text-sm">Policy Status</div>
												<div className="text-xs text-muted-foreground">Current availability</div>
											</div>
											<Badge variant={policy.is_active ? "default" : "secondary"}>
												{policy.is_active ? "Active" : "Inactive"}
											</Badge>
										</div>

										<div className="flex items-center justify-between p-3 border rounded-lg">
											<div>
												<div className="font-medium text-sm">Enforcement</div>
												<div className="text-xs text-muted-foreground">
													Strict policy enforcement
												</div>
											</div>
											<Badge variant={policy.enforce_policy ? "destructive" : "secondary"}>
												{policy.enforce_policy ? "Enforced" : "Flexible"}
											</Badge>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Quick Stats */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Quick Overview</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<Separator />

									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">Status</span>
										{getStatusBadge(policy.is_active)}
									</div>

									<Separator />

									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">Enforcement</span>
										<Badge
											variant={policy.enforce_policy ? "destructive" : "secondary"}
											className="text-xs"
										>
											{policy.enforce_policy ? "Strict" : "Flexible"}
										</Badge>
									</div>

									<Separator />

									<div>
										<span className="text-sm text-muted-foreground">Notice Range</span>
										<p className="font-medium text-sm mt-1">
											{getNoticePeriodText(policy.min_notice_days, policy.max_notice_days)}
										</p>
									</div>
								</CardContent>
							</Card>

							{/* Timestamps */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">Timeline</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<div className="text-sm text-muted-foreground mb-1">Created</div>
										<div className="text-sm font-medium">{formatDate(policy.created_at)}</div>
									</div>

									<Separator />

									<div>
										<div className="text-sm text-muted-foreground mb-1">Last Updated</div>
										<div className="text-sm font-medium">{formatDate(policy.updated_at)}</div>
									</div>

									{policy.created_at !== policy.updated_at && (
										<>
											<Separator />
											<div className="text-xs text-muted-foreground">
												Policy has been modified since creation
											</div>
										</>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
