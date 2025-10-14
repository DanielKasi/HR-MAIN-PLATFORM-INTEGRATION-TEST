"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
	Search,
	Calendar,
	User,
	FileText,
	Eye,
	RefreshCw,
	Plus,
	Loader2,
	ArrowLeft,
	Edit,
	Trash2,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";

import apiRequest from "@/lib/apiRequest";
import { IPaginatedResponse } from "@/types/types.utils";

interface IAuditLog {
	id: number;
	content_object: string;
	user: string;
	institution: string;
	object_id: number;
	action: "CREATE" | "UPDATE" | "DELETE";
	timestamp: string;
	changes: string;
	description: string;
	content_type: number;
}
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
	const [actionFilter, setActionFilter] = useState("all");
	const [contentTypeFilter, setContentTypeFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [ordering, setOrdering] = useState("-timestamp");

	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	// --- Toggle log expansion ---
	const toggleLog = (id: number) => {
		const newExpanded = new Set(expandedLogs);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		setExpandedLogs(newExpanded);
	};

	// --- Data Fetching Logic ---
	const fetchAuditLogs = useCallback(
		async (isInitial = false) => {
			if (!currentInstitution) return;
			if (loading) return;
			if (!isInitial && !hasMore) return;

			try {
				setLoading(true);

				let url: string;
				if (isInitial || !nextUrl) {
					const params = new URLSearchParams();
					if (searchTerm) params.append("search", searchTerm);
					if (actionFilter !== "all") params.append("action", actionFilter);
					if (contentTypeFilter !== "all") params.append("content_type", contentTypeFilter);
					if (dateFrom) params.append("date_from", dateFrom);
					if (dateTo) params.append("date_to", dateTo);
					if (ordering) params.append("ordering", ordering);
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
			searchTerm,
			actionFilter,
			contentTypeFilter,
			dateFrom,
			dateTo,
			ordering,
		],
	);

	// Initial fetch and refetch on filter changes
	useEffect(() => {
		if (currentInstitution) {
			setAuditLogs([]);
			setNextUrl(null);
			setHasMore(true);
			setInitialLoad(true);
			fetchAuditLogs(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		currentInstitution?.id,
		searchTerm,
		actionFilter,
		contentTypeFilter,
		dateFrom,
		dateTo,
		ordering,
	]);

	// Infinite scroll observer
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
			{ threshold: 0.1 },
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

	// --- Utility Functions ---
	const getActionColor = useCallback((action: string) => {
		switch (action) {
			case "CREATE":
				return "bg-green-100 text-green-800";
			case "UPDATE":
				return "bg-blue-100 text-blue-800";
			case "DELETE":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	}, []);

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		return {
			date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
			time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
		};
	};

	const handleViewDetails = (log: IAuditLog) => {
		showSuccessToast(`Viewing details for ${log.content_object}`);
	};

	const parseChanges = (changesStr: string) => {
		try {
			const changesObj = JSON.parse(changesStr);
			return Object.entries(changesObj).map(([field, values]) => ({
				field: field.charAt(0).toUpperCase() + field.slice(1),
				from: Array.isArray(values) ? String(values[0] ?? "null") : String(values),
				to: Array.isArray(values) ? String(values[1] ?? "null") : String(values),
			}));
		} catch {
			return [];
		}
	};

	// --- Render ---
	return (
		<div className="min-h-screen bg-background p-6">
			<div className="mx-auto max-w-5xl">
				{/* Header */}
				<div className="mb-6 flex items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => router.push("/admin")}
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-2xl font-semibold">Audit Logs</h1>
				</div>

				{/* Search and Filters */}
				<div className="mb-6 flex items-center gap-4 flex-wrap">
					<div className="relative flex-1 max-w-xs">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-9"
						/>
					</div>
					<div className="ml-auto flex items-center gap-2 flex-wrap">
						<Select value={actionFilter} onValueChange={setActionFilter}>
							<SelectTrigger className="w-[150px] focus-visible:ring-0 focus-visible:ring-offset-0">
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
							<SelectTrigger className="w-[180px] focus-visible:ring-0 focus-visible:ring-offset-0">
								<SelectValue placeholder="Content Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								<SelectItem value="institution">Institution</SelectItem>
								<SelectItem value="branch">Branch</SelectItem>
								<SelectItem value="department">Department</SelectItem>
								<SelectItem value="employee">Employee</SelectItem>
								<SelectItem value="user">User</SelectItem>
							</SelectContent>
						</Select>

						<div className="flex gap-2">
							<Input
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="w-[150px] focus-visible:ring-0 focus-visible:ring-offset-0"
								placeholder="From"
							/>
							<Input
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="w-[150px] focus-visible:ring-0 focus-visible:ring-offset-0"
								placeholder="To"
							/>
						</div>

						<Select value={ordering} onValueChange={setOrdering}>
							<SelectTrigger className="w-[150px] focus-visible:ring-0 focus-visible:ring-offset-0">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="-timestamp">Newest First</SelectItem>
								<SelectItem value="timestamp">Oldest First</SelectItem>
								<SelectItem value="action">Action (A-Z)</SelectItem>
								<SelectItem value="-action">Action (Z-A)</SelectItem>
								<SelectItem value="user__email">User (A-Z)</SelectItem>
								<SelectItem value="-user__email">User (Z-A)</SelectItem>
							</SelectContent>
						</Select>

						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9"
							onClick={handleRefresh}
							disabled={loading && auditLogs.length === 0}
						>
							<RefreshCw
								className={`h-4 w-4 ${loading && auditLogs.length === 0 ? "animate-spin" : ""}`}
							/>
						</Button>
					</div>
				</div>

				{/* Audit Logs Timeline */}
				{initialLoad && loading ? (
					<TableSkeleton rows={10} columns={1} />
				) : auditLogs.length === 0 ? (
					<div className="text-center py-12">
						<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-muted-foreground">No audit logs found</p>
					</div>
				) : (
					<div className="relative">
						{auditLogs.map((log, index) => {
							const { date, time } = formatTimestamp(log.timestamp);
							const changes = parseChanges(log.changes);
							const isExpanded = expandedLogs.has(log.id);

							return (
								<div key={log.id} className="relative flex gap-4">
									{/* Timeline indicator */}
									<div className="relative flex flex-col items-center">
										<div className="h-3 w-3 rounded-full bg-gray-400" />
										{index < auditLogs.length - 1 && (
											<div className="w-px flex-1 bg-gray-300 min-h-[80px]" />
										)}
									</div>

									{/* Log content */}
									<div className="flex-1 pb-8">
										<div className="flex items-center gap-2 mb-1 flex-wrap">
											<span className="font-medium text-sm">{log.content_object}</span>
											<Badge className={getActionColor(log.action)}>{log.action}</Badge>
											<span className="text-sm text-muted-foreground">{log.user}</span>
										</div>
										<div className="text-xs text-muted-foreground mb-3">
											{date} • {time}
										</div>

										{/* Details section */}
										<div className="border border-border rounded-lg overflow-hidden">
											<button
												onClick={() => toggleLog(log.id)}
												className="flex w-full items-center gap-2 bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
											>
												{isExpanded ? (
													<ChevronUp className="h-4 w-4" />
												) : (
													<ChevronDown className="h-4 w-4" />
												)}
												Details
											</button>

											{isExpanded && (
												<div className="bg-muted/20 px-4 py-4 space-y-4">
													<div>
														<h4 className="text-sm font-medium mb-2">Description</h4>
														<p className="text-sm text-muted-foreground">{log.description}</p>
													</div>

													{changes.length > 0 && (
														<div>
															<h4 className="text-sm font-medium mb-3">Changes</h4>
															<div className="space-y-3">
																{changes.map((change, idx) => (
																	<div key={idx} className="flex items-center gap-4">
																		<div className="min-w-0">
																			<div className="text-xs text-muted-foreground mb-1">
																				{change.field}:
																			</div>
																			<div className="text-sm font-medium truncate">
																				{change.from}
																			</div>
																		</div>
																		<div className="flex items-center flex-shrink-0">
																			<div className="h-px w-8 bg-yellow-400" />
																			<div className="h-0 w-0 border-y-4 border-l-4 border-y-transparent border-l-yellow-400" />
																		</div>
																		<div className="min-w-0">
																			<div className="text-xs text-muted-foreground mb-1">
																				{change.field}:
																			</div>
																			<div className="text-sm font-medium truncate">
																				{change.to}
																			</div>
																		</div>
																	</div>
																))}
															</div>
														</div>
													)}

													<div className="flex gap-2 pt-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleViewDetails(log)}
														>
															<Eye className="h-4 w-4 mr-2" />
															View Full Details
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																navigator.clipboard.writeText(JSON.stringify(log, null, 2));
																showSuccessToast("Copied to clipboard");
															}}
														>
															<FileText className="h-4 w-4 mr-2" />
															Copy Log Data
														</Button>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})}

						{/* Loading/End Indicator */}
						<div ref={loadMoreRef} className="flex justify-center py-4">
							{loading && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Loader2 className="h-5 w-5 animate-spin" />
									<span>Loading...</span>
								</div>
							)}
							{!hasMore && auditLogs.length > 0 && (
								<div className="text-sm text-muted-foreground">End of logs reached.</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
