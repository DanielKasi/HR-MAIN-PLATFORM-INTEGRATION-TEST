"use client";

import { useSelector } from "react-redux";
import { useEffect, useState } from "react";

import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Role } from "@/types";
import { ROLES_API } from "@/lib/utils";

export interface RoleSearchableSelectProps {
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

export const RoleSearchableSelect = ({
	value,
	onValueChange,
	disabled = false,
	showSelectedItems = true,
	className,
	triggerClassName,
	multiple = false,
	placeholder = `Select role${multiple ? "s" : ""}`,
	hideSelectedFromList = false,
}: RoleSearchableSelectProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);

	useEffect(() => {
		setSelectedItems(value);
	}, [value]);

	const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
		if (!currentInstitution) {
			throw new Error("No institution found !");
		}

		return await ROLES_API.getPaginatedFirstPage({ institutionId: currentInstitution.id });
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return await ROLES_API.getPaginatedFromUrl({ url });
	};

	const handleSelect = (itemId: string | number, _item: PaginatedSelectItem<Role>) => {
		if (!selectedItems.includes(itemId)) {
			if (multiple) {
				onValueChange([...selectedItems, itemId]);
			} else {
				onValueChange([itemId]);
			}
		}
	};
	const handleRemove = (itemId: string | number, _item: PaginatedSelectItem<Role>) => {
		if (multiple) {
			onValueChange(selectedItems.filter((id) => String(id) !== String(itemId)));
		}
	};

	return (
		<div className={className}>
			<PaginatedSearchableSelect<Role, { search?: string; page?: number }>
				paginated
				fetchFirstPage={fetchFirstPage}
				fetchFromUrl={fetchFromUrl}
				getItemId={(role) => role.id}
				getItemLabel={(role) => role.name || ""}
				getItemValue={(role) => role.id.toString()}
				selectedItems={selectedItems}
				onSelect={handleSelect}
				onRemove={handleRemove}
				showSelectedItems={showSelectedItems}
				multiple={multiple}
				disabled={disabled}
				placeholder={placeholder}
				searchPlaceholder="Search roles by name"
				triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
				popoverClassName="w-full"
				hideSelectedFromList={hideSelectedFromList}
			/>
		</div>
	);
};

export default RoleSearchableSelect;
