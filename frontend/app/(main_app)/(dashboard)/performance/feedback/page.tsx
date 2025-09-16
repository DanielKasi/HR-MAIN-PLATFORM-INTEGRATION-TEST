"use client";

import type { IFeedback360, IFeedback360FormData } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { MessageSquare, Star, Users, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import { FEEDBACK_360_API } from "@/lib/utils";
import { FeedbackTable } from "@/components/performance/feedback/feedback-table";
import { FeedbackModal } from "@/components/performance/feedback/feedback-modal";
import { PerformanceStatsCard } from "@/components/performance/common/performance-stats-card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export default function FeedbackPage() {
	const [feedback, setFeedback] = useState<IFeedback360[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingFeedback, setEditingFeedback] = useState<IFeedback360 | undefined>();
	const [feedbackToDelete, setFeedbackToDelete] = useState<IFeedback360 | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const currentInstitution = useSelector(selectSelectedInstitution);

	const fetchFeedback = async () => {
		if (!currentInstitution) return;

		setLoading(true);
		try {
			const response = await FEEDBACK_360_API.getPaginated({});

			setFeedback(response.results);
		} catch (error) {
			toast.error("Failed to fetch feedback");
			console.error("Error fetching feedback:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchFeedback();
	}, [currentInstitution, searchQuery]);

	const handleCreate = () => {
		setEditingFeedback(undefined);
		setModalOpen(true);
	};

	const handleEdit = (feedbackItem: IFeedback360) => {
		setEditingFeedback(feedbackItem);
		setModalOpen(true);
	};

	const handleSubmit = async (data: IFeedback360FormData) => {
		setSubmitting(true);
		try {
			if (editingFeedback) {
				await FEEDBACK_360_API.update({ feedbackId: editingFeedback.id, data });
				toast.success("Feedback updated successfully");
			} else {
				await FEEDBACK_360_API.create({ data });
				toast.success("Feedback submitted successfully");
			}

			setModalOpen(false);
			fetchFeedback();
		} catch (error: any) {
			toast.error(error.message || "Failed to save feedback");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (feedbackItem: IFeedback360) => {
		if (!feedbackToDelete) return;

		try {
			await FEEDBACK_360_API.delete({ feedbackId: feedbackItem.id });
			toast.success("Feedback deleted successfully");
			fetchFeedback();
		} catch (error: any) {
			toast.error(error.message || "Failed to delete feedback");
		}
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	// Calculate stats
	const totalFeedback = feedback.length;
	const averageRating =
		feedback.length > 0
			? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) /
				feedback.filter((f) => f.rating).length
			: 0;
	const anonymousFeedback = feedback.filter((f) => !f.given_by).length;
	const withRatings = feedback.filter((f) => f.rating).length;

	return (
		<div className="min-h-screen p-6 bg-white">
			<div className="">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<Link href="/performance">
							<Button
								variant="outline"
								size="sm"
								className="rounded-full aspect-square p-0 w-10 h-10 bg-transparent"
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								360° Feedback
							</h1>
							<p className="text-slate-600 text-lg">
								Collect and manage multi-source performance feedback
							</p>
						</div>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<PerformanceStatsCard
						title="Total Feedback"
						value={totalFeedback}
						icon={<MessageSquare className="h-5 w-5" />}
						description="All feedback entries"
					/>
					<PerformanceStatsCard
						title="Average Rating"
						value={averageRating.toFixed(1)}
						icon={<Star className="h-5 w-5" />}
						description="Out of 10"
					/>
					<PerformanceStatsCard
						title="Anonymous"
						value={anonymousFeedback}
						icon={<Eye className="h-5 w-5" />}
						description="Anonymous feedback"
					/>
					<PerformanceStatsCard
						title="With Ratings"
						value={withRatings}
						icon={<Users className="h-5 w-5" />}
						description="Include numeric ratings"
					/>
				</div>

				{/* Feedback Table */}
				<FeedbackTable
					feedback={feedback}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onAdd={handleCreate}
					onSearch={handleSearch}
					isLoading={loading}
				/>

				{/* Feedback Modal */}
				<FeedbackModal
					isOpen={modalOpen}
					onClose={() => setModalOpen(false)}
					feedback={editingFeedback}
					onSubmit={handleSubmit}
					isLoading={submitting}
				/>
				{feedbackToDelete && (
					<ConfirmationDialog
						description="Are you sure you want to delete this feedback? This action cannot be undone."
						isOpen={!!feedbackToDelete}
						title={
							feedbackToDelete.given_by?.user?.fullname
								? `Delete feedback from ${feedbackToDelete.given_by?.user?.fullname} ${feedbackToDelete.reviewer ? "for " + feedbackToDelete.reviewer?.user?.fullname : "Unknown"}?`
								: `Delete anonymous feedback ?`
						}
						onConfirm={() => handleDelete(feedbackToDelete)}
						onClose={() => {
							setFeedbackToDelete(null);
						}}
					/>
				)}
			</div>
		</div>
	);
}
