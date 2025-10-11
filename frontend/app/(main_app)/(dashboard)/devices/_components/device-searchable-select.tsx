"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { DEVICES_API } from "@/lib/api/devices.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IDevice } from "@/types/devices.types";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";

export interface DeviceSearchableSelectProps {
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
	setDevices?: (devices: IDevice[]) => void;
}

export const DeviceSearchableSelect = memo(
	({
		value,
		defaultLabel,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select Device(s)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
		setDevices,
	}: DeviceSearchableSelectProps) => {
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
				return await DEVICES_API.getPaginated({ ...query });
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await getPaginatedFromUrl<IDevice>({ url });
		}, []);

		const handleSelect = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IDevice>) => {
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
			(itemId: string | number, _item: PaginatedSelectItem<IDevice>) => {
				const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<IDevice, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(device) => device.id}
					getItemLabel={(device) => device.serial_number || ""}
					getItemValue={(device) => device.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search devices by serial number or description..."
					triggerClassName={`w-full justify-between focus:ring-primary ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
					setParentItems={setDevices}
					defaultLabel={defaultLabel}
				/>
			</div>
		);
	},
);

DeviceSearchableSelect.displayName = "DeviceSearchableSelect";
