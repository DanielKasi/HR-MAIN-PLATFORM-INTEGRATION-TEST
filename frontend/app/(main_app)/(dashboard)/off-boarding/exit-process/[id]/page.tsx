// app/off-boarding/exit-process/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
	ArrowLeft,
	Calendar,
	Users,
	FileText,
	CheckCircle,
	Clock,
	XCircle,
	Download,
	Edit,
	User,
	Building,
	Mail,
	Phone,
	MapPin,
	BadgeDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import apiRequest from "@/lib/apiRequest";
import { showErrorToast } from "@/lib/utils";
import { ITermination, ITerminationStage } from "../page";
// import { useAppSelector } from "@/lib/hooks";

// Stage progress component
interface StageProgressProps {
	stage: ITerminationStage;
	index: number;
	totalStages: number;
}

function StageProgressItem({ stage, index, totalStages }: StageProgressProps) {
	const getStatusConfig = (stage: ITerminationStage) => {
		if (stage.skipped) {
			return {
				icon: <XCircle className="h-5 w-5 text-gray-400" />,
				color: "text-gray-400",
				bgColor: "bg-gray-50",
				borderColor: "border-gray-200",
				statusText: "Skipped",
			};
		}
		if (stage.completed) {
			return {
				icon: <CheckCircle className="h-5 w-5 text-green-600" />,
				color: "text-green-600",
				bgColor: "bg-green-50",
				borderColor: "border-green-200",
				statusText: "Completed",
			};
		}
		return {
			icon: <Clock className="h-5 w-5 text-blue-500" />,
			color: "text-blue-500",
			bgColor: "bg-blue-50",
			borderColor: "border-blue-200",
			statusText: "In Progress",
		};
	};

	const config = getStatusConfig(stage);

	return (
		<div className="flex items-start gap-4 py-4">
			{/* Connection line */}
			{index < totalStages - 1 && (
				<div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-200 ml-5" />
			)}

			{/* Stage number and icon */}
			<div
				className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center relative z-10`}
			>
				{config.icon}
			</div>

			{/* Stage content */}
			<div className="flex-1 space-y-2">
				<div className="flex items-center justify-between">
					<h4 className="font-semibold text-gray-900">{stage.stage.name}</h4>
					<Badge variant="outline" className={`${config.color} border-current`}>
						{config.statusText}
					</Badge>
				</div>

				{stage.stage.description && (
					<p className="text-sm text-gray-600">{stage.stage.description}</p>
				)}

				{stage.notes && (
					<div className="mt-2 p-3 bg-gray-50 rounded-md">
						<p className="text-sm text-gray-700">
							<strong>Notes:</strong> {stage.notes}
						</p>
					</div>
				)}

				<div className="flex items-center gap-4 text-xs text-gray-500">
					{stage.completed_at && (
						<span>Completed: {new Date(stage.completed_at).toLocaleDateString()}</span>
					)}
					<span>Order: {stage.custom_order}</span>
				</div>
			</div>
		</div>
	);
}

export default function ExitProcessViewPage() {
	const router = useRouter();
	const params = useParams();
	const terminationId = params.id as string;
	const currentInstitution = useSelector(selectSelectedInstitution);

	const [termination, setTermination] = useState<ITermination | null>(null);
	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (currentInstitution && terminationId) {
			fetchTerminationDetails();
		}
	}, [currentInstitution, terminationId]);

	const fetchTerminationDetails = async () => {
		try {
			setLoading(true);
			const response = await apiRequest.get(`/on-boarding/terminations/${terminationId}/`);
			const data = response.data as ITermination;
			setTermination(data);

			// Calculate progress
			if (data.stage_progress.length > 0) {
				const completedStages = data.stage_progress.filter(
					(stage) => stage.completed || stage.skipped,
				).length;
				const totalStages = data.stage_progress.length;
				setProgress(Math.round((completedStages / totalStages) * 100));
			}
		} catch (err) {
			console.error("Error fetching termination details:", err);
			showErrorToast({ error: err, defaultMessage: "Failed to fetch exit process details" });
		} finally {
			setLoading(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "INITIATED":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "IN_PROGRESS":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "COMPLETED":
				return "bg-green-100 text-green-800 border-green-200";
			case "CANCELLED":
				return "bg-gray-100 text-gray-800 border-gray-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getCategoryColor = (category: string) => {
		switch (category) {
			case "resignation":
				return "bg-purple-100 text-purple-800 border-purple-200";
			case "termination":
				return "bg-red-100 text-red-800 border-red-200";
			case "retirement":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "contract_end":
				return "bg-orange-100 text-orange-800 border-orange-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const formatStatus = (status: string) => {
		return status.toLowerCase().replace(/_/g, " ");
	};

	const handleDownloadHandoverReport = () => {
		if (termination?.handover_report?.report_file) {
			// Implement download logic here
			window.open(termination.handover_report.report_file, "_blank");
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col w-full h-full p-6 bg-white rounded-lg">
				<div className="animate-pulse space-y-6">
					<div className="h-8 bg-gray-200 rounded w-1/4"></div>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2 space-y-4">
							<div className="h-40 bg-gray-200 rounded"></div>
							<div className="h-60 bg-gray-200 rounded"></div>
						</div>
						<div className="space-y-4">
							<div className="h-40 bg-gray-200 rounded"></div>
							<div className="h-40 bg-gray-200 rounded"></div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!termination) {
		return (
			<div className="flex flex-col w-full h-full p-6 bg-white rounded-lg items-center justify-center">
				<FileText className="h-16 w-16 text-gray-400 mb-4" />
				<h2 className="text-xl font-semibold text-gray-600 mb-2">Exit Process Not Found</h2>
				<p className="text-gray-500 mb-4">The requested exit process could not be found.</p>
				<Button onClick={() => router.push("/off-boarding/exit-process")}>
					Back to Exit Processes
				</Button>
			</div>
		);
	}

	const sortedStages = [...termination.stage_progress].sort(
		(a, b) => a.custom_order - b.custom_order,
	);

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			{/* Header */}
			<div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
				<Button
					size="sm"
					variant="outline"
					className="rounded-full aspect-square focus-visible:ring-0 focus-visible:ring-offset-0"
					onClick={() => router.push("/off-boarding/exit-process")}
				>
					<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
				</Button>
				<div className="flex-1">
					<h1 className="text-3xl font-semibold">Exit Process Details</h1>
					<p className="text-sm text-muted-foreground mt-1">
						View and manage employee offboarding process
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => router.push(`/off-boarding/exit-process/${terminationId}/edit`)}
						className="focus-visible:ring-0 focus-visible:ring-offset-0"
					>
						<Edit className="h-4 w-4 mr-2" />
						Edit
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content - Left Column */}
				<div className="lg:col-span-2 space-y-6">
					{/* Employee and Process Info */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								Employee Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h3 className="font-semibold text-lg text-gray-900">
										{termination.employee || "Employee Name"}
									</h3>
									<p className="text-sm text-gray-600">Employee</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<Badge className={getStatusColor(termination.status)}>
										{formatStatus(termination.status)}
									</Badge>
									<Badge
										className={getCategoryColor(
											termination.termination_type?.category || "unknown",
										)}
									>
										{termination.termination_type?.category || "unknown"}
									</Badge>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<Calendar className="h-4 w-4 text-gray-500" />
										<div>
											<p className="text-sm text-gray-600">Last Working Day</p>
											<p className="font-medium">
												{new Date(termination.last_working_day).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Users className="h-4 w-4 text-gray-500" />
										<div>
											<p className="text-sm text-gray-600">Initiated By</p>
											<p className="font-medium capitalize">
												{formatStatus(termination.initiator_type)}
											</p>
										</div>
									</div>
								</div>
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<BadgeDollarSign className="h-4 w-4 text-gray-500" />
										<div>
											<p className="text-sm text-gray-600">Final Payment</p>
											<p className="font-medium">
												{termination.final_payment_date
													? new Date(termination.final_payment_date).toLocaleDateString()
													: "Not set"}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Building className="h-4 w-4 text-gray-500" />
										<div>
											<p className="text-sm text-gray-600">Termination Type</p>
											<p className="font-medium">
												{termination.termination_type?.name || "Not specified"}
											</p>
										</div>
									</div>
								</div>
							</div>

							{termination.reason && (
								<div className="pt-4 border-t">
									<h4 className="font-medium mb-2">Reason for Exit</h4>
									<p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
										{termination.reason}
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Exit Stages Progress */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Clock className="h-5 w-5" />
									Exit Process Stages
								</div>
								<div className="text-sm font-normal text-gray-600">{progress}% Complete</div>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Progress value={progress} className="w-full mb-6" />

							<div className="space-y-1 relative">
								{sortedStages.map((stage, index) => (
									<StageProgressItem
										key={stage.id}
										stage={stage}
										index={index}
										totalStages={sortedStages.length}
									/>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Handover Report */}
					{termination.handover_report && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Handover Report
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{termination.handover_report.report_text && (
										<div>
											<h4 className="font-medium mb-2">Report Details</h4>
											<p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
												{termination.handover_report.report_text}
											</p>
										</div>
									)}

									{termination.handover_report.report_file && (
										<Button
											onClick={handleDownloadHandoverReport}
											variant="outline"
											className="w-full sm:w-auto focus-visible:ring-0 focus-visible:ring-offset-0"
										>
											<Download className="h-4 w-4 mr-2" />
											Download Handover Report
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Sidebar - Right Column */}
				<div className="space-y-6">
					{/* Process Summary */}
					<Card>
						<CardHeader>
							<CardTitle>Process Summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex justify-between items-center">
								<span className="text-sm text-gray-600">Initiated Date</span>
								<span className="font-medium">
									{new Date(termination.created_at).toLocaleDateString()}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-gray-600">Last Updated</span>
								<span className="font-medium">
									{new Date(termination.updated_at).toLocaleDateString()}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-gray-600">Total Stages</span>
								<span className="font-medium">{termination.stage_progress.length}</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-gray-600">Completed Stages</span>
								<span className="font-medium">
									{termination.stage_progress.filter((stage) => stage.completed).length}
								</span>
							</div>
							{termination.requires_handover_report && (
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">Handover Required</span>
									<Badge variant={termination.handover_report ? "default" : "outline"}>
										{termination.handover_report ? "Submitted" : "Pending"}
									</Badge>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Termination Type Details */}
					<Card>
						<CardHeader>
							<CardTitle>Termination Type</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<h4 className="font-medium">{termination.termination_type?.name}</h4>
								{termination.termination_type?.description && (
									<p className="text-sm text-gray-600 mt-1">
										{termination.termination_type.description}
									</p>
								)}
							</div>

							<div className="pt-3 border-t">
								<div className="flex justify-between items-center text-sm">
									<span>Requires Handover</span>
									<Badge
										variant={
											termination.termination_type?.requires_handover_report ? "default" : "outline"
										}
									>
										{termination.termination_type?.requires_handover_report ? "Yes" : "No"}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Quick Actions */}
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<Button
								variant="outline"
								onClick={() => router.push(`/off-boarding/exit-process/${terminationId}/edit`)}
								className="focus-visible:ring-0 focus-visible:ring-offset-0"
							>
								<Edit className="h-4 w-4 mr-2" />
								Edit
							</Button>

							{termination.handover_report?.report_file && (
								<Button
									variant="outline"
									className="w-full justify-start focus-visible:ring-0 focus-visible:ring-offset-0"
									onClick={handleDownloadHandoverReport}
								>
									<Download className="h-4 w-4 mr-2" />
									Download Report
								</Button>
							)}

							<Button
								variant="outline"
								className="w-full justify-start focus-visible:ring-0 focus-visible:ring-offset-0"
								onClick={() => router.push("/off-boarding/exit-process")}
							>
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to List
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
