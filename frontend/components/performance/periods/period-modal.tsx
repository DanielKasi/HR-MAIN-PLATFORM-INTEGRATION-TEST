"use client";

import type { IPeriod, IPeriodFormData } from "@/types/types.utils";

import { PerformanceFormModal } from "../common/performance-form-modal";

import { PeriodForm } from "./period-form";

interface PeriodModalProps {
	isOpen: boolean;
	onClose: () => void;
	period?: IPeriod;
	onSubmit: (data: IPeriodFormData) => void;
	isLoading?: boolean;
}

export function PeriodModal({ isOpen, onClose, period, onSubmit, isLoading }: PeriodModalProps) {
	return (
		<PerformanceFormModal
			isOpen={isOpen}
			onClose={onClose}
			title={period ? "Edit Period" : "Create New Period"}
			size="md"
		>
			<PeriodForm
				initialData={period}
				onSubmit={onSubmit}
				onCancel={onClose}
				isLoading={isLoading}
			/>
		</PerformanceFormModal>
	);
}
