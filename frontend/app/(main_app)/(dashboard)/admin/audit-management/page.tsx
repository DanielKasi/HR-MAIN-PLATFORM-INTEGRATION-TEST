"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

import {
	Search,
	FileText,
	RefreshCw,
	Loader2,
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	Clock,
	ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";

import apiRequest from "@/lib/apiRequest";
import { IPaginatedResponse } from "@/types/types.utils";
import type { IAuditLog } from "@/types/types.utils";

const safeStringify = (value: any): string => {
	if (value === undefined || value === null) {
		return "N/A";
	}

	if (typeof value === "object") {
		try {
			return JSON.stringify(value, null, 2);
		} catch (e) {
			console.error("Failed to stringify object:", value, e);
			return "[Unserializable Object]";
		}
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	if (typeof value === "number") {
		return value.toString();
	}

	return String(value);
};

const extractDisplayName = (value: any): string => {
	if (!value) return "N/A";

	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return parsed.display_name || parsed.type || parsed.email || parsed.full_name || value;
		} catch {
			return value;
		}
	}

	if (typeof value === "object") {
		return value.display_name || value.type || value.email || value.full_name || "N/A";
	}

	return String(value);
};

const extractAssetName = (log: IAuditLog): string => {
	const value = log.content_object;

	if (!value) {
		// Fallback to parsing description if content_object is missing
		if (log.description) {
			const parts = log.description.split("for ");
			if (parts.length > 1) {
				// Grab everything after "for " and trim trailing period or whatever
				return parts[1].replace(/\.$/, "").trim();
			}
		}
		return "Unknown Asset";
	}

	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return parsed.name || parsed.title || parsed.display_name || "Unknown Asset";
		} catch {
			return value;
		}
	}

	if (typeof value === "object") {
		return value.name || value.title || value.display_name || "Unknown Asset";
	}

	return String(value);
};

const extractUserName = (value: any): string => {
	if (!value) return "System";

	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return parsed.full_name || parsed.email || parsed.username || value;
		} catch {
			return value;
		}
	}

	if (typeof value === "object") {
		return value.full_name || value.email || value.username || "Unknown User";
	}

	return String(value);
};

const parseChanges = (
	changes: IAuditLog["changes"],
	action: IAuditLog["action"],
): Record<string, { old: any; new: any }> => {
	if (!changes) {
		return {};
	}

	let changesObj: Record<string, any>;

	if (typeof changes === "string") {
		try {
			changesObj = JSON.parse(changes);
		} catch (e) {
			console.error("Failed to parse changes JSON:", e);
			return {};
		}
	} else if (typeof changes === "object" && changes !== null) {
		changesObj = changes;
	} else {
		return {};
	}

	if (typeof changesObj !== "object" || changesObj === null) {
		return {};
	}

	const parsedChanges: Record<string, { old: any; new: any }> = {};

	if (Array.isArray(changesObj)) {
		changesObj.forEach((change, index) => {
			if (change && typeof change === "object") {
				parsedChanges[`Change ${index + 1}`] = {
					old: safeStringify(change.old !== undefined ? change.old : change.from),
					new: safeStringify(change.new !== undefined ? change.new : change.to),
				};
			}
		});
	} else {
		Object.entries(changesObj).forEach(([field, values]) => {
			const normalizedField = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");

			let oldValue: any = null;
			let newValue: any = null;

			try {
				if (Array.isArray(values) && values.length === 2) {
					oldValue = values[0];
					newValue = values[1];
				} else if (typeof values === "object" && values !== null) {
					oldValue = (values as any).old || (values as any).from;
					newValue = (values as any).new || (values as any).to;
				} else if (action === "CREATE") {
					oldValue = null;
					newValue = values;
				} else if (action === "DELETE") {
					oldValue = values;
					newValue = null;
				} else {
					oldValue = values;
					newValue = null;
				}
			} catch (error) {
				console.error(`Error processing field ${field}:`, error);
				oldValue = "Error processing value";
				newValue = "Error processing value";
			}

			parsedChanges[normalizedField] = {
				old: oldValue,
				new: newValue,
			};
		});
	}

	return parsedChanges;
};

export default function AuditLogsPage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);
	useDocumentTitle("AUDIT LOGS");

	const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
	const [loading, setLoading] = useState(false);
	const [initialLoad, setInitialLoad] = useState(true);
	const [hasMore, setHasMore] = useState(true);
	const [nextUrl, setNextUrl] = useState<string | null>(null);
	const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
	const [actionFilter, setActionFilter] = useState("all");
	const [contentTypeFilter, setContentTypeFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		searchTimeoutRef.current = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 500);

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, [searchTerm]);

	const toggleLog = (id: number) => {
		setExpandedLogs((prev) => {
			const newExpanded = new Set(prev);
			if (newExpanded.has(id)) {
				newExpanded.delete(id);
			} else {
				newExpanded.add(id);
			}
			return newExpanded;
		});
	};

	const getActionBadgeVariant = useCallback((action: string) => {
		switch (action.toUpperCase()) {
			case "CREATE":
				return "success";
			case "UPDATE":
				return "info";
			case "DELETE":
				return "destructive";
			default:
				return "default";
		}
	}, []);

	const getDotColor = (action: string) => {
		return "bg-gray-400";
	};

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		return {
			date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
			time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
		};
	};

	const fetchAuditLogs = useCallback(
		async (isInitial = false) => {
			if (!currentInstitution) return;
			if (loading && !isInitial) return;
			if (!isInitial && !hasMore) return;

			try {
				setLoading(true);

				let url: string;
				if (isInitial || !nextUrl) {
					const params = new URLSearchParams();
					if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
					if (actionFilter !== "all") params.append("action", actionFilter);
					if (contentTypeFilter !== "all") params.append("content_type__model", contentTypeFilter);
					if (dateFrom) params.append("date_from", dateFrom);
					if (dateTo) params.append("date_to", dateTo);
					params.append("institution_id", String(currentInstitution.id));
					url = `/audit/institutions/audit-logs/?${params.toString()}`;
				} else {
					url = nextUrl;
				}

				const response = await apiRequest.get(url);
				const data = response.data as IPaginatedResponse<IAuditLog>;

				if (isInitial) {
					setAuditLogs(data.results);
				} else {
					setAuditLogs((prev) => [...prev, ...data.results]);
				}

				setNextUrl(data.next);
				setHasMore(!!data.next);
			} catch (err) {
				console.error("Error fetching audit logs:", err);
				showErrorToast({ error: err, defaultMessage: "Failed to fetch audit logs" });
			} finally {
				setLoading(false);
				setInitialLoad(false);
			}
		},
		[
			currentInstitution,
			loading,
			hasMore,
			nextUrl,
			debouncedSearchTerm,
			actionFilter,
			contentTypeFilter,
			dateFrom,
			dateTo,
		],
	);

	useEffect(() => {
		if (currentInstitution) {
			setAuditLogs([]);
			setNextUrl(null);
			setHasMore(true);
			setInitialLoad(true);
			fetchAuditLogs(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentInstitution, debouncedSearchTerm, actionFilter, contentTypeFilter, dateFrom, dateTo]);

	useEffect(() => {
		if (loading || !hasMore || !loadMoreRef.current) return;

		if (observerRef.current) {
			observerRef.current.disconnect();
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					fetchAuditLogs(false);
				}
			},
			{ threshold: 0.5 },
		);

		observer.observe(loadMoreRef.current);
		observerRef.current = observer;

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [loading, hasMore, fetchAuditLogs]);

	const handleRefresh = () => {
		setAuditLogs([]);
		setNextUrl(null);
		setHasMore(true);
		setInitialLoad(true);
		fetchAuditLogs(true);
	};

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="px-4">
				<div className="mb-6 flex flex-col gap-4">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 flex-shrink-0"
							onClick={() => router.push("/admin")}
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<h1 className="text-2xl font-semibold whitespace-nowrap">Audit Logs</h1>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<div className="relative flex-1 max-w-md min-w-[250px]">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search user, object, or description..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
							/>
						</div>

						<div className="flex items-center gap-2 ml-auto flex-wrap">
							<Select value={actionFilter} onValueChange={setActionFilter}>
								<SelectTrigger className="w-[150px] focus:ring-0 focus:ring-offset-0">
									<SelectValue placeholder="Action" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Actions</SelectItem>
									<SelectItem value="CREATE">Create</SelectItem>
									<SelectItem value="UPDATE">Update</SelectItem>
									<SelectItem value="DELETE">Delete</SelectItem>
								</SelectContent>
							</Select>

							<Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
								<SelectTrigger className="w-[180px] focus:ring-0 focus:ring-offset-0">
									<SelectValue placeholder="Content Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value="institution">Institution</SelectItem>
									<SelectItem value="branch">Branch</SelectItem>
									<SelectItem value="department">Department</SelectItem>
									<SelectItem value="employee">Employee</SelectItem>
									<SelectItem value="user">User</SelectItem>
									<SelectItem value="institutionemployeeseparationtypes">
										Separation Type
									</SelectItem>
									<SelectItem value="offboardingstage">Offboarding Stage</SelectItem>
									<SelectItem value="employeeattendance">Employee Attendance</SelectItem>
									<SelectItem value="terminationinitiation">Termination Initiation</SelectItem>
								</SelectContent>
							</Select>

							<Input
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="w-[150px] min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
								placeholder="From Date"
							/>
							<Input
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="w-[150px] min-w-0 focus-visible:ring-0 focus-visible:ring-offset-0"
								placeholder="To Date"
							/>

							<Button
								variant="ghost"
								size="icon"
								className="h-9 w-9 flex-shrink-0"
								onClick={handleRefresh}
								disabled={loading}
							>
								<RefreshCw
									className={`h-4 w-4 ${loading && auditLogs.length === 0 ? "animate-spin" : ""}`}
								/>
							</Button>
						</div>
					</div>
				</div>

				{initialLoad && loading ? (
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex gap-3">
								<Skeleton className="h-3 w-3 rounded-full flex-shrink-0 mt-1" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							</div>
						))}
					</div>
				) : auditLogs.length === 0 ? (
					<div className="p-8 text-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
						<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
							<Clock className="h-5 w-5 text-gray-400" />
						</div>
						<p className="text-sm font-medium text-gray-900">No activity yet</p>
						<p className="text-xs text-gray-500 mt-1">Changes will appear here</p>
					</div>
				) : (
					<div className={cn("space-y-6")}>
						{auditLogs.map((log, index) => {
							const { date, time } = formatTimestamp(log.timestamp);
							const changes = parseChanges(log.changes, log.action);
							const hasChanges = changes && Object.keys(changes).length > 0;
							const isExpanded = expandedLogs.has(log.id);
							const isLastItem = index === auditLogs.length - 1;

							const assetName = extractAssetName(log); // Updated to pass whole log
							const displayName = extractDisplayName(log.content_object);
							const userName = extractUserName(log.user);

							return (
								<div key={log.id} className="relative space-y-3 mt-10">
									{!isLastItem && (
										<div className="absolute left-[5px] top-6 bottom-0 w-px bg-gray-300" />
									)}

									<div className="flex items-start gap-3 relative">
										<div className="flex-shrink-0 mt-1 relative z-10">
											<div className={cn("h-3 w-3 rounded-full", getDotColor(log.action))} />
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="text-sm font-medium text-gray-900">{assetName}</span>
												<Badge variant={getActionBadgeVariant(log.action)}>
													{log.action.charAt(0).toUpperCase() + log.action.slice(1).toLowerCase()}
												</Badge>
												<span className="text-sm text-gray-600">By {userName}</span>
											</div>

											<div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
												<span>{date}</span>
												<span>•</span>
												<span>{time}</span>
											</div>
										</div>
									</div>

									{(hasChanges || log.description) && (
										<div className="ml-6 bg-[#F4F4F9] rounded-lg">
											<button
												onClick={() => toggleLog(log.id)}
												className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2 pt-3 pl-3 pb-3"
											>
												{isExpanded ? (
													<ChevronUp className="h-4 w-4" />
												) : (
													<ChevronDown className="h-4 w-4" />
												)}
												<span>Details</span>
											</button>

											{isExpanded && (
												<div className="p-4 space-y-4 pt-0">
													{log.description && (
														<div className="space-y-2">
															<div className="text-xs font-medium text-gray-500">Description</div>
															<div className="text-sm text-gray-900 rounded-md">
																{log.description}
															</div>
														</div>
													)}

													{hasChanges &&
														Object.entries(changes).map(([field, change]: [string, any]) => (
															<div key={field} className="space-y-2">
																<div className="text-xs font-medium text-gray-700">{field}:</div>
																<div className="flex items-center gap-2">
																	<div className="flex-1">
																		<div className="text-xs text-gray-500 mb-1">Previous:</div>
																		<div className="text-sm text-gray-900 p-2 rounded-md">
																			{change.old !== null &&
																			change.old !== undefined &&
																			change.old !== "N/A" ? (
																				safeStringify(change.old)
																			) : (
																				<span className="text-gray-400 italic">Empty</span>
																			)}
																		</div>
																	</div>
																	<div className="flex items-center gap-0 flex-shrink-0">
																		<div className="h-px w-16 bg-[#848496] rounded-full" />
																		<ArrowRight className="h-4 w-4 text-[#848496] -ml-1" />
																	</div>
																	<div className="flex-1">
																		<div className="text-xs text-gray-500 mb-1">Current:</div>
																		<div className="text-sm font-medium text-gray-900 p-2 rounded-md">
																			{change.new !== null &&
																			change.new !== undefined &&
																			change.new !== "N/A" ? (
																				safeStringify(change.new)
																			) : (
																				<span className="text-gray-400 italic">Empty</span>
																			)}
																		</div>
																	</div>
																</div>
															</div>
														))}
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}

						{hasMore && (
							<div ref={loadMoreRef} className="flex justify-center pt-4 pb-8">
								{loading && auditLogs.length > 0 && (
									<div className="flex items-center gap-2 text-xs text-gray-500">
										<div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
										Loading more entries...
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
