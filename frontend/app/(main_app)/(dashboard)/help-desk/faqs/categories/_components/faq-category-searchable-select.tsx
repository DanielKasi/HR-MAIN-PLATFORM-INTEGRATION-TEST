"use client";

import { useSelector } from "react-redux";
import { useCallback, useEffect, useState } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { FAQCategory } from "@/types/help-desk.types";
import { FAQ_CATEGORIES_API } from "@/lib/api/help-desk.utils";

export interface FAQCategorySearchableSelectProps {
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

export const FAQCategorySearchableSelect = ({
	value,
	onValueChange,
	disabled = false,
	showSelectedItems = true,
	placeholder = "Select category...",
	className,
	triggerClassName,
	multiple = false,
	hideSelectedFromList = false,
}: FAQCategorySearchableSelectProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);

	useEffect(() => {
		setSelectedItems(value);
	}, [value]);

	const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
		if (!currentInstitution) {
			throw new Error("No institution found!");
		}
		return await FAQ_CATEGORIES_API.getPaginated({ ...query });
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return await FAQ_CATEGORIES_API.getPaginatedFromUrl({ url });
	};

	const handleSelect = useCallback(
		(itemIds: (string | number)[], _items: PaginatedSelectItem<FAQCategory>[]) => {
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
		(itemIds: (string | number)[], _item: PaginatedSelectItem<FAQCategory>[]) => {
			const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
			setSelectedItems(newItems);
			onValueChange(newItems);
		},
		[selectedItems, onValueChange],
	);

	return (
		<div className={className}>
			<PaginatedSearchableSelect<FAQCategory, { search?: string; page?: number }>
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
};

export default FAQCategorySearchableSelect;
