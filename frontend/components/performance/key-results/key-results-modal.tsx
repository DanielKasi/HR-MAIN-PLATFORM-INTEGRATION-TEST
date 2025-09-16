"use client"

import { PerformanceFormModal } from "../common/performance-form-modal"
import { KeyResultForm } from "./key-results-form"
import type { IKeyResult, IKeyResultFormData } from "@/types/types.utils"

interface KeyResultModalProps {
    isOpen: boolean
    onClose: () => void
    keyResult?: IKeyResult
    onSubmit: (data: IKeyResultFormData) => void
    isLoading?: boolean
}

export function KeyResultModal({ isOpen, onClose, keyResult, onSubmit, isLoading }: KeyResultModalProps) {
    return (
        <PerformanceFormModal<IKeyResultFormData>
            isOpen={isOpen}
            onClose={onClose}
            title={keyResult ? "Edit Key Result" : "Create New Key Result"}
            size="md"
            // onSubmit={onSubmit}
            isLoading={isLoading}
        >
            <KeyResultForm initialData={keyResult} onSubmit={onSubmit} isLoading={isLoading} />
        </PerformanceFormModal>
    )
}
