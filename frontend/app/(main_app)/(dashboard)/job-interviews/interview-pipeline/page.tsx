"use client";

import type { IInterviewStage, IInterviewStageFormData, IInterview } from "@/types/types.utils";

import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	Users,
	Mail,
	Phone,
	MessageSquare,
	Edit,
	Save,
	Search,
	MapPin,
	MoreVertical,
	CheckCircle,
	XCircle,
	Clock,
	Calendar,
	Plus,
	Eye,
	UserCheck,
	Code,
	Check,
	Briefcase,
	Star,
	History,
	Building2,
} from "lucide-react";
import { toast } from "sonner";
import { InterviewStagesPanel } from "@/components/common/interview-stages";
import { InterviewStageDetailsDialog } from "@/components/interview/interview-stage-details-dialog";
import { EditInterviewStageDialog } from "@/components/interview/edit-interview-stage-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	createInterviewStage,
	getInterviews,
	getInterviewStages,
	updateInterview,
	createInterview,
	bulkCreateOnBoarding,
	upddateInterviewStage,
} from "@/lib/utils";
import { selectUser, selectSelectedInstitution } from "@/store/auth/selectors";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { CreateInterviewStageDialog } from "@/components/dialogs/create-interview-stage-dialog";

interface InterviewHistoryEntry {
	stage_id: number;
	stage_name: string;
	stage_level: number;
	interviewer: string;
	interview_date?: string;
	interview_time?: string;
	location?: string;
	feedback?: string;
	rating?: number;
	status: string;
	created_at?: string;
	updated_at?: string;
}

interface InterviewCandidateWithHistory extends InterviewCandidate {
	interview_history: InterviewHistoryEntry[];
	current_stage_level: number;
	current_stage_name: string;
	overall_rating: number;
	completion_rate: number;
}
interface JobPosition {
	id: number;
	name: string;
	department: string;
	totalInterviews: number;
}

interface ProcessedStage {
	id: string;
	name: string;
	count: number;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
	level: number;
	interviewer: string;
	candidates: InterviewCandidate[];
}

interface InterviewCandidate {
	id: number;
	applicant_name: string;
	applicant_email: string;
	applicant_phone: string;
	gender: string;
	state: string;
	address: string;
	country: string;
	source: string;
	feedback?: string;
	rating?: number;
	interview_date?: string;
	interview_time?: string;
	location?: string;
	interview_id?: number;
	interview?: IInterview;
	status: string;
}

interface InterviewScheduleData {
	interview_date: string;
	location: string;
	interview_type: "online" | "in_person";
}

type OnboardResult = {
	success: boolean;
	alreadyOnboarded?: boolean;
	message?: string;
};

// Utility functions
const getStageIcon = (stageName: string, index: number) => {
	const iconMap: { [key: string]: React.ReactNode } = {
		initial: <Users className="h-5 w-5" />,
		assessment: <Users className="h-5 w-5" />,
		phone: <Phone className="h-5 w-5" />,
		technical: <Code className="h-5 w-5" />,
		final: <MessageSquare className="h-5 w-5" />,
		offer: <CheckCircle className="h-5 w-5" />,
		hired: <UserCheck className="h-5 w-5" />,
	};

	const lowerStageName = stageName.toLowerCase();

	for (const [key, icon] of Object.entries(iconMap)) {
		if (lowerStageName.includes(key)) return icon;
	}

	const defaultIcons = [
		<Users className="h-5 w-5" />,
		<Phone className="h-5 w-5" />,
		<Code className="h-5 w-5" />,
		<MessageSquare className="h-5 w-5" />,
		<CheckCircle className="h-5 w-5" />,
		<UserCheck className="h-5 w-5" />,
	];

	return defaultIcons[index % defaultIcons.length];
};

const getStageColors = (index: number) => {
	const colors = [
		{ color: "text-blue-600", bgColor: "bg-blue-100" },
		{ color: "text-purple-600", bgColor: "bg-purple-100" },
		{ color: "text-myOrange", bgColor: "bg-orange-100" },
		{ color: "text-yellow-600", bgColor: "bg-yellow-100" },
		{ color: "text-green-600", bgColor: "bg-green-100" },
		{ color: "text-emerald-600", bgColor: "bg-emerald-100" },
	];

	return colors[index % colors.length];
};

const buildCandidateHistory = (
	candidates: InterviewCandidate[],
	interviews: IInterview[],
	stages: ProcessedStage[],
): InterviewCandidateWithHistory[] => {
	return candidates.map((candidate) => {
		const candidateInterviews = interviews
			.filter((interview) => interview.job_position_application === candidate.id)
			.sort((a, b) => {
				const stageA = stages.find((s) => s.id === a.interview_stage.toString());
				const stageB = stages.find((s) => s.id === b.interview_stage.toString());

				return (stageA?.level || 0) - (stageB?.level || 0);
			});

		// Build interview history entries
		const interview_history = candidateInterviews.map((interview) => {
			const stage = stages.find((s) => s.id === interview.interview_stage.toString());

			return {
				stage_id: interview.interview_stage,
				stage_name: stage?.name || "Unknown Stage",
				stage_level: stage?.level || 0,
				interviewer: stage?.interviewer || "Unknown",
				interview_date: interview.interview_date,
				interview_time: interview.interview_time,
				location: interview.location,
				feedback: interview.feedback,
				rating: interview.rating ?? undefined,
				status: interview.status || "completed",
				created_at: interview.created_at,
				updated_at: interview.updated_at,
			};
		});

		const currentStageEntry =
			interview_history.length > 0 ? interview_history[interview_history.length - 1] : null;

		const current_stage_level = currentStageEntry?.stage_level || 0;
		const current_stage_name = currentStageEntry?.stage_name || "Not Started";

		const ratings = interview_history.filter((h) => h.rating && h.rating > 0);
		const overall_rating =
			ratings.length > 0
				? Math.round((ratings.reduce((sum, h) => sum + (h.rating || 0), 0) / ratings.length) * 10) /
					10
				: 0;

		// Completion rate
		const feedbacks = interview_history.filter((h) => h.feedback && h.feedback.trim().length > 0);
		const completion_rate =
			interview_history.length > 0
				? Math.round((feedbacks.length / interview_history.length) * 100)
				: 0;

		return {
			...candidate,
			interview_history,
			current_stage_level,
			current_stage_name,
			overall_rating,
			completion_rate,
		} as InterviewCandidateWithHistory;
	});
};

// Helper function to process interviews into candidates for a specific job
const processInterviewsForJob = (
	interviews: IInterview[],
	jobPositionId: number,
): InterviewCandidate[] => {
	return interviews
		.filter(
			(interview) =>
				interview.job_position_application_details?.job_position_advert === jobPositionId,
		)
		.map((interview) => ({
			id: interview.job_position_application,
			applicant_name: interview.job_position_application_details?.applicant_name || "Unknown",
			applicant_email: interview.job_position_application_details?.applicant_email || "",
			applicant_phone: interview.job_position_application_details?.applicant_phone || "",
			gender: interview.job_position_application_details?.gender || "",
			state: interview.job_position_application_details?.state || "",
			address: interview.job_position_application_details?.address || "",
			country: interview.job_position_application_details?.country || "",
			source: interview.job_position_application_details?.source || "",
			feedback: interview.feedback || undefined,
			rating: interview.rating || undefined,
			interview_date: interview.interview_date,
			interview_time: interview.interview_time,
			location: interview.location,
			interview_id: interview.id,
			interview: interview,
			status: interview.status,
		}));
};

// Group interviews by stage for a specific job
const buildStagesForJob = (
	interviewStages: IInterviewStage[],
	interviews: IInterview[],
	jobPositionId: number,
): ProcessedStage[] => {
	const jobStages = interviewStages.filter((stage) => stage.job_position_advert === jobPositionId);

	// Filter interviews for the specific job position and exclude rejected ones
	const jobInterviews = interviews.filter(
		(interview) =>
			interview.job_position_application_details?.job_position_advert === jobPositionId,
	);

	const processedStages: ProcessedStage[] = jobStages.map((stage, index) => {
		const colors = getStageColors(index);

		const stageInterviews = jobInterviews.filter(
			(interview) => interview.interview_stage_details?.id === stage.id,
		);

		const allCandidates = processInterviewsForJob(stageInterviews, jobPositionId);

		const activeCandidates = allCandidates.filter(
			(candidate) => candidate.status !== "rejected" && candidate.status !== "cancelled",
		);

		const candidates = allCandidates;

		const interviewerNames = Array.isArray(stage.interviewers_details)
			? stage.interviewers_details
					.map((emp) => emp.user?.fullname || `${emp.user?.fullname}` || "Unknown")
					.join(", ")
			: "Not assigned";

		return {
			id: stage.id.toString(),
			name: stage.name,
			count: activeCandidates.length,
			level: stage.level,
			interviewer: interviewerNames,
			icon: getStageIcon(stage.name, index),
			candidates,
			...colors,
		};
	});

	// Sort by level
	return processedStages.sort((a, b) => a.level - b.level);
};

// Sub-components
const RatingInput = ({
	rating,
	onRatingChange,
}: {
	rating: number;
	onRatingChange?: (rating: number) => void;
}) => {
	return (
		<div className="space-y-2">
			<Input
				type="number"
				min="1"
				max="10"
				value={rating || ""}
				onChange={(e) => onRatingChange?.(Number(e.target.value))}
				className="w-20"
			/>
			<p className="text-xs text-muted-foreground">Rate 1-10</p>
		</div>
	);
};

const FeedbackDialog = ({
	candidate,
	onSave,
	isOpen,
	onClose,
	nextStage,
	onReject,
	onScheduleAndMove,
}: {
	candidate: InterviewCandidate | null;
	onSave: (feedback: string, rating: number) => void;
	isOpen: boolean;
	onClose: () => void;
	nextStage?: ProcessedStage | null;
	onReject?: () => void;
	onScheduleAndMove?: () => void;
}) => {
	const [feedback, setFeedback] = useState("");
	const [rating, setRating] = useState(0);
	const [isSaving, setIsSaving] = useState(false);
	const [action, setAction] = useState<"save" | "cancel" | "schedule" | null>(null);

	useEffect(() => {
		if (candidate) {
			setFeedback(candidate.feedback || "");
			setRating(candidate.rating || 0);
		}
	}, [candidate]);

	if (!candidate) return null;

	const handleSave = async () => {
		if (!feedback.trim() || !rating) {
			toast.error("Please provide both feedback and rating");

			return;
		}

		setIsSaving(true);
		try {
			await onSave(feedback, rating);
			onClose();
			toast.success("Feedback updated successfully");
		} catch (error) {
			toast.error("Failed to update feedback");
		} finally {
			setIsSaving(false);
			setAction(null);
		}
	};

	const handleScheduleAndMove = async () => {
		if (!feedback.trim() || !rating) {
			toast.error("Please provide both feedback and rating before scheduling");

			return;
		}

		setIsSaving(true);
		setAction("schedule");
		try {
			await onSave(feedback, rating);
			if (onScheduleAndMove) {
				onScheduleAndMove();
			}
			onClose();
		} catch (error) {
			toast.error("Failed to save feedback");
		} finally {
			setIsSaving(false);
			setAction(null);
		}
	};

	const handleReject = async () => {
		if (!feedback.trim()) {
			toast.error("Please provide feedback for rejection");

			return;
		}

		setIsSaving(true);
		setAction("cancel");
		try {
			await onSave(feedback, rating || 1);
			if (onReject) {
				await onReject();
			}
			onClose();
			toast.success("Candidate rejected");
		} catch (error) {
			toast.error("Failed to reject candidate");
		} finally {
			setIsSaving(false);
			setAction(null);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Provide Feedback</DialogTitle>
					<DialogDescription>
						Provide feedback and rating for {candidate.applicant_name}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="space-y-2">
						<Label>Rating *</Label>
						<RatingInput rating={rating} onRatingChange={setRating} />
					</div>

					<div className="space-y-2">
						<Label>Feedback *</Label>
						<Textarea
							value={feedback}
							onChange={(e) => setFeedback(e.target.value)}
							placeholder="Enter your feedback about the candidate's performance..."
							rows={6}
						/>
					</div>

					<div className="flex flex-col gap-3">
						<div className="flex justify-between items-center">
							<div className="flex gap-2">
								<Button variant="outline" onClick={onClose} disabled={isSaving}>
									Cancel
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										setAction("save");
										handleSave();
									}}
									disabled={isSaving}
								>
									{isSaving && action === "save" ? (
										<>
											<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
											Saving...
										</>
									) : (
										<>
											<Save className="h-4 w-4 mr-2" />
											Save Only
										</>
									)}
								</Button>
							</div>

							<div className="flex gap-2">
								<Button variant="destructive" onClick={handleReject} disabled={isSaving}>
									{isSaving && action === "cancel" ? (
										<>
											<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
											Rejecting...
										</>
									) : (
										<>
											<XCircle className="h-4 w-4 mr-2" />
											Reject
										</>
									)}
								</Button>

								{nextStage && (
									<Button
										onClick={handleScheduleAndMove}
										disabled={isSaving}
										className="bg-green-600 hover:bg-green-700"
									>
										{isSaving && action === "schedule" ? (
											<>
												<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
												Processing...
											</>
										) : (
											<>
												<Calendar className="h-4 w-4 mr-2" />
												Schedule & Move to {nextStage.name}
											</>
										)}
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const InterviewSchedulingDialog = ({
	isOpen,
	onClose,
	onSchedule,
	candidates,
	targetStage,
	isScheduling,
}: {
	isOpen: boolean;
	onClose: () => void;
	onSchedule: (scheduleData: InterviewScheduleData) => void;
	candidates: InterviewCandidate[];
	targetStage: ProcessedStage | null;
	isScheduling: boolean;
}) => {
	const [scheduleData, setScheduleData] = useState<InterviewScheduleData>(() => {
		const tomorrow = new Date();

		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(10, 0, 0, 0);

		return {
			interview_date: tomorrow.toISOString().slice(0, 16),
			location: "Conference Room",
			interview_type: "online",
		};
	});

	const [errors, setErrors] = useState<any>({});

	const updateScheduleData = (field: keyof InterviewScheduleData, value: string) => {
		setScheduleData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev: any) => ({ ...prev, [field]: undefined }));
		}
	};

	const validateScheduleForm = (): boolean => {
		const newErrors: any = {};

		if (!scheduleData.interview_date || scheduleData.interview_date.trim() === "") {
			newErrors.interview_date = "Interview date is required";
		} else {
			const interviewDate = new Date(scheduleData.interview_date);
			const now = new Date();

			if (interviewDate <= now) {
				newErrors.interview_date = "Interview date must be in the future";
			}
		}

		if (!scheduleData.location || scheduleData.location.trim() === "") {
			newErrors.location = "Interview location is required";
		}

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSchedule = () => {
		if (!validateScheduleForm()) {
			toast.error("Please fix the form errors before scheduling");

			return;
		}

		onSchedule(scheduleData);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Schedule Interview for Next Stage</DialogTitle>
					<DialogDescription>
						Schedule interviews for {candidates.length} candidate(s) in {targetStage?.name}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="bg-blue-50 p-4 rounded-md">
						<h4 className="font-semibold text-sm mb-2 text-blue-800">
							Candidates to Schedule ({candidates.length})
						</h4>
						<div className="space-y-1">
							{candidates.map((candidate, index) => (
								<div key={index} className="text-sm text-blue-700">
									• {candidate.applicant_name}
								</div>
							))}
						</div>
					</div>

					{targetStage && (
						<div className="bg-green-50 p-4 rounded-md">
							<h4 className="font-semibold text-sm mb-2 text-green-800">Target Stage</h4>
							<div className="text-sm text-green-700">
								<p>
									<strong>{targetStage.name}</strong> (Level {targetStage.level})
								</p>
								<p>Interviewer: {targetStage.interviewer}</p>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="interview_date" className="text-sm font-medium">
								Interview Date & Time *
							</Label>
							<Input
								id="interview_date"
								type="datetime-local"
								value={scheduleData.interview_date}
								onChange={(e) => updateScheduleData("interview_date", e.target.value)}
								className={errors.interview_date ? "border-destructive" : ""}
								min={new Date().toISOString().slice(0, 16)}
							/>
							{errors.interview_date && (
								<p className="text-sm text-destructive">{errors.interview_date}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="location" className="text-sm font-medium">
								Interview Location *
							</Label>
							<LocationAutocomplete
								value={scheduleData.location}
								onChange={(value) => updateScheduleData("location", value)}
								onCoordinatesChange={(lat, lon) => {
									// You can handle lat/lon here if needed
								}}
								placeholder="Search for interview location..."
								showCurrentLocationButton={true}
							/>
							{errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
							<p className="text-xs text-muted-foreground">
								Search for the interview location or specify if virtual (e.g., "Zoom Meeting")
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="interview_type" className="text-sm font-medium">
								Interview Type *
							</Label>
							<Select
								value={scheduleData.interview_type}
								onValueChange={(value: "online" | "in_person") =>
									updateScheduleData("interview_type", value)
								}
							>
								<SelectTrigger className={errors.interview_type ? "border-destructive" : ""}>
									<SelectValue placeholder="Select interview type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="online">Online</SelectItem>
									<SelectItem value="in_person">In Person</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex justify-end gap-3">
						<Button variant="outline" onClick={onClose} disabled={isScheduling}>
							Cancel
						</Button>
						<Button onClick={handleSchedule} disabled={isScheduling}>
							{isScheduling ? (
								<>
									<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
									Scheduling...
								</>
							) : (
								<>
									<Calendar className="h-4 w-4 mr-2" />
									Schedule & Move to Next Stage
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

// Main Component
export default function JobSpecificInterviewPipeline() {
	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const userData = useSelector(selectUser);
	const createdBy = userData?.id ?? 0;

	// State management
	const [interviews, setInterviews] = useState<IInterview[]>([]);
	const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([]);
	const [processedStages, setProcessedStages] = useState<ProcessedStage[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Job position state
	const [selectedJobPosition, setSelectedJobPosition] = useState<JobPosition | null>(null);
	const [availableJobPositions, setAvailableJobPositions] = useState<JobPosition[]>([]);

	// UI State
	const [activeStageId, setActiveStageId] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

	const [isStageDetailsDialogOpen, setIsStageDetailsDialogOpen] = useState(false);
	const [selectedStageForDetails, setSelectedStageForDetails] = useState<ProcessedStage | null>(
		null,
	);

	// Dialog states
	const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false);
	const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
	const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false);
	const [selectedCandidate, setSelectedCandidate] = useState<InterviewCandidate | null>(null);
	const [candidatesToSchedule, setCandidatesToSchedule] = useState<InterviewCandidate[]>([]);

	const [viewMode, setViewMode] = useState<"current" | "history">("current");
	const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
	const [selectedCandidateWithHistory, setSelectedCandidateWithHistory] =
		useState<InterviewCandidateWithHistory | null>(null);

	const [isEditStageDialogOpen, setIsEditStageDialogOpen] = useState(false);
	const [selectedStageForEdit, setSelectedStageForEdit] = useState<ProcessedStage | null>(null);

	// Form states
	const [isProcessingProgression, setIsProcessingProgression] = useState(false);

	// Computed values
	const activeStage = processedStages.find((stage) => stage.id === activeStageId);
	const nextStageForActive = processedStages.find(
		(stage) => activeStage && stage.level === activeStage.level + 1,
	);

	// Filter candidates based on search
	const filteredCandidates = useMemo(() => {
		if (!activeStage) return [];

		let candidates = activeStage.candidates;

		// Apply search filter
		if (searchTerm) {
			candidates = candidates.filter(
				(candidate) =>
					candidate.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					candidate.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
					candidate.applicant_phone?.toLowerCase().includes(searchTerm.toLowerCase()),
			);
		}

		return candidates;
	}, [activeStage, searchTerm]);

	// Smart filtered candidates for selection (only those that need action)
	const selectableCandidates = useMemo(() => {
		return filteredCandidates.filter((candidate) => {
			// Only select candidates who DON'T have feedback yet (need action)
			return !(candidate.feedback && candidate.rating);
		});
	}, [filteredCandidates]);

	// Helper functions for candidate validation
	const canCandidateBeSelected = (candidate: InterviewCandidate): boolean => {
		// Cannot select rejected or cancelled candidates
		if (candidate.status === "rejected" || candidate.status === "cancelled") {
			return false;
		}

		// Only select candidates who DON'T have feedback yet (need action)
		// This ensures we only select candidates who need feedback/rating
		return !(candidate.feedback && candidate.rating && candidate.rating > 0);
	};

	const canCandidateBeMoved = (candidate: InterviewCandidate): boolean => {
		if (candidate.status === "rejected" || candidate.status === "cancelled") {
			return false;
		}

		return !!(candidate.feedback && candidate.rating && candidate.rating > 0);
	};

	const canCandidateBeOnboarded = (
		candidate: InterviewCandidate | InterviewCandidateWithHistory,
	): boolean => {
		if (candidate.status === "rejected" || candidate.status === "cancelled") {
			return false;
		}

		return !!(candidate.feedback && candidate.rating && candidate.rating > 0);
	};

	const isCandidateRejected = (
		candidate: InterviewCandidate | InterviewCandidateWithHistory,
	): boolean => {
		return candidate.status === "rejected" || candidate.status === "cancelled";
	};

	const isCandidateAlreadyOnboarded = (
		candidate: InterviewCandidate | InterviewCandidateWithHistory,
	): boolean => {
		return candidate.status === "onboarded" || candidate.status === "hired";
	};

	const candidatesEligibleForOnboarding = useMemo(() => {
		return filteredCandidates.filter(
			(candidate) =>
				selectedCandidates.includes(candidate.id) &&
				canCandidateBeOnboarded(candidate) &&
				!isCandidateAlreadyOnboarded(candidate),
		);
	}, [filteredCandidates, selectedCandidates]);

	const candidatesEligibleForMoving = useMemo(() => {
		return filteredCandidates.filter(
			(candidate) => selectedCandidates.includes(candidate.id) && canCandidateBeMoved(candidate),
		);
	}, [filteredCandidates, selectedCandidates]);

	const handleSaveStageEdit = async (stageId: string, formData: IInterviewStageFormData) => {
		try {
			const result = await upddateInterviewStage({
				stageId: parseInt(stageId),
				stageData: {
					...formData,
					job_position_advert: selectedJobPosition?.id ?? 0,
				},
			});

			if (result) {
				await fetchData();
			} else {
				throw new Error("Failed to update stage");
			}
		} catch (error) {
			console.error("Update stage error:", error);
			throw error;
		}
	};

	// Data fetching
	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

			if (!selectedInstitution?.id) {
				throw new Error("Institution information is missing");
			}

			const [fetchedInterviews, fetchedStages] = await Promise.all([
				getInterviews({ institutionId: selectedInstitution.id }),
				getInterviewStages({ institutionId: selectedInstitution.id }),
			]);

			(setInterviews(fetchedInterviews || []), setInterviewStages(fetchedStages || []));

			// Extract unique job position/titles /titles from interviews
			const jobPositionsMap = new Map<number, JobPosition>();

			fetchedInterviews?.forEach((interview) => {
				const jobAdvert = interview.job_position_application_details?.job_position_advert;
				const jobName =
					interview.job_position_application_details?.job_position_advert_job_details?.name;
				const jobDepartment =
					interview.job_position_application_details?.job_position_advert_job_details?.department;

				if (jobAdvert && jobName) {
					if (!jobPositionsMap.has(jobAdvert)) {
						jobPositionsMap.set(jobAdvert, {
							id: jobAdvert,
							name: jobName,
							department: jobDepartment || "",
							totalInterviews: 0,
						});
					}
					jobPositionsMap.get(jobAdvert)!.totalInterviews++;
				}
			});

			const positions = Array.from(jobPositionsMap.values()).sort((a, b) =>
				a.name.localeCompare(b.name),
			);

			setAvailableJobPositions(positions);

			// Auto-select the first job position/title if none selected
			if (!selectedJobPosition && positions.length > 0) {
				setSelectedJobPosition(positions[0]);
			}
		} catch (err) {
			setError(
				`Failed to load interview pipeline: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setLoading(false);
		}
	};
	const openHistoryDialog = (candidate: InterviewCandidateWithHistory) => {
		setSelectedCandidateWithHistory(candidate);
		setIsHistoryDialogOpen(true);
	};

	const allCandidatesWithHistory = React.useMemo(() => {
		if (!selectedJobPosition) return [];

		// Get all candidates for the selected job position from interviews
		const allCandidates = interviews
			.filter(
				(interview) =>
					interview.job_position_application_details?.job_position_advert ===
					selectedJobPosition.id,
			)
			.map((interview) => ({
				id: interview.job_position_application,
				applicant_name: interview.job_position_application_details?.applicant_name || "Unknown",
				applicant_email: interview.job_position_application_details?.applicant_email || "",
				applicant_phone: interview.job_position_application_details?.applicant_phone || "",
				gender: interview.job_position_application_details?.gender || "",
				state: interview.job_position_application_details?.state || "",
				address: interview.job_position_application_details?.address || "",
				country: interview.job_position_application_details?.country || "",
				source: interview.job_position_application_details?.source || "",
				status: interview.status,
			}))
			// Remove duplicates based on candidate ID
			.filter((candidate, index, array) => array.findIndex((c) => c.id === candidate.id) === index);

		return buildCandidateHistory(allCandidates, interviews, processedStages);
	}, [selectedJobPosition, interviews, processedStages]);

	const filteredHistoryCandidates = allCandidatesWithHistory.filter(
		(candidate) =>
			candidate.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			candidate.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			candidate.applicant_phone?.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	useEffect(() => {
		if (interviewStages.length > 0 && selectedJobPosition) {
			const stages = buildStagesForJob(interviewStages, interviews, selectedJobPosition.id);

			setProcessedStages(stages);

			// Set active stage to first stage if none selected
			if (!activeStageId && stages.length > 0) {
				setActiveStageId(stages[0].id);
			}
		} else {
			setProcessedStages([]);
			setActiveStageId(null);
		}
	}, [interviewStages, interviews, selectedJobPosition]);

	useEffect(() => {
		if (selectedInstitution) {
			fetchData();
		}
	}, [selectedInstitution]);

	// Candidate management functions
	const handleSelectCandidate = (candidateKey: string, checked: boolean) => {
		// Extract candidate ID from the key (format: "candidateId" or "candidateId-interviewId")
		const candidateId = parseInt(candidateKey.split("-")[0]);

		// Find the candidate to validate
		const candidate = filteredCandidates.find((c) => c.id === candidateId);

		if (checked) {
			if (!candidate) {
				toast.error("Candidate not found");

				return;
			}

			// Check if candidate is rejected
			if (isCandidateRejected(candidate)) {
				toast.error("Cannot select rejected or cancelled candidates");

				return;
			}

			// Check if candidate already has feedback and rating
			if (candidate.feedback && candidate.rating && candidate.rating > 0) {
				toast.error(
					"This candidate already has feedback and rating. Use individual actions to onboard or move them.",
				);

				return;
			}

			// Only allow selection if candidate needs feedback
			if (!canCandidateBeSelected(candidate)) {
				toast.error("This candidate cannot be selected for bulk actions");

				return;
			}

			setSelectedCandidates((prev) => [...prev, candidateId]);
		} else {
			setSelectedCandidates((prev) => prev.filter((id) => id !== candidateId));
		}
	};

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			// Only select candidates who need feedback (don't have feedback and rating yet)
			const candidatesNeedingFeedback = filteredCandidates.filter((candidate) =>
				canCandidateBeSelected(candidate),
			);

			if (candidatesNeedingFeedback.length === 0) {
				toast.info("No candidates need feedback. All candidates have already been reviewed.");

				return;
			}

			// Select only candidates who need feedback
			const candidateIds = candidatesNeedingFeedback.map((candidate) => candidate.id);

			setSelectedCandidates(candidateIds);

			const alreadyReviewed = filteredCandidates.length - candidatesNeedingFeedback.length;

			if (alreadyReviewed > 0) {
				toast.info(
					`Selected ${candidatesNeedingFeedback.length} candidates needing feedback. ${alreadyReviewed} candidates already reviewed.`,
				);
			} else {
				toast.success(`Selected ${candidatesNeedingFeedback.length} candidates for feedback.`);
			}
		} else {
			setSelectedCandidates([]);
		}
	};

	const handleUpdateFeedback = async (feedback: string, rating: number) => {
		if (!selectedCandidate) return;

		try {
			const interviewId = selectedCandidate.interview_id;

			if (!interviewId) {
				throw new Error("No interview found for this candidate");
			}

			// Only update feedback and rating, keep status as is (should remain "scheduled")
			const interviewData = {
				feedback: feedback,
				rating: rating,
				// DO NOT change status - it should remain "scheduled" until onboarded
			};

			const result = await updateInterview({
				interviewId: interviewId,
				interviewData: interviewData,
			});

			if (!result) {
				throw new Error("Failed to update interview feedback");
			}

			// Update local state
			setInterviews((prev) =>
				prev.map((interview) => {
					if (interview.id === interviewId) {
						return {
							...interview,
							feedback: result.feedback,
							rating: result.rating,
							// Keep the original status, don't change it
							status: interview.status,
						};
					}

					return interview;
				}),
			);

			setSelectedCandidate((prev) => {
				if (!prev || prev.interview_id !== interviewId) return prev;

				return {
					...prev,
					feedback: result.feedback || undefined,
					rating: result.rating || undefined,
					// Keep the original status
					status: prev.status,
				};
			});

			await fetchData(); // Refresh data
		} catch (error) {
			throw error;
		}
	};

	const rejectCandidate = async (candidateId: number) => {
		try {
			const candidate = filteredCandidates.find((c) => c.id === candidateId);

			if (!candidate || !candidate.interview_id) {
				throw new Error(`No interview found for candidate ${candidateId}`);
			}

			const interviewData = {
				status: "cancelled",
			};

			const result = await updateInterview({
				interviewId: candidate.interview_id,
				interviewData: interviewData,
			});

			if (!result) {
				throw new Error("Failed to reject candidate");
			}

			return { success: true, data: result };
		} catch (error) {
			throw error;
		}
	};

	const scheduleInterviewsForNextStage = async (
		candidates: InterviewCandidate[],
		scheduleData: InterviewScheduleData,
	) => {
		if (!selectedInstitution || !nextStageForActive || !selectedJobPosition) {
			throw new Error("Missing institution, next stage, or job position/title data");
		}

		try {
			const interviewPromises = candidates.map(async (candidate) => {
				// Extract time from datetime-local input
				let interviewTime = "10:00:00"; // Default fallback
				let interviewDate = scheduleData.interview_date;

				if (scheduleData.interview_date) {
					try {
						const dateTime = new Date(scheduleData.interview_date);

						if (!isNaN(dateTime.getTime())) {
							const hours = dateTime.getHours().toString().padStart(2, "0");
							const minutes = dateTime.getMinutes().toString().padStart(2, "0");

							interviewTime = `${hours}:${minutes}:00`;
							interviewDate = dateTime.toISOString();
						}
					} catch (error) {
						console.error("Error parsing interview date:", error);
					}
				}

				const location = (scheduleData.location || "").trim() || "To be determined";
				const interview_type = scheduleData.interview_type || "online";

				const createData = {
					job_position_application: candidate.id,
					interview_stage: parseInt(nextStageForActive.id),
					interview_date: interviewDate,
					location: location,
					interview_time: interviewTime,
					interview_type: interview_type,
					status: "scheduled", // New interview starts as "scheduled"
					feedback: null,
					rating: null,
					created_by: createdBy,
				};

				try {
					const result = await createInterview({
						institutionId: selectedInstitution.id,
						interviewData: createData,
					});

					return result;
				} catch (apiError) {
					console.error("Failed to create interview:", apiError);

					return null;
				}
			});

			const results = await Promise.all(interviewPromises);
			const successCount = results.filter((result) => result !== null).length;

			if (successCount === 0) {
				throw new Error("Failed to schedule any interviews");
			}

			return {
				successCount,
				totalCount: candidates.length,
				failureCount: results.length - successCount,
			};
		} catch (error) {
			throw error;
		}
	};

	// const moveToNextStage = async (candidateId: number) => {
	//   try {
	//     const candidate = filteredCandidates.find(c => c.id === candidateId);

	//     if (!candidate || !candidate.interview_id) {
	//       throw new Error(`No interview found for candidate ${candidateId}`);
	//     }

	//     const currentInterviewData = {
	//       status: 'completed'
	//     };

	//     const result = await updateInterview({
	//       interviewId: candidate.interview_id,
	//       interviewData: currentInterviewData
	//     });

	//     if (!result) {
	//       throw new Error('Failed to update current interview status');
	//     }

	//     return { success: true, data: result };
	//   } catch (error) {
	//     throw error;
	//   }
	// }

	const moveToNextStage = async (candidateId: number) => {
		try {
			const candidate = filteredCandidates.find((c) => c.id === candidateId);

			if (!candidate || !candidate.interview_id) {
				throw new Error(`No interview found for candidate ${candidateId}`);
			}

			return { success: true, data: { message: "Ready to schedule next stage" } };
		} catch (error) {
			throw error;
		}
	};
	const handleScheduleAndMove = async (scheduleData: InterviewScheduleData) => {
		setIsProcessingProgression(true);

		try {
			// Step 1: Schedule interviews for next stage
			const scheduleResult = await scheduleInterviewsForNextStage(
				candidatesToSchedule,
				scheduleData,
			);

			if (scheduleResult.successCount > 0) {
				// We don't need to update the current interviews' status
				// They should remain "scheduled" until the candidate is onboarded
				// Only the onboarding process should change status to "completed"

				toast.success(
					`Successfully scheduled interviews and moved ${candidatesToSchedule.length} candidates to ${nextStageForActive?.name}`,
				);

				setSelectedCandidates([]);
				setIsSchedulingDialogOpen(false);
				setCandidatesToSchedule([]);

				await fetchData();
			} else {
				toast.error("Failed to schedule interviews");
			}
		} catch (error) {
			toast.error("Failed to schedule interviews and move candidates");
		} finally {
			setIsProcessingProgression(false);
		}
	};
	const handleBulkOnboard = async () => {
		// Filter candidates who have feedback and rating (don't require completed status)
		const eligibleCandidates = filteredCandidates.filter(
			(candidate) =>
				selectedCandidates.includes(candidate.id) &&
				candidate.feedback &&
				candidate.rating &&
				candidate.rating > 0 &&
				candidate.status !== "rejected" &&
				candidate.status !== "cancelled",
		);

		if (eligibleCandidates.length === 0) {
			toast.error(
				"No candidates eligible for onboarding. Candidates need feedback and rating first.",
			);

			return;
		}

		try {
			const eligibleIds = eligibleCandidates.map((c) => c.id);
			const result = await bulkCreateOnBoarding({ applicationIds: eligibleIds });

			if (result) {
				const createdCount = result.summary?.created_count || result.created?.length || 0;
				const skippedCount = result.summary?.skipped_count || result.skipped?.length || 0;

				// Update interview statuses to completed for successfully onboarded candidates
				if (createdCount > 0) {
					const updatePromises = eligibleCandidates.map(async (candidate) => {
						if (candidate.interview_id) {
							try {
								await updateInterview({
									interviewId: candidate.interview_id,
									interviewData: { status: "completed" },
								});
							} catch (error) {
								console.error(`Failed to update status for candidate ${candidate.id}:`, error);
							}
						}
					});

					// Execute all status updates
					await Promise.allSettled(updatePromises);
				}

				if (createdCount > 0 && skippedCount === 0) {
					toast.success(`Successfully onboarded ${createdCount} candidate(s)`);
					setSelectedCandidates([]);
					await fetchData();
				} else if (createdCount > 0 && skippedCount > 0) {
					toast.warning(
						`${createdCount} candidates onboarded successfully, ${skippedCount} were already onboarded`,
					);
					setSelectedCandidates([]);
					await fetchData();
				} else if (createdCount === 0 && skippedCount > 0) {
					toast.warning(`All ${skippedCount} selected candidate(s) are already onboarded`);
					setSelectedCandidates([]);
					await fetchData();
				} else {
					toast.error("No candidates were processed successfully");
				}
			} else {
				toast.error("Failed to onboard candidates - API returned no response");
			}
		} catch (error) {
			toast.error(
				`Failed to onboard candidates: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	};

	const handleIndividualOnboard = async (
		candidate: InterviewCandidate | InterviewCandidateWithHistory,
	): Promise<OnboardResult> => {
		// Check if candidate has feedback and rating but don't require completed status
		if (!candidate.feedback || !candidate.rating || candidate.rating <= 0) {
			return {
				success: false,
				message: "Candidate must have feedback and rating to be onboarded",
			};
		}

		// Don't allow onboarding rejected candidates
		if (candidate.status === "rejected" || candidate.status === "cancelled") {
			return {
				success: false,
				message: "Cannot onboard rejected or cancelled candidates",
			};
		}

		try {
			const result = await bulkCreateOnBoarding({ applicationIds: [candidate.id] });

			if (result) {
				const createdCount = result.summary?.created_count || result.created?.length || 0;
				const skippedCount = result.summary?.skipped_count || result.skipped?.length || 0;

				if (createdCount > 0) {
					// Update the interview status to completed after successful onboarding
					try {
						const candidateWithHistory = candidate as InterviewCandidateWithHistory;
						const interviewId =
							candidateWithHistory.interview_id || (candidate as InterviewCandidate).interview_id;

						if (interviewId) {
							await updateInterview({
								interviewId: interviewId,
								interviewData: { status: "completed" },
							});
						}
					} catch (statusUpdateError) {
						console.error("Failed to update interview status after onboarding:", statusUpdateError);
						// Don't fail the onboarding if status update fails
					}

					await fetchData();

					return { success: true };
				} else if (skippedCount > 0) {
					return {
						success: true,
						alreadyOnboarded: true,
						message: "Candidate is already onboarded",
					};
				} else {
					return { success: false, message: "No candidates were processed successfully" };
				}
			} else {
				return { success: false, message: "API returned no response" };
			}
		} catch (error) {
			return {
				success: false,
				message: error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	};

	// UI Event Handlers
	const handleBack = () => {
		router.push("/job-interviews");
	};

	const openFeedbackDialog = (candidate: InterviewCandidate) => {
		setSelectedCandidate(candidate);
		setIsFeedbackDialogOpen(true);
	};

	const handleIndividualScheduleAndMove = () => {
		if (!selectedCandidate) return;
		setCandidatesToSchedule([selectedCandidate]);
		setIsFeedbackDialogOpen(false);
		setIsSchedulingDialogOpen(true);
	};

	const handleBulkScheduleAndMove = () => {
		const eligibleCandidates = filteredCandidates.filter(
			(candidate) =>
				selectedCandidates.includes(candidate.id) &&
				candidate.feedback &&
				candidate.rating &&
				candidate.rating > 0 &&
				candidate.status === "completed",
		);

		if (eligibleCandidates.length === 0) {
			toast.error("No candidates eligible for moving. Candidates need feedback and rating first.");

			return;
		}

		if (!nextStageForActive) {
			toast.error("No next stage available");

			return;
		}

		setCandidatesToSchedule(eligibleCandidates);
		setIsSchedulingDialogOpen(true);
	};

	const handleJobPositionChange = (jobPositionId: string) => {
		const jobPosition = availableJobPositions.find((job) => job.id.toString() === jobPositionId);

		setSelectedJobPosition(jobPosition || null);
		setActiveStageId(null);
		setSelectedCandidates([]);
		setSearchTerm("");
	};

	// Loading and error states
	if (loading) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-32" />
					<div>
						<Skeleton className="h-8 w-64 mb-2" />
						<Skeleton className="h-4 w-96" />
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="flex items-center justify-between">
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-8 w-16" />
									</div>
									<Skeleton className="h-12 w-12 rounded-full" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<Card>
					<CardContent className="p-6">
						<div className="space-y-4">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="flex items-center space-x-4">
									<Skeleton className="h-10 w-10 rounded-full" />
									<div className="space-y-2 flex-1">
										<Skeleton className="h-4 w-48" />
										<Skeleton className="h-4 w-32" />
									</div>
									<Skeleton className="h-6 w-16" />
									<Skeleton className="h-8 w-24" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<Card className="p-6">
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="text-red-500 mb-4">
								<MessageSquare className="h-12 w-12 mx-auto" />
							</div>
							<p className="text-gray-600 mb-4">{error}</p>
							<Button
								onClick={() => window.location.reload()}
								className="bg-orange-500 hover:bg-orange-600"
							>
								Try Again
							</Button>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	const CandidateHistoryDialog = ({
		candidate,
		isOpen,
		onClose,
		stages,
	}: {
		candidate: InterviewCandidateWithHistory | null;
		isOpen: boolean;
		onClose: () => void;
		stages: ProcessedStage[];
	}) => {
		if (!candidate) return null;

		const getStageStatusIcon = (entry: InterviewHistoryEntry) => {
			if (entry.feedback && entry.rating) {
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			} else if (entry.feedback) {
				return <Clock className="h-4 w-4 text-yellow-600" />;
			} else {
				return <XCircle className="h-4 w-4 text-gray-400" />;
			}
		};

		const getRatingColor = (rating: number) => {
			if (rating >= 8) return "text-green-600 bg-green-100";
			if (rating >= 6) return "text-yellow-600 bg-yellow-100";
			if (rating >= 4) return "text-myOrange bg-orange-100";

			return "text-red-600 bg-red-100";
		};

		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<History className="h-5 w-5" />
							Interview History - {candidate.applicant_name}
						</DialogTitle>
						<DialogDescription>
							Complete interview journey and performance across all stages
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* Candidate Summary */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Card>
								<CardContent className="p-4">
									<div className="text-center">
										<div className="text-2xl font-bold text-blue-600">
											{candidate.current_stage_level}
										</div>
										<div className="text-sm text-gray-600">Current Stage Level</div>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="p-4">
									<div className="text-center">
										<div className="text-2xl font-bold text-green-600">
											{candidate.overall_rating}
										</div>
										<div className="text-sm text-gray-600">Overall Rating</div>
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="p-4">
									<div className="text-center">
										<div className="text-2xl font-bold text-purple-600">
											{candidate.completion_rate}%
										</div>
										<div className="text-sm text-gray-600">Completion Rate</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Contact Information */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Contact Information</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex items-center gap-2">
										<Mail className="h-4 w-4 text-gray-500" />
										<span>{candidate.applicant_email}</span>
									</div>
									{candidate.applicant_phone && (
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-gray-500" />
											<span>{candidate.applicant_phone}</span>
										</div>
									)}
									<div className="flex items-center gap-2">
										<Users className="h-4 w-4 text-gray-500" />
										<span className="capitalize">{candidate.gender}</span>
									</div>
									<div className="flex items-center gap-2">
										<MapPin className="h-4 w-4 text-gray-500" />
										<span>
											{candidate.state}, {candidate.country}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Interview History Timeline */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Interview Journey</CardTitle>
							</CardHeader>
							<CardContent>
								{candidate.interview_history.length === 0 ? (
									<div className="text-center py-8">
										<Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
										<p className="text-gray-600">No interview history available</p>
									</div>
								) : (
									<div className="space-y-4">
										{candidate.interview_history.map((entry, index) => (
											<div key={index} className="relative">
												{/* Timeline line */}
												{index < candidate.interview_history.length - 1 && (
													<div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
												)}

												<div className="flex gap-4">
													{/* Timeline dot */}
													<div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
														{getStageStatusIcon(entry)}
													</div>

													{/* Content */}
													<div className="flex-1 min-w-0">
														<Card className="mb-2">
															<CardContent className="p-4">
																<div className="flex items-start justify-between mb-3">
																	<div>
																		<h4 className="font-semibold text-lg">{entry.stage_name}</h4>
																		<p className="text-sm text-gray-600">
																			Level {entry.stage_level} • {entry.interviewer}
																		</p>
																	</div>
																	<div className="flex items-center gap-2">
																		{entry.rating && (
																			<Badge className={`${getRatingColor(entry.rating)} border-0`}>
																				<Star className="h-3 w-3 mr-1" />
																				{entry.rating}/10
																			</Badge>
																		)}
																		<Badge variant="outline" className="capitalize">
																			{entry.status}
																		</Badge>
																	</div>
																</div>

																{/* Interview Details */}
																{(entry.interview_date || entry.location) && (
																	<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
																		{entry.interview_date && (
																			<div className="flex items-center gap-2">
																				<Calendar className="h-4 w-4 text-gray-500" />
																				<span>
																					{new Date(entry.interview_date).toLocaleDateString()}
																					{entry.interview_time && ` at ${entry.interview_time}`}
																				</span>
																			</div>
																		)}
																		{entry.location && (
																			<div className="flex items-center gap-2">
																				<MapPin className="h-4 w-4 text-gray-500" />
																				<span>{entry.location}</span>
																			</div>
																		)}
																	</div>
																)}

																{/* Feedback */}
																{entry.feedback && (
																	<div className="bg-gray-50 rounded-lg p-3">
																		<div className="flex items-center gap-2 mb-2">
																			<MessageSquare className="h-4 w-4 text-gray-500" />
																			<span className="font-medium text-sm">Feedback</span>
																		</div>
																		<p className="text-sm text-gray-700">{entry.feedback}</p>
																	</div>
																)}

																{!entry.feedback && !entry.rating && (
																	<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
																		<p className="text-sm text-yellow-700">
																			<Clock className="h-4 w-4 inline mr-1" />
																			No feedback provided yet
																		</p>
																	</div>
																)}
															</CardContent>
														</Card>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Performance Summary */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Performance Summary</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{/* Ratings Chart */}
									<div>
										<h4 className="font-medium mb-3">Stage Ratings</h4>
										<div className="space-y-2">
											{candidate.interview_history
												.filter((entry) => entry.rating)
												.map((entry, index) => (
													<div key={index} className="flex items-center gap-3">
														<span className="text-sm min-w-0 flex-1 truncate">
															{entry.stage_name}
														</span>
														<div className="flex items-center gap-2">
															<div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
																<div
																	className={`h-full rounded-full ${
																		entry.rating! >= 8
																			? "bg-green-500"
																			: entry.rating! >= 6
																				? "bg-yellow-500"
																				: entry.rating! >= 4
																					? "bg-orange-500"
																					: "bg-red-500"
																	}`}
																	style={{ width: `${(entry.rating! / 10) * 100}%` }}
																/>
															</div>
															<span className="text-sm font-medium w-8">{entry.rating}/10</span>
														</div>
													</div>
												))}
										</div>
									</div>

									{/* Progress Statistics */}
									<div>
										<h4 className="font-medium mb-3">Progress Statistics</h4>
										<div className="space-y-3">
											<div className="flex justify-between">
												<span className="text-sm">Stages Completed</span>
												<span className="font-medium">{candidate.interview_history.length}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-sm">Stages with Feedback</span>
												<span className="font-medium">
													{candidate.interview_history.filter((h) => h.feedback).length}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-sm">Average Rating</span>
												<span className="font-medium">{candidate.overall_rating || "N/A"}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-sm">Completion Rate</span>
												<span className="font-medium">{candidate.completion_rate}%</span>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="flex justify-end">
						<Button onClick={onClose}>Close</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	};

	// Calculate stats for selected job position
	const jobInterviews = selectedJobPosition
		? interviews.filter(
				(i) => i.job_position_application_details?.job_position_advert === selectedJobPosition.id,
			)
		: [];
	const totalInterviews = jobInterviews.length;
	const completedInterviews = jobInterviews.filter((i) => i.status === "completed").length;
	const scheduledInterviews = jobInterviews.filter((i) => i.status === "scheduled").length;
	const pendingFeedback = jobInterviews.filter(
		(i) => i.status === "completed" && (!i.feedback || !i.rating),
	).length;

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						size="sm"
						className="rounded-full aspect-square"
						variant="outline"
						onClick={handleBack}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Job-Specific Interview Pipeline</h1>
						<p className="text-gray-600">
							Manage interview stages and candidates for specific job position/titles
						</p>
					</div>
				</div>
			</div>

			{/* Job Position/ Title  Selector */}
			<Card className="mt-6 shadow-sm border-none">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Select Job Position / Title
					</CardTitle>
					<p className="text-muted-foreground py-4 my-4 text-sm">
						Organize and track candidates through multiple interview stages for each job position.
						Create custom interview stages, assign interviewers, manage candidate progression,
						provide feedback, and monitor the entire recruitment pipeline from initial screening to
						final selection. View comprehensive interview history and make data-driven hiring
						decisions.
					</p>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
						<div className="flex-1">
							<Label htmlFor="job-position">Job Position / Title </Label>
							<Select
								value={selectedJobPosition?.id.toString() || ""}
								onValueChange={handleJobPositionChange}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a job position/title to manage" />
								</SelectTrigger>
								<SelectContent>
									{availableJobPositions.map((position) => (
										<SelectItem key={position.id} value={position.id.toString()}>
											<div className="flex items-center gap-2">
												<Briefcase className="h-4 w-4" />
												<div>
													<div className="font-medium">{position.name}</div>
													<div className="text-xs text-muted-foreground">
														{position.department} • {position.totalInterviews} interviews
													</div>
												</div>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{selectedJobPosition && (
							<CreateInterviewStageDialog
								isOpen={isCreateStageDialogOpen}
								onOpenChange={setIsCreateStageDialogOpen}
								jobPositionId={selectedJobPosition.id}
								jobPositionName={selectedJobPosition.name}
								existingStagesCount={processedStages.length}
								onSuccess={fetchData}
								triggerButton={
									<Button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600">
										<Plus className="h-4 w-4" />
										Add Interview Stage
									</Button>
								}
							/>
						)}
					</div>
				</CardContent>
			</Card>

			{!selectedJobPosition ? (
				/* No job selected state */
				<Card className="p-6 mt-6 shadow-sm border-none">
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-semibold mb-2">Select a Job Position / Title </h3>
							<p className="text-muted-foreground mb-4">
								Choose a job position/title above to manage its interview pipeline
							</p>
							{availableJobPositions.length === 0 && (
								<p className="text-sm text-gray-500">
									No job position/titles /titles with interviews found. Schedule some interviews
									first.
								</p>
							)}
						</div>
					</div>
				</Card>
			) : (
				<>
					{/* Summary Stats for Selected Job */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Total Interviews</p>
										<p className="text-3xl font-bold text-gray-900">{totalInterviews}</p>
									</div>
									<div className="p-3 bg-blue-100 rounded-full">
										<Users className="h-6 w-6 text-blue-600" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Scheduled</p>
										<p className="text-3xl font-bold text-gray-900">{scheduledInterviews}</p>
									</div>
									<div className="p-3 bg-orange-100 rounded-full">
										<Clock className="h-6 w-6 text-myOrange" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Completed</p>
										<p className="text-3xl font-bold text-gray-900">{completedInterviews}</p>
									</div>
									<div className="p-3 bg-green-100 rounded-full">
										<CheckCircle className="h-6 w-6 text-green-600" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Pending Feedback</p>
										<p className="text-3xl font-bold text-gray-900">{pendingFeedback}</p>
									</div>
									<div className="p-3 bg-red-100 rounded-full">
										<MessageSquare className="h-6 w-6 text-red-600" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{processedStages.length === 0 ? (
						/* No stages state */
						<Card className="p-6">
							<div className="flex items-center justify-center h-64">
								<div className="text-center">
									<MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
									<h3 className="text-lg font-semibold mb-2">No Interview Stages</h3>
									<p className="text-muted-foreground mb-4">
										Create interview stages for {selectedJobPosition.name} to start managing the
										pipeline
									</p>
									<Button
										onClick={() => setIsCreateStageDialogOpen(true)}
										className="bg-orange-500 hover:bg-orange-600"
									>
										<Plus className="h-4 w-4 mr-2" />
										Add First Interview Stage
									</Button>
								</div>
							</div>
						</Card>
					) : (
						/* Main Pipeline Interface */
						<Tabs
							value={viewMode}
							onValueChange={(value) => {
								setViewMode(value as "current" | "history");
								setSelectedCandidates([]);
								setSearchTerm("");
							}}
						>
							<div className="flex items-center justify-between mb-4 mt-8">
								<TabsList className="grid w-fit grid-cols-2">
									<TabsTrigger value="current" className="flex items-center gap-2">
										<Briefcase className="h-4 w-4" />
										Current Stage View
									</TabsTrigger>
									<TabsTrigger value="history" className="flex items-center gap-2">
										<History className="h-4 w-4" />
										History View
									</TabsTrigger>
								</TabsList>
							</div>

							<TabsContent value="current">
								<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
									{/* Left Panel - Stages List */}
									<div className="lg:col-span-1">
										<InterviewStagesPanel
											stages={processedStages}
											activeStageId={activeStageId}
											onStageSelect={(stageId) => {
												setActiveStageId(stageId);
												setSelectedCandidates([]);
												setSearchTerm("");
											}}
											onViewStageDetails={(stage) => {
												setSelectedStageForDetails({
													...stage,
													candidates: (stage.candidates as InterviewCandidate[]) ?? [],
												});
												setIsStageDetailsDialogOpen(true);
											}}
											onEditStage={(stage) => {
												setSelectedStageForEdit({
													...stage,
													candidates: stage.candidates ?? [],
												});
												setIsEditStageDialogOpen(true);
											}}
											showDropdownActions={true}
										/>
									</div>

									{/* Right Panel - Candidates for Selected Stage */}
									<div className="lg:col-span-2">
										{activeStage ? (
											<Card className="h-full">
												<CardHeader>
													<div className="flex items-center justify-between">
														<div>
															<CardTitle className="flex items-center gap-2">
																{activeStage.icon}
																{activeStage.name} - Candidates
															</CardTitle>
															<p className="text-sm text-muted-foreground">
																Level {activeStage.level} • Interviewer: {activeStage.interviewer} •{" "}
																{filteredCandidates.length} candidates
															</p>
														</div>
														{nextStageForActive && (
															<div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
																Next: {nextStageForActive.name}
															</div>
														)}
													</div>
												</CardHeader>
												<CardContent className="space-y-4">
													{/* Search and Actions */}
													<div className="flex flex-col sm:flex-row gap-4">
														<div className="relative flex-1">
															<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
															<Input
																placeholder="Search candidates..."
																value={searchTerm}
																onChange={(e) => setSearchTerm(e.target.value)}
																className="pl-10"
															/>
														</div>
													</div>

													{/* Bulk Actions */}
													{selectedCandidates.length > 0 && (
														<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-2">
																	<Users className="h-4 w-4 text-blue-600" />
																	<span className="text-sm font-medium text-blue-800">
																		{selectedCandidates.length} candidate(s) selected
																	</span>
																	{/* Show warning if selected candidates need feedback first */}
																	{selectedCandidates.some((id) => {
																		const candidate = filteredCandidates.find((c) => c.id === id);

																		return (
																			candidate &&
																			!(
																				candidate.feedback &&
																				candidate.rating &&
																				candidate.rating > 0
																			)
																		);
																	}) && (
																		<span className="text-xs text-myOrange bg-orange-100 px-2 py-1 rounded-full">
																			Selected candidates need feedback & rating first
																		</span>
																	)}
																</div>
																<div className="flex items-center gap-2">
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={() => setSelectedCandidates([])}
																	>
																		Clear
																	</Button>

																	{/* Only show action buttons if candidates have the required feedback */}
																	{candidatesEligibleForOnboarding.length > 0 && (
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() => {
																				const eligibleIds = candidatesEligibleForOnboarding.map(
																					(c) => c.id,
																				);

																				setSelectedCandidates(eligibleIds);
																				handleBulkOnboard();
																			}}
																			className="text-purple-600 border-purple-200 hover:bg-purple-50"
																			title={`Onboard ${candidatesEligibleForOnboarding.length} eligible candidates`}
																		>
																			<Users className="h-4 w-4 mr-2" />
																			Onboard ({candidatesEligibleForOnboarding.length})
																		</Button>
																	)}

																	{nextStageForActive && candidatesEligibleForMoving.length > 0 && (
																		<Button
																			size="sm"
																			onClick={() => {
																				const eligibleIds = candidatesEligibleForMoving.map(
																					(c) => c.id,
																				);

																				setSelectedCandidates(eligibleIds);
																				handleBulkScheduleAndMove();
																			}}
																			className="bg-green-600 hover:bg-green-700"
																			title={`Move ${candidatesEligibleForMoving.length} candidates with feedback to ${nextStageForActive.name}`}
																		>
																			<Calendar className="h-4 w-4 mr-2" />
																			Move to {nextStageForActive.name} (
																			{candidatesEligibleForMoving.length})
																		</Button>
																	)}

																	{/* Show message when no candidates are eligible for actions */}
																	{candidatesEligibleForOnboarding.length === 0 &&
																		candidatesEligibleForMoving.length === 0 && (
																			<div className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
																				Please provide feedback & rating first
																			</div>
																		)}
																</div>
															</div>
														</div>
													)}
													{/* Candidates Table */}
													<div className="border rounded-lg max-h-[400px] overflow-auto">
														{filteredCandidates.length === 0 ? (
															<div className="text-center py-8">
																<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
																<h3 className="text-lg font-semibold mb-2">No candidates found</h3>
																<p className="text-muted-foreground">
																	{searchTerm
																		? "No candidates match your search."
																		: "No candidates have been assigned to this stage yet."}
																</p>
															</div>
														) : (
															<Table>
																<TableHeader>
																	<TableRow>
																		<TableHead className="w-12">
																			<Checkbox
																				checked={(() => {
																					const candidatesNeedingFeedback =
																						filteredCandidates.filter((candidate) =>
																							canCandidateBeSelected(candidate),
																						);

																					return (
																						candidatesNeedingFeedback.length > 0 &&
																						candidatesNeedingFeedback.every((c) =>
																							selectedCandidates.includes(c.id),
																						)
																					);
																				})()}
																				onCheckedChange={handleSelectAll}
																				title="Select candidates who need feedback"
																			/>
																		</TableHead>

																		<TableHead>Candidate</TableHead>
																		<TableHead>Contact</TableHead>
																		<TableHead>Feedback</TableHead>
																		<TableHead>Rating</TableHead>
																		<TableHead>Status</TableHead>
																		<TableHead>Actions</TableHead>
																	</TableRow>
																</TableHeader>

																<TableBody>
																	{filteredCandidates.map((candidate, idx) => (
																		<TableRow
																			key={idx}
																			className={
																				candidate.status === "rejected" ||
																				candidate.status === "cancelled"
																					? "opacity-60 bg-red-50"
																					: ""
																			}
																		>
																			<TableCell>
																				<Checkbox
																					checked={selectedCandidates.includes(candidate.id)}
																					onCheckedChange={(checked) =>
																						handleSelectCandidate(
																							candidate.id.toString(),
																							checked as boolean,
																						)
																					}
																					disabled={!canCandidateBeSelected(candidate)}
																					title={
																						isCandidateRejected(candidate)
																							? "Candidate is rejected/cancelled"
																							: canCandidateBeSelected(candidate)
																								? "Select for feedback"
																								: candidate.feedback && candidate.rating
																									? "Already has feedback and rating - use individual actions"
																									: "Cannot be selected"
																					}
																					className={
																						!canCandidateBeSelected(candidate) ? "opacity-50" : ""
																					}
																				/>
																			</TableCell>

																			<TableCell>
																				<div className="space-y-1">
																					<div className="font-medium">
																						{candidate.applicant_name}
																					</div>
																					<div className="text-xs text-muted-foreground capitalize">
																						{candidate.gender}
																					</div>
																				</div>
																			</TableCell>

																			<TableCell>
																				<div className="space-y-1">
																					<div className="flex items-center text-sm">
																						<Mail className="mr-1 h-3 w-3" />
																						{candidate.applicant_email}
																					</div>
																					{candidate.applicant_phone && (
																						<div className="flex items-center text-sm text-muted-foreground">
																							<Phone className="mr-1 h-3 w-3" />
																							{candidate.applicant_phone}
																						</div>
																					)}
																				</div>
																			</TableCell>

																			<TableCell>
																				<div className="max-w-xs">
																					{candidate.feedback ? (
																						<p
																							className="text-sm text-gray-600 truncate"
																							title={candidate.feedback}
																						>
																							{candidate.feedback}
																						</p>
																					) : (
																						<p className="text-sm text-gray-400 italic">
																							No feedback yet
																						</p>
																					)}
																				</div>
																			</TableCell>

																			<TableCell>
																				<div className="text-center">
																					{candidate.rating ? (
																						<div className="flex items-center gap-1">
																							<Star className="h-4 w-4 text-yellow-500" />
																							<span className="font-semibold">
																								{candidate.rating}/10
																							</span>
																						</div>
																					) : (
																						<span className="text-sm text-gray-400">-</span>
																					)}
																				</div>
																			</TableCell>

																			<TableCell>
																				<div className="flex items-center">
																					{(() => {
																						const status =
																							candidate.status?.toLowerCase() || "unknown";

																						switch (status) {
																							case "scheduled":
																								return (
																									<Badge
																										variant="secondary"
																										className="bg-blue-100 text-blue-700"
																									>
																										<Clock className="h-3 w-3 mr-1" />
																										Scheduled
																									</Badge>
																								);
																							case "completed":
																								return (
																									<Badge
																										variant="secondary"
																										className="bg-green-100 text-green-700"
																									>
																										<CheckCircle className="h-3 w-3 mr-1" />
																										Onboarded
																									</Badge>
																								);
																							case "cancelled":
																							case "rejected":
																								return (
																									<Badge
																										variant="secondary"
																										className="bg-red-100 text-red-700"
																									>
																										<XCircle className="h-3 w-3 mr-1" />
																										{status === "cancelled"
																											? "Cancelled"
																											: "Rejected"}
																									</Badge>
																								);
																							case "rescheduled":
																								return (
																									<Badge
																										variant="secondary"
																										className="bg-yellow-100 text-yellow-700"
																									>
																										<Calendar className="h-3 w-3 mr-1" />
																										Rescheduled
																									</Badge>
																								);
																							case "no_show":
																								return (
																									<Badge
																										variant="secondary"
																										className="bg-gray-100 text-gray-700"
																									>
																										<XCircle className="h-3 w-3 mr-1" />
																										No Show
																									</Badge>
																								);
																							default:
																								return (
																									<Badge
																										variant="secondary"
																										className="bg-gray-100 text-gray-500"
																									>
																										<Clock className="h-3 w-3 mr-1" />
																										{status.charAt(0).toUpperCase() +
																											status.slice(1)}
																									</Badge>
																								);
																						}
																					})()}
																				</div>
																			</TableCell>

																			<TableCell>
																				<DropdownMenu>
																					<DropdownMenuTrigger asChild>
																						<Button
																							variant="ghost"
																							size="sm"
																							className="h-8 w-8 p-0"
																						>
																							<MoreVertical className="h-4 w-4" />
																						</Button>
																					</DropdownMenuTrigger>
																					<DropdownMenuContent align="end">
																						{/* Show different options based on candidate status */}
																						{isCandidateRejected(candidate) ? (
																							// For rejected candidates, only show limited options
																							<>
																								<DropdownMenuItem disabled className="text-red-600">
																									<XCircle className="h-4 w-4 mr-2" />
																									Candidate Rejected
																								</DropdownMenuItem>
																								<DropdownMenuItem
																									onClick={() => openFeedbackDialog(candidate)}
																								>
																									<Eye className="h-4 w-4 mr-2" />
																									View Details
																								</DropdownMenuItem>
																							</>
																						) : (
																							// For active candidates, show full menu
																							<>
																								<DropdownMenuItem
																									onClick={() => openFeedbackDialog(candidate)}
																								>
																									<Edit className="h-4 w-4 mr-2" />
																									Provide Feedback
																								</DropdownMenuItem>

																								<DropdownMenuSeparator />

																								{/* Only show onboard option if candidate has feedback and rating and isn't already onboarded */}
																								{canCandidateBeOnboarded(candidate) &&
																									!isCandidateAlreadyOnboarded(candidate) && (
																										<DropdownMenuItem
																											onClick={async () => {
																												try {
																													const result =
																														await handleIndividualOnboard(
																															candidate,
																														);

																													if (result.success) {
																														if (result.alreadyOnboarded) {
																															toast.warning(
																																`${candidate.applicant_name} is already onboarded`,
																															);
																														} else {
																															toast.success(
																																`${candidate.applicant_name} onboarded successfully`,
																															);
																														}
																													} else {
																														toast.error(
																															`Failed to onboard ${candidate.applicant_name}: ${result.message}`,
																														);
																													}
																												} catch (error) {
																													toast.error(
																														`Unexpected error occurred while onboarding ${candidate.applicant_name}`,
																													);
																												}
																											}}
																											className="text-purple-600"
																										>
																											<Users className="h-4 w-4 mr-2" />
																											Onboard Candidate
																										</DropdownMenuItem>
																									)}

																								{/* Show message if candidate is already onboarded */}
																								{isCandidateAlreadyOnboarded(candidate) && (
																									<DropdownMenuItem
																										disabled
																										className="text-gray-400"
																									>
																										<UserCheck className="h-4 w-4 mr-2" />
																										Already Onboarded
																									</DropdownMenuItem>
																								)}

																								{/* Show message if candidate needs feedback first */}
																								{!canCandidateBeOnboarded(candidate) &&
																									!isCandidateAlreadyOnboarded(candidate) && (
																										<DropdownMenuItem
																											disabled
																											className="text-gray-400"
																										>
																											<Clock className="h-4 w-4 mr-2" />
																											Needs Feedback & Rating First
																										</DropdownMenuItem>
																									)}

																								{/* Only show move options if candidate has feedback and rating */}
																								{nextStageForActive &&
																									canCandidateBeMoved(candidate) && (
																										<>
																											<DropdownMenuItem
																												onClick={async () => {
																													setCandidatesToSchedule([candidate]);
																													setIsSchedulingDialogOpen(true);
																												}}
																												className="text-green-600"
																											>
																												<Calendar className="h-4 w-4 mr-2" />
																												Schedule & Move to {nextStageForActive.name}
																											</DropdownMenuItem>
																										</>
																									)}

																								{/* Show message if candidate can't be moved yet */}
																								{nextStageForActive &&
																									!canCandidateBeMoved(candidate) && (
																										<DropdownMenuItem
																											disabled
																											className="text-gray-400"
																										>
																											<Clock className="h-4 w-4 mr-2" />
																											Provide Feedback & Rating to Move
																										</DropdownMenuItem>
																									)}

																								<DropdownMenuSeparator />

																								{/* Only show reject option if candidate is not already rejected */}
																								<DropdownMenuItem
																									onClick={async () => {
																										try {
																											await rejectCandidate(candidate.id);
																											toast.success(
																												`${candidate.applicant_name} rejected`,
																											);
																											await fetchData();
																										} catch (error) {
																											toast.error(
																												`Failed to reject ${candidate.applicant_name}`,
																											);
																										}
																									}}
																									className="text-red-600"
																								>
																									<XCircle className="h-4 w-4 mr-2" />
																									Reject Candidate
																								</DropdownMenuItem>
																							</>
																						)}
																					</DropdownMenuContent>
																				</DropdownMenu>
																			</TableCell>
																		</TableRow>
																	))}
																</TableBody>
															</Table>
														)}
													</div>
												</CardContent>
											</Card>
										) : (
											/* No stage selected state */
											<Card className="h-full">
												<CardContent className="flex items-center justify-center h-full">
													<div className="text-center">
														<Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
														<h3 className="text-lg font-semibold mb-2">
															Select an Interview Stage
														</h3>
														<p className="text-muted-foreground">
															Choose a stage from the left panel to view and manage candidates
														</p>
													</div>
												</CardContent>
											</Card>
										)}
									</div>
								</div>
							</TabsContent>

							<TabsContent value="history">
								<Card>
									<CardHeader>
										<div className="flex items-center justify-between">
											<div>
												<CardTitle className="flex items-center gap-2">
													<History className="h-5 w-5" />
													Complete Interview History
												</CardTitle>
												<p className="text-sm text-muted-foreground">
													View all candidates and their complete interview journey across all stages
												</p>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										{/* Search */}
										<div className="flex flex-col sm:flex-row gap-4">
											<div className="relative flex-1">
												<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
												<Input
													placeholder="Search all candidates..."
													value={searchTerm}
													onChange={(e) => setSearchTerm(e.target.value)}
													className="pl-10"
												/>
											</div>
										</div>

										{/* Bulk Actions for History View */}
										{selectedCandidates.length > 0 && (
											<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<Users className="h-4 w-4 text-blue-600" />
														<span className="text-sm font-medium text-blue-800">
															{selectedCandidates.length} candidate(s) selected
														</span>
													</div>
													<div className="flex items-center gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() => setSelectedCandidates([])}
														>
															Clear
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={handleBulkOnboard}
															className="text-purple-600 border-purple-200 hover:bg-purple-50"
														>
															<Users className="h-4 w-4 mr-2" />
															Onboard Selected
														</Button>
													</div>
												</div>
											</div>
										)}

										{/* History Table */}
										<div className="border rounded-lg max-h-[600px] overflow-auto">
											{filteredHistoryCandidates.length === 0 ? (
												<div className="text-center py-8">
													<History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
													<h3 className="text-lg font-semibold mb-2">No candidates found</h3>
													<p className="text-muted-foreground">
														{searchTerm
															? "No candidates match your search."
															: "No candidates have applied for this position yet."}
													</p>
												</div>
											) : (
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead className="w-12">
																<Checkbox
																	checked={
																		filteredHistoryCandidates.length > 0 &&
																		selectedCandidates.length === filteredHistoryCandidates.length
																	}
																	onCheckedChange={handleSelectAll}
																/>
															</TableHead>
															<TableHead>Candidate</TableHead>
															<TableHead>Contact</TableHead>
															<TableHead>Current Stage</TableHead>
															<TableHead>Overall Rating</TableHead>
															<TableHead>Progress</TableHead>
															<TableHead>Actions</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{filteredHistoryCandidates.map((candidate) => (
															<TableRow
																key={candidate.id}
																className={
																	candidate.status === "rejected" ||
																	candidate.status === "cancelled"
																		? "opacity-60 bg-red-50"
																		: ""
																}
															>
																<TableCell>
																	<Checkbox
																		checked={selectedCandidates.includes(candidate.id)}
																		onCheckedChange={(checked) =>
																			handleSelectCandidate(
																				candidate.id.toString(),
																				checked as boolean,
																			)
																		}
																		disabled={!canCandidateBeSelected(candidate)}
																		title={
																			isCandidateRejected(candidate)
																				? "Candidate is rejected/cancelled"
																				: canCandidateBeSelected(candidate)
																					? "Select for feedback"
																					: candidate.feedback && candidate.rating
																						? "Already has feedback and rating - use individual actions"
																						: "Cannot be selected"
																		}
																		className={
																			!canCandidateBeSelected(candidate) ? "opacity-50" : ""
																		}
																	/>
																</TableCell>
																<TableCell>
																	<div className="space-y-1">
																		<div className="font-medium">{candidate.applicant_name}</div>
																		<div className="text-xs text-muted-foreground capitalize">
																			{candidate.gender}
																		</div>
																	</div>
																</TableCell>
																<TableCell>
																	<div className="space-y-1">
																		<div className="flex items-center text-sm">
																			<Mail className="mr-1 h-3 w-3" />
																			{candidate.applicant_email}
																		</div>
																		{candidate.applicant_phone && (
																			<div className="flex items-center text-sm text-muted-foreground">
																				<Phone className="mr-1 h-3 w-3" />
																				{candidate.applicant_phone}
																			</div>
																		)}
																	</div>
																</TableCell>
																<TableCell>
																	<div className="text-center">
																		{candidate.current_stage_level > 0 ? (
																			<Badge
																				variant="secondary"
																				className="bg-blue-100 text-blue-700"
																			>
																				{candidate.current_stage_name}
																			</Badge>
																		) : (
																			<Badge
																				variant="secondary"
																				className="bg-gray-100 text-gray-500"
																			>
																				Not Started
																			</Badge>
																		)}
																	</div>
																</TableCell>
																<TableCell>
																	<div className="text-center">
																		{candidate.overall_rating > 0 ? (
																			<div className="flex items-center gap-1 justify-center">
																				<Star className="h-4 w-4 text-yellow-500" />
																				<span className="font-semibold">
																					{candidate.overall_rating}/10
																				</span>
																			</div>
																		) : (
																			<span className="text-sm text-gray-400">-</span>
																		)}
																	</div>
																</TableCell>
																<TableCell>
																	<div className="flex items-center gap-2">
																		<div className="flex-1">
																			<div className="flex items-center gap-2">
																				<div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
																					<div
																						className="h-full bg-blue-500 rounded-full transition-all"
																						style={{ width: `${candidate.completion_rate}%` }}
																					/>
																				</div>
																				<span className="text-sm font-medium">
																					{candidate.completion_rate}%
																				</span>
																			</div>
																			<div className="text-xs text-gray-500 mt-1">
																				{candidate.interview_history.length} stages completed
																			</div>
																		</div>
																	</div>
																</TableCell>
																<TableCell>
																	<div className="flex items-center gap-2">
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() => openHistoryDialog(candidate)}
																			className="text-blue-600 border-blue-200 hover:bg-blue-50"
																		>
																			<History className="h-4 w-4 mr-1" />
																			View History
																		</Button>
																		<DropdownMenu>
																			<DropdownMenuTrigger asChild>
																				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
																					<MoreVertical className="h-4 w-4" />
																				</Button>
																			</DropdownMenuTrigger>
																			<DropdownMenuContent align="end">
																				<DropdownMenuItem
																					onClick={async () => {
																						try {
																							const result =
																								await handleIndividualOnboard(candidate);

																							if (result.success) {
																								if (result.alreadyOnboarded) {
																									toast.warning(
																										`${candidate.applicant_name} is already onboarded`,
																									);
																								} else {
																									toast.success(
																										`${candidate.applicant_name} onboarded successfully`,
																									);
																								}
																							} else {
																								toast.error(
																									`Failed to onboard ${candidate.applicant_name}: ${result.message}`,
																								);
																							}
																						} catch (error) {
																							toast.error(
																								`Unexpected error occurred while onboarding ${candidate.applicant_name}`,
																							);
																						}
																					}}
																					className="text-purple-600"
																				>
																					<Users className="h-4 w-4 mr-2" />
																					Onboard Candidate
																				</DropdownMenuItem>
																			</DropdownMenuContent>
																		</DropdownMenu>
																	</div>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											)}
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					)}

					{/* Progress Indicator */}
					{processedStages.length > 0 && viewMode === "current" && (
						<div className="mt-6">
							<Card>
								<CardContent className="p-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">
										Pipeline Progress for {selectedJobPosition.name}
									</h3>
									<div className="flex items-center space-x-2 overflow-x-auto pb-4 px-2">
										{processedStages.map((stage, index) => (
											<div key={stage.id} className="flex items-center flex-shrink-0">
												<div
													className={`flex items-center justify-center w-12 h-12 rounded-full border-2 cursor-pointer transition-all ${
														stage.count > 0
															? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
															: "border-gray-300 bg-gray-50 text-gray-400 hover:bg-gray-100"
													} ${activeStageId === stage.id ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
													onClick={() => setActiveStageId(stage.id)}
													title={`Click to view ${stage.name}`}
												>
													<span className="text-sm font-bold">{stage.count}</span>
												</div>
												{index < processedStages.length - 1 && (
													<div
														className={`h-0.5 w-8 mx-2 ${stage.count > 0 ? "bg-green-500" : "bg-gray-300"}`}
													/>
												)}
											</div>
										))}
									</div>
									<div className="flex items-center space-x-2 mt-2 overflow-x-auto">
										{processedStages.map((stage, index) => (
											<div key={stage.id} className="flex items-center flex-shrink-0">
												<div className="w-12 text-center">
													<span
														className={`text-xs font-medium truncate block cursor-pointer ${
															activeStageId === stage.id ? "text-blue-600" : "text-gray-600"
														}`}
														onClick={() => setActiveStageId(stage.id)}
														title={stage.name}
													>
														{stage.name}
													</span>
												</div>
												{index < processedStages.length - 1 && <div className="w-8 mx-2" />}
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>
					)}
				</>
			)}

			{/* Dialogs */}
			<FeedbackDialog
				candidate={selectedCandidate}
				onSave={handleUpdateFeedback}
				isOpen={isFeedbackDialogOpen}
				onClose={() => {
					setIsFeedbackDialogOpen(false);
					setSelectedCandidate(null);
				}}
				nextStage={nextStageForActive}
				onReject={async () => {
					if (selectedCandidate) {
						try {
							await rejectCandidate(selectedCandidate.id);
							toast.success(`${selectedCandidate.applicant_name} rejected`);
							await fetchData();
						} catch (error) {
							toast.error(`Failed to reject ${selectedCandidate.applicant_name}`);
						}
					}
				}}
				onScheduleAndMove={handleIndividualScheduleAndMove}
			/>

			<InterviewSchedulingDialog
				isOpen={isSchedulingDialogOpen}
				onClose={() => {
					setIsSchedulingDialogOpen(false);
					setCandidatesToSchedule([]);
				}}
				onSchedule={handleScheduleAndMove}
				candidates={candidatesToSchedule}
				targetStage={nextStageForActive ?? null}
				isScheduling={isProcessingProgression}
			/>

			<CandidateHistoryDialog
				candidate={selectedCandidateWithHistory}
				isOpen={isHistoryDialogOpen}
				onClose={() => {
					setIsHistoryDialogOpen(false);
					setSelectedCandidateWithHistory(null);
				}}
				stages={processedStages}
			/>
			<InterviewStageDetailsDialog
				isOpen={isStageDetailsDialogOpen}
				onClose={() => {
					setIsStageDetailsDialogOpen(false);
					setSelectedStageForDetails(null);
				}}
				stage={selectedStageForDetails}
				candidate={null}
				size="lg"
			/>
			<EditInterviewStageDialog
				isOpen={isEditStageDialogOpen}
				onClose={() => {
					setIsEditStageDialogOpen(false);
					setSelectedStageForEdit(null);
				}}
				stage={selectedStageForEdit}
				onSave={handleSaveStageEdit}
				size="md"
			/>
		</div>
	);
}
