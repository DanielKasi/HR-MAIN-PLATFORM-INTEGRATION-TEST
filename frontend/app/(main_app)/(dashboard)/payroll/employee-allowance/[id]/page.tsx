// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import {
// 	ArrowLeft,
// 	DollarSign,
// 	User,
// 	Calendar,
// 	Edit,
// 	CheckCircle,
// 	XCircle,
// 	Percent,
// 	Calculator,
// } from "lucide-react";
// import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import { useToast } from "@/hooks/use-toast";
// import { getEmployeeAllowance } from "@/lib/utils";
// import { IEmployeeAllowance } from "@/types/types.utils";
// import { PERMISSION_CODES } from "@/constants";
// import ProtectedComponent from "@/components/ProtectedComponent";
// import { formatCurrency } from "@/lib/helpers";

// export default function EmployeeAllowancePage() {
// 	const { id } = useParams();
// 	const router = useRouter();
// 	const { toast } = useToast();

// 	const [employeeAllowance, setEmployeeAllowance] = useState<IEmployeeAllowance | null>(null);
// 	const [loading, setLoading] = useState(true);

// 	useEffect(() => {
// 		if (id) {
// 			fetchEmployeeAllowance(Number(id));
// 		}
// 	}, [id]);

// 	const fetchEmployeeAllowance = async (allowanceId: number) => {
// 		setLoading(true);
// 		try {
// 			const allowance = await getEmployeeAllowance(allowanceId);
// 			if (!allowance) {
// 				toast({
// 					title: "Not Found",
// 					description: "The requested employee allowance does not exist.",
// 					variant: "destructive",
// 				});
// 				router.push("/payroll/employee-allowances");
// 			} else {
// 				setEmployeeAllowance(allowance);
// 			}
// 		} catch (error) {
// 			toast({
// 				title: "Error",
// 				description: "Failed to fetch employee allowance details",
// 				variant: "destructive",
// 			});
// 		} finally {
// 			setLoading(false);
// 		}
// 	};

// 	const getMethodColor = (method: string) => {
// 		switch (method) {
// 			case "percentage":
// 				return "bg-blue-100 text-blue-800 border-blue-200";
// 			case "fixed":
// 				return "bg-green-100 text-green-800 border-green-200";
// 			default:
// 				return "bg-gray-100 text-gray-800 border-gray-200";
// 		}
// 	};

// 	const getMethodIcon = (method: string) => {
// 		switch (method) {
// 			case "percentage":
// 				return <Percent className="h-3 w-3" />;
// 			case "fixed":
// 				return <DollarSign className="h-3 w-3" />;
// 			default:
// 				return <Calculator className="h-3 w-3" />;
// 		}
// 	};

// 	if (loading) {
// 		return (
// 			<div className="flex items-center justify-center h-64">
// 				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
// 			</div>
// 		);
// 	}

// 	if (!employeeAllowance) return null;

// 	return (
// 		<div className="max-w-full bg-white mt-4 pb-12 px-6">
// 			{/* Back Button */}
// 			<div className="flex items-center gap-3 mb-8">
// 				<Button
// 					size="sm"
// 					variant="outline"
// 					className="rounded-full aspect-square"
// 					onClick={() => router.back()}
// 				>
// 					<ArrowLeft className="h-4 w-4" />
// 				</Button>
// 				<div className="mt-5 ml-3">
// 					<h1 className="text-3xl font-bold tracking-tight">Employee Allowance Details</h1>
// 					<p className="text-muted-foreground mt-1">
// 						View and manage employee allowance information
// 					</p>
// 				</div>
// 			</div>

// 			{/* Action Buttons */}
// 			<div className="flex gap-3 mb-6">
// 				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEE_ALLOWANCES}>
// 					<Button
// 						onClick={() => router.push(`/payroll/employee-allowances/${id}/edit`)}
// 						className="flex items-center gap-2"
// 					>
// 						<Edit className="h-4 w-4" />
// 						Edit Allowance
// 					</Button>
// 				</ProtectedComponent>
// 			</div>

// 			{/* Results/Details Section */}
// 			<div
// 				className={`pt-4 ${
// 					employeeAllowance?.approval_status_display !== "active" &&
// 					employeeAllowance?.approvals?.length
// 						? "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3"
// 						: ""
// 				}`}
// 			>
// 				{/* Approval Workflow */}
// 				{employeeAllowance?.approvals && (
// 					<ApprovalWorkflow
// 						className="order-1 md:order-2"
// 						approvals={employeeAllowance.approvals}
// 						instance_approval_status={employeeAllowance.approval_status_display}
// 						onRefresh={() => fetchEmployeeAllowance(Number(id))}
// 					/>
// 				)}

// 				{/* Main Content */}
// 				<div className="lg:col-span-2 xl:col-span-3 order-2 md:order-1">
// 					{/* Employee Allowance Details */}
// 					<div className="space-y-6">
// 						<Card className="shadow-sm border-0 ring-1 ring-border">
// 							<CardHeader className="pb-6">
// 								<div className="flex items-start justify-between">
// 									<div className="flex items-center gap-3">
// 										<div className="p-2 rounded-lg bg-primary/10">
// 											<DollarSign className="h-6 w-6 text-primary" />
// 										</div>
// 										<div>
// 											<CardTitle className="text-2xl">
// 												{employeeAllowance.allowance_type.name}
// 											</CardTitle>
// 											<CardDescription className="text-base mt-1">
// 												Allowance for{" "}
// 												<span className="font-medium">
// 													{employeeAllowance.employee?.name || "Unknown Employee"}
// 												</span>
// 											</CardDescription>
// 										</div>
// 									</div>
// 									<div className="flex gap-2">
// 										<Badge
// 											className={`${getMethodColor(employeeAllowance.calculation_method)} flex items-center gap-1`}
// 										>
// 											{getMethodIcon(employeeAllowance.calculation_method)}
// 											{employeeAllowance.calculation_method === "percentage"
// 												? "Percentage"
// 												: "Fixed Amount"}
// 										</Badge>
// 										<Badge
// 											variant={employeeAllowance.is_active ? "default" : "secondary"}
// 											className="flex items-center gap-1"
// 										>
// 											{employeeAllowance.is_active ? (
// 												<CheckCircle className="h-3 w-3" />
// 											) : (
// 												<XCircle className="h-3 w-3" />
// 											)}
// 											{employeeAllowance.is_active ? "Active" : "Inactive"}
// 										</Badge>
// 										{employeeAllowance.approval_status_display && (
// 											<Badge
// 												className={
// 													employeeAllowance.approval_status_display === "active"
// 														? "bg-green-100 text-green-800 border-green-200"
// 														: ["under_creation", "under_update", "under_deletion"].includes(
// 																	employeeAllowance.approval_status_display,
// 															  )
// 															? "bg-yellow-100 text-yellow-800 border-yellow-200"
// 															: "bg-gray-100 text-gray-800 border-gray-200"
// 												}
// 											>
// 												{employeeAllowance.approval_status_display === "active" && (
// 													<CheckCircle className="h-3 w-3 mr-1" />
// 												)}
// 												{employeeAllowance.approval_status_display.charAt(0).toUpperCase() +
// 													employeeAllowance.approval_status_display.slice(1)}
// 											</Badge>
// 										)}
// 									</div>
// 								</div>
// 							</CardHeader>

// 							<CardContent className="space-y-8">
// 								{/* Basic Information */}
// 								<div className="space-y-3">
// 									<h3 className="font-semibold text-lg">Basic Information</h3>
// 									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
// 										<div className="space-y-2">
// 											<label className="text-sm font-medium text-muted-foreground">Employee</label>
// 											<p className="text-base font-medium">
// 												{employeeAllowance.employee?.name || "Unknown Employee"}
// 											</p>
// 										</div>
// 										<div className="space-y-2">
// 											<label className="text-sm font-medium text-muted-foreground">
// 												Allowance Type
// 											</label>
// 											<p className="text-base">{employeeAllowance.allowance_type.name}</p>
// 										</div>
// 										<div className="space-y-2">
// 											<label className="text-sm font-medium text-muted-foreground">
// 												Calculation Method
// 											</label>
// 											<Badge className={getMethodColor(employeeAllowance.calculation_method)}>
// 												{employeeAllowance.calculation_method === "percentage"
// 													? "Percentage"
// 													: "Fixed Amount"}
// 											</Badge>
// 										</div>
// 										<div className="space-y-2">
// 											<label className="text-sm font-medium text-muted-foreground">Status</label>
// 											<Badge variant={employeeAllowance.is_active ? "default" : "secondary"}>
// 												{employeeAllowance.is_active ? "Active" : "Inactive"}
// 											</Badge>
// 										</div>
// 									</div>
// 								</div>

// 								<Separator />

// 								{/* Amount Information */}
// 								<div className="space-y-3">
// 									<h3 className="font-semibold text-lg">Amount Details</h3>
// 									<div className="bg-muted/30 rounded-lg p-6 border">
// 										<div className="flex items-center justify-center">
// 											<div className="text-center">
// 												<div className="flex items-center justify-center gap-2 mb-2">
// 													{getMethodIcon(employeeAllowance.calculation_method)}
// 													<span className="text-sm text-muted-foreground font-medium">
// 														{employeeAllowance.calculation_method === "percentage"
// 															? "Percentage Rate"
// 															: "Fixed Amount"}
// 													</span>
// 												</div>
// 												<p className="text-3xl font-bold text-primary">
// 													{employeeAllowance.calculation_method === "percentage"
// 														? `${employeeAllowance.amount}%`
// 														: formatCurrency(employeeAllowance.amount)}
// 												</p>
// 												{employeeAllowance.calculation_method === "percentage" && (
// 													<p className="text-xs text-muted-foreground mt-1">
// 														Applied to base salary
// 													</p>
// 												)}
// 											</div>
// 										</div>
// 									</div>
// 								</div>

// 								{/* Description */}
// 								{employeeAllowance.allowance_type.description && (
// 									<div className="space-y-3">
// 										<h3 className="font-semibold text-lg">Description</h3>
// 										<div className="bg-muted/30 rounded-lg p-4 border">
// 											<p className="text-sm leading-relaxed">
// 												{employeeAllowance.allowance_type.description}
// 											</p>
// 										</div>
// 									</div>
// 								)}

// 								<Separator />

// 								{/* Metadata */}
// 								<div className="space-y-3">
// 									<h3 className="font-semibold text-lg">Metadata</h3>
// 									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
// 										<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
// 											<Calendar className="h-4 w-4 text-muted-foreground" />
// 											<div>
// 												<p className="font-medium text-sm">Created</p>
// 												<p className="text-xs text-muted-foreground">
// 													{new Date(employeeAllowance.created_at).toLocaleDateString("en-US", {
// 														year: "numeric",
// 														month: "long",
// 														day: "numeric",
// 														hour: "2-digit",
// 														minute: "2-digit",
// 													})}
// 												</p>
// 											</div>
// 										</div>
// 										<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
// 											<Calendar className="h-4 w-4 text-muted-foreground" />
// 											<div>
// 												<p className="font-medium text-sm">Last Updated</p>
// 												<p className="text-xs text-muted-foreground">
// 													{new Date(employeeAllowance.updated_at).toLocaleDateString("en-US", {
// 														year: "numeric",
// 														month: "long",
// 														day: "numeric",
// 														hour: "2-digit",
// 														minute: "2-digit",
// 													})}
// 												</p>
// 											</div>
// 										</div>
// 									</div>
// 								</div>
// 							</CardContent>
// 						</Card>
// 					</div>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }
