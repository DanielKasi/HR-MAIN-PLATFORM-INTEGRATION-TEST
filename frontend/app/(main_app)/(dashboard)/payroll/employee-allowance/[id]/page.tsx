"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	DollarSign,
	User,
	Calendar,
	Edit,
	CheckCircle,
	XCircle,
	Percent,
	Calculator,
	Currency,
} from "lucide-react";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getEmployeeAllowance, showErrorToast } from "@/lib/utils";
import { IEmployeeAllowance } from "@/types/types.utils";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { formatCurrency } from "@/lib/helpers";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function EmployeeAllowancePage() {
	const { id } = useParams();
	const router = useRouter();

	const [employeeAllowance, setEmployeeAllowance] = useState<IEmployeeAllowance | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			fetchEmployeeAllowance();
		}
	}, [id]);

	const fetchEmployeeAllowance = async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		try {
			const allowance = await getEmployeeAllowance(Number(id));
			setEmployeeAllowance(allowance);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to fetch employee allowance details" });
		} finally {
			setLoading(false);
		}
	};

	const getMethodColor = (method: string) => {
		switch (method) {
			case "percentage":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "fixed":
				return "bg-green-100 text-green-800 border-green-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getMethodIcon = (method: string) => {
		switch (method) {
			case "percentage":
				return <Percent className="h-3 w-3" />;
			case "fixed":
				return <Calculator className="h-3 w-3" />;
			default:
				return <Calculator className="h-3 w-3" />;
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!employeeAllowance) return null;

	return (
		<div className="max-w-full bg-white rounded-xl p-4">
			{/* Back Button */}
			<div className="my-5 md:pl-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center justify-start gap-4">
						<Button
							size="sm"
							variant="outline"
							className="rounded-full aspect-square !h-10 !w-10"
							onClick={() => router.back()}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="text-3xl font-bold tracking-tight">Employee Allowance Details</h1>
					</div>
				</div>
				<p className="text-muted-foreground mt-1">View and manage employee allowance information</p>
			</div>

			{/* Results/Details Section */}
			<ApprovableInstancePageLayout
				instance={employeeAllowance}
				onInstanceRefresh={fetchEmployeeAllowance}
			>
				<div className="space-y-6">
					<Card className="shadow-none border-none">
						<CardHeader className="pb-6">
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									<div>
										<CardTitle className="text-2xl">
											{employeeAllowance.allowance_type.name}
										</CardTitle>
										<CardDescription className="text-base mt-1">
											Allowance for{" "}
											<span className="font-medium">
												{employeeAllowance.employee?.name ||
													employeeAllowance.employee.user?.fullname ||
													"Unknown Employee"}
											</span>
										</CardDescription>
									</div>
								</div>
								<div className="flex gap-2">
									<Badge
										className={`${getMethodColor(employeeAllowance.calculation_method)} flex items-center gap-1`}
									>
										{getMethodIcon(employeeAllowance.calculation_method)}
										{employeeAllowance.calculation_method === "percentage"
											? "Percentage"
											: "Fixed Amount"}
									</Badge>
									{employeeAllowance.approval_status && (
										<Badge
											className={
												employeeAllowance.approval_status === "active"
													? "bg-green-100 text-green-800 border-green-200"
													: ["under_creation", "under_update", "under_deletion"].includes(
																employeeAllowance.approval_status,
														  )
														? "bg-yellow-100 text-yellow-800 border-yellow-200"
														: "bg-gray-100 text-gray-800 border-gray-200"
											}
										>
											{employeeAllowance.approval_status === "active" && (
												<CheckCircle className="h-3 w-3 mr-1" />
											)}
											{employeeAllowance.approval_status.charAt(0).toUpperCase() +
												employeeAllowance.approval_status.slice(1)}
										</Badge>
									)}
								</div>
							</div>
						</CardHeader>

						<CardContent className="space-y-8">
							{/* Basic Information */}
							<div className="space-y-3">
								<h3 className="font-semibold text-lg">Basic Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<label className="text-sm font-medium text-muted-foreground">Employee</label>
										<p className="text-base font-medium">
											{employeeAllowance.employee?.name || "Unknown Employee"}
										</p>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-muted-foreground">
											Allowance Type
										</label>
										<p className="text-base">{employeeAllowance.allowance_type.name}</p>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-muted-foreground">
											Calculation Method
										</label>
										<Badge className={getMethodColor(employeeAllowance.calculation_method)}>
											{employeeAllowance.calculation_method === "percentage"
												? "Percentage"
												: "Fixed Amount"}
										</Badge>
									</div>
								</div>
							</div>

							{/* Amount Information */}
							<div className="space-y-3">
								<h3 className="font-semibold text-lg">Amount Details</h3>
								<div className="bg-muted/30 rounded-lg p-6">
									<div className="flex items-center justify-start">
										<div className="text-center">
											<div className="flex items-center justify-center gap-2 mb-2">
												{getMethodIcon(employeeAllowance.calculation_method)}
												<span className="text-sm text-muted-foreground font-medium">
													{employeeAllowance.calculation_method === "percentage"
														? "Percentage Rate"
														: "Fixed Amount"}
												</span>
											</div>
											<p className="text-3xl font-bold text-primary">
												{employeeAllowance.calculation_method === "percentage"
													? `${employeeAllowance.amount}%`
													: formatCurrency(employeeAllowance.amount)}
											</p>
											{employeeAllowance.calculation_method === "percentage" && (
												<p className="text-xs text-muted-foreground mt-1">Applied to base salary</p>
											)}
										</div>
									</div>
								</div>
							</div>

							{/* Description */}
							{employeeAllowance.allowance_type.description && (
								<div className="space-y-3">
									<h3 className="font-semibold text-lg">Description</h3>
									<div className="bg-muted/30 rounded-lg p-4">
										<p className="text-sm leading-relaxed">
											{employeeAllowance.allowance_type.description}
										</p>
									</div>
								</div>
							)}

							{/* Metadata */}
							<div className="space-y-3">
								<h3 className="font-semibold text-lg">Metadata</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<div>
											<p className="font-medium text-sm">Created</p>
											<p className="text-xs text-muted-foreground">
												{new Date(employeeAllowance.created_at).toLocaleDateString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
