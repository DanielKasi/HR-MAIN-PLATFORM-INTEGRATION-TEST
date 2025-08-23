"use client"

import { IEmployee } from "@/types/types.utils"
import PaginatedSearchableSelect, { PaginatedSelectItem } from "@/components/generic/paginated-searchable-select"
import { getPaginatedEmployees, getPaginatedEmployeesFromUrl } from "@/lib/utils"
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useEffect, useState } from "react";


export interface EmployeeSearchableSelectProps {
  value: (string | number)[];
  onValueChange: (value: (string | number)[]) => void;
  disabled?: boolean;
  placeholder?: string;
  showEmployeeId?: boolean;
  showDepartment?: boolean;
  className?: string;
  triggerClassName?: string;
  multiple?: boolean;
  hideSelectedFromList?: boolean;
  showSelectedItems?: boolean;
}

export const EmployeeSearchableSelect = ({
  value,
  onValueChange,
  disabled = false,
  showSelectedItems = true,
  placeholder = "Select employee(s)",
  showEmployeeId = true,
  showDepartment = true,
  className,
  triggerClassName,
  multiple = false,
  hideSelectedFromList = false,
}: EmployeeSearchableSelectProps) => {

  const currentInstitution = useSelector(selectSelectedInstitution);
  const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value)

  useEffect(() => {
    setSelectedItems(value);
  }, [value])

  // Fetchers
  const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
    if (!currentInstitution) { throw new Error("No intitution found !") }
    return await getPaginatedEmployees({ institutionId: currentInstitution.id, ...query });
  };

  const fetchFromUrl = async ({ url }: { url: string }) => {
    return await getPaginatedEmployeesFromUrl({ url });
  };


  const handleSelect = (itemId: string | number, _item: PaginatedSelectItem<IEmployee>) => {
    if (!selectedItems.includes(itemId)) {
      if (multiple) {
        onValueChange([...selectedItems, itemId]);
      } else {
        onValueChange([itemId]);
      }
    }
  };
  const handleRemove = (itemId: string | number, _item: PaginatedSelectItem<IEmployee>) => {
    console.log("\n\n Removing item  : ", itemId)
    if (multiple) {
      onValueChange(selectedItems.filter((id) => String(id) !== String(itemId)));
    }
  };

  return (
    <div className={className}>
      <PaginatedSearchableSelect<IEmployee, { search?: string; page?: number }>
        paginated
        fetchFirstPage={fetchFirstPage}
        fetchFromUrl={fetchFromUrl}
        getItemId={(emp) => emp.id}
        getItemLabel={(emp) => emp.user?.fullname || ""}
        getItemValue={(emp) => emp.id.toString()}
        selectedItems={selectedItems}
        onSelect={handleSelect}
        onRemove={handleRemove}
        showSelectedItems={showSelectedItems}
        multiple={multiple}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder="Search employees by name, email, ID, or department..."
        triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
        popoverClassName="w-full"
        hideSelectedFromList={hideSelectedFromList}
      />
    </div>
  );
}

export default EmployeeSearchableSelect
