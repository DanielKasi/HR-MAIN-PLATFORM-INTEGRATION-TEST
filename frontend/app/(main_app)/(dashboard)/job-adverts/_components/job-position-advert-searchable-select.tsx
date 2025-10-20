"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { JobPositionAdvert } from "@/types/types.utils";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";
import { getJobPositionAdverts } from "@/lib/utils";

export interface JobPositionAdvertSearchableSelectSelectProps {
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
	setJobPositionAdverts?: (jobPositionAdverts: JobPositionAdvert[]) => void;
}

export const JobPositionAdvertSearchableSelectSelect = memo(
	({
		value,
		defaultLabel,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select job position advert",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		setJobPositionAdverts,
	}: JobPositionAdvertSearchableSelectSelectProps) => {
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
				return await getJobPositionAdverts({ institutionId: currentInstitution.id, ...query });
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await getPaginatedFromUrl<JobPositionAdvert>({ url });
		}, []);

		const handleSelect = useCallback(
			(itemIds: (string | number)[], _items: PaginatedSelectItem<JobPositionAdvert>[]) => {
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
			(itemIds: (string | number)[], _item: PaginatedSelectItem<JobPositionAdvert>[]) => {
				const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<JobPositionAdvert, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(job_position_advert) => job_position_advert.id}
					getItemLabel={(job_position_advert) =>
						job_position_advert.job_position_details.name || ""
					}
					getItemValue={(job_position_advert) => job_position_advert.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search job position adverts..."
					triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
					setParentItems={setJobPositionAdverts}
					defaultLabel={defaultLabel}
				/>
			</div>
		);
	},
);

JobPositionAdvertSearchableSelectSelect.displayName = "JobPositionAdvertSearchableSelectSelect";

export default JobPositionAdvertSearchableSelectSelect;
