"use client";

import { useSelector } from "react-redux";

import { IBankType } from "@/types/types.utils";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { bankTypesAPI } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useMemo } from "react";

export interface BankTypeSearchableSelectProps {
	selectedItems: (string | number)[];
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
}

export const BankTypeSearchableSelect = ({
	selectedItems,
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
}: BankTypeSearchableSelectProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	// const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value)

	// useEffect(() => {
	//   setSelectedItems(value);
	// }, [value])

	console.log("Current selected items : ", selectedItems);

	const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
		if (!currentInstitution) {
			throw new Error("No institution found !");
		}

		return await bankTypesAPI.getAll(query?.search);
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return await bankTypesAPI.getPaginatedFromUrl({ url });
	};

	const handleSelect = (itemId: string | number, _item: PaginatedSelectItem<IBankType>) => {
		// console.log("\n\n Selecting account : ", itemId)
		if (!selectedItems.includes(itemId)) {
			if (multiple) {
				// console.log("\n\n Value changed with mutliple and selected items : ", selectedItems)
				onValueChange([...selectedItems, itemId]);
			} else {
				// console.log("\n\n Value change with single value  : ", itemId)
				onValueChange([itemId]);
				// console.log("\n\n On value change called with : ", [itemId])
			}
		}
	};
	const handleRemove = (itemId: string | number, _item: PaginatedSelectItem<IBankType>) => {
		if (multiple) {
			onValueChange(selectedItems.filter((id) => String(id) !== String(itemId)));
		}
	};

	return (
		<div className={className}>
			<PaginatedSearchableSelect<IBankType, { search?: string; page?: number }>
				paginated
				fetchFirstPage={fetchFirstPage}
				fetchFromUrl={fetchFromUrl}
				getItemId={(account) => account.id}
				getItemLabel={(account) => account.bank_fullname || ""}
				getItemValue={(account) => account.id.toString()}
				selectedItems={selectedItems || [""]}
				onSelect={handleSelect}
				onRemove={handleRemove}
				showSelectedItems={showSelectedItems}
				multiple={multiple}
				disabled={disabled}
				placeholder={placeholder}
				searchPlaceholder="Search bank accounts by name..."
				triggerClassName={`w-full justify-between focus:ring-primary  ${triggerClassName || ""}`}
				popoverClassName="w-full"
				hideSelectedFromList={hideSelectedFromList}
				setParentItems={setAccounts}
				defaultLabel={defaultLabel}
			/>
		</div>
	);
};
