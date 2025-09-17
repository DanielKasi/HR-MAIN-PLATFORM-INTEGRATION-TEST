"use client";

import type { IFeedback360, IFeedback360FormData } from "@/types/types.utils";

import { PerformanceFormModal } from "../common/performance-form-modal";

import { FeedbackForm } from "./feedback-form";

interface FeedbackModalProps {
	isOpen: boolean;
	onClose: () => void;
	feedback?: IFeedback360;
	onSubmit: (data: IFeedback360FormData) => void;
	isLoading?: boolean;
}

export function FeedbackModal({
	isOpen,
	onClose,
	feedback,
	onSubmit,
	isLoading,
}: FeedbackModalProps) {
	return (
		<PerformanceFormModal
			isOpen={isOpen}
			onClose={onClose}
			title={feedback ? "Edit 360° Feedback" : "Give 360° Feedback"}
			size="lg"
		>
			<FeedbackForm
				initialData={feedback}
				onSubmit={onSubmit}
				onCancel={onClose}
				isLoading={isLoading}
			/>
		</PerformanceFormModal>
	);
}
