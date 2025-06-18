"use client";

import {ChevronLeft, ChevronRight} from "lucide-react";

import {Button} from "@/components/ui/button";

export interface PaginationInfo {
  next: string | null;
  previous: string | null;
  count: number;
}

interface PaginationControlsProps {
  pagination: PaginationInfo;
  currentItems: number;
  onPageChange: (url: string | null) => void | Promise<void>;
  isLoading?: boolean;
}

export function PaginationControls({
  pagination,
  currentItems,
  onPageChange,
  isLoading = false,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Showing {currentItems} of {pagination.count} items
      </div>
      <div className="flex items-center gap-2">
        <Button
          disabled={!pagination.previous || isLoading}
          size="sm"
          variant="default"
          onClick={() => pagination.previous && onPageChange(pagination.previous)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          disabled={!pagination.next || isLoading}
          size="sm"
          variant="default"
          onClick={() => pagination.next && onPageChange(pagination.next)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
