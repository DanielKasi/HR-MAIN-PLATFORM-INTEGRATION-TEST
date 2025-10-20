"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { getPaginatedEmployees, getPaginatedEmployeesFromUrl } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IEmployee } from "@/types/types.utils";

interface EmployeeSearchableSelectProps {
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
	id?: string;
	employees_under?: number;
	getIdByCustomEmployeeId?: boolean;
}

export const EmployeeSearchableSelect = memo(
	({
		value,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select employee(s)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		employees_under,
		id,
		getIdByCustomEmployeeId,
	}: EmployeeSearchableSelectProps) => {
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
				return await getPaginatedEmployees({
					institutionId: currentInstitution.id,
					employees_under,
					...query,
				});
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await getPaginatedEmployeesFromUrl({ url });
		}, []);

		const handleSelect = useCallback(
			(itemIds: (string | number)[], _items: PaginatedSelectItem<IEmployee>[]) => {
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
			(itemIds: (string | number)[], _item: PaginatedSelectItem<IEmployee>[]) => {
				const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<IEmployee, { search?: string; page?: number }>
					id={id}
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(emp) => (getIdByCustomEmployeeId ? emp.employee_id : emp.id)}
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
	},
);

EmployeeSearchableSelect.displayName = "EmployeeSearchableSelect";

export default EmployeeSearchableSelect;
