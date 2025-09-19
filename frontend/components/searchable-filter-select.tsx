"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { selectSelectedInstitution } from "@/store/auth/selectors";

export interface PaginatedFilterItem {
  id: string | number;
  name: string;
  label?: string;
}

interface PaginatedSearchableFilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  allValue?: string;
  className?: string;
  emptyMessage?: string;
  fetchFirstPage: (query?: { search?: string; page?: number }) => Promise<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>;
  fetchFromUrl: (params: { url: string }) => Promise<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>;
  getItemId: (item: any) => string | number;
  getItemLabel: (item: any) => string;
  searchPlaceholder?: string;
}

export function PaginatedSearchableFilterSelect({
  value,
  onValueChange,
  placeholder = "Search...",
  allLabel = "All Items",
  allValue = "all",
  className = "",
  emptyMessage = "No items found",
  fetchFirstPage,
  fetchFromUrl,
  getItemId,
  getItemLabel,
  searchPlaceholder = "Search...",
}: PaginatedSearchableFilterSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const currentInstitution = useSelector(selectSelectedInstitution);

  // Update display value when value changes
  useEffect(() => {
    if (value === allValue) {
      setDisplayValue(allLabel);
    } else {
      const selectedItem = items.find(item => 
        getItemLabel(item) === value || getItemId(item).toString() === value
      );
      setDisplayValue(selectedItem ? getItemLabel(selectedItem) : value);
    }
  }, [value, items, allValue, allLabel, getItemId, getItemLabel]);

  // Load initial data when dropdown opens
  const loadInitialData = useCallback(async () => {
    if (!currentInstitution) return;
    
    setIsLoading(true);
    try {
      const response = await fetchFirstPage({ search: searchTerm, page: 1 });
      setItems(response.results);
      setHasMore(!!response.next);
      setNextUrl(response.next);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFirstPage, searchTerm, currentInstitution]);

  // Load more data for pagination
  const loadMoreData = useCallback(async () => {
    if (!nextUrl || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetchFromUrl({ url: nextUrl });
      setItems(prev => [...prev, ...response.results]);
      setHasMore(!!response.next);
      setNextUrl(response.next);
    } catch (error) {
      console.error("Failed to load more data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [nextUrl, isLoading, fetchFromUrl]);

  // Handle search with debouncing
  useEffect(() => {
    if (!isOpen) return;
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      loadInitialData();
    }, 300);
    
    setSearchTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchTerm, isOpen, loadInitialData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoading) {
      loadMoreData();
    }
  }, [hasMore, isLoading, loadMoreData]);

  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
    if (items.length === 0) {
      loadInitialData();
    }
  }, [items.length, loadInitialData]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleItemSelect = useCallback((selectedValue: string, selectedLabel: string) => {
    onValueChange(selectedValue);
    setDisplayValue(selectedLabel);
    setSearchTerm("");
    setIsOpen(false);
  }, [onValueChange]);

  const handleAllSelect = useCallback(() => {
    handleItemSelect(allValue, allLabel);
  }, [allValue, allLabel, handleItemSelect]);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
      <Input
        placeholder={placeholder}
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        className="pl-10 text-sm border-gray-300 rounded-md focus:border-black focus:ring-0 cursor-pointer"
      />
      
      {isOpen && (
        <div
          className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto"
          ref={dropdownRef}
          onScroll={handleScroll}
        >
          {/* All Items Option */}
          <div
            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
            onClick={handleAllSelect}
          >
            <div className="font-medium text-sm">{allLabel}</div>
          </div>

          {/* Items List */}
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={getItemId(item)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => handleItemSelect(getItemLabel(item), getItemLabel(item))}
              >
                <div className="font-medium text-sm">
                  {getItemLabel(item)}
                </div>
              </div>
            ))
          ) : (
            !isLoading && (
              <div className="text-center py-8 text-gray-500 text-sm">
                {searchTerm ? `No items found for "${searchTerm}"` : emptyMessage}
              </div>
            )
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          )}

          {/* Load More Indicator */}
          {hasMore && !isLoading && items.length > 0 && (
            <div className="text-center py-2 text-xs text-gray-400">
              Scroll down to load more
            </div>
          )}
        </div>
      )}
    </div>
  );
}