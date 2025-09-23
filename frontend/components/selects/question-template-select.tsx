"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useSelector } from "react-redux";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { QUESTION_TEMPLATES_API } from "@/lib/utils";
import { IQuestionTemplate } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface QuestionTemplateSelectProps {
	value?: number | string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	category?: string;
}

export const QuestionTemplateSelect = memo(
	({
		value,
		onValueChange,
		placeholder = "Select template",
		disabled = false,
		className,
		category,
	}: QuestionTemplateSelectProps) => {
		const [templates, setTemplates] = useState<IQuestionTemplate[]>([]);
		const [loading, setLoading] = useState(false);
		const currentInstitution = useSelector(selectSelectedInstitution);

		const fetchTemplates = useCallback(async () => {
			if (!currentInstitution) return;
			setLoading(true);
			try {
				const response = await QUESTION_TEMPLATES_API.getPaginated({});
				let filteredTemplates = response.results;
				if (category) {
					filteredTemplates = response.results.filter((t) => t.category === category);
				}
				setTemplates(filteredTemplates);
			} catch (error) {
				console.error("Failed to fetch question templates:", error);
			} finally {
				setLoading(false);
			}
		}, [currentInstitution, category]);

		useEffect(() => {
			fetchTemplates();
		}, [fetchTemplates]);

		return (
			<Select
				value={value ? String(value) : ""}
				onValueChange={onValueChange}
				disabled={disabled || loading}
			>
				<SelectTrigger className={className}>
					<SelectValue placeholder={loading ? "Loading templates..." : placeholder} />
				</SelectTrigger>
				<SelectContent>
					{templates.map((template) => (
						<SelectItem key={template.id} value={String(template.id)}>
							<div className="flex flex-col">
								<span>{template.name}</span>
								<span className="text-xs text-slate-500 capitalize">
									{template.category.replace(/_/g, " ")} • {template.questions?.length || 0}{" "}
									questions
								</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	},
);

QuestionTemplateSelect.displayName = "QuestionTemplateSelect";

export default QuestionTemplateSelect;
