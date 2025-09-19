"use client";

import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { BONUS_POINT_SETTINGS_API } from "@/lib/utils";
import type { IBonusPointSettings } from "@/types/types.utils";

export interface BonusPointSettingsSelectProps {
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

export const BonusPointSettingsSelect = ({
	value,
	onValueChange,
	disabled = false,
	showSelectedItems = true,
	placeholder = "Select bonus point setting",
	className,
	triggerClassName,
	multiple = false,
	hideSelectedFromList = false,
}: BonusPointSettingsSelectProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);

	useEffect(() => {
		setSelectedItems(value);
	}, [value]);

	const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
		if (!currentInstitution) {
			throw new Error("No institution found!");
		}
		return await BONUS_POINT_SETTINGS_API.getPaginated({ page: query?.page || 1 });
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return await BONUS_POINT_SETTINGS_API.getPaginatedFromUrl({ url });
	};

	const handleSelect = (
		itemId: string | number,
		_item: PaginatedSelectItem<IBonusPointSettings>,
	) => {
		if (!selectedItems.includes(itemId)) {
			if (multiple) {
				onValueChange([...selectedItems, itemId]);
			} else {
				onValueChange([itemId]);
			}
		}
	};

	const handleRemove = (
		itemId: string | number,
		_item: PaginatedSelectItem<IBonusPointSettings>,
	) => {
		// if (multiple) {
		const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
		console.log("\n\n New selected items : ", newItems);
		onValueChange(newItems);
		setSelectedItems(newItems);
		// }
	};

	return (
		<div className={className}>
			<PaginatedSearchableSelect<IBonusPointSettings, { search?: string; page?: number }>
				paginated
				fetchFirstPage={fetchFirstPage}
				fetchFromUrl={fetchFromUrl}
				getItemId={(setting) => setting.id}
				getItemLabel={(setting) => `${setting.bonus_for} (${setting.points} points)`}
				getItemValue={(setting) => setting.id.toString()}
				selectedItems={selectedItems}
				onSelect={handleSelect}
				onRemove={handleRemove}
				showSelectedItems={showSelectedItems}
				multiple={multiple}
				disabled={disabled}
				placeholder={placeholder}
				searchPlaceholder="Search bonus point settings"
				triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
				popoverClassName="w-full"
				hideSelectedFromList={hideSelectedFromList}
			/>
		</div>
	);
};

export default BonusPointSettingsSelect;
