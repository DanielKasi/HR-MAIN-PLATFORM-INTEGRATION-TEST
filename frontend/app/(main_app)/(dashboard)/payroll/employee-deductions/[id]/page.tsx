"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Minus,
	User,
	Calendar,
	Edit,
	CheckCircle,
	XCircle,
	Percent,
	Calculator,
} from "lucide-react";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getEmployeeDeduction } from "@/lib/utils";
import { IEmployeeDeduction } from "@/types/types.utils";
import { formatCurrency } from "@/lib/helpers";

export default function EmployeeDeductionViewPage() {
	const { id } = useParams();
	const router = useRouter();
	const { toast } = useToast();

	const [employeeDeduction, setEmployeeDeduction] = useState<IEmployeeDeduction | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			fetchEmployeeDeduction(Number(id));
		}
	}, [id]);

	const fetchEmployeeDeduction = async (deductionId: number) => {
		setLoading(true);
		try {
			const deduction = await getEmployeeDeduction(deductionId);
			if (!deduction) {
				toast({
					title: "Not Found",
					description: "The requested employee deduction does not exist.",
					variant: "destructive",
				});
				router.push("/payroll/employee-deductions");
			} else {
				setEmployeeDeduction(deduction);
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch employee deduction details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const getMethodColor = (method: string) => {
		switch (method) {
			case "percentage":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "fixed":
				return "bg-purple-100 text-purple-800 border-purple-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getMethodIcon = (method: string) => {
		switch (method) {
			case "percentage":
				return <Percent className="h-3 w-3" />;
			case "fixed":
				return <Minus className="h-3 w-3" />;
			default:
				return <Calculator className="h-3 w-3" />;
		}
	};

	const getCalculatedAmount = (deduction: IEmployeeDeduction): number => {
		if (deduction.calculation_method === "percentage" && deduction.employee?.salary) {
			return (
				(Number(deduction.employee.salary || 0) * parseFloat(deduction.percentage || "0")) / 100
			);
		}
		return parseFloat(deduction.amount) || 0;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!employeeDeduction) return null;

	return (
		<div className="max-w-full bg-white mt-4 pb-12 px-6">
			{/* Back Button */}
			<div className="flex items-center gap-3 mb-8">
				<Button
					size="sm"
					variant="outline"
					className="rounded-full aspect-square"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="mt-5 ml-3">
					<h1 className="text-3xl font-bold tracking-tight">Employee Deduction Details</h1>
					<p className="text-muted-foreground mt-1">
						View and manage employee deduction information
					</p>
				</div>
			</div>

			{/* Results/Details Section */}
			<div
				className={`pt-4 ${
					employeeDeduction?.approval_status_display !== "active" &&
					employeeDeduction?.approvals?.length
						? "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3"
						: ""
				}`}
			>
				{/* Approval Workflow */}
				{employeeDeduction?.approvals && (
					<ApprovalWorkflow
						className="order-1 md:order-2"
						approvals={employeeDeduction.approvals}
						instance_approval_status={employeeDeduction.approval_status_display}
						onRefresh={() => fetchEmployeeDeduction(Number(id))}
					/>
				)}

				{/* Main Content */}
				<div className="lg:col-span-2 xl:col-span-3 order-2 md:order-1">
					{/* Employee Deduction Details */}
					<div className="space-y-6">
						<Card className="shadow-sm border-0 ring-1 ring-border">
							<CardHeader className="pb-6">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-lg bg-red-50">
											<Minus className="h-6 w-6 text-red-600" />
										</div>
										<div>
											<CardTitle className="text-2xl">
												{employeeDeduction.deduction_type.name}
											</CardTitle>
											<CardDescription className="text-base mt-1">
												Deduction for{" "}
												<span className="font-medium">
													{employeeDeduction.employee?.name || "Unknown Employee"}
												</span>
											</CardDescription>
										</div>
									</div>
									<div className="flex gap-2">
										<Badge
											className={`${getMethodColor(employeeDeduction.calculation_method)} flex items-center gap-1`}
										>
											{getMethodIcon(employeeDeduction.calculation_method)}
											{employeeDeduction.calculation_method === "percentage"
												? "Percentage"
												: "Fixed Amount"}
										</Badge>
										<Badge
											variant={employeeDeduction.is_active ? "default" : "secondary"}
											className="flex items-center gap-1"
										>
											{employeeDeduction.is_active ? (
												<CheckCircle className="h-3 w-3" />
											) : (
												<XCircle className="h-3 w-3" />
											)}
											{employeeDeduction.is_active ? "Active" : "Inactive"}
										</Badge>
										{employeeDeduction.approval_status_display && (
											<Badge
												className={
													employeeDeduction.approval_status_display === "active"
														? "bg-green-100 text-green-800 border-green-200"
														: ["under_creation", "under_update", "under_deletion"].includes(
																	employeeDeduction.approval_status_display,
															  )
															? "bg-yellow-100 text-yellow-800 border-yellow-200"
															: "bg-gray-100 text-gray-800 border-gray-200"
												}
											>
												{employeeDeduction.approval_status_display === "active" && (
													<CheckCircle className="h-3 w-3 mr-1" />
												)}
												{employeeDeduction.approval_status_display.charAt(0).toUpperCase() +
													employeeDeduction.approval_status_display.slice(1)}
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
												{employeeDeduction.employee?.name || "Unknown Employee"}
											</p>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium text-muted-foreground">
												Deduction Type
											</label>
											<p className="text-base">{employeeDeduction.deduction_type.name}</p>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium text-muted-foreground">
												Calculation Method{" "}
											</label>
											<Badge className={getMethodColor(employeeDeduction.calculation_method)}>
												{employeeDeduction.calculation_method === "percentage"
													? "Percentage"
													: "Fixed Amount"}
											</Badge>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium text-muted-foreground">Status </label>
											<Badge variant={employeeDeduction.is_active ? "default" : "secondary"}>
												{employeeDeduction.is_active ? "Active" : "Inactive"}
											</Badge>
										</div>
									</div>
								</div>

								<Separator />

								{/* Amount Information */}
								<div className="space-y-3">
									<h3 className="font-semibold text-lg">Deduction Details</h3>
									<div className="bg-red-50 rounded-lg p-6 border border-red-200">
										<div className="flex items-center justify-center">
											<div className="text-center">
												<div className="flex items-center justify-center gap-2 mb-2">
													{getMethodIcon(employeeDeduction.calculation_method)}
													<span className="text-sm text-red-700 font-medium">
														{employeeDeduction.calculation_method === "percentage"
															? "Percentage Rate"
															: "Fixed Amount"}
													</span>
												</div>
												<p className="text-3xl font-bold text-red-600">
													{employeeDeduction.calculation_method === "percentage"
														? `${employeeDeduction.percentage || employeeDeduction.amount}%`
														: formatCurrency(employeeDeduction.amount)}
												</p>
												{employeeDeduction.calculation_method === "percentage" &&
													employeeDeduction.employee?.salary && (
														<div className="mt-3 pt-3 border-t border-red-200">
															<p className="text-xs text-red-600 mb-1">
																Calculated from base salary:{" "}
																{formatCurrency(employeeDeduction.employee.salary)}
															</p>
															<p className="text-lg font-semibold text-red-700">
																Deduction Amount:{" "}
																{formatCurrency(getCalculatedAmount(employeeDeduction))}
															</p>
														</div>
													)}
											</div>
										</div>
									</div>
								</div>

								{/* Employee Information */}
								{employeeDeduction.employee && (
									<div className="space-y-3">
										<h3 className="font-semibold text-lg">Employee Information</h3>
										<div className="bg-muted/30 rounded-lg p-4 border">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<label className="text-sm font-medium text-muted-foreground">
														Full Name
													</label>
													<p className="text-sm">{employeeDeduction.employee.name}</p>
												</div>
												{employeeDeduction.employee.salary && (
													<div className="space-y-2">
														<label className="text-sm font-medium text-muted-foreground">
															Base Salary
														</label>
														<p className="text-sm font-mono">
															{formatCurrency(employeeDeduction.employee.salary)}
														</p>
													</div>
												)}
											</div>
										</div>
									</div>
								)}

								{/* Description */}
								{employeeDeduction.deduction_type.description && (
									<div className="space-y-3">
										<h3 className="font-semibold text-lg">Description</h3>
										<div className="bg-muted/30 rounded-lg p-4 border">
											<p className="text-sm leading-relaxed">
												{employeeDeduction.deduction_type.description}
											</p>
										</div>
									</div>
								)}

								<Separator />

								{/* Metadata */}
								<div className="space-y-3">
									<h3 className="font-semibold text-lg">Metadata</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<div>
												<p className="font-medium text-sm">Created</p>
												<p className="text-xs text-muted-foreground">
													{new Date(employeeDeduction.created_at).toLocaleDateString("en-US", {
														year: "numeric",
														month: "long",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<div>
												<p className="font-medium text-sm">Last Updated</p>
												<p className="text-xs text-muted-foreground">
													{new Date(employeeDeduction.updated_at).toLocaleDateString("en-US", {
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
				</div>
			</div>
		</div>
	);
}
