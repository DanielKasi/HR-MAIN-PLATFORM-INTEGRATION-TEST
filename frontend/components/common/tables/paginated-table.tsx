"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DependencyList, RefObject, ReactNode, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { type IPaginatedResponse } from "@/types/types.utils";
import { cn, showErrorToast } from "@/lib/utils";
import { forceUrlToHttps } from "@/lib/helpers";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type FetchFromUrlFn<T> = (args: { url: string }) => Promise<IPaginatedResponse<T>> | undefined;
type FetchFirstPageFn<T, Q> = (query?: Q) => Promise<IPaginatedResponse<T>>;

export type ColumnDef<T> = {
	key: string;
	header: ReactNode;
	cell: (item: T) => ReactNode;
	className?: string; // For TableHead
	cellClassName?: string; // For TableCell
};

export type PaginatedTableProps<T, Q = unknown> = {
	// Required fetchers
	fetchFirstPage: FetchFirstPageFn<T, Q>;
	fetchFromUrl?: FetchFromUrlFn<T>;
	// Optional query/deps to refetch first page
	query?: Q;
	deps?: DependencyList;
	paginated?: boolean;
	// UI controls
	className?: string; // For outer div
	tableClassName?: string; // For Table
	footerClassName?: string;
	showFooter?: boolean;
	// Error handler
	onError?: (err: unknown) => void;
	// Columns definition
	columns: ColumnDef<T>[];
	// Custom empty state
	emptyState?: ReactNode;
	// Number of skeleton rows during loading
	skeletonRows?: number;
	// Ref to expose refresh function
	refreshRef?: RefObject<(() => void) | null>;
};

/**
 * A reusable paginated table component that:
 * - Fetches first page with provided fetchFirstPage(query)
 * - Navigates via response.next/previous using fetchFromUrl({ url })
 * - Renders consistent rounded pagination controls
 * - Handles loading with skeletons and empty states internally
 * - Supports custom column definitions for headers and cells
 */
export function PaginatedTable<T, Q = unknown>({
	fetchFirstPage,
	fetchFromUrl,
	query,
	deps = [],
	paginated = true,
	className,
	tableClassName,
	footerClassName,
	showFooter = true,
	onError,
	columns,
	emptyState,
	skeletonRows = 5,
	refreshRef,
}: PaginatedTableProps<T, Q>) {
	const [data, setData] = useState<IPaginatedResponse<T> | null>(null);
	const [loading, setLoading] = useState<boolean>(paginated);

	const handleError = (err: unknown) => {
		if (onError) onError(err);
		else showErrorToast({ error: err, defaultMessage: "Failed to fetch data" });
	};

	const refresh = useCallback(async () => {
		if (!fetchFirstPage) {
			return;
		}
		setLoading(true);
		try {
			const res = await fetchFirstPage(query);

			setData(res);
		} catch (e) {
			handleError(e);
		} finally {
			setLoading(false);
		}
	}, [fetchFirstPage, onError, JSON.stringify(query)]); // stringify query to re-run when its content changes

	const goPrev = useCallback(async () => {
		if (!fetchFromUrl || !data?.previous) return;
		setLoading(true);
		try {
			const res = await fetchFromUrl({ url: forceUrlToHttps(data.previous) });

			if (!res) {
				return;
			}
			setData(res);
		} catch (e) {
			handleError(e);
		} finally {
			setLoading(false);
		}
	}, [data?.previous, fetchFromUrl]);

	const goNext = useCallback(async () => {
		if (!fetchFromUrl || !data?.next) return;
		setLoading(true);
		try {
			const res = await fetchFromUrl({ url: forceUrlToHttps(data.next) });

			if (!res) {
				return;
			}
			setData(res);
		} catch (e) {
			handleError(e);
		} finally {
			setLoading(false);
		}
	}, [data?.next, fetchFromUrl]);

	// Expose refresh via ref if provided
	useEffect(() => {
		if (refreshRef) {
			refreshRef.current = refresh;
		}
	}, [refresh, refreshRef]);

	// Initial fetch and refresh on deps change (with slight delay for debouncing)
	useEffect(() => {
		const timer = setTimeout(refresh, 1000);

		return () => clearTimeout(timer);
	}, [...deps]);

	return (
		<div className={cn("space-y-4", className)}>
			<Table className={cn(tableClassName)}>
				<TableHeader>
					<TableRow className="border-b bg-muted/30">
						{columns.map((col) => (
							<TableHead key={col.key} className={col.className}>
								{col.header}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{loading ? (
						Array.from({ length: skeletonRows }).map((_, rowIndex) => (
							<TableRow key={rowIndex} className="border-b">
								{columns.map((col) => (
									<TableCell key={col.key}>
										<Skeleton className="h-6 w-3/4" />
									</TableCell>
								))}
							</TableRow>
						))
					) : (data?.results?.length ?? 0) === 0 ? (
						<TableRow>
							<TableCell colSpan={columns.length} className="text-center py-12">
								{emptyState ?? <p className="text-muted-foreground mb-4">No data found</p>}
							</TableCell>
						</TableRow>
					) : (
						data?.results?.map((item, index) => (
							<TableRow key={index} className="hover:bg-muted/50 transition-colors border-b">
								{columns.map((col) => (
									<TableCell key={col.key} className={col.cellClassName}>
										{col.cell(item)}
									</TableCell>
								))}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			{showFooter && data && paginated && (
				<div className={cn("flex items-center justify-between pt-2", footerClassName)}>
					<p className="text-sm text-gray-500">
						Showing {data.results?.length ?? 0} results of {data.count ?? 0} total
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={goPrev}
							disabled={!data.previous || loading}
							className="rounded-xl"
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={goNext}
							disabled={!data.next || loading}
							className="rounded-xl"
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
