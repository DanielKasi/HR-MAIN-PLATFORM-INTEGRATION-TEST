"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { bankTypesAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IBankType } from "@/types/types.utils";

export interface BankTypeSearchableSelectProps {
	value: (string | number)[];
	onValueChange: (value: (string | number)[]) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
	triggerClassName?: string;
	multiple?: boolean;
	hideSelectedFromList?: boolean;
	showSelectedItems?: boolean;
	defaultLabel?: string;
	setAccounts?: (accounts: IBankType[]) => void;
	required?: boolean;
}

export const BankTypeSearchableSelect = memo(
	({
		value,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select Account(s)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		defaultLabel,
		setAccounts,
		required,
	}: BankTypeSearchableSelectProps) => {
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
				return await bankTypesAPI.getAll(query?.search);
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await bankTypesAPI.getPaginatedFromUrl({ url });
		}, []);

		const handleSelect = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IBankType>) => {
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
			(itemId: string | number, _item: PaginatedSelectItem<IBankType>) => {
				const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<IBankType, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(account) => account.id}
					getItemLabel={(account) => account.bank_fullname || ""}
					getItemValue={(account) => account.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search banks by name..."
					triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
					setParentItems={setAccounts}
					defaultLabel={defaultLabel}
					required={required}
				/>
			</div>
		);
	},
);

BankTypeSearchableSelect.displayName = "BankTypeSearchableSelect";

export default BankTypeSearchableSelect;
