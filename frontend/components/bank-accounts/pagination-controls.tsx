"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
	currentPage: number;
	totalCount: number;
	nextPageUrl: string | null;
	previousPageUrl: string | null;
	loading: boolean;
	onNextPage: () => void;
	onPreviousPage: () => void;
}

export function PaginationControls({
	currentPage,
	totalCount,
	nextPageUrl,
	previousPageUrl,
	loading,
	onNextPage,
	onPreviousPage,
}: PaginationControlsProps) {
	if (!nextPageUrl && !previousPageUrl) {
		return null;
	}

	return (
		<div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
			<div className="flex items-center gap-2 text-sm text-gray-600">
				<span>
					Total: {totalCount} results • Page {currentPage}
				</span>
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onPreviousPage}
					disabled={!previousPageUrl || loading}
					className="flex items-center gap-1 bg-transparent"
				>
					<ChevronLeft className="h-4 w-4" />
					Previous
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={onNextPage}
					disabled={!nextPageUrl || loading}
					className="flex items-center gap-1 bg-transparent"
				>
					Next
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
