"use client";

import type { JobPositionAdvert, JobAdvertStatus } from "@/types/types.utils";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
	Plus,
	MoreVertical,
	Edit,
	Trash2,
	RefreshCw,
	Eye,
	Search,
	Calendar,
	Users,
} from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import {
	updateJobPositionAdvert,
	getPaginatedJobAdverts,
	getPaginatedJobAdvertsFromUrl,
} from "@/lib/utils";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";
import { useDocumentTitle } from "@/hooks/use-document-title";
import RichTextDisplay from "@/components/common/rich-text-display";
import { formatCurrency } from "@/lib/helpers";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getStatusColor = (status: JobAdvertStatus) => {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-800 border-green-200";
		case "archived":
			return "bg-gray-100 text-gray-800 border-gray-200";
		case "expired":
			return "bg-red-100 text-red-800 border-red-200";
		case "closed":
			return "bg-blue-100 text-blue-800 border-blue-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

const getStatusVariant = (status: JobAdvertStatus) => {
	switch (status) {
		case "active":
			return "success";
		case "archived":
			return "secondary";
		case "expired":
			return "destructive";
		case "closed":
			return "outline";
		default:
			return "secondary";
	}
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const isExpired = (expiryDate: string) => {
	return new Date(expiryDate) < new Date();
};

// Mobile card view component
const JobAdvertCard = ({
	advert,
	onEdit,
	onView,
	onClose,
	isClosing,
	closingAdvertId,
}: {
	advert: JobPositionAdvert;
	onEdit: (id: number) => void;
	onView: (id: number) => void;
	onClose: (id: number) => void;
	isClosing: boolean;
	closingAdvertId: number | null;
}) => {
	const [showCloseDialog, setShowCloseDialog] = useState(false);

	return (
		<div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
			{/* Header */}
			<div className="flex justify-between items-start">
				<div className="flex-1">
					<h3 className="font-semibold text-gray-900 text-lg truncate">
						{advert.job_position_details?.name || "Unknown"}
					</h3>
					<Badge
						variant={getStatusVariant(advert.job_position_advert_status)}
						className="mt-1 whitespace-nowrap"
					>
						{advert.job_position_advert_status.toUpperCase()}
					</Badge>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
						>
							<MoreVertical className="h-5 w-5 text-gray-600" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_ADVERTS}>
							<DropdownMenuItem onClick={() => onView(advert.id)}>
								<Eye className="h-4 w-4 mr-2" />
								View Details
							</DropdownMenuItem>
						</ProtectedComponent>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_JOB_ADVERTS}>
							<DropdownMenuItem onClick={() => onEdit(advert.id)}>
								<Edit className="h-4 w-4 mr-2" />
								Edit
							</DropdownMenuItem>
						</ProtectedComponent>
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_JOB_ADVERTS}>
							{advert.job_position_advert_status !== "closed" && (
								<DropdownMenuItem
									onSelect={(e) => {
										e.preventDefault();
										setShowCloseDialog(true);
									}}
									className="text-destructive"
									disabled={isClosing}
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Close
								</DropdownMenuItem>
							)}
						</ProtectedComponent>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Details Grid */}
			<div className="grid grid-cols-2 gap-3 text-sm">
				<div className="space-y-1">
					<div className="flex items-center gap-1 text-gray-500">
						<Calendar className="h-3 w-3" />
						<span>Published</span>
					</div>
					<div>{formatDate(advert.published_date)}</div>
				</div>
				<div className="space-y-1">
					<div className="flex items-center gap-1 text-gray-500">
						<Calendar className="h-3 w-3" />
						<span>Expires</span>
					</div>
					<div className={isExpired(advert.expiry_date) ? "text-red-600 font-medium" : ""}>
						{formatDate(advert.expiry_date)}
					</div>
				</div>
				<div className="space-y-1">
					<div className="flex items-center gap-1 text-gray-500">
						<Users className="h-3 w-3" />
						<span>Employees</span>
					</div>
					<div>{formatCurrency(advert.number_of_employees_expected ?? 0) || "-"}</div>
				</div>
				<div className="space-y-1">
					<div className="text-gray-500">Stages</div>
					<div>{advert.interview_stages?.length || 0}</div>
				</div>
			</div>

			{/* Additional Info */}
			<div className="text-sm">
				<div className="text-gray-500 mb-1">Additional Info</div>
				<div className="line-clamp-2 text-muted-foreground">
					<RichTextDisplay content={advert.extra_information || "-"} />
				</div>
			</div>

			{/* Close Dialog */}
			<Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>
							Are you sure you want to close{" "}
							<span className="ml-2">"{advert.job_position_details.name}"?</span>{" "}
						</DialogTitle>
						<DialogDescription>
							Closing this job opening will change its status to "closed" and prevent further
							applications. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col sm:flex-row gap-2">
						<Button
							variant="outline"
							onClick={() => setShowCloseDialog(false)}
							className="w-full sm:w-auto"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								onClose(advert.id);
								setShowCloseDialog(false);
							}}
							disabled={isClosing}
							className="w-full sm:w-auto"
						>
							{isClosing ? "Closing..." : "Close Job Opening"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default function JobAdvertsPage() {
	const [jobAdverts, setJobAdverts] = useState<JobPositionAdvert[]>([]);
	const [paginationInfo, setPaginationInfo] = useState<{
		count: number;
		next: string | null;
		previous: string | null;
	}>({ count: 0, next: null, previous: null });
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({
		from: null,
		to: null,
	});
	const [error, setError] = useState("");
	const [isClosing, setIsClosing] = useState(false);
	const [closingAdvertId, setClosingAdvertId] = useState<number | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const refreshTableRef = useRef<(() => void) | null>(null);
	const [ordering, setOrdering] = useState("");
	const [isMobile, setIsMobile] = useState(false);

	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);

	useDocumentTitle("JOB OPENINGS");

	// Check for mobile screen size
	useEffect(() => {
		const checkScreenSize = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkScreenSize();
		window.addEventListener("resize", checkScreenSize);

		return () => {
			window.removeEventListener("resize", checkScreenSize);
		};
	}, []);

	const handleEditJobAdvert = useCallback(
		(advertId: number) => {
			router.push(`/job-adverts/${advertId}/edit`);
		},
		[router],
	);

	const handleCloseJobAdvert = useCallback(async (advertId: number) => {
		if (!advertId) return;

		try {
			setIsClosing(true);
			setClosingAdvertId(advertId);
			const updatedAdvert = await updateJobPositionAdvert({
				advertId: advertId,
				advertData: { job_position_advert_status: "closed" },
			});

			if (updatedAdvert) {
				toast.success("Job opening closed successfully!");
				refreshTableRef.current?.();
			} else {
				toast.error("Failed to close job openings");
			}
		} catch (error) {
			toast.error("Failed to close job openings");
		} finally {
			setIsClosing(false);
			setClosingAdvertId(null);
		}
	}, []);

	const handleViewJobAdvert = useCallback(
		(advertId: number) => {
			router.push(`/job-adverts/${advertId}`);
		},
		[router],
	);

	if (!selectedInstitution || !selectedBranch) {
		return <div>Loading...</div>;
	}

	function handleRefresh(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
		event.preventDefault();
		setIsRefreshing(true);
		setError("");
		refreshTableRef.current?.();
		setTimeout(() => setIsRefreshing(false), 1000);
	}

	return (
		<div className="space-y-6">
			{/* Header and Filters */}
			<div className="bg-white rounded-lg min-h-screen">
				<div className="p-4 sm:p-6 border-gray-200">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Job Openings</h1>
						</div>
					</div>
				</div>
				<div className="p-4 sm:p-6 border-gray-200">
					<div className="flex flex-col gap-4">
						{/* Search and Filters Row */}
						<div className="flex flex-col sm:flex-row gap-4">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search job openings..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 w-full"
								/>
							</div>
							<div className="flex flex-col sm:flex-row gap-4 sm:gap-2 sm:items-center">
								<Select
									value={statusFilter}
									onValueChange={(value: string) =>
										setStatusFilter(value as "all" | "active" | "inactive" | "expired" | "draft")
									}
								>
									<SelectTrigger className="w-full sm:w-[150px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
										<SelectValue placeholder="All Statuses" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Statuses</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
										<SelectItem value="expired">Expired</SelectItem>
										<SelectItem value="draft">Draft</SelectItem>
									</SelectContent>
								</Select>

								<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_JOB_ADVERTS}>
									<Button
										onClick={() => router.push("/job-adverts/create")}
										disabled={!selectedInstitution?.id}
										className="w-full sm:w-auto"
									>
										<Plus className="mr-2 h-4 w-4" />
										Create Job Opening
									</Button>
								</ProtectedComponent>
							</div>
						</div>
					</div>
				</div>
				<div className="p-4 sm:p-6">
					<PaginatedTableWrapper<JobPositionAdvert>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");

							return await getPaginatedJobAdverts({
								institutionId: selectedInstitution.id,
								page: 1,
								search: searchTerm || undefined,
								branch: selectedBranch?.id?.toString() || undefined,
								ordering,
							});
						}}
						fetchFromUrl={getPaginatedJobAdvertsFromUrl}
						deps={[selectedInstitution?.id, selectedBranch?.id, searchTerm, ordering]}
						className="space-y-4"
						footerClassName="pt-4"
					>
						{({ data, loading, refresh }) => {
							useEffect(() => {
								refreshTableRef.current = refresh;
							}, [refresh]);

							if ((!data || data.results.length === 0) && !loading) {
								return (
									<div className="text-center py-8 text-gray-500">
										{searchTerm
											? "No job openings found matching your search"
											: "No job openings found"}
									</div>
								);
							}

							const filteredResults = data?.results.filter((advert) => {
								const matchesStatus =
									statusFilter === "all" || advert.job_position_advert_status === statusFilter;

								return matchesStatus;
							});

							if (filteredResults?.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500">
										No job openings match the selected status filter
									</div>
								);
							}

							// Mobile card view
							if (isMobile) {
								return (
									<div className="space-y-4">
										{filteredResults?.map((advert) => (
											<JobAdvertCard
												key={advert.id}
												advert={advert}
												onEdit={handleEditJobAdvert}
												onView={handleViewJobAdvert}
												onClose={handleCloseJobAdvert}
												isClosing={isClosing}
												closingAdvertId={closingAdvertId}
											/>
										))}
									</div>
								);
							}

							// Desktop table view
							return (
								<div className="overflow-x-auto">
									{!loading ? (
										<Table className="min-w-full lg:min-w-[1000px] [&_th]:border-0 [&_td]:border-0">
											<TableHeader className="bg-gray-50/50">
												<TableRow>
													<TableHead className="whitespace-nowrap">
														<div className="flex items-center gap-2">
															<span>Job Position</span>
															<Button
																onClick={() =>
																	setOrdering(
																		ordering === "job_position__name" ? "" : "job_position__name",
																	)
																}
																size="sm"
																variant={ordering === "job_position__name" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead className="whitespace-nowrap">Status</TableHead>
													<TableHead className="whitespace-nowrap">Published Date</TableHead>
													<TableHead className="whitespace-nowrap">Expiry Date</TableHead>
													<TableHead className="whitespace-nowrap">Employees Required</TableHead>
													<TableHead className="whitespace-nowrap">Interview Stages</TableHead>
													<TableHead className="whitespace-nowrap">Additional Info</TableHead>
													<TableHead className="text-right whitespace-nowrap">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredResults?.map((advert) => (
													<TableRow key={advert.id}>
														<TableCell className="font-medium">
															<div className="font-medium text-gray-900">
																{advert.job_position_details?.name || "Unknown"}
															</div>
														</TableCell>
														<TableCell>
															<Badge
																variant={getStatusVariant(advert.job_position_advert_status)}
																className="whitespace-nowrap"
															>
																{advert.job_position_advert_status.toUpperCase()}
															</Badge>
														</TableCell>
														<TableCell className="whitespace-nowrap">
															{formatDate(advert.published_date)}
														</TableCell>
														<TableCell>
															<span
																className={`whitespace-nowrap ${isExpired(advert.expiry_date) ? "text-red-600 font-medium" : ""}`}
															>
																{formatDate(advert.expiry_date)}
															</span>
														</TableCell>
														<TableCell className="whitespace-nowrap">
															{formatCurrency(advert.number_of_employees_expected ?? 0) || "-"}
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2 whitespace-nowrap">
																{advert.interview_stages?.length || 0} stages
															</div>
														</TableCell>
														<TableCell>
															<div className="max-w-[200px] truncate text-sm text-muted-foreground">
																<RichTextDisplay content={advert.extra_information || "-"} />
															</div>
														</TableCell>
														<TableCell className="text-right">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
																	>
																		<MoreVertical className="h-5 w-5 text-gray-600" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_ADVERTS}
																	>
																		<DropdownMenuItem
																			onClick={() => handleViewJobAdvert(advert.id)}
																		>
																			<Eye className="h-4 w-4 mr-2" />
																			View Details
																		</DropdownMenuItem>
																	</ProtectedComponent>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_EDIT_JOB_ADVERTS}
																	>
																		<DropdownMenuItem
																			onClick={() => handleEditJobAdvert(advert.id)}
																		>
																			<Edit className="h-4 w-4 mr-2" />
																			Edit
																		</DropdownMenuItem>
																	</ProtectedComponent>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_DELETE_JOB_ADVERTS}
																	>
																		<Dialog
																			open={closingAdvertId === advert.id}
																			onOpenChange={(open: boolean) =>
																				setClosingAdvertId(open ? advert.id : null)
																			}
																		>
																			{advert.job_position_advert_status !== "closed" && (
																				<DialogTrigger asChild>
																					<DropdownMenuItem
																						onSelect={(e) => e.preventDefault()}
																						className="text-destructive"
																						disabled={isClosing}
																					>
																						<Trash2 className="h-4 w-4 mr-2" />
																						Close
																					</DropdownMenuItem>
																				</DialogTrigger>
																			)}
																			<DialogContent className="sm:max-w-[425px]">
																				<DialogHeader>
																					<DialogTitle>
																						Are you sure you want to close{" "}
																						<span className="ml-2">
																							"{advert.job_position_details.name}"?
																						</span>{" "}
																					</DialogTitle>
																					<DialogDescription>
																						Closing this job opening will change its status to
																						"closed" and prevent further applications. This action
																						cannot be undone.
																					</DialogDescription>
																				</DialogHeader>
																				<DialogFooter className="flex-col sm:flex-row gap-2">
																					<Button
																						variant="outline"
																						onClick={() => setClosingAdvertId(null)}
																						className="w-full sm:w-auto"
																					>
																						Cancel
																					</Button>
																					<Button
																						variant="destructive"
																						onClick={() => handleCloseJobAdvert(advert.id)}
																						disabled={isClosing}
																						className="w-full sm:w-auto"
																					>
																						{isClosing ? "Closing..." : "Close Job Opening"}
																					</Button>
																				</DialogFooter>
																			</DialogContent>
																		</Dialog>
																	</ProtectedComponent>
																</DropdownMenuContent>
															</DropdownMenu>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									) : (
										<TableSkeleton columns={8} rows={5} />
									)}
								</div>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="text-sm font-medium text-destructive bg-destructive/10 p-4 rounded-md border border-destructive/20">
					<div className="font-semibold mb-2">Error Loading Job Openings</div>
					<div className="text-sm">{error}</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						className="mt-3"
						disabled={isRefreshing}
					>
						<RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
						Try Again
					</Button>
				</div>
			)}
		</div>
	);
}
