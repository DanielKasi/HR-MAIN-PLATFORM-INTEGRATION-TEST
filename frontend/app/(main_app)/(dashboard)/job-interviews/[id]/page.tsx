"use client";

import type { IInterview } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
	ArrowLeft,
	Calendar,
	User,
	Mail,
	Phone,
	Star,
	Edit,
	Trash2,
	FileText,
	Download,
	AlertCircle,
	Users,
	MessageSquare,
	Award,
	RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { getInterviewById } from "@/lib/utils";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { downloadFile } from "@/lib/helpers";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

export default function InterviewViewPage() {
	const [interview, setInterview] = useState<IInterview | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const router = useRouter();
	const params = useParams();
	const interviewId = Number.parseInt(params?.id as string);

	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);

	useEffect(() => {
		if (!selectedInstitution || !selectedBranch) {
			router.push("/dashboard");

			return;
		}

		if (!interviewId) {
			router.push("/job-interviews");

			return;
		}

		fetchInterview();
	}, [selectedBranch, selectedInstitution, router, interviewId]);

	const fetchInterview = async () => {
		try {
			setIsLoading(true);
			setError("");

			const fetchedInterview = await getInterviewById({ interviewId });

			if (fetchedInterview) {
				setInterview(fetchedInterview);
			}
		} catch (err) {
			setError("Failed to fetch interview details");
			toast.error("Failed to load interview details");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEdit = () => {
		router.push(`/job-interviews/${interviewId}/edit`);
	};

	const handleDelete = () => {
		// TODO: Implement delete functionality with confirmation
		toast.success("Interview deletion would be implemented here");
	};

	const handleGoBack = () => {
		router.push("/job-interviews");
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "completed":
				return "default";
			case "scheduled":
				return "secondary";
			case "cancelled":
				return "destructive";
			default:
				return "outline";
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getRatingStars = (rating: number) => {
		return Array.from({ length: 10 }, (_, i) => (
			<Star
				key={i}
				className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
			/>
		));
	};

	const getInitials = (fullName: string) => {
		return `${fullName.split(" ")[0]?.charAt(0) || ""}${fullName.split(" ")[1]?.charAt(0) || ""}`.toUpperCase();
	};

	if (!selectedInstitution || !selectedBranch) {
		return <div>Loading...</div>;
	}

	if (isLoading) {
		return (
			<div className="w-full h-full p-6 space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-10 rounded" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-96" />
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-6">
						<Skeleton className="h-64 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
					<div className="space-y-6">
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !interview) {
		return (
			<div className="w-full h-full p-6">
				<div className="flex items-center gap-4 mb-6">
					<Button variant="outline" size="sm" onClick={handleGoBack}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Interviews
					</Button>
				</div>
				<Card className="p-12 text-center">
					<AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">Interview Not Found</h3>
					<p className="text-muted-foreground mb-4">{error}</p>
					<Button onClick={handleGoBack}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Interviews
					</Button>
				</Card>
			</div>
		);
	}

	return (
		<div className="w-full h-full p-6 space-y-6 rounded-lg bg-white shadow-sm">
			{/* Header */}

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="flex flex-col items-start lg:flex-row lg:items-center gap-4">
					<Button variant="outline" size="sm" onClick={handleGoBack}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
					<div>
						<h1 className="text-2xl font-bold">
							Interview with {interview.job_position_application_details?.applicant_name}
						</h1>
						<p className="text-muted-foreground">
							{interview.interview_stage_details?.name} • {formatDate(interview.interview_date)}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant={getStatusBadgeVariant(interview.status)} className="mt-1">
							{interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
						</Badge>
						<div className="flex items-center gap-2">
							<div className="flex">{getRatingStars(interview.rating || 0)}</div>
							<span className="text-lg font-bold">{interview.rating}/10</span>
						</div>
					</div>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={interview} onInstanceRefresh={fetchInterview}>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Main Content */}
					<div className="lg:col-span-2">
						<Tabs defaultValue="overview">
							<TabsList>
								<TabsTrigger value="overview">Overview</TabsTrigger>
								<TabsTrigger value="applicant">Applicant Details</TabsTrigger>
								<TabsTrigger value="feedback">Feedback</TabsTrigger>
							</TabsList>

							<TabsContent value="overview" className="space-y-6">
								{/* Interview Details */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Calendar className="h-5 w-5" />
											Interview Details
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													Interview Stage
												</label>
												<p className="text-sm mt-1">{interview.interview_stage_details?.name}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													Stage Level
												</label>
												<p className="text-sm mt-1">
													Level {interview.interview_stage_details?.level}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													Date & Time
												</label>
												<p className="text-sm mt-1">{formatDate(interview.interview_date)}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													Application Status
												</label>
												<Badge variant="outline" className="mt-1">
													{interview.job_position_application_details?.status}
												</Badge>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Interviewer Information */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Users className="h-5 w-5" />
											Interviewer Information
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="flex items-start gap-4">
											<Avatar className="h-12 w-12">
												<AvatarImage
													src={
														interview.interview_stage_details?.interviewers_details?.[0]
															?.employee_profile_picture ?? undefined
													}
												/>

												<AvatarFallback>
													{getInitials(
														interview.interview_stage_details?.interviewers_details?.[0]?.user
															?.fullname || "",
													)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<h4 className="font-medium">
													{
														interview.interview_stage_details?.interviewers_details?.[0]?.user
															?.fullname
													}{" "}
												</h4>
												<p className="text-sm text-muted-foreground">
													{interview.interview_stage_details?.interviewers_details?.[0]?.email}
												</p>
												<p className="text-sm text-muted-foreground">
													{
														interview.interview_stage_details?.interviewers_details?.[0]
															?.phone_number
													}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="applicant" className="space-y-6">
								{/* Applicant Details */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<User className="h-5 w-5" />
											Applicant Information
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													Full Name
												</label>
												<p className="text-sm mt-1">
													{interview.job_position_application_details?.applicant_name}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">Gender</label>
												<p className="text-sm mt-1 capitalize">
													{interview.job_position_application_details?.gender}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">Email</label>
												<p className="text-sm mt-1">
													{interview.job_position_application_details?.applicant_email}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">Phone</label>
												<p className="text-sm mt-1">
													{interview.job_position_application_details?.applicant_phone}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													Location
												</label>
												<p className="text-sm mt-1">
													{interview.job_position_application_details?.address},{" "}
													{interview.job_position_application_details?.state}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">Country</label>
												<p className="text-sm mt-1">
													{interview.job_position_application_details?.country}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													Application Date
												</label>
												<p className="text-sm mt-1">
													{new Date(
														interview.job_position_application_details?.application_date ?? "",
													).toLocaleDateString()}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">Source</label>
												<Badge variant="outline" className="mt-1 capitalize">
													{interview.job_position_application_details?.source}
												</Badge>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Application Documents */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<FileText className="h-5 w-5" />
											Application Documents
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										{interview.job_position_application_details?.resume && (
											<div className="flex items-center justify-between p-3 border rounded-lg">
												<div className="flex items-center gap-3">
													<FileText className="h-5 w-5 text-muted-foreground" />
													<div>
														<p className="text-sm font-medium">Resume</p>
														<p className="text-xs text-muted-foreground">
															{interview.job_position_application_details.resume.split("/").pop()}
														</p>
													</div>
												</div>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														downloadFile(
															interview.job_position_application_details?.resume || "",
															"Resume",
														)
													}
												>
													<Download className="h-4 w-4 mr-2" />
													Download
												</Button>
											</div>
										)}
										{interview.job_position_application_details?.cover_letter && (
											<div className="flex items-center justify-between p-3 border rounded-lg">
												<div className="flex items-center gap-3">
													<FileText className="h-5 w-5 text-muted-foreground" />
													<div>
														<p className="text-sm font-medium">Cover Letter</p>
														<p className="text-xs text-muted-foreground">
															{interview.job_position_application_details.cover_letter
																.split("/")
																.pop()}
														</p>
													</div>
												</div>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														downloadFile(
															interview.job_position_application_details?.cover_letter || "",
															"Cover Letter",
														)
													}
												>
													<Download className="h-4 w-4 mr-2" />
													Download
												</Button>
											</div>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="feedback" className="space-y-6">
								{/* Interview Feedback */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<MessageSquare className="h-5 w-5" />
											Interview Feedback
										</CardTitle>
									</CardHeader>
									<CardContent>
										{interview.feedback ? (
											<div className="space-y-4">
												<div className="p-4 bg-muted/50 rounded-lg">
													{interview.feedback &&
														Object.entries(interview.feedback).map(([key, value], idx) =>
															key ? (
																<div key={idx} className="space-y-2">
																	<label>{key}</label>
																	<p className="text-sm leading-relaxed">
																		{interview.feedback && interview.feedback[key]}
																	</p>
																</div>
															) : (
																<></>
															),
														)}
												</div>
												{interview?.rating && (
													<div className="flex items-center gap-4 pt-4 border-t">
														<div className="flex items-center gap-2">
															<Award className="h-5 w-5 text-muted-foreground" />
															<span className="text-sm font-medium">Overall Rating:</span>
														</div>
														<div className="flex items-center gap-2">
															<div className="flex">{getRatingStars(interview.rating)}</div>
															<span className="text-sm font-bold">{interview.rating}/10</span>
														</div>
													</div>
												)}
											</div>
										) : (
											<div className="text-center py-8">
												<MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
												<p className="text-muted-foreground">No feedback available yet</p>
											</div>
										)}
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Quick Actions */}
						<Card className="mt-12">
							<CardHeader>
								<CardTitle className="text-lg">Quick Actions</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button className="w-full justify-start" variant="outline" onClick={handleEdit}>
									<Edit className="h-4 w-4 mr-2" />
									Edit Interview
								</Button>
								<Button
									variant="outline"
									className="w-full justify-start"
									size="sm"
									onClick={fetchInterview}
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Refresh
								</Button>
								<Button className="w-full justify-start" variant="outline">
									<Mail className="h-4 w-4 mr-2" />
									Send Email
								</Button>
								<Button className="w-full justify-start" variant="outline">
									<Phone className="h-4 w-4 mr-2" />
									Schedule Call
								</Button>
								<Separator />
								<Button
									className="w-full justify-start text-destructive"
									variant="outline"
									onClick={handleDelete}
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete Interview
								</Button>
							</CardContent>
						</Card>

						{/* Interview Summary */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Summary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Interview ID</span>
									<span className="text-sm font-medium">#{interview.id}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Application ID</span>
									<span className="text-sm font-medium">#{interview.job_position_application}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Stage Level</span>
									<span className="text-sm font-medium">
										Level {interview.interview_stage_details?.level}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Status</span>
									<Badge variant={getStatusBadgeVariant(interview.status)}>
										{interview.status}
									</Badge>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
}
