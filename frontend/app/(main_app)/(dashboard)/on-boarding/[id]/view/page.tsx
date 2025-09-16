"use client";

import type { IOnBoarding } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Calendar,
	User,
	Mail,
	Phone,
	MapPin,
	Briefcase,
	FileText,
	Clock,
	CheckCircle,
	XCircle,
	AlertTriangle,
	GraduationCap,
	UserCheck,
	UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getOnBoardingById } from "@/lib/utils";
import { DocumentGenerationDialog } from "@/components/document-generation-dialog";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

const ONBOARDING_STAGES = [
	{ value: "initial", label: "Initial", icon: AlertTriangle, color: "text-gray-500" },
	{ value: "training", label: "Training", icon: GraduationCap, color: "text-blue-500" },
	{ value: "issued_contract", label: "Contract Issued", icon: FileText, color: "text-purple-500" },
	{ value: "accepted_offer", label: "Offer Accepted", icon: UserCheck, color: "text-orange-500" },
	{ value: "declined_offer", label: "Offer Declined", icon: UserX, color: "text-red-500" },
] as const;

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export default function ViewOnboardingDetails() {
	const [isLoading, setIsLoading] = useState(true);
	const [showDocumentDialog, setShowDocumentDialog] = useState(false);
	const params = useParams();
	const onboardingId = params.id as unknown as number;
	const [onboarding, setOnboarding] = useState<IOnBoarding | null>(null);

	const router = useRouter();

	useEffect(() => {
		fetchOnboarding();
	}, [onboardingId]);

	const fetchOnboarding = async () => {
		try {
			setIsLoading(true);
			const data = await getOnBoardingById({ onboardingId });

			if (data) {
				setOnboarding(data);
			} else {
				toast.error("Failed to load onboarding record");
				router.push("/on-boarding");
			}
		} catch (error) {
			toast.error("Failed to load onboarding record");
			router.push("/on-boarding");
		} finally {
			setIsLoading(false);
		}
	};

	const getApplicationData = (onboarding: IOnBoarding) => {
		const applicationData = onboarding.application_details;

		if (!applicationData) {
			return {
				applicantName: "N/A",
				applicantEmail: "N/A",
				jobDesc: "N/A",
				applicantPhone: "N/A",
				applicantAddress: "N/A",
				applicantPositions: "N/A",
			};
		}

		const jobDetails = applicationData.job_position_advert_job_details;
		const jobName = jobDetails?.name || "N/A";
		const jobDescription = jobDetails?.description || "N/A";

		return {
			applicantName: applicationData.applicant_name || "N/A",
			applicantEmail: applicationData.applicant_email || "N/A",
			jobDesc: jobName !== "N/A" ? jobName : jobDescription,
			applicantPhone: applicationData.applicant_phone || "N/A",
			applicantAddress: applicationData.address || "N/A",
			applicantPositions: applicationData.positions?.toString() || "N/A",
		};
	};

	const getStatusIcon = (status: IOnBoarding["status"]) => {
		if (!status) return <AlertTriangle className="h-5 w-5 text-gray-500" />;
		const stage = ONBOARDING_STAGES.find((s) => s.value === status);

		if (stage) {
			const IconComponent = stage.icon;

			return <IconComponent className={`h-5 w-5 ${stage.color}`} />;
		}

		return <AlertTriangle className="h-5 w-5 text-gray-500" />;
	};

	const getStatusBadgeVariant = (status: IOnBoarding["status"]): BadgeVariant => {
		if (!status) return "outline";
		switch (status) {
			case "accepted_offer":
				return "default";
			case "issued_contract":
				return "secondary";
			case "training":
				return "outline";
			case "declined_offer":
				return "destructive";
			case "initial":
				return "outline";
			default:
				return "outline";
		}
	};

	const formatStatus = (status: IOnBoarding["status"]) => {
		if (!status) return "Unknown Status";

		return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return "N/A";
		}
	};

	const getInitials = (name: string) => {
		if (!name || name === "N/A") return "NA";

		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	if (isLoading) {
		return (
			<div className="w-full h-full p-6 space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-96" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-6">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-48" />
							</CardHeader>
							<CardContent className="space-y-4">
								{[...Array(4)].map((_, i) => (
									<div key={i} className="space-y-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-48" />
									</div>
								))}
							</CardContent>
						</Card>
					</div>

					<div className="space-y-6">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent className="space-y-4">
								{[...Array(3)].map((_, i) => (
									<div key={i} className="space-y-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-32" />
									</div>
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	if (!onboarding) {
		return (
			<div className="w-full h-full p-6 flex items-center justify-center">
				<div className="text-center space-y-4">
					<AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
					<h3 className="text-lg font-semibold">Onboarding Record Not Found</h3>
					<p className="text-muted-foreground">
						The onboarding record you're looking for could not be found.
					</p>
					<Button onClick={() => router.push("/on-boarding")}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Onboarding
					</Button>
				</div>
			</div>
		);
	}

	const applicationData = getApplicationData(onboarding);

	return (
		<div className="w-full h-full p-6 space-y-6 rounded-lg bg-white shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between ">
				<div>
					<div className="flex items-center gap-4 mb-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => router.back()}
							className="rounded-full aspect-square"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div className=" flex items-center justify-center gap-8">
							<h1 className="text-2xl font-bold">{applicationData.applicantName}</h1>
							<p className="text-muted-foreground">{applicationData.jobDesc}</p>
						</div>
						{/* {onboarding.status && getStatusIcon(onboarding.status)} */}
						<Badge variant={getStatusBadgeVariant(onboarding.status)} className="text-sm">
							{formatStatus(onboarding.status)}
						</Badge>
					</div>
					<div className="flex items-center gap-2" />
				</div>
			</div>

			<div
				className={` gap-6 ${onboarding?.approval_status !== "active" && onboarding?.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
			>
				{onboarding?.approvals && onboarding.approvals.length > 0 && (
					<div className="order-1 lg:order-2">
						<ApprovalWorkflow
							approvals={onboarding.approvals}
							instance_approval_status={onboarding.approval_status}
							onRefresh={fetchOnboarding}
						/>
					</div>
				)}

				<div
					className={`${onboarding?.approval_status !== "active" && onboarding?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
				>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Main Content */}
						<div className="lg:col-span-2 space-y-6">
							{/* Candidate Information */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<User className="h-5 w-5" />
										Candidate Information
									</CardTitle>
								</CardHeader>
								<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<div>
											<Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
											<div className="flex items-center gap-2 mt-1">
												<User className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm font-medium">{applicationData.applicantName}</p>
											</div>
										</div>

										<div>
											<Label className="text-sm font-medium text-muted-foreground">
												Email Address
											</Label>
											<div className="flex items-center gap-2 mt-1">
												<Mail className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm">{applicationData.applicantEmail}</p>
											</div>
										</div>
									</div>

									<div className="space-y-4">
										<div>
											<Label className="text-sm font-medium text-muted-foreground">
												Phone Number
											</Label>
											<div className="flex items-center gap-2 mt-1">
												<Phone className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm">{applicationData.applicantPhone}</p>
											</div>
										</div>

										<div>
											<Label className="text-sm font-medium text-muted-foreground">Address</Label>
											<div className="flex items-center gap-2 mt-1">
												<MapPin className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm">{applicationData.applicantAddress}</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Position Information */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Briefcase className="h-5 w-5" />
										Position Details
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Job Position/ Title{" "}
										</Label>
										<div className="flex items-center gap-2 mt-1">
											<Briefcase className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-medium">{applicationData.jobDesc}</p>
										</div>
									</div>

									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Number of Positions
										</Label>
										<div className="flex items-center gap-2 mt-1">
											<FileText className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm">{applicationData.applicantPositions}</p>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Remarks */}
							{onboarding.remarks && (
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<FileText className="h-5 w-5" />
											Remarks & Notes
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="bg-muted/50 rounded-lg p-4">
											<p className="text-sm whitespace-pre-wrap">{onboarding.remarks}</p>
										</div>
									</CardContent>
								</Card>
							)}
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Status & Progress */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Clock className="h-5 w-5" />
										Status & Progress
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Current Status
										</Label>
										<div className="flex items-center gap-2 mt-2">
											{onboarding.status && getStatusIcon(onboarding.status)}
											<Badge variant={getStatusBadgeVariant(onboarding.status)}>
												{formatStatus(onboarding.status)}
											</Badge>
										</div>
									</div>

									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Training Attendance
										</Label>
										<div className="flex items-center gap-2 mt-2">
											{onboarding.attended ? (
												<CheckCircle className="h-4 w-4 text-green-500" />
											) : (
												<XCircle className="h-4 w-4 text-red-500" />
											)}
											<span className="text-sm font-medium">
												{onboarding.attended ? "Attended" : "Not Attended"}
											</span>
										</div>
									</div>

									{onboarding.status === "training" && (
										<div className="pt-4">
											<Button
												variant="outline"
												onClick={() => setShowDocumentDialog(true)}
												className="w-full"
											>
												<FileText className="h-4 w-4 mr-2" />
												Generate Document
											</Button>
										</div>
									)}
								</CardContent>
							</Card>

							<DocumentGenerationDialog
								open={showDocumentDialog}
								onOpenChange={setShowDocumentDialog}
								contextId={onboardingId}
								context="onboarding"
							/>

							{/* Timeline */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-5 w-5" />
										Timeline
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<Label className="text-sm font-medium text-muted-foreground">Created</Label>
										<div className="flex items-center gap-2 mt-1">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm">{formatDate(onboarding.created_at)}</p>
										</div>
									</div>

									<div>
										<Label className="text-sm font-medium text-muted-foreground">
											Last Updated
										</Label>
										<div className="flex items-center gap-2 mt-1">
											<Clock className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm">{formatDate(onboarding.updated_at)}</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
