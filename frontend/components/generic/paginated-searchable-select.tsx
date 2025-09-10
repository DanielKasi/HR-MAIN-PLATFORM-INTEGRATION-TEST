"use client";

import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {ChevronsUpDown, Check, X} from "lucide-react";
import {cn} from "@/lib/utils";
import {IPaginatedResponse} from "@/types/types.utils";
import {toast} from "sonner";

// Generic item type for the select
export type PaginatedSelectItem<T> = T;

// Fetchers for paginated data
export type FetchFirstPageFn<T, Q = unknown> = (query?: Q) => Promise<IPaginatedResponse<T>>;
export type FetchFromUrlFn<T> = (args: {url: string}) => Promise<IPaginatedResponse<T>>;

export interface PaginatedSearchableSelectProps<T, Q = unknown> {
  // Required for paginated mode
  paginated?: boolean;
  fetchFirstPage?: FetchFirstPageFn<T, Q>;
  fetchFromUrl?: FetchFromUrlFn<T>;
  query?: Q;
  deps?: React.DependencyList;
  getItemId: (item: T) => string | number;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  // For non-paginated mode
  items?: PaginatedSelectItem<T>[];
  // Common props
  selectedItems?: (string | number)[];
  onSelect: (itemId: string | number, item: PaginatedSelectItem<T>) => void;
  onRemove: (itemId: string | number, item: PaginatedSelectItem<T>) => void;
  showSelectedItems?: boolean;
  // showSelectedItems?: (
  //     selectedIds: (string | number)[],
  //     items: PaginatedSelectItem<T>[]
  // ) => React.ReactNode;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  hideSelectedFromList?: boolean;
  setParentItems?: (items: PaginatedSelectItem<T>[]) => void;
}

export function PaginatedSearchableSelect<T, Q = unknown>({
  paginated = true,
  fetchFirstPage,
  fetchFromUrl,
  query,
  deps = [],
  items: staticItems = [],
  selectedItems = [],
  onSelect,
  onRemove,
  showSelectedItems = true,
  getItemId,
  getItemLabel,
  getItemValue,
  multiple = false,
  disabled = false,
  className,
  triggerClassName,
  popoverClassName,
  placeholder = "Select an item",
  emptyMessage = "No items found.",
  searchPlaceholder = "Search items...",
  hideSelectedFromList = false,
  setParentItems,
}: PaginatedSearchableSelectProps<T, Q>) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<IPaginatedResponse<PaginatedSelectItem<T>> | null>(null);
  const [search, setSearch] = React.useState("");
  const [hasMore, setHasMore] = React.useState(true);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [sentinelNode, setSentinelNode] = React.useState<HTMLDivElement | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);
  const sentinelRef = React.useCallback((node: HTMLDivElement | null) => {
    setSentinelNode(node);
  }, []);

  React.useEffect(() => {
    const itemMatch =
      !multiple && selectedItems.length > 0
        ? data?.results.find((item) => getItemId(item) === selectedItems[0])
        : null;
    if (itemMatch) {
      setSelectedItem(itemMatch);
    }
  }, [selectedItems, data]);

  React.useEffect(()=> {
  if (setParentItems) {
      if (data?.results && data.next) {
        setParentItems(data.results);
      }
    }
  }, [data])


  // Fetch first page for paginated mode
  React.useEffect(() => {
    if (!paginated) return;
    if (!fetchFirstPage) return;
    if (data && data.next) {
      return;
    }
    setLoading(true);
    console.log("\n\n Refetching first page with previous data : ", data, "Query :", query)
    fetchFirstPage()
      .then((res) => {
        setData(res as IPaginatedResponse<PaginatedSelectItem<T>>);
          setHasMore(!!res.next);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [...deps]);


  // Infinite scroll with intersection observer (using callback ref)
  React.useEffect(() => {
    if (!paginated || !data?.next || !fetchFromUrl) return;
    if (loading) return;
    if (!sentinelNode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if(!hasMore){return}
        // console.log("\n\n Trying to fetch with loading : ", loading, "And has more : ", hasMore, "Next url : ", data.next)
        if (entry.isIntersecting && !loading && hasMore) {
          setLoading(true);

          fetchFromUrl({url: data.next!})
            .then((res) => {
              if (res && (!data.next || data.next !== res.next)) {
                  setHasMore(!!res.next);
                setData((prev) => ({
                  ...res,
                  results: [...(prev?.results || []), ...res.results],
                }));
              }
            })
            .finally(() => setLoading(false));
        }
      },
      {
        root: listRef.current,
        rootMargin: "5px",
        threshold: 0.1,
      },
    );
    observer.observe(sentinelNode);
    return () => {
      observer.disconnect();
    };
  }, [paginated, data?.next, fetchFromUrl, loading, sentinelNode]);

  // Filtered items
//   const allItems = paginated ? data?.results || [] : staticItems;
//   const filteredItems = data?.results.filter((item) => {
//     if (hideSelectedFromList && selectedItems.includes(getItemId(item))) return false;
//     if (!search) return true;
//     const itemLabel = getItemLabel(item);
//     const itemValue = getItemValue(item);
//     return (
//       itemLabel.toLowerCase().includes(search.toLowerCase()) ||
//       (itemValue && itemValue.toLowerCase().includes(search.toLowerCase()))
//     );
//   });

  const handleSelect = (itemId: string | number) => {
    const item = data?.results.find((i) => getItemId(i) === itemId);
    // console.log("\n\n Item selected : ", item)
    if (!item) return;
    if (multiple && selectedItems.includes(itemId) && onRemove) {
      onRemove(itemId, item);
    } else {
      onSelect(itemId, item);
      if (!multiple) setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="py-1">
        {showSelectedItems && (
          <div className="flex items-center justify-start gap-2 flex-wrap ">
            {data?.results
              .filter((resItem) =>
                selectedItems.find((item) => String(item) === String(getItemId(resItem))),
              )
              .map((itemData, idx) => {
                const isSelected =
                  selectedItems.includes(getItemId(itemData)) ||
                  selectedItems.includes(String(getItemId(itemData)));
                return (
                  <span
                    key={idx}
                    className="px-2 rounded-full text-sm inline-flex  bg-primary/20 text-primary py-1 w-fit items-center gap-1 max-w-xs"
                  >
                    {getItemLabel(itemData)}
                    {multiple && isSelected && onRemove && (
                      <button
                        className="rounded-full ml-1 !px-1 bg-red-500/20 cursor-pointer aspect-square !text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(getItemId(itemData), itemData);
                        }}
                      >
                        <X className="!h-3 !w-3 text-red-500" />
                      </button>
                    )}
                  </span>
                );
              })}
          </div>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className={cn("w-full justify-between h-12 rounded-2xl", triggerClassName)}
            disabled={disabled}
            role="combobox"
            variant="outline"
          >
            {!multiple && selectedItem ? getItemLabel(selectedItem) : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("w-full p-0", popoverClassName)}>
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandEmpty>{loading ? "Loading..." : emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandList ref={listRef} style={{maxHeight: 300, overflowY: "auto"}}>
                {data?.results.map((item) => {
                  const isSelected =
                    selectedItems.includes(getItemId(item)) ||
                    selectedItems.includes(String(getItemId(item)));
                  return (
                    <CommandItem
                      key={getItemId(item)}
                      value={getItemValue(item) || getItemLabel(item)}
                      onSelect={() => handleSelect(getItemId(item))}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      {getItemLabel(item)}
                      {multiple && isSelected && onRemove && (
                        <button
                          className="rounded-full ml-auto !px-1 bg-red-500/20 cursor-pointer aspect-square !text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(getItemId(item), item);
                          }}
                        >
                          <X className="!h-3 !w-3 text-red-500" />
                        </button>
                      )}
                    </CommandItem>
                  );
                })}
                {/* Intersection observer sentinel */}
                {paginated && hasMore && <div ref={sentinelRef} className="h-3" />}
                {loading && (
                  <div className="text-center py-2 text-xs text-gray-500">Loading more...</div>
                )}
              </CommandList>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default PaginatedSearchableSelect;
