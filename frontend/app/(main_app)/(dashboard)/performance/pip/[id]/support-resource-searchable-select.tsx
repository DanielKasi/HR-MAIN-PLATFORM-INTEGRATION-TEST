"use client";

import { useState, useEffect } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PIP_SUPPORT_RESOURCE_API } from "@/lib/api/performance.utils";
import type { IPIPSupportResource } from "@/types/performance.types";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast } from "@/lib/utils";

interface PIPSupportResourceSearchableSelectProps {
	value: number[];
	onValueChange: (value: number[]) => void;
	placeholder?: string;
	disabled?: boolean;
	triggerClassName?: string;
	multiple?: boolean;
}

export default function PIPSupportResourceSearchableSelect({
	value,
	onValueChange,
	placeholder = "Select support resources...",
	disabled,
	triggerClassName,
	multiple,
}: PIPSupportResourceSearchableSelectProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [resources, setResources] = useState<IPIPSupportResource[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!currentInstitution) return;
		const fetchResources = async () => {
			try {
				setLoading(true);
				const response = await PIP_SUPPORT_RESOURCE_API.getPaginated({
					institutionId: currentInstitution.id,
				});
				setResources(response.results || []);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch support resources" });
			} finally {
				setLoading(false);
			}
		};
		fetchResources();
	}, [currentInstitution]);

	return (
		<Select
			value={multiple ? undefined : value[0]?.toString()}
			onValueChange={(val) => !multiple && onValueChange(val ? [Number(val)] : [])}
			disabled={disabled || loading}
		>
			<SelectTrigger className={triggerClassName}>
				<SelectValue placeholder={placeholder}>
					{multiple && value.length > 0
						? resources
								.filter((res) => value.includes(res.id))
								.map((res) => res.name)
								.join(", ")
						: undefined}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{resources.map((resource) => (
					<SelectItem
						key={resource.id}
						value={resource.id.toString()}
						onClick={() => {
							if (multiple) {
								const newValue = value.includes(resource.id)
									? value.filter((id) => id !== resource.id)
									: [...value, resource.id];
								onValueChange(newValue);
							}
						}}
					>
						{resource.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
