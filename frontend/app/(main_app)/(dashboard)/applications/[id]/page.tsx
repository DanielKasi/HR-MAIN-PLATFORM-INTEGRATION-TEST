"use client";

import type { IInterviewStageFormData } from "@/types/types.utils";
import type {
	JobApplication,
	IInterviewStage,
	IInterviewFormData,
	JobApplicationDocument,
} from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
	ArrowLeft,
	Calendar,
	User,
	Mail,
	Phone,
	MapPin,
	Edit,
	FileText,
	Download,
	XCircle,
	Building,
	RefreshCw,
	Globe,
	UserCheck,
	Eye,
	Users,
	AlertCircle,
} from "lucide-react";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createInterviewStage, showErrorToast } from "@/lib/utils";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import {
	getJobApplicationById,
	updateJobApplicationStatus,
	getInterviewStages,
	createInterview,
} from "@/lib/utils";
import { downloadFile, getFileUrl } from "@/lib/helpers";
import { selectUser } from "@/store/auth/selectors";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { CreateInterviewStageDialog } from "@/components/dialogs/create-interview-stage-dialog";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const statusColors = {
	new: "bg-blue-100 text-blue-800",
	reviewed: "bg-yellow-100 text-yellow-800",
	shortlisted: "bg-green-100 text-green-800",
	rejected: "bg-red-100 text-red-800",
	passed: "bg-purple-100 text-purple-800",
};

const sourceLabels = {
	website: "Website",
	referral: "Referral",
	job_board: "Job Board",
	social_media: "Social Media",
	head_hunt: "Head Hunt",
	other: "Other",
};

export default function ApplicationViewPage() {
	const [showShortlistConfirm, setShowShortlistConfirm] = useState(false);
	const [application, setApplication] = useState<JobApplication | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [previewDocument, setPreviewDocument] = useState<{
		isOpen: boolean;
		document: JobApplicationDocument | null;
	}>({
		isOpen: false,
		document: null,
	});
	const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = useState(false);
	const [previewContent, setPreviewContent] = useState<string | null>(null);

	const router = useRouter();
	const params = useParams();
	const applicationId = Number.parseInt(params?.id as string);
	const currentUser = useSelector(selectUser);

	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);
	const [showScheduleDialog, setShowScheduleDialog] = useState(false);
	const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([]);
	const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);
	const [showCreateStageDialog, setShowCreateStageDialog] = useState(false);
	const [isCreatingStage, setIsCreatingStage] = useState(false);
	const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
		name: "",
		level: 1,
		interviewers: [],
		job_position_advert: 0,
	});

	const updateStageFormData = (field: string, value: any) => {
		setStageFormData((prev) => ({ ...prev, [field]: value }));
		if (stageErrors[field]) {
			setStageErrors((prev: any) => ({ ...prev, [field]: undefined }));
		}
	};
	const [stageErrors, setStageErrors] = useState<any>({});
	const [interviewFormData, setInterviewFormData] = useState<IInterviewFormData>({
		interview_stage: 0,
		interview_date: "",
		location: "",
		interview_type: "in_person",
		interview_time: "",
		job_position_application: 0,
		status: "scheduled",
		feedback: {},
		rating: undefined,
	});
	const [interviewErrors, setInterviewErrors] = useState<any>({});

	// Handler for shortlisting
	const handleShortlist = async () => {
		if (!application) return;
		try {
			const updateData: {
				applicationId: number;
				status: string;
				shortlisted_by?: number;
			} = {
				applicationId: application.id,
				status: "shortlisted",
			};

			// Add the current user as the one who shortlisted
			if (currentUser?.id) {
				updateData.shortlisted_by = currentUser.id;
			}

			await updateJobApplicationStatus(updateData);
			setApplication({ ...application, status: "shortlisted" });
			toast.success("Application shortlisted successfully");

			// Refresh the application data to get updated user details
			await fetchApplication();
		} catch (error) {
			toast.error("Failed to shortlist application");
		}
	};

	const handleIndividualAction = async (applicationId: number, action: "reviewed" | "rejected") => {
		try {
			// Prepare the update data with user tracking - just like created_by works
			const updateData: {
				applicationId: number;
				status: string;
				reviewed_by?: number;
				rejected_by?: number;
			} = {
				applicationId,
				status: action,
			};

			// Add the appropriate user field based on the action - automatically populate like created_by
			if (action === "reviewed" && currentUser?.id) {
				updateData.reviewed_by = currentUser.id;
			} else if (action === "rejected" && currentUser?.id) {
				updateData.rejected_by = currentUser.id;
			}

			await updateJobApplicationStatus(updateData);
			setApplication((prev) => (prev ? { ...prev, status: action } : null));
			toast.success(`Application ${action} successfully`);

			await fetchApplication();

			// Refresh the application
		} catch (error) {
			toast.error(`Failed to ${action} application`);
		}
	};

	const fetchInterviewData = async (app?: JobApplication) => {
		const applicationToUse = app || application;

		if (!selectedInstitution || !applicationToUse) return;

		try {
			const stagesResponse = await getInterviewStages({ institutionId: selectedInstitution.id });

			let stagesArray: IInterviewStage[] = [];

			if (stagesResponse && "results" in stagesResponse && Array.isArray(stagesResponse.results)) {
				stagesArray = stagesResponse.results;
			} else if (Array.isArray(stagesResponse)) {
				stagesArray = stagesResponse;
			}

			// Filter stages for this job position
			const filteredStages = stagesArray.filter(
				(stage) => stage.job_position_advert === applicationToUse.job_position_advert,
			);

			setInterviewStages(filteredStages);

			// Set default interview date to tomorrow at 10 AM
			const tomorrow = new Date();

			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(10, 0, 0, 0);
			setInterviewFormData((prev) => ({
				...prev,
				interview_date: tomorrow.toISOString().slice(0, 16),
			}));
		} catch (error) {
			console.error("Error fetching interview data:", error);
			toast.error("Failed to load interview data");
		}
	};

	const handleScheduleInterview = async () => {
		if (!application || !selectedInstitution) return;

		// Validate form
		const errors: any = {};

		if (!interviewFormData.interview_stage || interviewFormData.interview_stage === 0) {
			errors.interview_stage = "Please select an interview stage";
		}
		if (!interviewFormData.interview_date) {
			errors.interview_date = "Interview date and time is required";
		} else {
			const interviewDate = new Date(interviewFormData.interview_date);
			const now = new Date();

			if (interviewDate <= now) {
				errors.interview_date = "Interview date must be in the future";
			}
		}
		if (!interviewFormData.location || interviewFormData.location.trim() === "") {
			errors.location = "Interview location is required";
		}

		if (Object.keys(errors).length > 0) {
			setInterviewErrors(errors);

			return;
		}

		if (!currentUser?.id) {
			toast.error("User information not available. Please refresh and try again.");

			return;
		}

		setIsSchedulingInterview(true);

		try {
			let interviewTime = "";

			if (interviewFormData.interview_date) {
				const dateTime = new Date(interviewFormData.interview_date);
				const hours = dateTime.getHours().toString().padStart(2, "0");
				const minutes = dateTime.getMinutes().toString().padStart(2, "0");

				interviewTime = `${hours}:${minutes}`;
			}

			const createData: IInterviewFormData = {
				job_position_application: application.id,
				interview_stage: interviewFormData.interview_stage,
				interview_date: interviewFormData.interview_date,
				location: interviewFormData.location,
				interview_time: interviewTime,
				interview_type: interviewFormData.interview_type,
				status: interviewFormData.status || "scheduled",
				feedback: interviewFormData.feedback || undefined,
				rating: interviewFormData.rating || undefined,
				// Add the current user as the one who created/scheduled the interview
				created_by: currentUser.id,
			};

			const result = await createInterview({
				institutionId: selectedInstitution.id,
				interviewData: createData,
			});

			if (result) {
				toast.success("Interview scheduled successfully!");
				setShowScheduleDialog(false);
				// Reset form
				setInterviewFormData({
					interview_stage: 0,
					interview_date: "",
					location: "",
					interview_type: "in_person",
					interview_time: "",
					job_position_application: 0,
					status: "scheduled",
					feedback: {},
					rating: undefined,
				});
				setInterviewErrors({});
			} else {
				toast.error("Failed to schedule interview");
			}
		} catch (error) {
			console.error("Error scheduling interview:", error);
			toast.error("Failed to schedule interview");
		} finally {
			setIsSchedulingInterview(false);
		}
	};

	const updateInterviewFormData = (field: string, value: any) => {
		setInterviewFormData((prev) => ({ ...prev, [field]: value }));
		setInterviewErrors((prev: any) => ({ ...prev, [field]: undefined }));
	};

	// Enhanced file type detection for preview
	const getFilePreviewType = (fileName: string): string => {
		const extension = fileName.split(".").pop()?.toLowerCase() || "";

		// Images
		const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico"];
		if (imageExtensions.includes(extension)) return "image";

		// PDFs
		if (extension === "pdf") return "pdf";

		// Text files
		const textExtensions = ["txt", "csv", "json", "xml", "md", "log"];
		if (textExtensions.includes(extension)) return "text";

		// Office documents
		const officeExtensions = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
		if (officeExtensions.includes(extension)) return "office";

		// Code files
		const codeExtensions = [
			"js",
			"jsx",
			"ts",
			"tsx",
			"html",
			"css",
			"py",
			"java",
			"cpp",
			"c",
			"php",
		];
		if (codeExtensions.includes(extension)) return "code";

		return "unknown";
	};

	// Document preview functions
	const handlePreviewDocument = async (document: JobApplicationDocument) => {
		if (!document.file) {
			toast.error("No document available for preview");
			return;
		}

		setPreviewDocument({
			isOpen: true,
			document,
		});
		setIsLoadingPreview(true);
		setPreviewBlobUrl(null);
		setPreviewContent(null);

		try {
			const fileName = getFileNameFromUrl(document.file);
			const fileType = getFilePreviewType(fileName);
			const fileUrl = getFileUrl(document.file);

			// Fetch the file as blob to bypass download headers
			const response = await fetch(fileUrl);
			if (!response.ok) throw new Error("Failed to fetch document");

			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			setPreviewBlobUrl(blobUrl);

			// For text-based files, we can also read the content
			if (fileType === "text" || fileType === "code") {
				const text = await blob.text();
				setPreviewContent(text);
			}
		} catch (error) {
			console.error("Error loading document for preview:", error);
			toast.error("Failed to load document for preview");
		} finally {
			setIsLoadingPreview(false);
		}
	};

	// Clean up blob URLs
	useEffect(() => {
		return () => {
			if (previewBlobUrl) {
				URL.revokeObjectURL(previewBlobUrl);
			}
		};
	}, [previewBlobUrl]);

	const getFileIcon = (fileName: string) => {
		const extension = fileName.split(".").pop()?.toLowerCase();
		switch (extension) {
			case "pdf":
				return <FileText className="h-8 w-8 text-red-500" />;
			case "doc":
			case "docx":
				return <FileText className="h-8 w-8 text-blue-500" />;
			case "xls":
			case "xlsx":
				return <FileText className="h-8 w-8 text-green-500" />;
			case "ppt":
			case "pptx":
				return <FileText className="h-8 w-8 text-orange-500" />;
			case "jpg":
			case "jpeg":
			case "png":
			case "gif":
				return <FileText className="h-8 w-8 text-green-500" />;
			default:
				return <FileText className="h-8 w-8 text-gray-500" />;
		}
	};

	const getFileNameFromUrl = (url: string) => {
		return url.split("/").pop() || "document";
	};

	// Enhanced document preview - ALL IN-HOUSE
	const renderDocumentPreview = (document: JobApplicationDocument) => {
		if (!document.file) {
			return (
				<div className="text-center text-muted-foreground py-8">
					<FileText className="h-16 w-16 mx-auto mb-4" />
					<p>No document available for preview</p>
				</div>
			);
		}

		const fileName = getFileNameFromUrl(document.file);
		const fileType = getFilePreviewType(fileName);

		if (isLoadingPreview) {
			return (
				<div className="flex flex-col items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
					<span className="text-muted-foreground">Loading preview...</span>
				</div>
			);
		}

		// If we don't have a blob URL, something went wrong
		if (!previewBlobUrl) {
			return (
				<div className="text-center py-8">
					<AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
					<p className="text-destructive mb-2">Failed to load document for preview</p>
					<Button
						onClick={() => {
							downloadFile(document.file, document.required_document.document_name);
						}}
					>
						<Download className="h-4 w-4 mr-2" />
						Download File
					</Button>
				</div>
			);
		}

		switch (fileType) {
			case "pdf":
				return (
					<iframe
						src={previewBlobUrl}
						className="w-full h-[400px] border-0 rounded"
						title={`Preview of ${document.required_document.document_name}`}
					/>
				);

			case "image":
				return (
					<div className="flex justify-center items-center h-[400px]">
						<img
							src={previewBlobUrl}
							alt={document.required_document.document_name}
							className="max-w-full max-h-full object-contain"
						/>
					</div>
				);

			case "text":
			case "code":
				return (
					<div className="w-full h-[400px] border rounded bg-white overflow-auto">
						<pre className="p-4 text-sm whitespace-pre-wrap font-mono">
							{previewContent || "Loading content..."}
						</pre>
					</div>
				);

			case "office":
				return (
					<div className="text-center py-8">
						<FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground mb-2">
							Office documents cannot be previewed directly in the browser.
						</p>
						<p className="text-sm text-muted-foreground mb-4">
							Please download the file to view it using appropriate software.
						</p>
						<Button
							onClick={() => {
								downloadFile(document.file, document.required_document.document_name);
							}}
						>
							<Download className="h-4 w-4 mr-2" />
							Download Document
						</Button>
					</div>
				);

			case "unknown":
			default:
				return (
					<div className="text-center py-8">
						<FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground mb-2">
							This file type cannot be previewed directly in the browser.
						</p>
						<p className="text-sm text-muted-foreground mb-4">
							Please download the file to view it using appropriate software.
						</p>
						<Button
							onClick={() => {
								downloadFile(document.file, document.required_document.document_name);
							}}
						>
							<Download className="h-4 w-4 mr-2" />
							Download File
						</Button>
					</div>
				);
		}
	};

	useEffect(() => {
		if (selectedInstitution?.id) {
		}
	}, [selectedInstitution?.id]);

	useEffect(() => {
		if (!selectedInstitution || !selectedBranch) {
			router.push("/dashboard");

			return;
		}

		if (!applicationId) {
			router.push("/applications");

			return;
		}

		fetchApplication();
	}, [selectedBranch, selectedInstitution, router, applicationId]);

	const fetchApplication = async () => {
		try {
			setIsLoading(true);
			setError("");
			const fetchedApplication = await getJobApplicationById({ applicationId });

			await fetchInterviewData(fetchedApplication);
			setApplication(fetchedApplication);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to load application details" });
		} finally {
			setIsLoading(false);
		}
	};

	const handleEdit = () => {
		router.push(`/applications/${applicationId}/edit`);
	};

	const handleGoBack = () => {
		router.push("/applications");
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "passed":
				return "default";
			case "shortlisted":
				return "secondary";
			case "reviewed":
				return "outline";
			case "rejected":
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

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	if (!selectedInstitution || !selectedBranch) {
		return <div>Loading...</div>;
	}

	return (
		<>
			{isLoading ? (
				<>
					<div className="w-full h-full min-h-screen p-6 bg-white animate-pulse">
						<div className="flex items-center gap-4 mb-8">
							<Skeleton className="h-10 w-10 rounded bg-gray-200 " />
							<div className="space-y-2">
								<Skeleton className="h-8 w-64 bg-gray-200 " />
								<Skeleton className="h-4 w-96 bg-gray-200 " />
							</div>
						</div>
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<div className="lg:col-span-2 space-y-6">
								<Skeleton className="h-64 w-full bg-gray-200 " />
								<Skeleton className="h-64 w-full bg-gray-200 " />
								<Skeleton className="h-48 w-full bg-gray-200 mt-8" />
							</div>
							<div className="space-y-6">
								<Skeleton className="h-32 w-full bg-gray-200 " />
								<Skeleton className="h-32 w-full bg-gray-200 " />
							</div>
						</div>
					</div>
				</>
			) : (
				application && (
					<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div className="flex flex-col items-start xl:flex-row xl:items-center gap-4">
								<div className="flex items-center justify-start gap-8">
									<Button
										variant="ghost"
										className="rounded-full aspect-square"
										size="sm"
										onClick={handleGoBack}
									>
										<ArrowLeft className="h-4 w-4" />
									</Button>
									<h1 className="text-xl md:text-2xl: font-bold">
										Application from {application.applicant_name}
									</h1>
									<Badge className="mt-1 bg-green-500 text-white hover:!bg-green-500">
										{application.status.charAt(0).toUpperCase() + application.status.slice(1)}
									</Badge>
								</div>
								<p className="text-muted-foreground">
									{application.job_position_advert_job_details?.name ||
										`Job Opening #${application.job_position_advert}`}{" "}
									• Applied {formatDate(application.application_date)}
								</p>
							</div>
						</div>

						<ApprovableInstancePageLayout
							instance={application}
							onInstanceRefresh={fetchApplication}
						>
							<div className="mb-12">
								{/* Main Content */}
								<div className="lg:col-span-2">
									<Tabs defaultValue="overview">
										<TabsList className="w-full md:w-fit gap-2 md:gap-4">
											<TabsTrigger value="overview">Overview</TabsTrigger>
											<TabsTrigger value="job-details">Job Details</TabsTrigger>
											<TabsTrigger value="documents">Documents</TabsTrigger>
										</TabsList>

										<TabsContent value="overview" className="space-y-6">
											{/* Applicant Details */}
											<Card>
												<CardHeader>
													<CardTitle className="flex items-center gap-2">
														<User className="h-5 w-5" />
														Applicant Information
													</CardTitle>
												</CardHeader>
												<CardContent className="space-y-4">
													<div className="flex flex-col md:flex-row items-start gap-4">
														<Avatar className="h-16 w-16">
															<AvatarFallback className="text-lg">
																{getInitials(application.applicant_name)}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1">
															<h3 className="text-xl font-semibold">
																{application.applicant_name}
															</h3>
															<p className="text-muted-foreground capitalize">
																{application.gender}
															</p>
															<div className="mt-3 space-y-2">
																<div className="flex items-center gap-2 text-sm">
																	<Mail className="h-4 w-4 text-muted-foreground" />
																	<a
																		href={`mailto:${application.applicant_email}`}
																		className="hover:underline"
																	>
																		{application.applicant_email}
																	</a>
																</div>
																{application.applicant_phone && (
																	<div className="flex items-center gap-2 text-sm">
																		<Phone className="h-4 w-4 text-muted-foreground" />
																		<a
																			href={`tel:${application.applicant_phone}`}
																			className="hover:underline"
																		>
																			{application.applicant_phone}
																		</a>
																	</div>
																)}
															</div>
														</div>
													</div>
												</CardContent>
											</Card>

											{/* Location Information */}
											<Card>
												<CardHeader>
													<CardTitle className="flex items-center gap-2">
														<MapPin className="h-5 w-5" />
														Location Information
													</CardTitle>
												</CardHeader>
												<CardContent className="space-y-4">
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="text-sm font-medium text-muted-foreground">
																Address
															</label>
															<p className="text-sm mt-1">{application.address}</p>
														</div>
														{application.state && (
															<div>
																<label className="text-sm font-medium text-muted-foreground">
																	State
																</label>
																<p className="text-sm mt-1">{application.state}</p>
															</div>
														)}
														<div>
															<label className="text-sm font-medium text-muted-foreground">
																Country
															</label>
															<div className="flex items-center gap-2 mt-1">
																<Globe className="h-4 w-4 text-muted-foreground" />
																<p className="text-sm">{application.country}</p>
															</div>
														</div>
														<div>
															<label className="text-sm font-medium text-muted-foreground">
																Application Date
															</label>
															<div className="flex items-center gap-2 mt-1">
																<Calendar className="h-4 w-4 text-muted-foreground" />
																<p className="text-sm">
																	{formatDate(application.application_date)}
																</p>
															</div>
														</div>
													</div>
												</CardContent>
											</Card>
											{/* Interviewers - MOVED TO CORRECT LOCATION */}
											<Card>
												<CardHeader>
													<CardTitle className="text-lg flex items-center gap-2">
														<Users className="h-5 w-5" />
														Interviewers
													</CardTitle>
												</CardHeader>
												<CardContent>
													{interviewStages.length > 0 ? (
														<div className="space-y-4">
															{interviewStages
																.sort((a, b) => a.level - b.level)
																.filter(
																	(stage) =>
																		stage.interviewers_details &&
																		stage.interviewers_details.length > 0,
																)
																.map((stage) => (
																	<div key={stage.id} className="border rounded-lg overflow-hidden">
																		{/* Stage Header */}
																		<div className="bg-muted/50 px-4 py-3 border-b">
																			<div className="flex items-center justify-between">
																				<div className="flex items-center gap-3">
																					<Badge variant="outline" className="text-xs font-medium">
																						Level {stage.level}
																					</Badge>
																					<h3 className="font-semibold text-sm">{stage.name}</h3>
																				</div>
																				<span className="text-xs text-muted-foreground">
																					{stage.interviewers_details?.length} interviewer
																					{stage.interviewers_details?.length !== 1 ? "s" : ""}
																				</span>
																			</div>
																		</div>

																		{/* Interviewers List */}
																		<div className="p-4">
																			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
																				{stage.interviewers_details?.map((interviewer) => (
																					<div
																						key={interviewer.id}
																						className="flex items-center gap-2 p-2 rounded-md bg-background border"
																					>
																						<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
																							<User className="h-4 w-4 text-primary" />
																						</div>
																						<div className="min-w-0 flex-1">
																							<p className="text-sm font-medium truncate">
																								{interviewer.user?.fullname || "Unnamed User"}
																							</p>
																							{interviewer.user?.email && (
																								<p className="text-xs text-muted-foreground truncate">
																									{interviewer.user.email}
																								</p>
																							)}
																							{!interviewer.user?.fullname &&
																								!interviewer.user?.email && (
																									<p className="text-xs text-muted-foreground">
																										Employee #{interviewer.id}
																									</p>
																								)}
																						</div>
																					</div>
																				))}
																			</div>
																		</div>
																	</div>
																))}
														</div>
													) : (
														<div className="text-center py-8">
															<div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
																<Users className="h-6 w-6 text-muted-foreground" />
															</div>
															<h3 className="text-sm font-medium text-foreground mb-1">
																No interviewers assigned
															</h3>
															<p className="text-xs text-muted-foreground">
																Interview stages will appear here once interviewers are assigned
															</p>
														</div>
													)}
												</CardContent>
											</Card>
										</TabsContent>

										<TabsContent value="job-details" className="space-y-6">
											{/* Job Position/ Title  Details */}
											<Card>
												<CardHeader>
													<CardTitle className="flex items-center gap-2">
														<Building className="h-5 w-5" />
														Job Position/ Title Details
													</CardTitle>
												</CardHeader>
												<CardContent className="space-y-4">
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="text-sm font-medium text-muted-foreground">
																Position Name
															</label>
															<p className="text-sm mt-1 font-medium">
																{application.job_position_advert_job_details?.name || "Unknown"}
															</p>
														</div>
														<div>
															<label className="text-sm font-medium text-muted-foreground">
																Available Positions
															</label>
															<p className="text-sm mt-1">{application.positions || "Unknown"}</p>
														</div>
													</div>

													{application.job_position_advert_job_details?.description && (
														<div>
															<label className="text-sm font-medium text-muted-foreground">
																Job Description
															</label>
															<div className="mt-2 p-4 bg-muted/50 rounded-lg">
																<p className="text-sm leading-relaxed">
																	{application.job_position_advert_job_details.description}
																</p>
															</div>
														</div>
													)}
												</CardContent>
											</Card>
										</TabsContent>

										<TabsContent value="documents" className="space-y-6">
											{/* Required Application Documents */}
											<Card>
												<CardHeader>
													<CardTitle className="flex items-center gap-2">
														<FileText className="h-5 w-5" />
														Required Application Documents
													</CardTitle>
												</CardHeader>
												<CardContent className="space-y-4">
													{application.documents && application.documents.length > 0 ? (
														<div className="space-y-4">
															{application.documents
																.filter((doc) => doc.is_active && !doc.deleted_at)
																.map((document) => (
																	<div
																		key={document.id}
																		className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
																	>
																		<div className="flex items-center gap-3 flex-1">
																			{getFileIcon(document.file)}
																			<div className="flex-1 min-w-0">
																				<div className="flex items-center gap-2">
																					<p className="font-medium truncate">
																						{document.required_document.document_name}
																					</p>
																					{document.required_document.is_optional && (
																						<Badge variant="outline" className="text-xs">
																							Optional
																						</Badge>
																					)}
																				</div>
																				{document.required_document.description && (
																					<p className="text-sm text-muted-foreground truncate">
																						{document.required_document.description}
																					</p>
																				)}
																				<div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
																					<span>
																						Uploaded:{" "}
																						{new Date(document.uploaded_at).toLocaleDateString()}
																					</span>
																					{document.file && (
																						<span className="truncate">
																							File: {getFileNameFromUrl(document.file)}
																						</span>
																					)}
																				</div>
																			</div>
																		</div>
																		<div className="flex items-center gap-2">
																			{document.file && (
																				<>
																					<Button
																						variant="outline"
																						size="sm"
																						onClick={() => handlePreviewDocument(document)}
																						title="Preview document"
																					>
																						<Eye className="h-4 w-4" />
																					</Button>
																					<Button
																						variant="outline"
																						size="sm"
																						onClick={() =>
																							downloadFile(
																								document.file,
																								document.required_document.document_name,
																							)
																						}
																						title="Download document"
																					>
																						<Download className="h-4 w-4" />
																					</Button>
																				</>
																			)}
																			{!document.file && (
																				<Badge variant="secondary" className="text-xs">
																					Not Uploaded
																				</Badge>
																			)}
																		</div>
																	</div>
																))}
														</div>
													) : (
														<div className="text-center py-8">
															<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
															<p className="text-muted-foreground">
																No documents available for this application
															</p>
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
											<Button
												className="w-full justify-start"
												variant="outline"
												onClick={handleEdit}
											>
												<Edit className="h-4 w-4 mr-2" />
												Edit Application
											</Button>
											<Button
												variant="outline"
												className="w-full min-w-32 justify-start"
												size="sm"
												onClick={fetchApplication}
											>
												<RefreshCw className="h-4 w-4 mr-2" />
												Refresh
											</Button>

											{/* Review Button - only show for new applications */}
											{application?.status === "new" && (
												<Button
													className="w-full justify-start text-yellow-600 border-yellow-200 hover:bg-yellow-50"
													variant="outline"
													onClick={() => handleIndividualAction(application.id, "reviewed")}
												>
													<Eye className="h-4 w-4 mr-2" />
													Mark as Reviewed
												</Button>
											)}

											{/* Shortlist Button - only show for reviewed applications */}
											{application?.status === "reviewed" && (
												<Button
													className="w-full justify-start text-green-600 border-green-200 hover:bg-green-50"
													variant="outline"
													onClick={() => setShowShortlistConfirm(true)}
												>
													<UserCheck className="h-4 w-4 mr-2" />
													Shortlist
												</Button>
											)}

											{/* Schedule Interview Button - only show for shortlisted applications */}
											{application?.status === "shortlisted" && (
												<Button
													className="w-full justify-start text-blue-600 border-blue-200 hover:bg-blue-50"
													variant="outline"
													onClick={() => {
														fetchInterviewData();
														setShowScheduleDialog(true);
													}}
												>
													<Calendar className="h-4 w-4 mr-2" />
													Schedule Interview
												</Button>
											)}

											{/* Schedule Call - show for reviewed and shortlisted */}
											{(application?.status === "reviewed" ||
												application?.status === "shortlisted") && (
												<Button className="w-full justify-start" variant="outline">
													<Phone className="h-4 w-4 mr-2" />
													Schedule Call
												</Button>
											)}

											<Separator />

											{/* Reject Button - show for new and reviewed (not shortlisted) */}
											{(application?.status === "new" || application?.status === "reviewed") && (
												<Button
													className="text-destructive justify-start w-full min-w-32  mr-2"
													variant="outline"
													onClick={() => handleIndividualAction(application.id, "rejected")}
												>
													<XCircle className="h-4 w-4 mr-2" />
													Reject Application
												</Button>
											)}
										</CardContent>
									</Card>
									{/* Application Summary */}
									<Card>
										<CardHeader>
											<CardTitle className="text-lg">Summary</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">Status</span>
												<div className="flex items-center gap-2">
													<Badge variant={getStatusBadgeVariant(application.status)}>
														{application.status.charAt(0).toUpperCase() +
															application.status.slice(1)}
													</Badge>
													{/* Show next step indicator */}
													{application.status === "new" && (
														<span className="text-xs text-muted-foreground">→ Needs Review</span>
													)}
													{application.status === "reviewed" && (
														<span className="text-xs text-muted-foreground">→ Can Shortlist</span>
													)}
													{application.status === "shortlisted" && (
														<span className="text-xs text-muted-foreground">
															→ Ready for Interview
														</span>
													)}
												</div>
											</div>

											{/* Show who performed each action */}
											{application.reviewed_by && (
												<div className="flex items-center justify-between">
													<span className="text-sm text-muted-foreground">Reviewed by</span>
													<span className="text-sm font-medium">
														{application.reviewed_by.fullname || application.reviewed_by.email}
														{application.reviewed_by.id === currentUser?.id}
													</span>
												</div>
											)}

											{application.shortlisted_by && (
												<div className="flex items-center justify-between">
													<span className="text-sm text-muted-foreground">Shortlisted by</span>
													<span className="text-sm font-medium">
														{application.shortlisted_by.fullname ||
															application.shortlisted_by.email}
														{application.shortlisted_by.id === currentUser?.id}
													</span>
												</div>
											)}

											{application.scheduled_by && (
												<div className="flex items-center justify-between">
													<span className="text-sm text-muted-foreground">Scheduled by</span>
													<span className="text-sm font-medium">
														{application.scheduled_by.fullname || application.scheduled_by.email}
														{application.scheduled_by.id === currentUser?.id}
													</span>
												</div>
											)}

											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">Source</span>
												<Badge variant="outline">{sourceLabels[application.source]}</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">Documents</span>
												<span className="text-sm font-medium">
													{application.documents
														? application.documents.filter(
																(doc) => doc.is_active && !doc.deleted_at,
															).length
														: 0}
												</span>
											</div>

											{/* Application workflow progress */}
											<div className="pt-2 border-t">
												<span className="text-sm font-medium text-muted-foreground">
													Application Flow
												</span>
												<div className="mt-2 flex items-center space-x-2">
													<div
														className={`w-3 h-3 rounded-full ${application.status !== "new" ? "bg-green-500" : "bg-gray-300"}`}
													/>
													<span className="text-xs">New</span>
													<div className="w-4 h-px bg-gray-300" />
													<div
														className={`w-3 h-3 rounded-full ${["reviewed", "shortlisted"].includes(application.status) ? "bg-green-500" : "bg-gray-300"}`}
													/>
													<span className="text-xs">Reviewed</span>
													<div className="w-4 h-px bg-gray-300" />
													<div
														className={`w-3 h-3 rounded-full ${application.status === "shortlisted" ? "bg-green-500" : "bg-gray-300"}`}
													/>
													<span className="text-xs">Shortlisted</span>
												</div>
											</div>
										</CardContent>
									</Card>
								</div>
							</div>
						</ApprovableInstancePageLayout>

						{/* Document Preview Dialog */}
						<Dialog
							open={previewDocument.isOpen}
							onOpenChange={(open) => {
								if (!open) {
									setPreviewDocument({ isOpen: open, document: null });
									if (previewBlobUrl) {
										URL.revokeObjectURL(previewBlobUrl);
										setPreviewBlobUrl(null);
									}
									setPreviewContent(null);
								}
							}}
						>
							<DialogContent className="max-w-4xl max-h-[90vh]">
								<DialogHeader>
									<DialogTitle>
										{previewDocument.document?.required_document.document_name ||
											"Document Preview"}
									</DialogTitle>
									<DialogDescription>
										{previewDocument.document?.required_document.description}
									</DialogDescription>
								</DialogHeader>

								<div className="flex-1 min-h-0">
									{previewDocument.document && (
										<div className="space-y-4">
											{/* Document Info */}
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<span className="font-medium">Document Type:</span>{" "}
													{previewDocument.document.required_document.document_name}
												</div>
												<div>
													<span className="font-medium">Uploaded:</span>{" "}
													{new Date(previewDocument.document.uploaded_at).toLocaleString()}
												</div>
												<div>
													<span className="font-medium">Status:</span>{" "}
													{previewDocument.document.required_document.is_optional
														? "Optional"
														: "Required"}
												</div>
												<div>
													<span className="font-medium">File:</span>{" "}
													{getFileNameFromUrl(previewDocument.document.file)}
												</div>
											</div>

											{/* Document Preview */}
											<div className="border rounded-lg p-4 bg-muted/50">
												<div className="flex justify-center items-center min-h-[400px]">
													{renderDocumentPreview(previewDocument.document)}
												</div>
											</div>

											{/* Action Buttons */}
											<div className="flex justify-end gap-2 pt-4">
												<Button
													variant="outline"
													onClick={() => {
														setPreviewDocument({ isOpen: false, document: null });
														if (previewBlobUrl) {
															URL.revokeObjectURL(previewBlobUrl);
															setPreviewBlobUrl(null);
														}
														setPreviewContent(null);
													}}
												>
													Close
												</Button>
												{previewDocument.document.file && (
													<Button
														onClick={() => {
															downloadFile(
																previewDocument.document!.file,
																previewDocument.document!.required_document.document_name,
															);
														}}
													>
														<Download className="h-4 w-4 mr-2" />
														Download
													</Button>
												)}
											</div>
										</div>
									)}
								</div>
							</DialogContent>
						</Dialog>

						<Dialog open={showShortlistConfirm} onOpenChange={setShowShortlistConfirm}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Shortlist Application</DialogTitle>
									<DialogDescription>
										Are you sure you want to shortlist the application from{" "}
										<strong>{application?.applicant_name}</strong>?
									</DialogDescription>
								</DialogHeader>
								<div className="flex justify-end space-x-2 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowShortlistConfirm(false)}
									>
										Cancel
									</Button>
									<Button
										onClick={async () => {
											await handleShortlist();
											setShowShortlistConfirm(false);
										}}
									>
										<UserCheck className="h-4 w-4 mr-2" />
										Shortlist
									</Button>
								</div>
							</DialogContent>
						</Dialog>

						{application && (
							<CreateInterviewStageDialog
								isOpen={showCreateStageDialog}
								onOpenChange={setShowCreateStageDialog}
								jobPositionId={application.job_position_advert}
								jobPositionName={application.job_position_advert_job_details.name}
								existingStagesCount={interviewStages.length}
								onSuccess={async (newStage) => {
									await fetchInterviewData();
								}}
								showTrigger={false}
								title="Create Interview Stage"
								description={`Create a new interview stage for{" "}
                          ${application?.job_position_advert_job_details?.name || "this position"}.`}
							/>
						)}
						{/* Schedule Interview Dialog */}
						<Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
							<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle>Schedule Interview</DialogTitle>
									<DialogDescription>
										Schedule an interview for {application?.applicant_name}
									</DialogDescription>
								</DialogHeader>

								<div className="space-y-4">
									{/* Interview Stage */}
									<div className="space-y-2">
										<Label htmlFor="interview_stage" className="text-sm font-medium">
											Interview Stage *
										</Label>
										<div className="flex items-center gap-2">
											<Select
												value={interviewFormData.interview_stage.toString()}
												onValueChange={(value: any) =>
													updateInterviewFormData("interview_stage", Number(value))
												}
											>
												<SelectTrigger
													className={`flex-1 ${interviewErrors.interview_stage ? "border-destructive" : ""}`}
												>
													<SelectValue placeholder="Select interview stage" />
												</SelectTrigger>
												<SelectContent>
													{interviewStages.map((stage) => (
														<SelectItem key={stage.id} value={stage.id.toString()}>
															<div className="flex items-center gap-2">
																<Building className="h-4 w-4" />
																{stage.name} (Level {stage.level})
															</div>
														</SelectItem>
													))}
													{interviewStages.length === 0 && (
														<SelectItem value="no-stages" disabled>
															No interview stages available for this position
														</SelectItem>
													)}
												</SelectContent>
											</Select>

											{/* Plus icon button to create new stage */}
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => setShowCreateStageDialog(true)}
												className="flex-shrink-0"
												title="Create new interview stage"
											>
												<Plus className="h-4 w-4" />
											</Button>
										</div>

										{interviewErrors.interview_stage && (
											<p className="text-sm text-destructive">{interviewErrors.interview_stage}</p>
										)}

										{interviewStages.length === 0 && (
											<p className="text-xs text-muted-foreground">
												No interview stages available. Click the + button to create one.
											</p>
										)}
									</div>

									{/* Interview Date */}
									<div className="space-y-2">
										<Label htmlFor="interview_date" className="text-sm font-medium">
											Interview Date & Time *
										</Label>
										<Input
											id="interview_date"
											type="datetime-local"
											value={interviewFormData.interview_date}
											onChange={(e) => updateInterviewFormData("interview_date", e.target.value)}
											className={interviewErrors.interview_date ? "border-destructive" : ""}
											min={new Date().toISOString().slice(0, 16)}
										/>
										{interviewErrors.interview_date && (
											<p className="text-sm text-destructive">{interviewErrors.interview_date}</p>
										)}
									</div>

									{/* Interview Location */}
									<div className="space-y-2">
										<Label htmlFor="location" className="text-sm font-medium">
											Interview Location *
										</Label>
										<Input
											id="location"
											type="text"
											value={interviewFormData.location}
											onChange={(e) => updateInterviewFormData("location", e.target.value)}
											className={interviewErrors.location ? "border-destructive" : ""}
											placeholder="e.g., Conference Room A, or Zoom meeting"
										/>
										{interviewErrors.location && (
											<p className="text-sm text-destructive">{interviewErrors.location}</p>
										)}
									</div>

									{/* Interview Type */}
									<div className="space-y-2">
										<Label htmlFor="interview_type" className="text-sm font-medium">
											Interview Type
										</Label>
										<Select
											value={interviewFormData.interview_type}
											onValueChange={(value: any) =>
												updateInterviewFormData("interview_type", value)
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select interview type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="online">Online</SelectItem>
												<SelectItem value="in_person">In Person</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="flex justify-end space-x-2 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowScheduleDialog(false)}
										disabled={isSchedulingInterview}
									>
										Cancel
									</Button>
									<Button onClick={handleScheduleInterview} disabled={isSchedulingInterview}>
										{isSchedulingInterview ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
												Scheduling...
											</>
										) : (
											<>
												<Calendar className="h-4 w-4 mr-2" />
												Schedule Interview
											</>
										)}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				)
			)}
		</>
	);
}
