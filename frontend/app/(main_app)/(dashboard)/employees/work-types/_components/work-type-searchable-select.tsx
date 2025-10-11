"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IWorkType } from "@/types/types.utils";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";
import { getWorkTypes } from "@/lib/utils";

export interface WorkTypeSearchableSelectProps {
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
	setWorkTypes?: (workTypes: IWorkType[]) => void;
}

export const WorkTypeSearchableSelect = memo(
	({
		value,
		defaultLabel,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select work types",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		setWorkTypes,
	}: WorkTypeSearchableSelectProps) => {
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
				return await getWorkTypes({ institutionId: currentInstitution.id, ...query });
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await getPaginatedFromUrl<IWorkType>({ url });
		}, []);

		const handleSelect = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IWorkType>) => {
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
			(itemId: string | number, _item: PaginatedSelectItem<IWorkType>) => {
				const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<IWorkType, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(work_type) => work_type.id}
					getItemLabel={(work_type) => work_type.name || ""}
					getItemValue={(work_type) => work_type.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search work types..."
					triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
					setParentItems={setWorkTypes}
					defaultLabel={defaultLabel}
				/>
			</div>
		);
	},
);

WorkTypeSearchableSelect.displayName = "WorkTypeSearchableSelect";

export default WorkTypeSearchableSelect;
