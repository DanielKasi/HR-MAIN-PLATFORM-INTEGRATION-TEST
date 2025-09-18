"use client";

import { useSelector } from "react-redux";

import { IDepartment } from "@/types/types.utils";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { getPaginatedDepartments, getPaginatedDepartmentsFromUrl } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";

export interface DepartmentSearchableSelectProps {
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
	setDepartments?: (departments: IDepartment[]) => void;
}

export const DepartmentSearchableSelect = ({
	value,
	defaultLabel,
	onValueChange,
	disabled = false,
	showSelectedItems = true,
	placeholder = "Select Department(s)",
	className,
	triggerClassName,
	multiple = false,
	hideSelectedFromList = false,
	setDepartments,
}: DepartmentSearchableSelectProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);

	const fetchFirstPage = async (query?: { search?: string; page?: number }) => {
		if (!currentInstitution) {
			throw new Error("No institution found !");
		}

		return await getPaginatedDepartments({ institutionId: currentInstitution.id, ...query });
	};

	const fetchFromUrl = async ({ url }: { url: string }) => {
		return await getPaginatedDepartmentsFromUrl({ url });
	};

	const handleSelect = (itemId: string | number, _item: PaginatedSelectItem<IDepartment>) => {
		if (!value.includes(itemId)) {
			if (multiple) {
				onValueChange([...value, itemId]);
			} else {
				onValueChange([itemId]);
			}
		}
	};

	const handleRemove = (itemId: string | number, _item: PaginatedSelectItem<IDepartment>) => {
		onValueChange(value.filter((id) => String(id) !== String(itemId)));
	};
	return (
		<div className={className}>
			<PaginatedSearchableSelect<IDepartment, { search?: string; page?: number }>
				paginated
				fetchFirstPage={fetchFirstPage}
				fetchFromUrl={fetchFromUrl}
				getItemId={(department) => department.id}
				getItemLabel={(department) => department.name || ""}
				getItemValue={(department) => department.id.toString()}
				selectedItems={value}
				onSelect={handleSelect}
				onRemove={handleRemove}
				showSelectedItems={showSelectedItems}
				multiple={multiple}
				disabled={disabled}
				placeholder={placeholder}
				searchPlaceholder="Search departments by name..."
				triggerClassName={`w-full justify-between focus:ring-primary  ${triggerClassName || ""}`}
				popoverClassName="w-full"
				hideSelectedFromList={hideSelectedFromList}
				setParentItems={setDepartments}
				defaultLabel={defaultLabel}
			/>
		</div>
	);
};

export default DepartmentSearchableSelect;
