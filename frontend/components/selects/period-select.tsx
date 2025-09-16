"use client";

import { useState, useEffect } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERIODS_API } from "@/lib/utils";
import { IPeriod } from "@/types/types.utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

interface PeriodSelectProps {
	value?: number | string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function PeriodSelect({
	value,
	onValueChange,
	placeholder = "Select period",
	disabled = false,
	className,
}: PeriodSelectProps) {
	const [periods, setPeriods] = useState<IPeriod[]>([]);
	const [loading, setLoading] = useState(false);
	const currentInstitution = useSelector(selectSelectedInstitution);

	useEffect(() => {
		if (!currentInstitution) return;

		const fetchPeriods = async () => {
			setLoading(true);
			try {
				const response = await PERIODS_API.getPaginated({});
				setPeriods(response.results);
			} catch (error) {
				console.error("Failed to fetch periods:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchPeriods();
	}, [currentInstitution]);

	return (
		<Select
			value={value ? String(value) : ""}
			onValueChange={onValueChange}
			disabled={disabled || loading}
		>
			<SelectTrigger className={className}>
				<SelectValue placeholder={loading ? "Loading periods..." : placeholder} />
			</SelectTrigger>
			<SelectContent>
				{periods.map((period) => (
					<SelectItem key={period.id} value={String(period.id)}>
						<div className="flex flex-col">
							<span>{period.name}</span>
							<span className="text-xs text-slate-500">
								{new Date(period.start_date).toLocaleDateString()} -{" "}
								{new Date(period.end_date).toLocaleDateString()}
							</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
