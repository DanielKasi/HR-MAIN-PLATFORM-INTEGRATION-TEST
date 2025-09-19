"use client";

import type React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Users,
	Calendar,
	MapPin,
	Clock,
	Mail,
	Phone,
	Building2,
	Star,
	UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessedStage {
	id: string;
	name: string;
	count: number;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
	level: number;
	interviewer: string;
	candidates: any[];
}

interface InterviewCandidate {
	id: number;
	applicant_name: string;
	applicant_email: string;
	applicant_phone: string;
	interview_date?: string;
	interview_time?: string;
	location?: string;
	feedback?: string;
	rating?: number;
	status: string;
}

interface InterviewStageDetailsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	stage: ProcessedStage | null;
	candidate?: InterviewCandidate | null;
	size?: "sm" | "md" | "lg" | "xl";
}

export function InterviewStageDetailsDialog({
	isOpen,
	onClose,
	stage,
	candidate,
	size = "lg",
}: InterviewStageDetailsDialogProps) {
	const sizeClasses = {
		sm: "max-w-md",
		md: "max-w-lg",
		lg: "max-w-2xl",
		xl: "max-w-4xl",
	};

	if (!stage) return null;

	// Parse interviewer names (assuming they're comma-separated)
	const interviewers = stage.interviewer
		.split(", ")
		.filter((name) => name.trim() !== "Not assigned");

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className={cn("p-0 rounded-xl overflow-hidden", sizeClasses[size])}>
				<DialogHeader className="px-6 py-4 border-b">
					<div className="flex items-center justify-between">
						<DialogTitle className="text-xl font-semibold text-slate-900 flex items-center gap-3">
							<div className={`p-2 rounded-lg ${stage.bgColor}`}>
								<div className={stage.color}>{stage.icon}</div>
							</div>
							Interview Stage Details
						</DialogTitle>
					</div>
				</DialogHeader>

				<div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-6">
					{/* Stage Information */}
					<Card>
						<CardContent className="p-4">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
										<p className="text-sm text-gray-600">Level {stage.level}</p>
									</div>
									<Badge variant="secondary" className="bg-orange-100 text-orange-700 font-semibold">
										{stage.count} Candidates
									</Badge>
								</div>

								{/* Stage Stats */}
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-gray-50 rounded-lg p-3">
										<div className="flex items-center gap-2">
											<Users className="h-4 w-4 text-gray-500" />
											<span className="text-sm font-medium">Active Candidates</span>
										</div>
										<p className="text-2xl font-bold text-gray-900 mt-1">{stage.count}</p>
									</div>
									<div className="bg-gray-50 rounded-lg p-3">
										<div className="flex items-center gap-2">
											<Building2 className="h-4 w-4 text-gray-500" />
											<span className="text-sm font-medium">Stage Level</span>
										</div>
										<p className="text-2xl font-bold text-gray-900 mt-1">{stage.level}</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Interviewers Section */}
					<Card>
						<CardContent className="p-4">
							<h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Interviewers</h4>
							{interviewers.length === 0 || stage.interviewer === "Not assigned" ? (
								<div className="text-center py-6">
									<UserCheck className="h-8 w-8 text-gray-400 mx-auto mb-2" />
									<p className="text-gray-500">No interviewers assigned to this stage</p>
								</div>
							) : (
								<div className="space-y-3">
									{interviewers.map((interviewer, index) => (
										<div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
											<div className="p-2 bg-blue-100 rounded-full">
												<UserCheck className="h-4 w-4" />
											</div>
											<div className="flex-1">
												<p className="font-medium text-gray-900">{interviewer}</p>
												<p className="text-sm text-gray-500">Interview Panel Member</p>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Candidate Context (if provided) */}
					{candidate && (
						<Card>
							<CardContent className="p-4">
								<h4 className="text-lg font-semibold text-gray-900 mb-4">
									Interview Details for {candidate.applicant_name}
								</h4>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Contact Information */}
									<div className="space-y-3">
										<h5 className="font-medium text-gray-700">Contact Information</h5>
										<div className="space-y-2">
											<div className="flex items-center gap-2 text-sm">
												<Mail className="h-4 w-4 text-gray-500" />
												<span>{candidate.applicant_email}</span>
											</div>
											{candidate.applicant_phone && (
												<div className="flex items-center gap-2 text-sm">
													<Phone className="h-4 w-4 text-gray-500" />
													<span>{candidate.applicant_phone}</span>
												</div>
											)}
										</div>
									</div>

									{/* Interview Schedule */}
									<div className="space-y-3">
										<h5 className="font-medium text-gray-700">Schedule Information</h5>
										<div className="space-y-2">
											{candidate.interview_date && (
												<div className="flex items-center gap-2 text-sm">
													<Calendar className="h-4 w-4 text-gray-500" />
													<span>
														{new Date(candidate.interview_date).toLocaleDateString()}
														{candidate.interview_time && ` at ${candidate.interview_time}`}
													</span>
												</div>
											)}
											{candidate.location && (
												<div className="flex items-center gap-2 text-sm">
													<MapPin className="h-4 w-4 text-gray-500" />
													<span>{candidate.location}</span>
												</div>
											)}
											<div className="flex items-center gap-2 text-sm">
												<Clock className="h-4 w-4 text-gray-500" />
												<Badge
													variant="secondary"
													className={cn(
														"capitalize",
														candidate.status === "scheduled" && "bg-blue-100 text-blue-700",
														candidate.status === "completed" && "bg-green-100 text-green-700",
														candidate.status === "cancelled" && "bg-red-100 text-red-700",
													)}
												>
													{candidate.status}
												</Badge>
											</div>
										</div>
									</div>
								</div>

								{/* Performance Information */}
								{(candidate.feedback || candidate.rating) && (
									<div className="mt-4 pt-4 border-t">
										<h5 className="font-medium text-gray-700 mb-3">Performance Review</h5>
										<div className="space-y-3">
											{candidate.rating && (
												<div className="flex items-center gap-2">
													<Star className="h-4 w-4 text-yellow-500" />
													<span className="font-semibold">Rating: {candidate.rating}/10</span>
												</div>
											)}
											{candidate.feedback && (
												<div className="bg-gray-50 rounded-lg p-3">
													<p className="text-sm font-medium text-gray-700 mb-1">Feedback</p>
													<p className="text-sm text-gray-600">{candidate.feedback}</p>
												</div>
											)}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Stage Guidelines or Additional Info */}
					<Card>
						<CardContent className="p-4">
							<h4 className="text-lg font-semibold text-gray-900 mb-3">Stage Information</h4>
							<div className="bg-blue-50 rounded-lg p-4">
								<div className="flex items-start gap-3">
									<div className={`p-2 rounded-lg ${stage.bgColor} flex-shrink-0`}>
										<div className={stage.color}>{stage.icon}</div>
									</div>
									<div>
										<p className="font-medium text-blue-900">Stage: {stage.name}</p>
										<p className="text-sm text-blue-700 mt-1">
											This is level {stage.level} of the interview process.
											{stage.count > 0
												? ` Currently ${stage.count} candidate${stage.count === 1 ? "" : "s"} ${stage.count === 1 ? "is" : "are"} in this stage.`
												: " No candidates are currently in this stage."}
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	);
}
