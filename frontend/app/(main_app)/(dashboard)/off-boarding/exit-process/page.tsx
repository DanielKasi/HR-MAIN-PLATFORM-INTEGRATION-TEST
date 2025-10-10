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
	ArrowUpDown,
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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import apiRequest from "@/lib/apiRequest";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import StageReorderModal from "@/components/stage-reorder-modal";
import {
	IEmployeeS,
	IEmployeeSeparation,
	ISeparationType,
	IPaginatedResponse,
} from "@/types/types.utils";

export default function ExitProcessPage() {
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);

	const [separations, setSeparations] = useState<IEmployeeSeparation[]>([]);
	const [separationTypes, setSeparationTypes] = useState<ISeparationType[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingSeparationTypes, setLoadingSeparationTypes] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [stageToDelete, setStageToDelete] = useState<{
		stageId: number;
		separationId: number;
		stageName: string;
	} | null>(null);
	const [deleting, setDeleting] = useState(false);

	const [reorderModalOpen, setReorderModalOpen] = useState(false);
	const [separationToReorder, setSeparationToReorder] = useState<IEmployeeSeparation | null>(null);

	const [stats, setStats] = useState({
		total: 0,
		planned: 0,
		completed: 0,
		cancelled: 0,
	});

	const fetchSeparationTypes = useCallback(async () => {
		if (!currentInstitution) return;

		try {
			setLoadingSeparationTypes(true);
			const response = await apiRequest.get("/on-boarding/separation-types/");
			const data = response.data;

			let typesArray: ISeparationType[] = [];

			if (Array.isArray(data)) {
				typesArray = data;
			} else if (data && Array.isArray(data.results)) {
				typesArray = data.results;
			} else if (data && typeof data === "object") {
				typesArray = [data];
			}

			setSeparationTypes(typesArray);
		} catch (err) {
			console.error("Error fetching separation types:", err);
			showErrorToast({ error: err, defaultMessage: "Failed to fetch separation types" });
			setSeparationTypes([]);
		} finally {
			setLoadingSeparationTypes(false);
		}
	}, [currentInstitution]);

	const fetchSeparations = useCallback(
		async (currentPage: number, isNewSearch: boolean = false) => {
			if (!currentInstitution || loading) return;

			try {
				setLoading(true);
				const params = new URLSearchParams({
					page: currentPage.toString(),
				});

				if (searchTerm) params.append("search", searchTerm);
				if (statusFilter !== "all") params.append("separation_status", statusFilter);
				if (categoryFilter !== "all") params.append("category", categoryFilter);

				const response = await apiRequest.get(
					`/on-boarding/employee-separations/?${params.toString()}`,
				);

				const data = response.data as IPaginatedResponse<IEmployeeSeparation>;

				setSeparations((prev) => (isNewSearch ? data.results : [...prev, ...data.results]));
				setHasMore(!!data.next);

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

	useEffect(() => {
		if (currentInstitution) {
			fetchSeparations(1, true);
			fetchSeparationTypes();
		}
	}, [currentInstitution]);

	useEffect(() => {
		if (!currentInstitution) return;

		const timeout = setTimeout(() => {
			setPage(1);
			setHasMore(true);
			fetchSeparations(1, true);
		}, 500);

		return () => clearTimeout(timeout);
	}, [searchTerm, statusFilter, categoryFilter]);

	useEffect(() => {
		if (page > 1 && currentInstitution) {
			fetchSeparations(page, false);
		}
	}, [page]);

	const handleCreateNewExitProcess = (separationType: ISeparationType) => {
		const basePath = "/off-boarding/exit-process/create";
		router.push(`${basePath}?category=${separationType.category}`);
	};

	const handleDeleteStage = async () => {
		if (!stageToDelete) return;

		try {
			setDeleting(true);
			await apiRequest.delete(`/on-boarding/offboarding-stages/${stageToDelete.stageId}/`);
			showSuccessToast("Stage deleted successfully");

			// Update the separations list by removing the deleted stage
			setSeparations((prev) =>
				prev.map((sep) =>
					sep.id === stageToDelete.separationId
						? {
								...sep,
								stages: sep.stages.filter((stage) => stage.id !== stageToDelete.stageId),
							}
						: sep,
				),
			);
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete stage" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setStageToDelete(null);
		}
	};

	const handleReorderSuccess = (updatedStages: any[]) => {
		if (!separationToReorder) return;

		setSeparations((prev) =>
			prev.map((sep) =>
				sep.id === separationToReorder.id ? { ...sep, stages: updatedStages } : sep,
			),
		);
	};

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
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			{/* Header */}
			<div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
				<Button
					size="sm"
					variant="outline"
					className="rounded-full aspect-square"
					onClick={() => router.push("/admin")}
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
							<Button className="rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base">
								<Plus className="h-4 w-4 mr-2" />
								New Exit Process
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							{loadingSeparationTypes ? (
								<div className="flex items-center justify-center py-4">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
									<span className="ml-2 text-sm">Loading separation types...</span>
								</div>
							) : separationTypes.length === 0 ? (
								<div className="text-center py-4 text-sm text-muted-foreground">
									No separation types found
								</div>
							) : (
								separationTypes.map((type) => (
									<DropdownMenuItem
										key={type.id}
										onClick={() => handleCreateNewExitProcess(type)}
										className="flex flex-col items-start p-3 cursor-pointer hover:bg-gray-50"
									>
										<div className="flex items-center justify-between w-full">
											<span className="font-medium text-sm">{type.separation_type}</span>
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

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
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
					</SelectContent>
				</Select>
			</div>

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
													{separation.stages && separation.stages.length > 0 && (
														<>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onClick={() => {
																	setSeparationToReorder(separation);
																	setReorderModalOpen(true);
																}}
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
											<Badge className={getStatusColor(separation.separation_status)}>
												{separation.separation_status}
											</Badge>
											<Badge
												className={getCategoryColor(separation.employee_separation_type.category)}
											>
												{separation.employee_separation_type.category}
											</Badge>
										</div>

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
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
																			<MoreVertical className="h-3 w-3" />
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuItem
																			onClick={() => {
																				setStageToDelete({
																					stageId: stage.id,
																					separationId: separation.id,
																					stageName: stage.stage_name,
																				});
																				setDeleteConfirmOpen(true);
																			}}
																			className="text-red-600"
																		>
																			<Trash2 className="h-4 w-4 mr-2" />
																			Delete Stage
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																</DropdownMenu>
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
					<Button
						variant="outline"
						onClick={() => setPage((p) => p + 1)}
						disabled={loading}
						className="rounded-xl"
					>
						{loading ? "Loading..." : "Load More"}
					</Button>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			{stageToDelete && (
				<ConfirmationDialog
					isOpen={deleteConfirmOpen}
					onClose={() => {
						setDeleteConfirmOpen(false);
						setStageToDelete(null);
					}}
					onConfirm={handleDeleteStage}
					title="Delete Stage"
					description={`Are you sure you want to delete the stage "${stageToDelete.stageName}"? This action cannot be undone.`}
					confirmText="Delete"
					cancelText="Cancel"
					disabled={deleting}
				/>
			)}

			{/* Stage Reorder Modal */}
			{separationToReorder && (
				<StageReorderModal
					isOpen={reorderModalOpen}
					separationId={separationToReorder.id}
					stages={separationToReorder.stages}
					employeeName={
						separationToReorder.employee?.name || separationToReorder.employee?.email || "Employee"
					}
					onClose={() => {
						setReorderModalOpen(false);
						setTimeout(() => setSeparationToReorder(null), 100);
					}}
					onSuccess={handleReorderSuccess}
				/>
			)}
		</div>
	);
}
