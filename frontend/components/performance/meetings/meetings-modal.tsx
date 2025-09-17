"use client";

import type { IMeeting, IMeetingFormData } from "@/types/types.utils";

import { PerformanceFormModal } from "../common/performance-form-modal";

import { MeetingForm } from "./meetings-form";

interface MeetingModalProps {
	isOpen: boolean;
	onClose: () => void;
	meeting?: IMeeting;
	onSubmit: (data: IMeetingFormData) => void;
	isLoading?: boolean;
}

export function MeetingModal({ isOpen, onClose, meeting, onSubmit, isLoading }: MeetingModalProps) {
	return (
		<PerformanceFormModal
			isOpen={isOpen}
			onClose={onClose}
			title={meeting ? "Edit Meeting" : "Schedule New Meeting"}
			size="xl"
		>
			<MeetingForm
				initialData={meeting}
				onSubmit={onSubmit}
				onCancel={onClose}
				isLoading={isLoading}
			/>
		</PerformanceFormModal>
	);
}
