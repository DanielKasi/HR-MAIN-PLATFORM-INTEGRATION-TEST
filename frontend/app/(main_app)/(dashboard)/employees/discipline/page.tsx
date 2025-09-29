"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Plus,
	Search,
	Edit,
	Trash2,
	Eye,
	Calendar,
	User,
	FileText,
	CheckCircle,
	Clock,
	XCircle,
	AlertCircle,
	MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	getDisciplinaryActions,
	deleteDisciplinaryAction,
	getPaginatedDisciplinaryActionsFromUrl,
} from "@/lib/utils";
import { IDisciplinaryAction } from "@/types/types.utils";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";

export default function DisciplinaryActionsPage() {
	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [ordering, setOrdering] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [severityFilter, setSeverityFilter] = useState("all");
	const [actionToDelete, setActionToDelete] = useState<IDisciplinaryAction | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case "low":
				return "bg-green-100 text-green-800 border-green-200";
			case "medium":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "high":
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "critical":
				return "bg-red-100 text-red-800 border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800 border-green-200";
			case "in_progress":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "pending":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "dismissed":
				return "bg-gray-100 text-gray-800 border-gray-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return <CheckCircle className="h-4 w-4" />;
			case "in_progress":
				return <Clock className="h-4 w-4" />;
			case "pending":
				return <AlertCircle className="h-4 w-4" />;
			case "dismissed":
				return <XCircle className="h-4 w-4" />;
			default:
				return <Clock className="h-4 w-4" />;
		}
	};

	const handleAddNewAction = () => {
		router.push("/employees/discipline/create-disciplinary-action");
	};

	const handleEditAction = (actionId: string) => {
		router.push(`/employees/discipline/update-disciplinary-action/${actionId}/`);
	};

	const handleViewDisciplinaryAction = (actionId: string) => {
		router.push(`/employees/discipline/${actionId}`);
	};
	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
			<div className="">
				<div className="flex items-center justify-between">
					<h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
						Disciplinary Actions
					</h1>
					<Button onClick={handleAddNewAction} className="">
						<Plus className="h-4 w-4 mr-2" />
						<span className="hidden md:inline">Add New Action</span>
					</Button>
				</div>
				<CardDescription className="text-sm sm:text-base">
					Complete overview of disciplinary actions across all departments
				</CardDescription>
			</div>

			<div className="mt-6 mb-4">
				<div className="flex flex-col md:flex-row gap-4 items-start">
					<div className="relative w-full md:max-w-lg lg:max-w-xl ">
						<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by employee or discipline type..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10 w-full"
						/>
					</div>

					<div className="flex w-full items-center justify-start gap-4">
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="md:w-full md:max-w-[16rem] w-48">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="in_progress">In Progress</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
								<SelectItem value="dismissed">Dismissed</SelectItem>
							</SelectContent>
						</Select>

						<Select value={severityFilter} onValueChange={setSeverityFilter}>
							<SelectTrigger className="md:w-full md:max-w-[16rem] max-w-48">
								<SelectValue placeholder="Filter by severity" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Severities</SelectItem>
								<SelectItem value="low">Low</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="critical">Critical</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<PaginatedTableWrapper<IDisciplinaryAction, { institutionId?: number; search?: string }>
				fetchFirstPage={async (query) => {
					const res = await getDisciplinaryActions({
						institutionId: selectedInstitution?.id,
						page: 1,
						search: searchTerm || undefined,
						ordering,
					});

					return res;
				}}
				fetchFromUrl={async ({ url }) => await getPaginatedDisciplinaryActionsFromUrl({ url })}
				deps={[selectedInstitution?.id, searchTerm, ordering]}
			>
				{({ data, loading, refresh }) => {
					const apiResults = data?.results || [];
					const filteredActions = apiResults.filter((action) => {
						const matchesSearch =
							action.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
							action.discipline_type?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
							(action.employee.department.name &&
								action.employee.department.name.toLowerCase().includes(searchTerm.toLowerCase()));
						const matchesStatus = statusFilter === "all" || action.status === statusFilter;
						const matchesSeverity =
							severityFilter === "all" || action.discipline_type?.severity === severityFilter;

						return matchesSearch && matchesStatus && matchesSeverity;
					});

					const handleDeleteAction = async () => {
						if (!actionToDelete) return;
						try {
							const success = await deleteDisciplinaryAction(actionToDelete.id);

							if (success) {
								toast.success("Disciplinary action deleted successfully");
								await refresh();
							} else {
								toast.error("Failed to delete disciplinary action");
							}
						} catch (error: any) {
							toast.error("Failed to delete disciplinary action");
						} finally {
							setIsDeleteDialogOpen(false);
							setActionToDelete(null);
						}
					};

					if (loading) {
						return (
							<Card className="h-[calc(100vh-2rem)] shadow-lg">
								<CardHeader className="border-b">
									<div className="flex justify-between gap-8 items-center">
										<div className="flex items-center justify-start gap-4">
											<div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
											<div className="space-y-2">
												<div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
												<div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
											</div>
										</div>
										<div className="flex gap-2">
											<div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
											<div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
											<div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
										</div>
									</div>
								</CardHeader>
								<TableSkeleton rows={10} columns={8} />
							</Card>
						);
					}

					return (
						<CardContent className="">
							<div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-6">
								<div className="inline-block min-w-full px-3 sm:px-4 lg:px-6">
									<div className="overflow-x-auto mt-10 -ml-4">
										<Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
											<TableHeader className="bg-gray-50/50">
												<TableRow>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Employee</span>
															<Button
																onClick={() =>
																	setOrdering(
																		ordering === "employee__user__fullname"
																			? ""
																			: "employee__user__fullname",
																	)
																}
																size="sm"
																variant={
																	ordering === "employee__user__fullname" ? "default" : "outline"
																}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Severity</span>
															<Button
																onClick={() =>
																	setOrdering(
																		ordering === "discipline_type__severity"
																			? ""
																			: "discipline_type__severity",
																	)
																}
																size="sm"
																variant={
																	ordering === "discipline_type__severity" ? "default" : "outline"
																}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Incident Date</span>
															<Button
																onClick={() =>
																	setOrdering(ordering === "incident_date" ? "" : "incident_date")
																}
																size="sm"
																variant={ordering === "incident_date" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>
														<div className="flex items-center gap-2">
															<span>Assigned To</span>
															<Button
																onClick={() =>
																	setOrdering(
																		ordering === "assigned_to__user__fullname"
																			? ""
																			: "assigned_to__user__fullname",
																	)
																}
																size="sm"
																variant={
																	ordering === "assigned_to__user__fullname" ? "default" : "outline"
																}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>
													</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>Follow-up Date</TableHead>
													<TableHead>Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredActions.map((action) => (
													<TableRow key={action.id} className="hover:bg-gray-50">
														<TableCell>
															<div>
																<div className="font-medium">{action.employee?.name || ""}</div>
																{action.employee.department.name &&
																	action.employee.department.name.trim() && (
																		<div className="text-sm text-muted-foreground">
																			{action.employee.department.name}
																		</div>
																	)}
															</div>
														</TableCell>
														<TableCell>
															<div className="space-y-1">
																<div className="font-medium">{action.discipline_type?.name}</div>
																<Badge
																	variant="outline"
																	className={getSeverityColor(
																		action.discipline_type?.severity || "Low",
																	)}
																>
																	{action.discipline_type?.severity.toUpperCase()}
																</Badge>
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<Calendar className="h-4 w-4 text-muted-foreground" />
																{new Date(action.incident_date).toLocaleDateString()}
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<User className="h-4 w-4 text-muted-foreground" />
																{action.assigned_to?.user?.fullname || ""}
															</div>
														</TableCell>
														<TableCell>
															<Badge
																variant="outline"
																className={`${getStatusColor(
																	action.status,
																)} flex items-center gap-1 w-fit`}
															>
																{getStatusIcon(action.status)}
																{action.status.replace("_", " ").toUpperCase()}
															</Badge>
														</TableCell>
														<TableCell>
															{action.follow_up_required ? (
																<Badge
																	variant="outline"
																	className="bg-orange-100 text-orange-800 border-orange-200"
																>
																	{action.follow_up_date
																		? new Date(action.follow_up_date).toLocaleDateString()
																		: "Required"}
																</Badge>
															) : (
																<span className="text-muted-foreground">None</span>
															)}
														</TableCell>
														<TableCell className="text-right">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button variant="ghost" className="h-8 w-8 p-0">
																		<MoreVertical className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_VIEW_DISCIPLINE_CASES}
																	>
																		<DropdownMenuItem
																			onClick={() =>
																				handleViewDisciplinaryAction(action.id.toString())
																			}
																		>
																			<Eye className="h-4 w-4 mr-2" /> View Details
																		</DropdownMenuItem>
																	</ProtectedComponent>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_EDIT_DISCIPLINE_CASES}
																	>
																		<DropdownMenuItem
																			onClick={() => handleEditAction(action.id.toString())}
																		>
																			<Edit className="mr-2 h-4 w-4" />
																			Edit
																		</DropdownMenuItem>
																	</ProtectedComponent>
																	<ProtectedComponent
																		permissionCode={PERMISSION_CODES.CAN_DELETE_DISCIPLINE_CASES}
																	>
																		<DropdownMenuItem
																			onClick={() => {
																				setActionToDelete(action);
																				setIsDeleteDialogOpen(true);
																			}}
																			className="text-red-600"
																		>
																			<Trash2 className="mr-2 h-4 w-4" />
																			Delete
																		</DropdownMenuItem>
																	</ProtectedComponent>
																</DropdownMenuContent>
															</DropdownMenu>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							</div>

							<Dialog
								open={isDeleteDialogOpen}
								onOpenChange={(open) => {
									setIsDeleteDialogOpen(open);
									if (!open) setActionToDelete(null);
								}}
							>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Confirm Deletion</DialogTitle>
										<DialogDescription>
											Are you sure you want to delete the disciplinary action for{" "}
											{(
												actionToDelete &&
												filteredActions.find((action) => action.id === actionToDelete.id)
											)?.employee?.name || "this employee"}{" "}
											(
											{(actionToDelete &&
												filteredActions.find((action) => action.id === actionToDelete.id)
													?.discipline_type?.name) ||
												"this type"}
											)? This action cannot be undone.
										</DialogDescription>
									</DialogHeader>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => {
												setIsDeleteDialogOpen(false);
												setActionToDelete(null);
											}}
										>
											Cancel
										</Button>
										<Button variant="destructive" onClick={handleDeleteAction}>
											Delete
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>

							{filteredActions.length === 0 && (
								<div className="text-center py-8 text-muted-foreground">
									No disciplinary actions found matching your criteria.
								</div>
							)}
						</CardContent>
					);
				}}
			</PaginatedTableWrapper>
		</div>
	);
}
