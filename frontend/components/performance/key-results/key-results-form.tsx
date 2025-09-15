"use client"

import { forwardRef } from "react"
import { PerformanceForm, type FormField } from "../common/performance-form"
import type { IKeyResult, IKeyResultFormData, IProgressType } from "@/types/types.utils"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { da } from "date-fns/locale"

interface KeyResultFormProps {
    initialData?: IKeyResult
    onSubmit: (data: IKeyResultFormData) => void
    isLoading?: boolean
}

export const KeyResultForm = forwardRef<HTMLFormElement, KeyResultFormProps>(
    ({ initialData, onSubmit, isLoading }, ref) => {
        const currentInstitution = useSelector(selectSelectedInstitution)

        const progressTypeOptions = [
            { value: "percentage", label: "Percentage" },
            { value: "number", label: "Number" },
        ]

        const fields: FormField[] = [
            {
                name: "title",
                label: "Key Result Title",
                type: "text",
                placeholder: "e.g., Increase customer satisfaction to 95%",
                required: true,
                validation: (value: string) => {
                    if (value.length < 5) return "Title must be at least 5 characters"
                    return null
                },
            },
            {
                name: "progress_type",
                label: "Progress Type",
                type: "select",
                options: progressTypeOptions,
                required: true,
            },
            {
                name: "description",
                label: "Description",
                type: "textarea",
                placeholder: "Describe what success looks like...",
                required: true,
                validation: (value: string) => {
                    if (value.length < 10) return "Description must be at least 10 characters"
                    return null
                },
            },

            {
                name: "target_value",
                label: "Target Value",
                type: "number",
                placeholder: "e.g., 95",
                required: true,
                validation: (value: string) => {
                    const num = Number.parseFloat(value)
                    if (isNaN(num)) return "Target value must be a valid number"
                    if (num <= 0) return "Target value must be greater than 0"
                    return null
                },
            },
            {
                name: "current_value",
                label: "Current Value",
                type: "number",
                placeholder: "e.g., 85",
                validation: (value: string) => {
                    if (value && isNaN(Number.parseFloat(value))) return "Current value must be a valid number"
                    return null
                },
            },
        ]

        const handleSubmit = (formData: Record<string, any>) => {
            if (!currentInstitution) return

            const keyResultData: IKeyResultFormData = {
                institution: currentInstitution.id,
                title: formData.title,
                description: formData.description,
                progress_type: formData.progress_type as IProgressType,
                target_value: Number.parseFloat(formData.target_value),
                duration: "0", // Placeholder, as duration is not part of this form
            }

            onSubmit(keyResultData)
        }

        const getInitialFormData = () => {
            if (!initialData) return {}

            return {
                title: initialData.title,
                description: initialData.description,
                progress_type: initialData.progress_type,
                target_value: initialData.target_value,

            }
        }

        return (
            <PerformanceForm
                ref={ref}
                fields={fields}
                initialData={getInitialFormData()}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                submitLabel={initialData ? "Update Key Result" : "Create Key Result"}
                showCancel={false}
                showSubmit={false}
            />
        )
    },
)

KeyResultForm.displayName = "KeyResultForm"
