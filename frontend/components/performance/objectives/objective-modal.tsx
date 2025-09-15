"use client"

import { useRef } from "react"
import { PerformanceFormModal } from "../common/performance-form-modal"
import { ObjectiveForm } from "./objective-form"
import type { IObjectives, IObjectivesFormData } from "@/types/types.utils"


interface ObjectiveModalProps {
    isOpen: boolean
    onClose: () => void
    objective?: IObjectives
    onSubmit: (data: IObjectivesFormData) => void
    isLoading?: boolean
}

export function ObjectiveModal({ isOpen, onClose, objective, onSubmit, isLoading }: ObjectiveModalProps) {
    const formRef = useRef<HTMLFormElement>(null)

    const handleModalSubmit = () => {
        if (formRef.current) {
            formRef.current.requestSubmit()
        }
    }

    return (
        <PerformanceFormModal<IObjectivesFormData>
            isOpen={isOpen}
            onClose={onClose}
            title={objective ? "Edit Objective" : "Create New Objective"}
            size="lg"
            onSubmit={handleModalSubmit}
            isLoading={isLoading}
        >
            <ObjectiveForm ref={formRef} initialData={objective} onSubmit={onSubmit} isLoading={isLoading} />
        </PerformanceFormModal>
    )
}
