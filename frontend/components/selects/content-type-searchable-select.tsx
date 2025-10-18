"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { APPROVABLE_MODELS_API } from "@/lib/api/approvals/utils";
import { IBonusPointSettings, IPaginatedResponse } from "@/types/types.utils";
import { ContentTypeLite } from "@/types/approvals.types";

export interface ContentTypeSearchableSelectProps {
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

export const ContentTypeSearchableSelect = memo(
	({
		value,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		className,
		triggerClassName,
		multiple = false,
		placeholder = `Select resource type${multiple ? "s" : ""}`,
		hideSelectedFromList = false,
	}: ContentTypeSearchableSelectProps) => {
		const currentInstitution = useSelector(selectSelectedInstitution);
		const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);

		useEffect(() => {
			setSelectedItems(value);
		}, [value]);

		const fetchFirstPage = useCallback(
			async (query?: {
				search?: string;
				page?: number;
			}): Promise<IPaginatedResponse<ContentTypeLite>> => {
				if (!currentInstitution) {
					throw new Error("No institution found!");
				}
				const models = await APPROVABLE_MODELS_API.fetchAll();
				return { count: models.length, next: null, previous: null, results: models };
			},
			[currentInstitution],
		);

		const handleSelect = useCallback(
			(itemIds: (string | number)[], _items: PaginatedSelectItem<ContentTypeLite>[]) => {
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
			(itemIds: (string | number)[], _item: PaginatedSelectItem<ContentTypeLite>[]) => {
				const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<ContentTypeLite, { search?: string; page?: number }>
					paginated={false}
					fetchFirstPage={fetchFirstPage}
					getItemId={(content_type) => content_type.id}
					getItemLabel={(content_type) => content_type.name || ""}
					getItemValue={(content_type) => content_type.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search resource by name"
					triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
				/>
			</div>
		);
	},
);

ContentTypeSearchableSelect.displayName = "ContentTypeSearchableSelect";

export default ContentTypeSearchableSelect;
