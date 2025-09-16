"use client"

import { PerformanceFormModal } from "../common/performance-form-modal"
import { EmployeeObjectiveForm } from "./employee-objective-form"
import type { IEmployeeObjective, IEmployeeObjectiveFormData } from "@/types/types.utils"

interface EmployeeObjectiveModalProps {
    isOpen: boolean
    onClose: () => void
    employeeObjective?: IEmployeeObjective
    onSubmit: (data: IEmployeeObjectiveFormData) => void
    isLoading?: boolean
}

export function EmployeeObjectiveModal({
    isOpen,
    onClose,
    employeeObjective,
    onSubmit,
    isLoading,
}: EmployeeObjectiveModalProps) {
    return (
        <PerformanceFormModal
            isOpen={isOpen}
            onClose={onClose}
            title={employeeObjective ? "Edit Objective Assignment" : "Assign Objective to Employee"}
            size="lg"
        >
            <EmployeeObjectiveForm
                initialData={employeeObjective}
                onSubmit={onSubmit}
                onCancel={onClose}
                isLoading={isLoading}
            />
        </PerformanceFormModal>
    )
}
