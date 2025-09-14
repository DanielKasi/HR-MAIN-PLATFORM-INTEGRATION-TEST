"use client"


import PaginatedSearchableSelect, { PaginatedSelectItem } from "@/components/generic/paginated-searchable-select"
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useEffect, useState } from "react";
import { UserProfile } from "@/types";
import { PROFILES_API } from "@/lib/utils";


export interface UserProfileSearchableSelectProps {
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

export const UserProfileSearchableSelect = ({
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
}: UserProfileSearchableSelectProps) => {

  const currentInstitution = useSelector(selectSelectedInstitution);
  const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value)

  useEffect(() => {
    setSelectedItems(value);
  }, [value])

  const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
    if (!currentInstitution) { throw new Error("No intitution found !") }
    return await PROFILES_API.getPaginatedUserProfiles({ ...query });
  };

  const fetchFromUrl = async ({ url }: { url: string }) => {
    return await PROFILES_API.getPaginatedUserProfilesFromUrl({ url });
  };


  const handleSelect = (itemId: string | number, _item: PaginatedSelectItem<UserProfile>) => {
    if (!selectedItems.includes(itemId)) {
      if (multiple) {
        onValueChange([...selectedItems, itemId]);
      } else {
        onValueChange([itemId]);
      }
    }
  };
  const handleRemove = (itemId: string | number, _item: PaginatedSelectItem<UserProfile>) => {
    if (multiple) {
      onValueChange(selectedItems.filter((id) => String(id) !== String(itemId)));
    }
  };

  return (
    <div className={className}>
      <PaginatedSearchableSelect<UserProfile, { search?: string; page?: number }>
        paginated
        fetchFirstPage={fetchFirstPage}
        fetchFromUrl={fetchFromUrl}
        getItemId={(profile) => profile.id}
        getItemLabel={(profile) => profile.user?.fullname || ""}
        getItemValue={(profile) => profile.id.toString()}
        selectedItems={selectedItems}
        onSelect={handleSelect}
        onRemove={handleRemove}
        showSelectedItems={showSelectedItems}
        multiple={multiple}
        disabled={disabled}
        placeholder={placeholder}
        searchPlaceholder="Search profiles by name"
        triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
        popoverClassName="w-full"
        hideSelectedFromList={hideSelectedFromList}
      />
    </div>
  );
}

export default UserProfileSearchableSelect
