"use client";

import * as React from "react";
import {Check, ChevronsUpDown} from "lucide-react";

import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

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
  // onRemove,
  renderSelectedItems,
  multiple = false,
  disabled = false,
  className,
  triggerClassName,
  popoverClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  // For single select, find the selected item to display in the trigger
  const selectedItem =
    !multiple && selectedItems.length > 0
      ? items.find((item) => item.id === selectedItems[0])
      : null;

  const handleSelect = (itemId: number | string) => {
    onSelect(itemId);
    if (!multiple) {
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
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.value || item.label}
                    onSelect={() => handleSelect(item.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedItems.includes(item.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandList>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
