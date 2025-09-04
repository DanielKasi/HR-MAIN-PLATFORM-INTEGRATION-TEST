"use client";

import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {type IPaginatedResponse} from "@/types/types.utils";
import {cn, showErrorToast} from "@/lib/utils";
import {DependencyList, ReactNode, useCallback, useEffect, useState} from "react";
import { forceUrlToHttps } from "@/lib/helpers";

type FetchFromUrlFn<T> = (args: {url: string}) => Promise<IPaginatedResponse<T>>|undefined;
type FetchFirstPageFn<T, Q> = (query?: Q) => Promise<IPaginatedResponse<T>>;

export type PaginatedTableWrapperProps<T, Q = unknown> = {
  // Required fetchers
  fetchFirstPage?: FetchFirstPageFn<T, Q>|null;
  fetchFromUrl?: FetchFromUrlFn<T>|null;
  // Optional query/deps to refetch first page
  query?: Q;
  deps?: DependencyList;
  paginated?:boolean
  // UI controls
  className?: string;
  footerClassName?: string;
  showFooter?: boolean;
  // Error handler
  onError?: (err: unknown) => void;
  // Children render prop gets data + controls
  children: (ctx: {
    data: IPaginatedResponse<T> | null;
    loading: boolean;
    refresh: () => Promise<void>;
    goNext: () => Promise<void>;
    goPrev: () => Promise<void>;
  }) => ReactNode;
};

/**
 * A reusable wrapper for paginated tables that:
 * - Fetches first page with provided fetchFirstPage(query)
 * - Navigates via response.next/previous using fetchFromUrl({ url })
 * - Renders consistent rounded pagination controls
 * - Exposes data/loading/refresh/goNext/goPrev to children for table rendering
 */
export function PaginatedTableWrapper<T, Q = unknown>({
  fetchFirstPage,
  fetchFromUrl,
  query,
  deps = [],
  paginated = true,
  className,
  footerClassName,
  showFooter = true,
  onError,
  children,

}: PaginatedTableWrapperProps<T, Q>) {
  const [data, setData] = useState<IPaginatedResponse<T> | null>(null);
  const [loading, setLoading] = useState<boolean>(paginated);

  const handleError = (err: unknown) => {
    if (onError) onError(err);
    else showErrorToast({error: err, defaultMessage: "Failed to fetch data"});
  };

  const refresh = useCallback(async () => {
    if(!fetchFirstPage){return}
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
    if (!fetchFromUrl ||!data?.previous) return;
    setLoading(true);
    try {
      const res = await fetchFromUrl({url: forceUrlToHttps(data.previous)});
      if(!res){return}
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
      const res = await fetchFromUrl({url: forceUrlToHttps(data.next)});
      if(!res){
        return
      }
      setData(res);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }, [data?.next, fetchFromUrl]);

  useEffect(() => {
    const timer = setTimeout(refresh, 1000);
    return () => clearTimeout(timer);
  }, [...deps]);

  return (
    <div className={cn("space-y-4", className)}>
      {children({data, loading, refresh, goNext, goPrev})}

      {showFooter && data && paginated && (
        <div className={cn("flex items-center justify-between pt-2", footerClassName)}>
          <p className="text-sm text-gray-500">
            Showing {data.results?.length} results of {data.count} total
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
