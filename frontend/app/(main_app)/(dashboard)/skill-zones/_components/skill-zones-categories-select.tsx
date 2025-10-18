"use client";

import { useSelector } from "react-redux";
import { useCallback, useEffect, useState } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ISkillZoneCategory } from "@/types/recruitment.types";
import { SKILL_ZONE_CATEGORIES_API } from "@/lib/api/recruitment.utils";
import { JobApplicationStatus } from "@/types/types.utils";

interface SkillZoneCategoriesSearchableSelectProps {
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
	setCategories?: (categories: ISkillZoneCategory[]) => void;
}

export const SkillZoneCategoriesSearchableSelect = ({
	value,
	defaultLabel,
	onValueChange,
	disabled = false,
	showSelectedItems = true,
	placeholder = "Select category",
	className,
	triggerClassName,
	multiple = true,
	hideSelectedFromList = false,
}: SkillZoneCategoriesSearchableSelectProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);

	useEffect(() => {
		setSelectedItems(value);
	}, [value]);

	const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
		if (!currentInstitution) {
			throw new Error("No institution found!");
		}
		return await SKILL_ZONE_CATEGORIES_API.getPaginated({ ...query });
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return await SKILL_ZONE_CATEGORIES_API.getPaginatedFromUrl({ url });
	};

	const handleSelect = useCallback(
		(itemIds: (string | number)[], _items: PaginatedSelectItem<ISkillZoneCategory>[]) => {
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
		(itemIds: (string | number)[], _item: PaginatedSelectItem<ISkillZoneCategory>[]) => {
			const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
			setSelectedItems(newItems);
			onValueChange(newItems);
		},
		[selectedItems, onValueChange],
	);

	return (
		<div className={className}>
			<PaginatedSearchableSelect<ISkillZoneCategory, { search?: string; page?: number }>
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
				searchPlaceholder="Search categories by name..."
				triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
				popoverClassName="w-full"
				hideSelectedFromList={hideSelectedFromList}
				defaultLabel={defaultLabel}
			/>
		</div>
	);
};

export default SkillZoneCategoriesSearchableSelect;
