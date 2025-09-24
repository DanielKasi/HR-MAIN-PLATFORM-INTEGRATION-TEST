"use client";

import { useState, useEffect } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERFORMANCE_CONCERN_TYPE_API } from "@/lib/api/performance.utils";
import type { IPerformanceConcernType } from "@/types/performance.types";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast } from "@/lib/utils";

interface PerformanceConcernTypeSearchableSelectProps {
	value: number[];
	onValueChange: (value: number[]) => void;
	placeholder?: string;
	disabled?: boolean;
	triggerClassName?: string;
}

export default function PerformanceConcernTypeSearchableSelect({
	value,
	onValueChange,
	placeholder = "Select concern type...",
	disabled,
	triggerClassName,
}: PerformanceConcernTypeSearchableSelectProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [categories, setCategories] = useState<IPerformanceConcernType[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!currentInstitution) return;
		const fetchCategories = async () => {
			try {
				setLoading(true);
				const response = await PERFORMANCE_CONCERN_TYPE_API.getPaginated({
					institutionId: currentInstitution.id,
				});
				setCategories(response.results || []);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch concern types" });
			} finally {
				setLoading(false);
			}
		};
		fetchCategories();
	}, [currentInstitution]);

	return (
		<Select
			value={value[0]?.toString()}
			onValueChange={(val) => onValueChange(val ? [Number(val)] : [])}
			disabled={disabled || loading}
		>
			<SelectTrigger className={triggerClassName}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{categories.map((category) => (
					<SelectItem key={category.id} value={category.id.toString()}>
						{category.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
