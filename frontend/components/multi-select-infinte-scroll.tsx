"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Search, Check, X } from 'lucide-react'
import { cn } from "@/lib/utils"

interface MultiSelectInfiniteScrollProps<T> {
  items: T[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSearch: (query: string) => void
  selectedItems: T[]
  onSelectionChange: (items: T[]) => void
  getItemId: (item: T) => string | number
  getItemLabel: (item: T) => string
  getItemDescription?: (item: T) => string
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

export function MultiSelectInfiniteScroll<T>({
  items,
  loading,
  hasMore,
  onLoadMore,
  onSearch,
  selectedItems,
  onSelectionChange,
  getItemId,
  getItemLabel,
  getItemDescription,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found",
  className,
  disabled = false,
}: MultiSelectInfiniteScrollProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      onSearch(query)
    },
    [onSearch],
  )

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loading) {
          onLoadMore()
        }
      },
      {
        threshold: 0.1,
      },
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, onLoadMore])

  const handleItemToggle = (item: T) => {
    if (disabled) return

    const itemId = getItemId(item)
    const isSelected = selectedItems.some(selected => getItemId(selected) === itemId)
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter(selected => getItemId(selected) !== itemId))
    } else {
      onSelectionChange([...selectedItems, item])
    }
  }

  const clearSelection = () => {
    if (!disabled) {
      onSelectionChange([])
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
      </div>

      {/* Selected Items Display */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-primary">
              Selected Items ({selectedItems.length})
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedItems.slice(0, 5).map((item) => (
              <div
                key={getItemId(item)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-primary/30 rounded text-xs"
              >
                <span className="truncate max-w-24">{getItemLabel(item)}</span>
                <button
                  type="button"
                  onClick={() => handleItemToggle(item)}
                  className="text-primary hover:text-primary/80"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {selectedItems.length > 5 && (
              <div className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                +{selectedItems.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      <ScrollArea className="h-64 border rounded-lg" ref={scrollAreaRef}>
        <div className="p-2">
          {items.length === 0 && !loading ? (
            <div className="text-center py-8 text-gray-500">
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <>
              {items.map((item) => {
                const isSelected = selectedItems.some(selected => getItemId(selected) === getItemId(item))
                return (
                  <Button
                    key={getItemId(item)}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start p-3 h-auto mb-1",
                      isSelected && "bg-primary/10 border border-primary/20",
                    )}
                    onClick={() => handleItemToggle(item)}
                    disabled={disabled}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-left flex-1">
                        <p className="font-medium">{getItemLabel(item)}</p>
                        {getItemDescription && (
                          <p className="text-sm text-gray-600">{getItemDescription(item)}</p>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />}
                    </div>
                  </Button>
                )
              })}

              {/* Load More Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {loading && <Loader2 className="h-6 w-6 animate-spin text-gray-400" />}
                </div>
              )}

              {/* Loading State */}
              {loading && items.length === 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
