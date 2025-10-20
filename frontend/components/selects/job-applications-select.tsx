"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { JobApplication, JobApplicationStatus } from "@/types/types.utils";
import { JOB_APPLICATIONS_API } from "@/lib/api/job-positions.utils";

export interface JobApplicationsSearchableSelectProps {
	value: (string | number)[];
	defaultLabel?: string;
	onValueChange: (value: (string | number)[]) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
	triggerClassName?: string;
	multiple?: boolean;
	hideSelectedFromList?: boolean;
	showSelectedItems?: boolean;
	filters?: { status: JobApplicationStatus };
}

export const JobApplicationsSearchableSelect = memo(
	({
		value,
		defaultLabel,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select candidate(s)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		filters,
	}: JobApplicationsSearchableSelectProps) => {
		const currentInstitution = useSelector(selectSelectedInstitution);
		const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);

		useEffect(() => {
			setSelectedItems(value);
		}, [value]);

		const fetchFirstPage = useCallback(
			async (query?: { search?: string; page?: number }) => {
				if (!currentInstitution) {
					throw new Error("No institution found!");
				}
				return await JOB_APPLICATIONS_API.getPaginated({
					institutionId: currentInstitution.id,
					...query,
					status: filters?.status,
				});
			},
			[currentInstitution, filters?.status],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await JOB_APPLICATIONS_API.getPaginatedFromUrl({ url });
		}, []);

		const handleSelect = useCallback(
			(itemIds: (string | number)[], _items: PaginatedSelectItem<JobApplication>[]) => {
				if (
					itemIds.filter((item) =>
						selectedItems.find((s_item) => s_item.toString() !== item.toString()),
					)
				) {
					if (multiple) {
						onValueChange([...selectedItems, ...itemIds]);
					} else {
						onValueChange(itemIds);
					}
				}
			},
			[multiple, selectedItems, onValueChange],
		);

		const handleRemove = useCallback(
			(itemIds: (string | number)[], _item: PaginatedSelectItem<JobApplication>[]) => {
				const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<JobApplication, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(application) => application.id}
					getItemLabel={(application) => application.applicant_name || ""}
					getItemValue={(application) => application.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search candidates by name..."
					triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
					defaultLabel={defaultLabel}
				/>
			</div>
		);
	},
);

JobApplicationsSearchableSelect.displayName = "JobApplicationsSearchableSelect";

export default JobApplicationsSearchableSelect;
