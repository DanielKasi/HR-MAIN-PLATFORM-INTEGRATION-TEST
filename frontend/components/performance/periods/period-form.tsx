"use client";


import { FormField, PerformanceForm } from "../common/performance-form";
import { IPeriod, IPeriodFormData } from "@/types/types.utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface PeriodFormProps {
    initialData?: IPeriod;
    onSubmit: (data: IPeriodFormData) => void;
    onCancel?: () => void;
    isLoading?: boolean;
}

export function PeriodForm({ initialData, onSubmit, onCancel, isLoading }: PeriodFormProps) {
    const currentInstitution = useSelector(selectSelectedInstitution);

    const fields: FormField[] = [
        {
            name: "name",
            label: "Period Name",
            type: "text",
            placeholder: "e.g., Q1 2024 Performance Review",
            required: true,
            validation: (value: string) => {
                if (value.length < 3) return "Period name must be at least 3 characters";
                return null;
            }
        },
        {
            name: "start_date",
            label: "Start Date",
            type: "date",
            required: true,
            validation: (value: string) => {
                const startDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (startDate < today) {
                    return "Start date cannot be in the past";
                }
                return null;
            }
        },
        {
            name: "end_date",
            label: "End Date",
            type: "date",
            required: true,
            validation: (value: string, formData?: Record<string, any>) => {
                if (!formData?.start_date) return null;

                const startDate = new Date(formData.start_date);
                const endDate = new Date(value);

                if (endDate <= startDate) {
                    return "End date must be after start date";
                }

                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 7) {
                    return "Period must be at least 7 days long";
                }

                return null;
            }
        },
        {
            name: "is_closed",
            label: "Period Status",
            type: "switch",
            description: "Mark as closed to prevent further modifications",
        }
    ];

    const handleSubmit = (formData: Record<string, any>) => {
        if (!currentInstitution) return;

        const periodData: IPeriodFormData = {
            institution: currentInstitution.id,
            name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            is_closed: formData.is_closed || false,
        };

        onSubmit(periodData);
    };

    const getInitialFormData = () => {
        if (!initialData) return {};

        return {
            name: initialData.name,
            start_date: initialData.start_date,
            end_date: initialData.end_date,
            is_closed: initialData.is_closed,
        };
    };

    return (
        <PerformanceForm
            fields={fields}
            initialData={getInitialFormData()}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            isLoading={isLoading}
            submitLabel={initialData ? "Update Period" : "Create Period"}
        />
    );
}
