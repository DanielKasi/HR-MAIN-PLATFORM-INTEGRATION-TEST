"use client";

import * as React from "react";
import { ChevronDown, X, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { IPaginatedResponse } from "@/types/types.utils";
import { toast } from "sonner";

// Generic item type for the select
export type PaginatedSelectItem<T> = T;

// Fetchers for paginated data
export type FetchFirstPageFn<T, Q = unknown> = (query?: Q) => Promise<IPaginatedResponse<T>>;
export type FetchFromUrlFn<T> = (args: { url: string }) => Promise<IPaginatedResponse<T>>;

export interface PaginatedSearchableSelectProps<T, Q = unknown> {
	paginated?: boolean;
	fetchFirstPage?: FetchFirstPageFn<T, Q>;
	fetchFromUrl?: FetchFromUrlFn<T>;
	query?: Q;
	deps?: React.DependencyList;
	refreshTrigger?: number; // Added to trigger re-fetch on content type change
	getItemId: (item: T) => string | number;
	getItemValue: (item: T) => string;
	getItemLabel: (item: T) => string;
	items?: PaginatedSelectItem<T>[];
	defaultLabel?: string;
	selectedItems?: (string | number)[];
	onSelect: (itemId: string | number, item: PaginatedSelectItem<T>) => void;
	onRemove: (itemId: string | number, item: PaginatedSelectItem<T>) => void;
	showSelectedItems?: boolean;
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
	id?: string;
	required?: boolean;
}

export function PaginatedSearchableSelect<T, Q = unknown>({
	paginated = true,
	fetchFirstPage,
	fetchFromUrl,
	query,
	deps = [],
	refreshTrigger,
	getItemId,
	getItemValue,
	getItemLabel,
	items: staticItems = [],
	defaultLabel,
	selectedItems = [],
	onSelect,
	onRemove,
	showSelectedItems = true,
	multiple = false,
	disabled = false,
	className,
	triggerClassName,
	popoverClassName,
	placeholder = "Select an item",
	emptyMessage = "No items found.",
	searchPlaceholder = "Search items...",
	hideSelectedFromList = false,
	id,
	setParentItems,
	required,
}: PaginatedSearchableSelectProps<T, Q>) {
	const [open, setOpen] = React.useState(false);
	const [loading, setLoading] = React.useState(false);
	const [data, setData] = React.useState<IPaginatedResponse<PaginatedSelectItem<T>> | null>(null);
	const [search, setSearch] = React.useState("");
	const [hasMore, setHasMore] = React.useState(true);
	const listRef = React.useRef<HTMLDivElement>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);
	const searchInputRef = React.useRef<HTMLInputElement>(null);
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
		} else {
			setSelectedItem(null);
		}
	}, [selectedItems, data, getItemId, multiple]);

	React.useEffect(() => {
		if (setParentItems && data?.results && data.next) {
			setParentItems(data.results);
		}
	}, [data, setParentItems]);

	// Close dropdown when clicking outside
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Focus search input when dropdown opens
	React.useEffect(() => {
		if (open && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [open]);

	// Fetch first page for paginated mode
	React.useEffect(() => {
		if (!fetchFirstPage || (!paginated && data?.results)) return;
		if (data && data.next && !search) return;
		setLoading(true);
		const timeout = setTimeout(() => {
			fetchFirstPage({ search, ...query } as Q)
				.then((res) => {
					setData(res as IPaginatedResponse<PaginatedSelectItem<T>>);
					setHasMore(!!res.next);
				})
				.catch((error) => {
					console.error("Failed to fetch first page", error);
					toast.error("Failed to load items");
				})
				.finally(() => setLoading(false));
		}, 1000);
		return () => clearTimeout(timeout);
	}, [paginated, fetchFirstPage, search, query, refreshTrigger, ...deps]);

	// Infinite scroll with intersection observer
	React.useEffect(() => {
		if (!paginated || !data?.next || !fetchFromUrl || loading || !sentinelNode) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!hasMore) return;
				if (entry.isIntersecting && !loading) {
					setLoading(true);
					fetchFromUrl({ url: data.next! })
						.then((res) => {
							if (res && (!data.next || data.next !== res.next)) {
								setHasMore(!!res.next);
								setData((prev) => ({
									...res,
									results: [...(prev?.results || []), ...res.results],
								}));
							}
						})
						.catch((error) => {
							console.error("Failed to fetch next page", error);
							toast.error("Failed to load more items");
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
		return () => observer.disconnect();
	}, [paginated, data?.next, fetchFromUrl, loading, sentinelNode, hasMore]);

	// Helper functions for organizing items
	const getOrderedItems = () => {
		if (!data?.results) return [];
		const allItems = data.results;
		const selectedFilteredItems = allItems.filter(
			(item) =>
				selectedItems.includes(getItemId(item)) || selectedItems.includes(String(getItemId(item))),
		);
		const unselectedFilteredItems = allItems.filter(
			(item) =>
				!selectedItems.includes(getItemId(item)) &&
				!selectedItems.includes(String(getItemId(item))),
		);
		return [...selectedFilteredItems, ...unselectedFilteredItems];
	};

	// Select all functionality
	const handleSelectAll = () => {
		if (!data?.results) return;
		console.log("\n\n Selecting all with data results : ", data.results);
		const allItems = data.results;
		const allSelected = allItems.every(
			(item) =>
				selectedItems.includes(getItemId(item)) || selectedItems.includes(String(getItemId(item))),
		);

		if (allSelected) {
			// Deselect all visible items
			allItems.forEach((item) => {
				const itemId = getItemId(item);
				if (
					onRemove &&
					(selectedItems.includes(itemId) || selectedItems.includes(String(itemId)))
				) {
					onRemove(itemId, item);
				}
			});
		} else {
			// Select all visible items
			allItems.forEach((item) => {
				const itemId = getItemId(item);
				if (!selectedItems.includes(itemId) && !selectedItems.includes(String(itemId))) {
					onSelect(itemId, item);
				}
			});
		}
	};

	const handleSelect = (itemId: string | number) => {
		const item = data?.results.find((i) => getItemId(i) === itemId);
		if (!item) return;
		if (multiple && selectedItems.includes(itemId) && onRemove) {
			onRemove(itemId, item);
		} else {
			onSelect(itemId, item);
			if (!multiple) setOpen(false);
		}
	};

	// Clear all selections
	const clearAll = () => {
		selectedItems.forEach((itemId) => {
			const item = data?.results.find((i) => getItemId(i) === itemId);
			if (item && onRemove) {
				onRemove(itemId, item);
			}
		});
	};

	// Check selection state
	const allVisibleSelected = data?.results
		? data.results.every(
				(item) =>
					selectedItems.includes(getItemId(item)) ||
					selectedItems.includes(String(getItemId(item))),
			)
		: false;
	const someVisibleSelected = data?.results
		? data.results.some(
				(item) =>
					selectedItems.includes(getItemId(item)) ||
					selectedItems.includes(String(getItemId(item))),
			)
		: false;

	const orderedItems = getOrderedItems();

	return (
		<div className={cn("relative w-full", className)} ref={dropdownRef}>
			{/* Trigger button */}
			<div
				className={cn(
					"relative flex items-center justify-between w-full px-3 py-2 min-h-12 text-sm border border-input rounded-2xl cursor-pointer hover:bg-accent/50 transition-colors",
					disabled && "opacity-50 cursor-not-allowed",
					triggerClassName,
				)}
				onClick={() => !disabled && setOpen(!open)}
			>
				{
					// If single-select (multiple=false), dropdown is closed, and there's a selected item, show its label
					!multiple && !open && selectedItems.length > 0 && selectedItem ? (
						<input
							readOnly
							value={getItemLabel(selectedItem)}
							className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground"
							onClick={(e) => e.stopPropagation()}
						/>
					) : (
						// Otherwise show the search input so users can type to filter
						<input
							ref={searchInputRef}
							type="text"
							placeholder={placeholder}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground"
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => {
								if (!open) {
									setOpen(true);
								}
							}}
							disabled={disabled}
						/>
					)
				}

				<div className="flex items-center gap-2 absolute right-1">
					{!multiple && selectedItems.length === 1 && selectedItem && (
						// Clear button for single-select
						<button
							onClick={(e) => {
								e.stopPropagation();
								clearAll();
							}}
							className="text-muted-foreground hover:text-foreground transition-colors"
							disabled={disabled}
						>
							<X className="h-4 w-4" />
						</button>
					)}
					{selectedItems.length > 1 && (
						<div className="flex items-center gap-1">
							<span className="bg-primary text-primary-foreground text-xs px-4 py-1 rounded-md font-medium">
								{selectedItems.length}
							</span>
							<button
								onClick={(e) => {
									e.stopPropagation();
									clearAll();
								}}
								className="text-muted-foreground hover:text-foreground transition-colors"
								disabled={disabled}
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					)}
					<ChevronDown
						className={cn(
							"h-4 w-4 text-muted-foreground transition-transform",
							open && "rotate-180",
						)}
					/>
				</div>
			</div>

			{/* Dropdown content */}
			{open && (
				<div
					className={cn(
						"absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg !z-[60] max-h-64 overflow-hidden",
						popoverClassName,
					)}
				>
					{/* Select All option - only show for multiple selection */}
					{multiple && (
						<div
							className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer border-b border-border"
							onClick={handleSelectAll}
						>
							<div className="flex items-center justify-center w-4 h-4 border border-input rounded-sm bg-background">
								{allVisibleSelected ? (
									<Check className="h-3 w-3 text-primary" />
								) : someVisibleSelected ? (
									<Minus className="h-3 w-3 text-primary" />
								) : null}
							</div>
							<span className="text-sm font-medium">Select All</span>
						</div>
					)}

					{/* Items list */}
					<div ref={listRef} className="max-h-48 overflow-y-auto">
						{loading && orderedItems.length === 0 ? (
							<div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
						) : orderedItems.length === 0 ? (
							<div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
						) : (
							orderedItems.map((item) => {
								const isSelected =
									selectedItems.includes(getItemId(item)) ||
									selectedItems.includes(String(getItemId(item)));
								return (
									<div
										key={getItemId(item)}
										className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer transition-colors"
										onClick={() => handleSelect(getItemId(item))}
									>
										<div className="flex items-center justify-center w-4 h-4 border border-input rounded-sm bg-background">
											{isSelected && <Check className="h-3 w-3 text-primary" />}
										</div>
										<span className={cn("text-sm", isSelected && "font-medium")}>
											{getItemLabel(item)}
										</span>
									</div>
								);
							})
						)}
						{paginated && hasMore && <div ref={sentinelRef} className="h-3" />}
						{loading && orderedItems.length > 0 && (
							<div className="text-center py-2 text-xs text-gray-500">Loading more...</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default PaginatedSearchableSelect;
