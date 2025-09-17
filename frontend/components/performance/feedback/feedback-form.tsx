"use client";

import type { IFeedback360, IFeedback360FormData } from "@/types/types.utils";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { PeriodSelect } from "@/components/selects/period-select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeedbackFormProps {
	initialData?: IFeedback360;
	onSubmit: (data: IFeedback360FormData) => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export function FeedbackForm({ initialData, onSubmit, onCancel, isLoading }: FeedbackFormProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [revieweeValue, setRevieweeValue] = useState<(string | number)[]>([]);
	const [reviewerValue, setReviewerValue] = useState<(string | number)[]>([]);
	const [periodValue, setPeriodValue] = useState<string>("");
	const [rating, setRating] = useState<number[]>([5]);
	const [formData, setFormData] = useState<Record<string, any>>(() => {
		if (!initialData) {
			return {
				feedback_text: "",
				strengths: "",
				areas_for_improvement: "",
				is_anonymous: false,
				submission_date: new Date().toISOString().split("T")[0],
			};
		}

		return {
			feedback_text: initialData.feedback_text || "",
			strengths: initialData.strengths || "",
			areas_for_improvement: initialData.areas_for_improvement || "",
			is_anonymous: initialData.is_anonymous || false,
			submission_date:
				initialData.submission_date?.split("T")[0] || new Date().toISOString().split("T")[0],
		};
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		// Set initial values
		if (initialData) {
			initialData.given_by && setRevieweeValue([initialData.given_by.id]);
			initialData.reviewer && setReviewerValue([initialData.reviewer.id]);
			if (initialData.period) {
				setPeriodValue(String(initialData.period.id));
			}
			if (initialData.rating) {
				setRating([initialData.rating]);
			}
		}
	}, [initialData]);

	const handleChange = (name: string, value: any) => {
		setFormData((prev) => ({ ...prev, [name]: value }));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		// Feedback text validation
		if (!formData.feedback_text || formData.feedback_text.length < 10) {
			newErrors.feedback_text = "Feedback must be at least 10 characters";
		}

		// Strengths validation
		if (formData.strengths && formData.strengths.length < 5) {
			newErrors.strengths = "Strengths must be at least 5 characters";
		}

		// Areas for improvement validation
		if (formData.areas_for_improvement && formData.areas_for_improvement.length < 5) {
			newErrors.areas_for_improvement = "Areas for improvement must be at least 5 characters";
		}

		// Submission date validation
		if (!formData.submission_date) {
			newErrors.submission_date = "Submission date is required";
		}

		// Reviewee and reviewer validation
		if (revieweeValue.length === 0) {
			newErrors.reviewee = "Reviewee is required";
		}
		if (reviewerValue.length === 0) {
			newErrors.reviewer = "Reviewer is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!currentInstitution ||
			!validateForm() ||
			revieweeValue.length === 0 ||
			reviewerValue.length === 0
		)
			return;

		const feedbackData: IFeedback360FormData = {
			reviewee_id: formData.is_anonymous ? Number(revieweeValue[0]) : null,
			reviewer_id: Number(reviewerValue[0]),
			period: periodValue ? Number(periodValue) : undefined,
			feedback_text: formData.feedback_text,
			strengths: formData.strengths || undefined,
			areas_for_improvement: formData.areas_for_improvement || undefined,
			rating: rating[0],
			is_anonymous: formData.is_anonymous || false,
			submission_date: formData.submission_date,
		};

		onSubmit(feedbackData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Employee Selection */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
				<div className="space-y-2">
					<label className="text-sm font-medium text-slate-700">
						Given by (Person who gave feedback) <span className="text-red-500">*</span>
					</label>
					<EmployeeSearchableSelect
						value={revieweeValue}
						onValueChange={setRevieweeValue}
						placeholder="Select here..."
						multiple={false}
						disabled={isLoading || !!initialData}
					/>
					{errors.reviewee && <p className="text-sm text-red-600">{errors.reviewee}</p>}
					{!!initialData && (
						<p className="text-xs text-slate-500">Reviewee cannot be changed after creation</p>
					)}
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium text-slate-700">
						Reviewer (Person giving feedback) <span className="text-red-500">*</span>
					</label>
					<EmployeeSearchableSelect
						value={reviewerValue}
						onValueChange={setReviewerValue}
						placeholder="Select reviewer"
						multiple={false}
						disabled={isLoading || !!initialData}
					/>
					{errors.reviewer && <p className="text-sm text-red-600">{errors.reviewer}</p>}
					{!!initialData && (
						<p className="text-xs text-slate-500">Reviewer cannot be changed after creation</p>
					)}
				</div>
			</div>

			{/* Period Selection */}
			<div className="space-y-2">
				<label className="text-sm font-medium text-slate-700">Performance Period (Optional)</label>
				<PeriodSelect
					value={periodValue}
					onValueChange={setPeriodValue}
					placeholder="Select performance period"
					disabled={isLoading}
				/>
				<p className="text-xs text-slate-500">
					Link this feedback to a specific performance period
				</p>
			</div>

			{/* Rating */}
			<div className="space-y-3">
				<Label className="text-sm font-medium text-slate-700">Overall Rating: {rating[0]}/10</Label>
				<div className="px-3">
					<Slider
						key="rating-slider" // Stabilizes React key for re-mounts
						value={rating}
						onValueChange={setRating}
						max={10}
						min={1}
						step={1}
						className="w-full"
						disabled={isLoading}
					/>
					<div className="flex justify-between text-xs text-slate-500 mt-1">
						<span>Poor (1)</span>
						<span>Average (5)</span>
						<span>Excellent (10)</span>
					</div>
				</div>
			</div>

			{/* Form Fields */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
				{/* Feedback Text */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="feedback_text" className="text-sm font-medium text-slate-700">
						Feedback <span className="text-red-500">*</span>
					</Label>
					<Textarea
						id="feedback_text"
						value={formData.feedback_text}
						onChange={(e) => handleChange("feedback_text", e.target.value)}
						placeholder="Provide detailed feedback..."
						disabled={isLoading}
						className={cn(
							"min-h-[100px] rounded-xl resize-none",
							errors.feedback_text && "border-red-500",
						)}
						rows={3}
					/>
					{errors.feedback_text && <p className="text-sm text-red-600">{errors.feedback_text}</p>}
				</div>

				{/* Strengths */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="strengths" className="text-sm font-medium text-slate-700">
						Strengths
					</Label>
					<Textarea
						id="strengths"
						value={formData.strengths}
						onChange={(e) => handleChange("strengths", e.target.value)}
						placeholder="What are this person's key strengths?"
						disabled={isLoading}
						className={cn(
							"min-h-[100px] rounded-xl resize-none",
							errors.strengths && "border-red-500",
						)}
						rows={3}
					/>
					{errors.strengths && <p className="text-sm text-red-600">{errors.strengths}</p>}
				</div>

				{/* Areas for Improvement */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="areas_for_improvement" className="text-sm font-medium text-slate-700">
						Areas for Improvement
					</Label>
					<Textarea
						id="areas_for_improvement"
						value={formData.areas_for_improvement}
						onChange={(e) => handleChange("areas_for_improvement", e.target.value)}
						placeholder="What areas could be improved?"
						disabled={isLoading}
						className={cn(
							"min-h-[100px] rounded-xl resize-none",
							errors.areas_for_improvement && "border-red-500",
						)}
						rows={3}
					/>
					{errors.areas_for_improvement && (
						<p className="text-sm text-red-600">{errors.areas_for_improvement}</p>
					)}
				</div>

				{/* Anonymous Feedback */}
				<div className="space-y-2">
					<Label htmlFor="is_anonymous" className="text-sm font-medium text-slate-700">
						Anonymous Feedback
					</Label>
					<div className="flex items-center space-x-2">
						<Switch
							id="is_anonymous"
							checked={formData.is_anonymous}
							onCheckedChange={(checked) => handleChange("is_anonymous", checked)}
							disabled={isLoading}
						/>
						<Label className="text-sm text-slate-600">Submit this feedback anonymously</Label>
					</div>
				</div>

				{/* Submission Date */}
				<div className="space-y-2">
					<Label htmlFor="submission_date" className="text-sm font-medium text-slate-700">
						Submission Date <span className="text-red-500">*</span>
					</Label>
					<Input
						id="submission_date"
						type="date"
						value={formData.submission_date}
						onChange={(e) => handleChange("submission_date", e.target.value)}
						disabled={isLoading}
						className={cn("rounded-xl", errors.submission_date && "border-red-500")}
					/>
					{errors.submission_date && (
						<p className="text-sm text-red-600">{errors.submission_date}</p>
					)}
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="submit" disabled={isLoading} className="px-8 w-full rounded-full">
					{isLoading ? "Saving..." : initialData ? "Update Feedback" : "Submit Feedback"}
				</Button>
			</div>
		</form>
	);
}
