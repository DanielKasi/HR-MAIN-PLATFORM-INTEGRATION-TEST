"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { getPaginatedJobPositions, getPaginatedJobPositionsFromUrl } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IJobPosition } from "@/types/types.utils";

export interface JobPositionSearchableSelectProps {
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
	setPositions?: (positions: IJobPosition[]) => void;
}

export const JobPositionSearchableSelect = memo(
	({
		value,
		defaultLabel,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select Position(s)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		setPositions,
	}: JobPositionSearchableSelectProps) => {
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
				return await getPaginatedJobPositions({ institutionId: currentInstitution.id, ...query });
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await getPaginatedJobPositionsFromUrl(url);
		}, []);

		const handleSelect = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IJobPosition>) => {
				if (!selectedItems.includes(itemId)) {
					if (multiple) {
						onValueChange([...selectedItems, itemId]);
					} else {
						onValueChange([itemId]);
					}
				}
			},
			[multiple, selectedItems, onValueChange],
		);

		const handleRemove = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IJobPosition>) => {
				const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<IJobPosition, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(position) => position.id}
					getItemLabel={(position) => position.name || ""}
					getItemValue={(position) => position.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search job positions by name..."
					triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
					setParentItems={setPositions}
					defaultLabel={defaultLabel}
				/>
			</div>
		);
	},
);

JobPositionSearchableSelect.displayName = "JobPositionSearchableSelect";

export default JobPositionSearchableSelect;
