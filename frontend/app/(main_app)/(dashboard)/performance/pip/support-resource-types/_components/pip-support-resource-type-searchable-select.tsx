"use client";

import { useState, useEffect } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PIP_SUPPORT_RESOURCE_TYPE_API } from "@/lib/api/performance.utils";
import type { IPIPSupportResourceType } from "@/types/performance.types";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast } from "@/lib/utils";

interface PIPSupportResourceTypeSearchableSelectProps {
	value: number[];
	onValueChange: (value: number[]) => void;
	placeholder?: string;
	disabled?: boolean;
	triggerClassName?: string;
}

export default function PIPSupportResourceTypeSearchableSelect({
	value,
	onValueChange,
	placeholder = "Select resource type...",
	disabled,
	triggerClassName,
}: PIPSupportResourceTypeSearchableSelectProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [resourceTypes, setResourceTypes] = useState<IPIPSupportResourceType[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!currentInstitution) return;
		const fetchResourceTypes = async () => {
			try {
				setLoading(true);
				const response = await PIP_SUPPORT_RESOURCE_TYPE_API.getPaginated({
					institutionId: currentInstitution.id,
				});
				setResourceTypes(response.results || []);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch resource types" });
			} finally {
				setLoading(false);
			}
		};
		fetchResourceTypes();
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
				{resourceTypes.map((resourceType) => (
					<SelectItem key={resourceType.id} value={resourceType.id.toString()}>
						{resourceType.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
