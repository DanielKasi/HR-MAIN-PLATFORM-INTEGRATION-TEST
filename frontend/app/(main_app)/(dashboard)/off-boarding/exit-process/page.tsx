"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
	Search,
	Plus,
	Eye,
	Edit,
	MoreVertical,
	Calendar,
	Users,
	FileText,
	CheckCircle,
	Clock,
	XCircle,
	ArrowLeft,
	ArrowUpDown,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import apiRequest from "@/lib/apiRequest";
import { showErrorToast } from "@/lib/utils";
import StageReorderModal from "@/components/stage-reorder-modal";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";

// Updated interfaces based on new API response structure
export interface ITerminationStage {
	id: number;
	stage: {
		id: number;
		name: string;
		description: string;
		order: number;
		created_at: string;
		updated_at: string;
	};
	custom_order: number;
	completed: boolean;
	completed_at: string | null;
	notes: string;
	skipped: boolean;
	created_at: string;
	updated_at: string;
}

export interface ITerminationType {
	id: number;
	name: string;
	description: string;
	category: "resignation" | "termination" | "retirement" | "contract_end" | "other";
	requires_handover_report: boolean;
	supported_stages: Array<{
		id: number;
		stage: {
			id: number;
			name: string;
			description: string;
			order: number;
		};
		can_be_skipped: boolean;
		order: number;
	}>;
	approval_status: "under_creation" | "approved" | "rejected";
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface ITermination {
	id: number;
	employee: {
		id: number;
		name: string;
		email: string;
	} | null;
	termination_type: ITerminationType;
	initiated_by: {
		id: number;
		user: {
			fullname: string;
			email: string;
		};
	} | null;
	last_working_day: string;
	reason: string;
	status: "INITIATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
	stage_progress: ITerminationStage[];
	handover_report: {
		report_text: string;
		report_file: string;
	} | null;
	created_at: string;
	updated_at: string;
	initiator_type: "EMPLOYEE" | "MANAGER" | "HR";
	is_paid_after_termination: boolean;
	final_payment_date: string | null;
}

export interface IPaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export default function ExitProcessPage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);

	const [terminationTypes, setTerminationTypes] = useState<ITerminationType[]>([]);
	const [loadingTerminationTypes, setLoadingTerminationTypes] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [reorderModalOpen, setReorderModalOpen] = useState(false);
	const [terminationToReorder, setTerminationToReorder] = useState<ITermination | null>(null);
	const [terminations, setTerminations] = useState<ITermination[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [nextUrl, setNextUrl] = useState<string | null>(null);
	const [initialLoad, setInitialLoad] = useState(true);

	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const hasFetchedTerminationTypesRef = useRef(false);

	const fetchTerminationTypes = async () => {
		if (!currentInstitution) return;

		try {
			setLoadingTerminationTypes(true);
			// Note: You might need to create a separate endpoint for termination types
			// For now, using a mock implementation based on available data
			const response = await apiRequest.get("/on-boarding/terminations/");
			const data = response.data as IPaginatedResponse<ITermination>;

			// Extract unique termination types from the terminations
			const uniqueTypes = new Map();
			data.results.forEach((termination) => {
				if (termination.termination_type && !uniqueTypes.has(termination.termination_type.id)) {
					uniqueTypes.set(termination.termination_type.id, termination.termination_type);
				}
			});

			setTerminationTypes(Array.from(uniqueTypes.values()));
		} catch (err) {
			console.error("Error fetching termination types:", err);
			showErrorToast({ error: err, defaultMessage: "Failed to fetch termination types" });
			setTerminationTypes([]);
		} finally {
			setLoadingTerminationTypes(false);
		}
	};

	const fetchTerminations = useCallback(
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
					if (statusFilter !== "all") params.append("status", statusFilter);
					if (categoryFilter !== "all") params.append("category", categoryFilter);
					url = `/on-boarding/terminations/?${params.toString()}`;
				} else {
					url = nextUrl;
				}

				const response = await apiRequest.get(url);
				const data = response.data as IPaginatedResponse<ITermination>;

				if (isInitial) {
					setTerminations(data.results);
				} else {
					setTerminations((prev) => [...prev, ...data.results]);
				}

				setNextUrl(data.next);
				setHasMore(!!data.next);
			} catch (err) {
				console.error("Error fetching terminations:", err);
				showErrorToast({ error: err, defaultMessage: "Failed to fetch terminations" });
			} finally {
				setLoading(false);
				setInitialLoad(false);
			}
		},
		[currentInstitution, searchTerm, statusFilter, categoryFilter, loading, hasMore, nextUrl],
	);

	useEffect(() => {
		if (currentInstitution) {
			setTerminations([]);
			setNextUrl(null);
			setHasMore(true);
			setInitialLoad(true);
			fetchTerminations(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentInstitution?.id, searchTerm, statusFilter, categoryFilter]);

	useEffect(() => {
		if (currentInstitution && !hasFetchedTerminationTypesRef.current) {
			hasFetchedTerminationTypesRef.current = true;
			fetchTerminationTypes();
		}
	}, [currentInstitution?.id]);

	// Infinite scroll observer
	useEffect(() => {
		if (loading || !hasMore) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					fetchTerminations(false);
				}
			},
			{ threshold: 0.1 },
		);

		const currentLoadMoreRef = loadMoreRef.current;
		if (currentLoadMoreRef) {
			observerRef.current.observe(currentLoadMoreRef);
		}

		return () => {
			if (observerRef.current && currentLoadMoreRef) {
				observerRef.current.unobserve(currentLoadMoreRef);
			}
		};
	}, [loading, hasMore, fetchTerminations]);

	const handleCreateNewExitProcess = useCallback(
		(terminationType: ITerminationType) => {
			const basePath = "/off-boarding/exit-process/create";
			router.push(`${basePath}?category=${terminationType.category}&typeId=${terminationType.id}`);
		},
		[router],
	);

	const handleReorderSuccess = useCallback(() => {
		if (!terminationToReorder) return;
		setTerminations([]);
		setNextUrl(null);
		setHasMore(true);
		fetchTerminations(true);
	}, [terminationToReorder, fetchTerminations]);

	const getStatusColor = useCallback((status: string) => {
		switch (status) {
			case "INITIATED":
			case "planned":
				return "bg-blue-100 text-blue-800";
			case "IN_PROGRESS":
				return "bg-yellow-100 text-yellow-800";
			case "COMPLETED":
			case "completed":
				return "bg-green-100 text-green-800";
			case "CANCELLED":
			case "cancelled":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	}, []);

	const getCategoryColor = useCallback((category: string) => {
		switch (category) {
			case "resignation":
				return "bg-purple-100 text-purple-800";
			case "termination":
				return "bg-red-100 text-red-800";
			case "retirement":
				return "bg-yellow-100 text-yellow-800";
			case "contract_end":
				return "bg-orange-100 text-orange-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	}, []);

	const getStageStatusIcon = useCallback((stage: ITerminationStage) => {
		if (stage.skipped) return <XCircle className="h-4 w-4 text-gray-400" />;
		if (stage.completed) return <CheckCircle className="h-4 w-4 text-green-500" />;
		return <Clock className="h-4 w-4 text-blue-500" />;
	}, []);

	const formatStatus = useCallback((status: string) => {
		return status.toLowerCase().replace(/_/g, " ");
	});

	const getStagesForDisplay = (termination: ITermination) => {
		return termination.stage_progress
			.map((progress) => ({
				id: progress.id,
				stage_name: progress.stage.name,
				status: progress.skipped ? "skipped" : progress.completed ? "completed" : "in_progress",
				notes: progress.notes,
				position: progress.custom_order,
				created_at: progress.created_at,
				updated_at: progress.updated_at,
				isOpen: false,
			}))
			.sort((a, b) => a.position - b.position);
	};

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
				<Button
					size="sm"
					variant="outline"
					className="rounded-full aspect-square focus-visible:ring-0 focus-visible:ring-offset-0"
					onClick={() => router.push("/analytics/offboarding")}
				>
					<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
				</Button>
				<div>
					<h1 className="text-3xl font-semibold">Exit Process Management</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage employee separations and offboarding processes
					</p>
				</div>
				<div className="ml-auto">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0">
								<Plus className="h-4 w-4 mr-2" />
								New Exit Process
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							{loadingTerminationTypes ? (
								<div className="flex items-center justify-center py-4">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
									<span className="ml-2 text-sm">Loading termination types...</span>
								</div>
							) : terminationTypes.length === 0 ? (
								<div className="text-center py-4 text-sm text-muted-foreground">
									No termination types found
								</div>
							) : (
								terminationTypes.map((type) => (
									<DropdownMenuItem
										key={type.id}
										onClick={() => handleCreateNewExitProcess(type)}
										className="flex flex-col items-start p-3 cursor-pointer hover:bg-gray-50 focus-visible:ring-0 focus-visible:ring-offset-0"
									>
										<div className="flex items-center justify-between w-full">
											<span className="font-medium text-sm">{type.name}</span>
											<Badge className={getCategoryColor(type.category)} variant="outline">
												{type.category}
											</Badge>
										</div>
										{type.description && (
											<span className="text-xs text-muted-foreground mt-1">{type.description}</span>
										)}
									</DropdownMenuItem>
								))
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<div className="relative sm:w-[500px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
						placeholder="Search by employee name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				<div className="flex gap-4 ms-auto">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full sm:w-[180px] focus-visible:ring-0 focus-visible:ring-offset-0">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="INITIATED">Initiated</SelectItem>
							<SelectItem value="IN_PROGRESS">In Progress</SelectItem>
							<SelectItem value="COMPLETED">Completed</SelectItem>
							<SelectItem value="CANCELLED">Cancelled</SelectItem>
						</SelectContent>
					</Select>
					<Select value={categoryFilter} onValueChange={setCategoryFilter}>
						<SelectTrigger className="w-full sm:w-[180px] focus-visible:ring-0 focus-visible:ring-offset-0">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Categories</SelectItem>
							<SelectItem value="resignation">Resignation</SelectItem>
							<SelectItem value="termination">Termination</SelectItem>
							<SelectItem value="retirement">Retirement</SelectItem>
							<SelectItem value="contract_end">Contract End</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Content */}
			<div className="space-y-4">
				{initialLoad && loading ? (
					<TableSkeleton rows={5} columns={1} />
				) : terminations.length === 0 ? (
					<div className="text-center py-12">
						<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-muted-foreground">No exit processes found</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 gap-4">
							{terminations.map((termination) => {
								const displayStages = getStagesForDisplay(termination);
								return (
									<Card key={termination.id} className="hover:shadow-md transition-shadow">
										<CardContent className="p-6">
											<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
												<div className="flex-1 space-y-3">
													<div className="flex items-start justify-between">
														<div>
															<h3 className="font-semibold text-lg">
																{termination.employee?.name || "Unknown Employee"}
															</h3>
															<p className="text-sm text-muted-foreground">
																{termination.termination_type?.name || "No type"}
															</p>
														</div>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
																>
																	<MoreVertical className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={() =>
																		router.push(`/off-boarding/exit-process/${termination.id}`)
																	}
																	className="focus-visible:ring-0 focus-visible:ring-offset-0"
																>
																	<Eye className="h-4 w-4 mr-2" />
																	View Details
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() =>
																		router.push(`/off-boarding/exit-process/${termination.id}/edit`)
																	}
																	className="focus-visible:ring-0 focus-visible:ring-offset-0"
																>
																	<Edit className="h-4 w-4 mr-2" />
																	Edit
																</DropdownMenuItem>
																{displayStages.length > 0 && (
																	<>
																		<DropdownMenuSeparator />
																		<DropdownMenuItem
																			onClick={() => {
																				setTerminationToReorder(termination);
																				setReorderModalOpen(true);
																			}}
																			className="focus-visible:ring-0 focus-visible:ring-offset-0"
																		>
																			<ArrowUpDown className="h-4 w-4 mr-2" />
																			Reorder Stages
																		</DropdownMenuItem>
																	</>
																)}
															</DropdownMenuContent>
														</DropdownMenu>
													</div>

													<div className="flex flex-wrap gap-2">
														<Badge className={getStatusColor(termination.status)}>
															{formatStatus(termination.status)}
														</Badge>
														<Badge
															className={getCategoryColor(
																termination.termination_type?.category || "unknown",
															)}
														>
															{termination.termination_type?.category || "unknown"}
														</Badge>
														{termination.initiator_type && (
															<Badge variant="outline" className="bg-gray-100">
																Initiated by: {formatStatus(termination.initiator_type)}
															</Badge>
														)}
													</div>

													<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
														<div className="flex items-center gap-2">
															<Calendar className="h-4 w-4 text-muted-foreground" />
															<span className="text-muted-foreground">Last Working Day:</span>
															<span className="font-medium">
																{new Date(termination.last_working_day).toLocaleDateString()}
															</span>
														</div>
														<div className="flex items-center gap-2">
															<Users className="h-4 w-4 text-muted-foreground" />
															<span className="text-muted-foreground">Initiated by:</span>
															<span className="font-medium">
																{termination.initiated_by?.user?.fullname || "N/A"}
															</span>
														</div>
													</div>

													{termination.reason && (
														<div className="mt-3 p-3 bg-gray-50 rounded-md">
															<p className="text-sm text-muted-foreground">
																<strong>Reason:</strong> {termination.reason.substring(0, 150)}
																{termination.reason.length > 150 ? "..." : ""}
															</p>
														</div>
													)}

													{displayStages.length > 0 && (
														<div className="mt-4">
															<p className="text-sm font-medium mb-2">Exit Stages:</p>
															<div className="space-y-2">
																{displayStages.slice(0, 3).map((stage) => (
																	<div key={stage.id} className="flex items-center gap-2 text-sm">
																		{getStageStatusIcon(
																			termination.stage_progress.find((sp) => sp.id === stage.id)!,
																		)}
																		<span
																			className={
																				stage.status === "completed" ? "text-green-600" : ""
																			}
																		>
																			{stage.stage_name}
																		</span>
																		<Badge variant="outline" className="ml-auto text-xs">
																			{stage.status
																				.replace(/_/g, " ")
																				.replace(/\b\w/g, (l) => l.toUpperCase())}
																		</Badge>
																	</div>
																))}
																{displayStages.length > 3 && (
																	<p className="text-xs text-muted-foreground">
																		+{displayStages.length - 3} more stages
																	</p>
																)}
															</div>
														</div>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>

						<div ref={loadMoreRef} className="flex justify-center py-4">
							{loading && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Loader2 className="h-5 w-5 animate-spin" />
									<span>Loading more...</span>
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{terminationToReorder && (
				<StageReorderModal
					isOpen={reorderModalOpen}
					terminationId={terminationToReorder.id}
					stages={getStagesForDisplay(terminationToReorder)}
					employeeName={
						terminationToReorder.employee?.name ||
						terminationToReorder.employee?.email ||
						"Employee"
					}
					onClose={() => {
						setReorderModalOpen(false);
						setTimeout(() => setTerminationToReorder(null), 100);
					}}
					onSuccess={handleReorderSuccess}
				/>
			)}
		</div>
	);
}
