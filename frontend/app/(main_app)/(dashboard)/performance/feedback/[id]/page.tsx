"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Star, User, Calendar, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FEEDBACK_360_API, showErrorToast } from "@/lib/utils";
import type { IFeedback360 } from "@/types/types.utils";
import ApprovableInstancePageLayout from "@/components/common/layouts/approvable-instance-layout";

const FeedbackDetailPage = () => {
	const [feedback, setFeedback] = useState<IFeedback360 | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const params = useParams();
	const feedbackId = params?.id as string;

	const fetchFeedbackDetail = async () => {
		if (!feedbackId) return;

		try {
			setLoading(true);
			const numericId = Number(feedbackId);

			if (isNaN(numericId)) {
				throw new Error("Invalid feedback ID format");
			}

			const feedbackData = await FEEDBACK_360_API.getById({
				feedbackId: numericId,
			});
			setFeedback(feedbackData);
		} catch (error) {
			showErrorToast({
				error: error,
				defaultMessage: "Failed to fetch feedback details.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchFeedbackDetail();
	}, [feedbackId]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getRatingBadge = (rating: number | null) => {
		if (!rating) return "bg-gray-100 text-gray-800";
		if (rating >= 8) return "bg-green-100 text-green-800";
		if (rating >= 6) return "bg-yellow-100 text-yellow-800";
		if (rating >= 4) return "bg-orange-100 text-orange-800";
		return "bg-red-100 text-red-800";
	};

	const getRatingText = (rating: number | null) => {
		if (!rating) return "No Rating";
		if (rating >= 8) return "Excellent";
		if (rating >= 6) return "Good";
		if (rating >= 4) return "Fair";
		return "Needs Improvement";
	};

	if (loading) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
					<div className="grid gap-6 md:grid-cols-2">
						<div className="h-64 bg-gray-200 rounded"></div>
						<div className="h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!feedback) {
		return (
			<div className="space-y-6 p-6 bg-white">
				<div className="text-center py-12">
					<h2 className="text-lg font-semibold text-gray-900">Feedback not found</h2>
					<p className="text-gray-600 mt-2">The feedback you're looking for doesn't exist.</p>
					<Button onClick={() => router.back()} className="mt-4">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6 bg-white">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Button
						variant="outline"
						size="sm"
						className="flex items-center gap-2 rounded-full aspect-square flex-shrink-0"
						onClick={() => router.back()}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
					</Button>
					<div className="mt-4">
						<h1 className="text-2xl font-semibold tracking-tight">360° Feedback Details</h1>
						<p className="text-muted-foreground">Performance Feedback Review</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{feedback.is_anonymous ? (
						<EyeOff className="h-4 w-4 text-gray-600" />
					) : (
						<Eye className="h-4 w-4 text-blue-600" />
					)}
					<Badge variant={feedback.is_anonymous ? "secondary" : "default"}>
						{feedback.is_anonymous ? "Anonymous" : "Named"}
					</Badge>
				</div>
			</div>

			<ApprovableInstancePageLayout instance={feedback} onInstanceRefresh={fetchFeedbackDetail}>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Feedback Content */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<MessageSquare className="mr-2 h-5 w-5" />
								Feedback Content
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Rating */}
							{feedback.rating && (
								<div className="space-y-2">
									<span className="text-sm font-medium text-gray-700">Rating:</span>
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-1">
											<Star className="h-4 w-4 text-yellow-500" />
											<span className="text-lg font-semibold">{feedback.rating}/10</span>
										</div>
										<Badge className={`${getRatingBadge(feedback.rating)} border`}>
											{getRatingText(feedback.rating)}
										</Badge>
									</div>
								</div>
							)}

							{/* Feedback Text */}
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Feedback:</span>
								<Textarea
									value={feedback.feedback_text || "No feedback text provided"}
									disabled
									rows={6}
									className="resize-none bg-gray-50 border-gray-200"
								/>
							</div>

							{/* Submission Date */}
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Submitted:</span>
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-gray-500" />
									<span className="text-sm">{formatDate(feedback.submission_date)}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Participants Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<User className="mr-2 h-5 w-5" />
								Participants
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Feedback Giver */}
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Given By:</span>
								{feedback.is_anonymous ? (
									<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
										<div className="flex items-center gap-2">
											<EyeOff className="h-4 w-4 text-gray-500" />
											<span className="text-sm text-gray-600">Anonymous Feedback</span>
										</div>
									</div>
								) : feedback.given_by ? (
									<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
										<p className="text-sm font-medium text-blue-900">
											{feedback.given_by.name || feedback.given_by.user?.fullname}
										</p>
										<p className="text-sm text-blue-700">
											{feedback.given_by.user?.email || feedback.given_by.email}
										</p>
										<p className="text-sm text-blue-600">
											{feedback.given_by.position?.name} - {feedback.given_by.department?.name}
										</p>
									</div>
								) : (
									<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
										<span className="text-sm text-gray-600">Unknown</span>
									</div>
								)}
							</div>

							{/* Reviewer */}
							<div className="space-y-2">
								<span className="text-sm font-medium text-gray-700">Reviewer (About):</span>
								{feedback.reviewer ? (
									<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
										<p className="text-sm font-medium text-green-900">
											{feedback.reviewer.name || feedback.reviewer.user?.fullname}
										</p>
										<p className="text-sm text-green-700">
											{feedback.reviewer.user?.email || feedback.reviewer.email}
										</p>
										<p className="text-sm text-green-600">
											{feedback.reviewer.position?.name} - {feedback.reviewer.department?.name}
										</p>
									</div>
								) : (
									<div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
										<span className="text-sm text-gray-600">No specific reviewer</span>
									</div>
								)}
							</div>

							{/* Period */}
							{feedback.period && (
								<div className="space-y-2">
									<span className="text-sm font-medium text-gray-700">Review Period:</span>
									<div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
										<p className="text-sm font-medium text-purple-900">{feedback.period.name}</p>
										{feedback.period.description && (
											<p className="text-sm text-purple-700">{feedback.period.description}</p>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* System Information */}
					<Card className="md:col-span-2">
						<CardHeader>
							<CardTitle className="flex items-center">
								<Calendar className="mr-2 h-5 w-5" />
								System Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-4">
								<div className="space-y-2">
									<span className="text-sm font-medium">Feedback ID:</span>
									<p className="text-sm">#{feedback.id}</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Type:</span>
									<p className="text-sm">{feedback.is_anonymous ? "Anonymous" : "Named"}</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Has Rating:</span>
									<p className="text-sm">{feedback.rating ? "Yes" : "No"}</p>
								</div>
								<div className="space-y-2">
									<span className="text-sm font-medium">Submission Date:</span>
									<p className="text-sm">{formatDate(feedback.submission_date)}</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</ApprovableInstancePageLayout>
		</div>
	);
};

export default FeedbackDetailPage;
