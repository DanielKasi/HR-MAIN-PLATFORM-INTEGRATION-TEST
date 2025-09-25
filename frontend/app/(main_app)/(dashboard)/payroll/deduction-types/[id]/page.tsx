"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
	ArrowLeft,
	Settings,
	Calendar,
	DollarSign,
	FileText,
	CheckCircle,
	XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IDeductionType } from "@/types/types.utils";
import { getDeductionType } from "@/lib/utils";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

const getTaxableColor = (isTaxable: boolean) => {
	return isTaxable
		? "bg-red-100 text-red-800 border-red-200"
		: "bg-blue-100 text-blue-800 border-blue-200";
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

const AllowanceTypeView = () => {
	const params = useParams();
	const router = useRouter();
	const [deductionType, setDeductionType] = useState<IDeductionType | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const deductionTypeId = parseInt(params.id as string);

	const fetchDeductionType = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await getDeductionType(deductionTypeId);
			setDeductionType(data);
		} catch (err) {
			setError("Failed to fetch deduction type details");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (deductionTypeId && !isNaN(deductionTypeId)) {
			fetchDeductionType();
		} else {
			setError("Invalid deduction type ID");
			setLoading(false);
		}
	}, [deductionTypeId]);

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

	if (error || !deductionType) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-4">
				<Settings className="h-16 w-16 text-muted-foreground" />
				<h2 className="text-2xl font-semibold text-gray-900">
					{error || "Allowance type not found"}
				</h2>
				<p className="text-muted-foreground text-center max-w-md">
					The deduction type you're looking for doesn't exist or you don't have permission to view
					it.
				</p>
				<Button onClick={() => router.push("/payroll/deduction-types")} className="mt-4">
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Deduction Types
				</Button>
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
						className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
						size="sm"
						onClick={() => router.push("/payroll/deduction-types")}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
					</Button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{deductionType.name}</h1>
						<p className="text-muted-foreground">Deduction Type Details</p>
					</div>
				</div>
			</div>

			{/* Main Content with Approval Workflow */}
			<div
				className={`${
					deductionType?.approval_status &&
					!["active", "approved"].includes(deductionType.approval_status) &&
					deductionType?.approvals?.length
						? "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6"
						: ""
				}`}
			>
				{/* Approval Workflow - Show if approvals exist and status requires approval */}
				{deductionType?.approvals &&
					deductionType.approvals.length > 0 &&
					deductionType?.approval_status &&
					!["active", "approved"].includes(deductionType.approval_status) && (
						<ApprovalWorkflow
							className="order-1 md:order-2"
							approvals={deductionType.approvals}
							instance_approval_status={deductionType.approval_status}
							onRefresh={fetchDeductionType}
						/>
					)}

				{/* Main Content */}
				<div
					className={`${
						deductionType?.approval_status !== "active" && deductionType?.approvals?.length
							? "lg:col-span-2 xl:col-span-3 order-2 md:order-1"
							: ""
					}`}
				>
					{/* Basic Information */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center">
								<FileText className="h-5 w-5 mr-2" />
								Basic Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label className="text-sm font-medium text-muted-foreground">Name</label>
									<p className="text-base font-medium">{deductionType.name}</p>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium text-muted-foreground">Status</label>
									<div>
										<Badge className={getStatusColor(deductionType.is_active)}>
											{deductionType.is_active ? (
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

								{/* Approval Status */}
								{deductionType.approval_status && (
									<div className="space-y-2">
										<label className="text-sm font-medium text-muted-foreground">
											Approval Status
										</label>
										<div>
											<Badge
												className={
													deductionType.approval_status === "active"
														? "bg-green-100 text-green-800 border-green-200"
														: ["under_creation", "under_update", "under_deletion"].includes(
																	deductionType.approval_status,
															  )
															? "bg-yellow-100 text-yellow-800 border-yellow-200"
															: "bg-gray-100 text-gray-800 border-gray-200"
												}
											>
												{deductionType.approval_status === "active" && (
													<CheckCircle className="h-3 w-3 mr-1" />
												)}
												{deductionType.approval_status.charAt(0).toUpperCase() +
													deductionType.approval_status.slice(1)}
											</Badge>
										</div>
									</div>
								)}
								<div className="space-y-2">
									<label className="text-sm font-medium text-muted-foreground">
										Recurrence Type
									</label>
									<div>
										<Badge
											className={
												deductionType.is_recurring
													? "bg-purple-100 text-purple-800 border-purple-200"
													: "bg-gray-100 text-gray-800 border-gray-200"
											}
										>
											<Calendar className="h-3 w-3 mr-1" />
											{deductionType.is_recurring ? "Recurring" : "One-time"}
										</Badge>
									</div>
								</div>
							</div>

							{deductionType.is_recurring && deductionType.frequency && (
								<div className="space-y-2">
									<label className="text-sm font-medium text-muted-foreground">Frequency</label>
									<p className="text-base capitalize">{deductionType.frequency}</p>
								</div>
							)}

							{deductionType.description && (
								<div className="space-y-2">
									<label className="text-sm font-medium text-muted-foreground">Description</label>
									<p className="text-base text-gray-700 leading-relaxed">
										{deductionType.description}
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Configuration Summary */}
					<Card>
						<CardHeader>
							<CardTitle>Configuration Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="flex items-center space-x-3 p-4 rounded-lg bg-muted/30">
									<div
										className={`p-2 rounded-full ${
											deductionType.is_active
												? "bg-green-100 text-green-600"
												: "bg-gray-100 text-gray-600"
										}`}
									>
										{deductionType.is_active ? (
											<CheckCircle className="h-4 w-4" />
										) : (
											<XCircle className="h-4 w-4" />
										)}
									</div>
									<div>
										<p className="font-medium">Status</p>
										<p className="text-sm text-muted-foreground">
											{deductionType.is_active ? "Currently active" : "Currently inactive"}
										</p>
									</div>
								</div>

								<div className="flex items-center space-x-3 p-4 rounded-lg bg-muted/30">
									<div
										className={`p-2 rounded-full ${
											deductionType.is_recurring
												? "bg-purple-100 text-purple-600"
												: "bg-gray-100 text-gray-600"
										}`}
									>
										<Calendar className="h-4 w-4" />
									</div>
									<div>
										<p className="font-medium">Payment Schedule</p>
										<p className="text-sm text-muted-foreground">
											{deductionType.is_recurring
												? `Recurring${
														deductionType.frequency ? ` - ${deductionType.frequency}` : ""
													}`
												: "One-time payment"}
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

export default AllowanceTypeView;
