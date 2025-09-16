"use client";

import { useState, useEffect } from "react";
import { PerformanceForm, type FormField } from "../common/performance-form";
import type { IFeedback360, IFeedback360FormData } from "@/types/types.utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { PeriodSelect } from "@/components/selects/period-select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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

	const fields: FormField[] = [
		{
			name: "feedback_text",
			label: "Feedback",
			type: "textarea",
			placeholder: "Provide detailed feedback...",
			required: true,
			validation: (value: string) => {
				if (value.length < 10) return "Feedback must be at least 10 characters";
				return null;
			},
		},
		{
			name: "strengths",
			label: "Strengths",
			type: "textarea",
			placeholder: "What are this person's key strengths?",
			validation: (value: string) => {
				if (value && value.length < 5) return "Strengths must be at least 5 characters";
				return null;
			},
		},
		{
			name: "areas_for_improvement",
			label: "Areas for Improvement",
			type: "textarea",
			placeholder: "What areas could be improved?",
			validation: (value: string) => {
				if (value && value.length < 5) return "Areas for improvement must be at least 5 characters";
				return null;
			},
		},
		{
			name: "is_anonymous",
			label: "Anonymous Feedback",
			type: "switch",
			description: "Submit this feedback anonymously",
		},
		{
			name: "submission_date",
			label: "Submission Date",
			type: "date",
			required: true,
		},
	];

	const handleSubmit = (formData: Record<string, any>) => {
		if (!currentInstitution || revieweeValue.length === 0 || reviewerValue.length === 0) return;

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

	const getInitialFormData = () => {
		if (!initialData) {
			return {
				submission_date: new Date().toISOString().split("T")[0],
				is_anonymous: false,
			};
		}

		return {
			feedback_text: initialData.feedback_text,
			strengths: initialData.strengths,
			areas_for_improvement: initialData.areas_for_improvement,
			is_anonymous: initialData.is_anonymous,
			submission_date: initialData.submission_date.split("T")[0],
		};
	};

	return (
		<div className="space-y-6">
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
			<PerformanceForm
				fields={fields}
				initialData={getInitialFormData()}
				onSubmit={handleSubmit}
				onCancel={onCancel}
				isLoading={isLoading}
				submitLabel={initialData ? "Update Feedback" : "Submit Feedback"}
				showCancel={false}
			/>
		</div>
	);
}
