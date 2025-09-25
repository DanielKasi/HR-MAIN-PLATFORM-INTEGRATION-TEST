"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
	FileText,
	Calendar,
	User,
	CheckCircle,
	Clock,
	XCircle,
	AlertCircle,
	ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IDisciplinaryAction } from "@/types/types.utils";
import { getDisciplinaryActionById } from "@/lib/utils";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

export default function ViewDisciplinaryActionPage() {
	const router = useRouter();
	const params = useParams();
	const actionId = params.actionId as string;
	const [disciplinaryAction, setDisciplinaryAction] = useState<IDisciplinaryAction | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchAction = async () => {
		try {
			setLoading(true);
			const idAsNumber = parseInt(params.id as string, 10);
			const response = await getDisciplinaryActionById(idAsNumber);
			if (!response) {
				throw new Error("No disciplinary action found");
			}
			setDisciplinaryAction(response);
		} catch (error: any) {
			toast.error(`Failed to fetch disciplinary action: ${error.message || "Unknown error"}`);
			router.push("/employees/discipline");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (params.id && !isNaN(parseInt(params.id as string, 10))) {
			fetchAction();
		} else {
			toast.error("Invalid disciplinary action ID");
			setLoading(false);
			router.push("/employees/discipline");
		}
	}, [params.id, router]);

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case "low":
				return "bg-green-100 text-green-800 border-green-200";
			case "medium":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "high":
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "critical":
				return "bg-red-100 text-red-800 border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800 border-green-200";
			case "in_progress":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "pending":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "dismissed":
				return "bg-gray-100 text-gray-800 border-gray-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-4 w-4" />;
			case "in_progress":
				return <Clock className="h-4 w-4" />;
			case "pending":
				return <AlertCircle className="h-4 w-4" />;
			case "dismissed":
				return <XCircle className="h-4 w-4" />;
			default:
				return <Clock className="h-4 w-4" />;
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
				<Card className="shadow-lg">
					<CardHeader className="border-b">
						<div className="flex justify-between gap-8 items-center">
							<div className="flex items-center justify-start gap-4">
								<div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
								<div className="space-y-2">
									<div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
									<div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
								</div>
							</div>
						</div>
					</CardHeader>
					<TableSkeleton rows={5} columns={4} />
				</Card>
			</div>
		);
	}

	if (!disciplinaryAction) {
		return (
			<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
				<Card>
					<CardHeader>
						<CardDescription>No disciplinary action found.</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6 bg-white min-h-screen">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/employees/discipline")}
						className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Disciplinary Action Details</h1>
						<CardDescription className="text-muted-foreground">
							Complete information for {disciplinaryAction.employee?.name || ""}'s disciplinary
							action
						</CardDescription>
					</div>
				</div>
			</div>

			<div
				className={`pt-4 ${
					disciplinaryAction?.approval_status !== undefined &&
					disciplinaryAction?.approval_status !== true &&
					disciplinaryAction?.approvals?.length
						? "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3"
						: ""
				}`}
			>
				{disciplinaryAction.approvals.length > 0 &&
					disciplinaryAction?.approval_status !== undefined &&
					disciplinaryAction?.approval_status !== true && (
						<ApprovalWorkflow
							className="order-1 md:order-2"
							approvals={disciplinaryAction.approvals}
							instance_approval_status={
								typeof disciplinaryAction.approval_status === "boolean"
									? disciplinaryAction.approval_status
										? "active"
										: undefined
									: disciplinaryAction.approval_status
							}
							onRefresh={fetchAction}
						/>
					)}

				<div
					className={`${
						disciplinaryAction?.approval_status !== undefined &&
						disciplinaryAction?.approval_status !== true &&
						disciplinaryAction?.approvals?.length
							? "lg:col-span-2 xl:col-span-3 order-2 md:order-1 mx-0 md:mx-2"
							: ""
					}`}
				>
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<FileText className="h-5 w-5 text-green-600" />
								<CardTitle>Action Details</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Employee</Label>
										<p className="text-base font-medium">{disciplinaryAction.employee?.name}</p>
										{disciplinaryAction.employee.department &&
											disciplinaryAction.employee.department.name.trim() && (
												<p className="text-sm text-muted-foreground">
													{disciplinaryAction.employee.department.name}
												</p>
											)}
									</div>
									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Discipline Type
										</Label>
										<div className="flex items-center gap-2 mt-1">
											<p className="text-base font-medium">
												{disciplinaryAction.discipline_type?.name}
											</p>
											<Badge
												className={getSeverityColor(
													disciplinaryAction.discipline_type?.severity || "Low",
												)}
											>
												{disciplinaryAction.discipline_type?.severity.toUpperCase()}
											</Badge>
										</div>
									</div>
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Status</Label>
										<Badge
											className={`${getStatusColor(disciplinaryAction.status)} flex items-center gap-1 w-fit mt-1`}
										>
											{getStatusIcon(disciplinaryAction.status)}
											{disciplinaryAction.status.replace("_", " ").toUpperCase()}
										</Badge>
									</div>
								</div>
								<div className="space-y-4">
									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Incident Date
										</Label>
										<p className="text-base font-medium">
											{new Date(disciplinaryAction.incident_date).toLocaleDateString()}
										</p>
									</div>
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Reported By</Label>
										<p className="text-base font-medium">
											{disciplinaryAction.reported_by.user?.fullname}
										</p>
									</div>
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
										<p className="text-base font-medium">
											{disciplinaryAction.assigned_to?.user?.fullname}
										</p>
									</div>
								</div>
							</div>
							<div className="space-y-4">
								<div>
									<Label className="text-sm font-medium text-muted-foreground">Description</Label>
									<p className="mt-1 p-3 bg-gray-50 rounded-md">{disciplinaryAction.description}</p>
								</div>
								{disciplinaryAction.evidence && (
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Evidence</Label>
										<p className="mt-1 p-3 bg-gray-50 rounded-md">{disciplinaryAction.evidence}</p>
									</div>
								)}
								{disciplinaryAction.action_taken && (
									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Action Taken
										</Label>
										<p className="mt-1 p-3 bg-gray-50 rounded-md">
											{disciplinaryAction.action_taken}
										</p>
									</div>
								)}
								{disciplinaryAction.notes && (
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Notes</Label>
										<p className="mt-1 p-3 bg-gray-50 rounded-md">{disciplinaryAction.notes}</p>
									</div>
								)}
								{disciplinaryAction.follow_up_required && (
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Follow-Up</Label>
										<p className="mt-1 p-3 bg-gray-50 rounded-md">
											{disciplinaryAction.follow_up_date
												? new Date(disciplinaryAction.follow_up_date).toLocaleDateString()
												: "Required"}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
