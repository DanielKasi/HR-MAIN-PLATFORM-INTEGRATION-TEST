"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchableSelectItem = {
	id: number | string;
	label: string;
	value?: string;
};

type SearchableSelectProps = {
	items: SearchableSelectItem[];
	selectedItems?: (number | string)[];
	placeholder?: string;
	emptyMessage?: string;
	searchPlaceholder?: string;
	onSelect: (itemId: number | string) => void;
	onRemove?: (itemId: number | string) => void;
	renderSelectedItems?: (
		selectedIds: (number | string)[],
		items: SearchableSelectItem[],
	) => React.ReactNode;
	multiple?: boolean;
	disabled?: boolean;
	className?: string;
	triggerClassName?: string;
	popoverClassName?: string;
};

export function SearchableSelect({
	items,
	selectedItems = [],
	placeholder = "Select an item",
	emptyMessage = "No items found.",
	searchPlaceholder = "Search items...",
	onSelect,
	onRemove,
	renderSelectedItems,
	multiple = false,
	disabled = false,
	className,
	triggerClassName,
	popoverClassName,
}: SearchableSelectProps) {
	const [open, setOpen] = React.useState(false);

	const selectedItem =
		!multiple && selectedItems.length > 0
			? items.find((item) => item.id === selectedItems[0])
			: null;

	const handleSelect = (itemId: number | string) => {
		const isSelected = selectedItems.includes(itemId);

		if (multiple) {
			if (isSelected && onRemove) {
				onRemove(itemId);
			} else {
				onSelect(itemId);
			}
		} else {
			onSelect(itemId);
			setOpen(false);
		}
	};

	return (
		<div className={cn("relative", className)}>
			{multiple && renderSelectedItems && (
				<div className="mb-2">{renderSelectedItems(selectedItems, items)}</div>
			)}

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						aria-expanded={open}
						className={cn("w-full justify-between", triggerClassName)}
						disabled={disabled}
						role="combobox"
						variant="outline"
					>
						{!multiple && selectedItem ? selectedItem.label : placeholder}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className={cn("w-full p-0", popoverClassName)}>
					<Command>
						<CommandInput placeholder={searchPlaceholder} />
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							<CommandList>
								{items.map((item) => {
									const isSelected = selectedItems.includes(item.id);

									return (
										<CommandItem
											key={item.id}
											value={item.value || item.label}
											onSelect={() => handleSelect(item.id)}
										>
											<Check
												className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
											/>
											{item.label}
											{multiple && isSelected && onRemove && (
												<X
													className="ml-auto h-4 w-4 text-red-500 cursor-pointer"
													onClick={(e) => {
														e.stopPropagation();
														onRemove(item.id);
													}}
												/>
											)}
										</CommandItem>
									);
								})}
							</CommandList>
						</CommandGroup>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
