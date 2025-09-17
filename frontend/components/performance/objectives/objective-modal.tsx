"use client";

import type { IObjective, IObjectiveFormData } from "@/types/types.utils";

import { useRef } from "react";

import { PerformanceFormModal } from "../common/performance-form-modal";

import { ObjectiveForm } from "./objective-form";

interface ObjectiveModalProps {
	isOpen: boolean;
	onClose: () => void;
	objective?: IObjective;
	onSubmit: (data: IObjectiveFormData) => void;
	isLoading?: boolean;
}

export function ObjectiveModal({
	isOpen,
	onClose,
	objective,
	onSubmit,
	isLoading,
}: ObjectiveModalProps) {
	const formRef = useRef<HTMLFormElement>(null);

	const handleModalSubmit = () => {
		if (formRef.current) {
			formRef.current.requestSubmit();
		}
	};

	return (
		<PerformanceFormModal<IObjectiveFormData>
			isOpen={isOpen}
			onClose={onClose}
			title={objective ? "Edit Objective" : "Create New Objective"}
			size="lg"
			onSubmit={handleModalSubmit}
			isLoading={isLoading}
		>
			<ObjectiveForm
				ref={formRef}
				initialData={objective}
				onSubmit={onSubmit}
				isLoading={isLoading}
			/>
		</PerformanceFormModal>
	);
}
