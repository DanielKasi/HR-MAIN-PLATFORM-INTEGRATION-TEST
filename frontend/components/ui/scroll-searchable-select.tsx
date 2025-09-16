"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { IPaginatedResponse } from "@/types/types.utils";

interface SearchableSelectInfiniteProps<T> {
	value?: string | number;
	onValueChange: (value: string | number) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	loadingText?: string;
	fetchData: (searchTerm: string, pageUrl?: string | null) => Promise<IPaginatedResponse<T>>;
	getItemValue: (item: T) => string | number;
	getItemLabel: (item: T) => string;
	getItemSearchText?: (item: T) => string;
	disabled?: boolean;
	error?: boolean;
	className?: string;
}

export function SearchableSelectInfinite<T>({
	value,
	onValueChange,
	placeholder = "Select an option...",
	searchPlaceholder = "Search...",
	emptyText = "No results found",
	loadingText = "Loading...",
	fetchData,
	getItemValue,
	getItemLabel,
	getItemSearchText,
	disabled = false,
	error = false,
	className,
}: SearchableSelectInfiniteProps<T>) {
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
	const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [initialLoad, setInitialLoad] = useState(false);

	const scrollRef = useRef<HTMLDivElement>(null);
	const observer = useRef<IntersectionObserver>(null);

	// Debounce search term
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Load initial data and handle search changes
	useEffect(() => {
		if (open) {
			loadData(true);
			setInitialLoad(true);
		} else if (debouncedSearchTerm !== searchTerm) {
			return;
		}
	}, [open]);

	const loadData = async (reset = false) => {
		try {
			if (reset) {
				setLoading(true);
				setItems([]);
			} else {
				setLoadingMore(true);
			}

			const response = await fetchData(debouncedSearchTerm, reset ? null : nextPageUrl);

			if (reset) {
				setItems(response.results);
			} else {
				setItems((prev) => [...prev, ...response.results]);
			}

			setNextPageUrl(response.next);
			setHasMore(!!response.next);
		} catch (error) {
			// Error handling can be done by parent component
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	};

	// Intersection observer for infinite scroll
	const lastItemRef = useCallback(
		(node: HTMLDivElement) => {
			if (loading || loadingMore) return;
			if (observer.current) observer.current.disconnect();

			observer.current = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting && hasMore && !loadingMore) {
					loadData(false);
				}
			});

			if (node) observer.current.observe(node);
		},
		[loading, loadingMore, hasMore],
	);

	const selectedItem = items.find((item) => getItemValue(item) === value);

	const handleSelect = (selectedValue: string | number) => {
		onValueChange(selectedValue);
		setOpen(false);
	};

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			setSearchTerm("");
			setDebouncedSearchTerm("");
		}
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"w-full justify-between",
						!selectedItem && "text-muted-foreground",
						error && "border-red-500",
						className,
					)}
					disabled={disabled}
				>
					{selectedItem ? getItemLabel(selectedItem) : placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0" align="start">
				<Command shouldFilter={false}>
					<div className="flex items-center border-b px-3">
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<Input
							placeholder={searchPlaceholder}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
						/>
					</div>
					<CommandList className="max-h-[200px] overflow-y-auto" ref={scrollRef}>
						{loading ? (
							<div className="flex items-center justify-center py-6">
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								<span className="text-sm text-muted-foreground">{loadingText}</span>
							</div>
						) : items.length === 0 ? (
							<CommandEmpty>{emptyText}</CommandEmpty>
						) : (
							<CommandGroup>
								{items.map((item, index) => {
									const itemValue = getItemValue(item);
									const itemLabel = getItemLabel(item);
									const isLast = index === items.length - 1;

									return (
										<CommandItem
											key={itemValue}
											value={itemValue.toString()}
											onSelect={() => handleSelect(itemValue)}
											ref={isLast ? lastItemRef : undefined}
											className="cursor-pointer"
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													value === itemValue ? "opacity-100" : "opacity-0",
												)}
											/>
											{itemLabel}
										</CommandItem>
									);
								})}
								{loadingMore && (
									<div className="flex items-center justify-center py-2">
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
										<span className="text-sm text-muted-foreground">Loading more...</span>
									</div>
								)}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
