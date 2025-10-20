"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TicketCategory } from "@/types/help-desk.types";
import { TICKET_CATEGORIES_API } from "@/lib/api/help-desk.utils";

interface TicketCategorySearchableSelectProps {
	value: (string | number)[];
	onValueChange: (value: (string | number)[]) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
	triggerClassName?: string;
	multiple?: boolean;
	hideSelectedFromList?: boolean;
	showSelectedItems?: boolean;
}

export const TicketCategorySearchableSelect = memo(
	({
		value,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select category(s)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
	}: TicketCategorySearchableSelectProps) => {
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
				return await TICKET_CATEGORIES_API.getPaginated({ ...query });
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await TICKET_CATEGORIES_API.getPaginatedFromUrl({ url });
		}, []);

		const handleSelect = useCallback(
			(itemIds: (string | number)[], _items: PaginatedSelectItem<TicketCategory>[]) => {
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
			(itemIds: (string | number)[], _item: PaginatedSelectItem<TicketCategory>[]) => {
				const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);
		return (
			<div className={className}>
				<PaginatedSearchableSelect<TicketCategory, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(category) => category.id}
					getItemLabel={(category) => category.name || ""}
					getItemValue={(category) => category.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search categories by name"
					triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
				/>
			</div>
		);
	},
);

TicketCategorySearchableSelect.displayName = "TicketCategorySearchableSelect";

export default TicketCategorySearchableSelect;
