"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { branchesAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Branch } from "@/types/branch.types";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";

export interface BranchSearchableSelectProps {
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
	setBranches?: (branches: Branch[]) => void;
}

export const BranchSearchableSelect = memo(
	({
		value,
		defaultLabel,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select Branch(es)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		setBranches,
	}: BranchSearchableSelectProps) => {
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
				return await branchesAPI.getPaginated({ ...query });
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await getPaginatedFromUrl<Branch>({ url });
		}, []);

		const handleSelect = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<Branch>) => {
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
			(itemId: string | number, _item: PaginatedSelectItem<Branch>) => {
				const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<Branch, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(branch) => branch.id}
					getItemLabel={(branch) => branch.branch_name || ""}
					getItemValue={(branch) => branch.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search branches by name..."
					triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
					setParentItems={setBranches}
					defaultLabel={defaultLabel}
				/>
			</div>
		);
	},
);

BranchSearchableSelect.displayName = "BranchSearchableSelect";

export default BranchSearchableSelect;
