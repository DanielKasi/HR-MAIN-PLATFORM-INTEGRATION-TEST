"use client"

import {  IBankAccount } from "@/types/types.utils"
import PaginatedSearchableSelect, { PaginatedSelectItem } from "@/components/generic/paginated-searchable-select"
import { bankAccountsAPI } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useEffect, useState } from "react";


export interface BankAccountSearchableSelectProps {
  selectedItems: (string | number)[];
  onValueChange: (value: (string | number)[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  multiple?: boolean;
  hideSelectedFromList?: boolean;
  showSelectedItems?: boolean;
    defaultLabel?:string;
  setAccounts?: (accounts: IBankAccount[]) => void;
}

export const BankAccountSearchableSelect = ({
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
}: BankAccountSearchableSelectProps) => {

  const currentInstitution = useSelector(selectSelectedInstitution);
  // const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value)

  // useEffect(() => {
  //   setSelectedItems(value);
  // }, [value])

  const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
    if (!currentInstitution) { throw new Error("No institution found !") }
    return await bankAccountsAPI.getAll(query?.search);
  };

  const fetchFromUrl = async ({ url }: { url: string }) => {
    return await bankAccountsAPI.getPaginatedFRomUrl({url});
  };


  const handleSelect = (itemId: string | number, _item: PaginatedSelectItem<IBankAccount>) => {
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
  const handleRemove = (itemId: string | number, _item: PaginatedSelectItem<IBankAccount>) => {
    if (multiple) {
      onValueChange(selectedItems.filter((id) => String(id) !== String(itemId)));
    }
  };

  return (
    <div className={className}>
      <PaginatedSearchableSelect<IBankAccount, { search?: string; page?: number }>
        paginated
        fetchFirstPage={fetchFirstPage}
        fetchFromUrl={fetchFromUrl}
        getItemId={(account) => account.id}
        getItemLabel={(account) => account.account_name || ""}
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
}

export default BankAccountSearchableSelect
