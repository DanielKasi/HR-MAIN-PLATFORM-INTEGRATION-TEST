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
import { RichTextEditor } from "@/components/common/rich-editor";

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
	const [formData, setFormData] = useState<Partial<IFeedback360FormData>>(() => {
		if (!initialData) {
			return {
				feedback_text: "",
				is_anonymous: false,
				submission_date: new Date().toISOString().split("T")[0],
			};
		}

		return {
			feedback_text: initialData.feedback_text || "",
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

		// Submission date validation
		if (!formData.submission_date) {
			newErrors.submission_date = "Submission date is required";
		}

		// Reviewee and reviewer validation
		if (revieweeValue.length === 0 && !formData.is_anonymous) {
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
		if (!currentInstitution || !validateForm()) return;

		const feedbackData: IFeedback360FormData = {
			reviewer_id: Number(reviewerValue[0]),
			period: periodValue ? Number(periodValue) : undefined,
			feedback_text: formData.feedback_text,
			rating: rating[0],
			submission_date: formData.submission_date,
		};

		if (!formData.is_anonymous && revieweeValue) {
			feedbackData["given_by"] = Number(revieweeValue[0]);
		}

		onSubmit(feedbackData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Employee Selection */}

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

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
				{!formData.is_anonymous && (
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
				)}

				<div className="space-y-2">
					<label className="text-sm font-medium text-slate-700">
						Reviewer (Person to review the feedback) <span className="text-red-500">*</span>
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
					<RichTextEditor
						value={formData.feedback_text || ""}
						onChange={(value) => handleChange("feedback_text", value)}
					/>
					{errors.feedback_text && <p className="text-sm text-red-600">{errors.feedback_text}</p>}
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
