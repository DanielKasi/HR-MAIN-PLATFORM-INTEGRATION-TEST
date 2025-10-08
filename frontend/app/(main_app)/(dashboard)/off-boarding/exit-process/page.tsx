"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
	Search,
	Plus,
	Filter,
	Eye,
	Edit,
	Trash2,
	MoreVertical,
	Calendar,
	Users,
	FileText,
	CheckCircle,
	Clock,
	XCircle,
	ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import apiRequest from "@/lib/apiRequest";
import { showErrorToast, showSuccessToast } from "@/lib/utils";

// Types based on the API schema
interface IEmployee {
	id: number;
	name: string;
	email: string;
	employee_id?: string;
	date_of_birth?: string;
	gender?: string;
	phone_number?: string;
	department?: {
		id: number;
		name: string;
		institution_id: number;
	};
	position?: {
		id: number;
		name: string;
		department_id?: number;
	};
}

interface IEmployeeSeparation {
	id: number;
	employee: IEmployee | null;
	employee_separation_type: {
		id: number;
		separation_type: string;
		description: string;
		category: "resignation" | "termination" | "retirement" | "contract_end" | "other";
		approval_status: string;
	};
	initiated_by: {
		id: number;
		user: {
			fullname: string;
			email: string;
		};
	} | null;
	effective_date: string;
	additional_notes: string;
	separation_status: "planned" | "completed" | "cancelled";
	created_at: string;
	updated_at: string;
	stages: Array<{
		id: number;
		stage_name: string;
		status: "not_started" | "in_progress" | "completed" | "skipped";
		notes: string;
		position: number;
		created_at: string;
		updated_at: string;
	}>;
}

interface IPaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export default function ExitProcessPage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);

	// State management
	const [separations, setSeparations] = useState<IEmployeeSeparation[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [separationToDelete, setSeparationToDelete] = useState<IEmployeeSeparation | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Statistics
	const [stats, setStats] = useState({
		total: 0,
		planned: 0,
		completed: 0,
		cancelled: 0,
	});

	// Fetch separations
	const fetchSeparations = useCallback(
		async (currentPage: number, isNewSearch: boolean = false) => {
			if (!currentInstitution || loading) return;

			console.log("=== FETCH DEBUG ===");
			console.log("Current Institution:", currentInstitution);
			console.log("Page:", currentPage);
			console.log("Is New Search:", isNewSearch);

			try {
				setLoading(true);
				const params = new URLSearchParams({
					page: currentPage.toString(),
				});

				console.log("Query Params:", params.toString());

				if (searchTerm) params.append("search", searchTerm);
				if (statusFilter !== "all") params.append("separation_status", statusFilter);
				if (categoryFilter !== "all") params.append("category", categoryFilter);

				const response = await apiRequest.get(
					`/on-boarding/employee-separations/?${params.toString()}`,
				);

				const data = response.data as IPaginatedResponse<IEmployeeSeparation>;

				// Debug logging
				// console.log('API Response:', data);
				// console.log('Results count:', data.results.length);
				// console.log('First result:', data.results[0]);

				setSeparations((prev) => (isNewSearch ? data.results : [...prev, ...data.results]));
				setHasMore(!!data.next);

				// Update stats on first page
				if (currentPage === 1) {
					setStats({
						total: data.count,
						planned: data.results.filter((s) => s.separation_status === "planned").length,
						completed: data.results.filter((s) => s.separation_status === "completed").length,
						cancelled: data.results.filter((s) => s.separation_status === "cancelled").length,
					});
				}
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch exit processes" });
			} finally {
				setLoading(false);
			}
		},
		[currentInstitution, searchTerm, statusFilter, categoryFilter],
	);

	// Initial fetch on mount
	useEffect(() => {
		if (currentInstitution) {
			fetchSeparations(1, true);
		}
	}, [currentInstitution]);

	// Reset and fetch on filter change
	useEffect(() => {
		if (!currentInstitution) return;

		const timeout = setTimeout(() => {
			setPage(1);
			setHasMore(true);
			fetchSeparations(1, true);
		}, 500);

		return () => clearTimeout(timeout);
	}, [searchTerm, statusFilter, categoryFilter]);

	// Fetch more when page changes (but not on initial mount)
	useEffect(() => {
		if (page > 1 && currentInstitution) {
			fetchSeparations(page, false);
		}
	}, [page]);

	// Handle delete
	const handleDelete = async () => {
		if (!separationToDelete) return;

		try {
			setDeleting(true);
			await apiRequest.delete(`/on-boarding/employee-separations/${separationToDelete.id}/`);
			showSuccessToast("Exit process deleted successfully");
			setSeparations((prev) => prev.filter((s) => s.id !== separationToDelete.id));
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete exit process" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setSeparationToDelete(null);
		}
	};

	// Status badge colors
	const getStatusColor = (status: string) => {
		switch (status) {
			case "planned":
				return "bg-blue-100 text-blue-800";
			case "completed":
				return "bg-green-100 text-green-800";
			case "cancelled":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getCategoryColor = (category: string) => {
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
	};

	const getStageStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "in_progress":
				return <Clock className="h-4 w-4 text-blue-500" />;
			case "skipped":
				return <XCircle className="h-4 w-4 text-gray-400" />;
			default:
				return <Clock className="h-4 w-4 text-gray-400" />;
		}
	};

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						className="rounded-full aspect-square"
						onClick={() => router.push("/admin")}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-2xl font-bold">Exit Process </h1>
						<p className="text-sm text-muted-foreground">
							Manage employee separations and offboarding processes
						</p>
					</div>
				</div>
				<Button onClick={() => router.push("/exit-process/create")} className="rounded-xl">
					<Plus className="h-4 w-4 mr-2" />
					New Exit Process
				</Button>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Processes</p>
								<p className="text-2xl font-bold">{stats.total}</p>
							</div>
							<Users className="h-8 w-8 text-blue-500" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Planned</p>
								<p className="text-2xl font-bold">{stats.planned}</p>
							</div>
							<Clock className="h-8 w-8 text-orange-500" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Completed</p>
								<p className="text-2xl font-bold">{stats.completed}</p>
							</div>
							<CheckCircle className="h-8 w-8 text-green-500" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Cancelled</p>
								<p className="text-2xl font-bold">{stats.cancelled}</p>
							</div>
							<XCircle className="h-8 w-8 text-gray-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9"
						placeholder="Search by employee name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-full sm:w-[180px]">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="planned">Planned</SelectItem>
						<SelectItem value="completed">Completed</SelectItem>
						<SelectItem value="cancelled">Cancelled</SelectItem>
					</SelectContent>
				</Select>
				<Select value={categoryFilter} onValueChange={setCategoryFilter}>
					<SelectTrigger className="w-full sm:w-[180px]">
						<SelectValue placeholder="Category" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Categories</SelectItem>
						<SelectItem value="resignation">Resignation</SelectItem>
						<SelectItem value="termination">Termination</SelectItem>
						<SelectItem value="retirement">Retirement</SelectItem>
						<SelectItem value="contract_end">Contract End</SelectItem>
						<SelectItem value="other">Other</SelectItem>
					</SelectContent>
				</Select>
			</div> */}

			{/* Separations List */}
			<div className="grid grid-cols-1 gap-4">
				{loading && separations.length === 0 ? (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
					</div>
				) : separations.length === 0 ? (
					<div className="text-center py-12">
						<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-muted-foreground">No exit processes found</p>
					</div>
				) : (
					separations.map((separation) => (
						<Card key={separation.id} className="hover:shadow-md transition-shadow">
							<CardContent className="p-6">
								<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
									{/* Main Info */}
									<div className="flex-1 space-y-3">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="font-semibold text-lg">
													{separation.employee?.name ||
														separation.employee?.email ||
														"Unknown Employee"}
												</h3>
												<p className="text-sm text-muted-foreground">
													{separation.employee_separation_type.separation_type}
												</p>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => router.push(`/exit-process/${separation.id}`)}
													>
														<Eye className="h-4 w-4 mr-2" />
														View Details
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => router.push(`/exit-process/${separation.id}/edit`)}
													>
														<Edit className="h-4 w-4 mr-2" />
														Edit
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => {
															setSeparationToDelete(separation);
															setDeleteConfirmOpen(true);
														}}
														className="text-red-600"
													>
														<Trash2 className="h-4 w-4 mr-2" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										{/* Badges */}
										<div className="flex flex-wrap gap-2">
											<Badge className={getStatusColor(separation.separation_status)}>
												{separation.separation_status}
											</Badge>
											<Badge
												className={getCategoryColor(separation.employee_separation_type.category)}
											>
												{separation.employee_separation_type.category}
											</Badge>
										</div>

										{/* Details */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
											<div className="flex items-center gap-2">
												<Calendar className="h-4 w-4 text-muted-foreground" />
												<span className="text-muted-foreground">Effective Date:</span>
												<span className="font-medium">
													{new Date(separation.effective_date).toLocaleDateString()}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Users className="h-4 w-4 text-muted-foreground" />
												<span className="text-muted-foreground">Initiated by:</span>
												<span className="font-medium">
													{separation.initiated_by?.user.fullname || "N/A"}
												</span>
											</div>
										</div>

										{/* Stages Progress */}
										{separation.stages && separation.stages.length > 0 && (
											<div className="mt-4">
												<p className="text-sm font-medium mb-2">Exit Stages:</p>
												<div className="space-y-2">
													{separation.stages
														.sort((a, b) => a.position - b.position)
														.slice(0, 3)
														.map((stage) => (
															<div key={stage.id} className="flex items-center gap-2 text-sm">
																{getStageStatusIcon(stage.status)}
																<span
																	className={stage.status === "completed" ? "text-green-600" : ""}
																>
																	{stage.stage_name}
																</span>
																<Badge variant="outline" className="ml-auto text-xs">
																	{stage.status}
																</Badge>
															</div>
														))}
													{separation.stages.length > 3 && (
														<p className="text-xs text-muted-foreground">
															+{separation.stages.length - 3} more stages
														</p>
													)}
												</div>
											</div>
										)}

										{/* Notes */}
										{separation.additional_notes && (
											<div className="mt-3 p-3 bg-gray-50 rounded-md">
												<p className="text-sm text-muted-foreground">
													{separation.additional_notes.substring(0, 150)}
													{separation.additional_notes.length > 150 ? "..." : ""}
												</p>
											</div>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>

			{/* Load More */}
			{hasMore && separations.length > 0 && (
				<div className="flex justify-center py-4">
					<Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>
						{loading ? "Loading..." : "Load More"}
					</Button>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			{separationToDelete && (
				<ConfirmationDialog
					isOpen={deleteConfirmOpen}
					onClose={() => {
						setDeleteConfirmOpen(false);
						setSeparationToDelete(null);
					}}
					onConfirm={handleDelete}
					title="Delete Exit Process"
					description={`Are you sure you want to delete the exit process for ${
						separationToDelete.employee?.name ||
						separationToDelete.employee?.email ||
						"this employee"
					}? This action cannot be undone.`}
					confirmText="Delete"
					cancelText="Cancel"
					disabled={deleting}
				/>
			)}
		</div>
	);
}
