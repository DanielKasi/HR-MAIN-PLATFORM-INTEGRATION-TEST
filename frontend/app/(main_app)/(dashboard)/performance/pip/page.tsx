"use client";

import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Eye, Trash2, Search, Plus } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { PERFORMANCE_IMPROVEMENT_PLAN_API } from "@/lib/api/performance.utils";
import type {
	IPerformanceConcern,
	IPerformanceImprovementPlan,
	IPIPSupportResource,
} from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";
import { PerformanceImprovementPlanCreateEditDialog } from "./_components/performance-improvement-plan-create-edit-dialog";
import Link from "next/link";
import { format } from "date-fns";
import { IObjective } from "@/types/types.utils";

export default function PerformanceImprovementPlanListPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<IPerformanceImprovementPlan | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [planToDelete, setPlanToDelete] = useState<IPerformanceImprovementPlan | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!planToDelete) return;
		try {
			setDeleting(true);
			await PERFORMANCE_IMPROVEMENT_PLAN_API.delete({ pipId: planToDelete.id });
			showSuccessToast("Performance improvement plan deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: "Failed to delete performance improvement plan",
			});
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setPlanToDelete(null);
		}
	};

	const openEditDialog = (plan: IPerformanceImprovementPlan) => {
		setSelectedPlan(plan);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (plan: IPerformanceImprovementPlan) => {
		setSelectedPlan(plan);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<IPerformanceImprovementPlan>[] = [
		{
			key: "employee",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Employee</span>
					<Button
						onClick={() =>
							setOrdering((prev) =>
								prev === "employee__full_name" ? "-employee__full_name" : "employee__full_name",
							)
						}
						size="sm"
						variant={ordering.includes("employee__full_name") ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (plan) => plan.employee?.name || plan.employee.user?.fullname || "Unknown",
		},
		{
			key: "start_date",
			header: "Start Date",
			cell: (plan) => (plan.start_date ? format(new Date(plan.start_date), "PPP") : "Unknown"),
		},
		{
			key: "end_date",
			header: "End Date",
			cell: (plan) => (plan.end_date ? format(new Date(plan.end_date), "PPP") : "Unknown"),
		},
		{
			key: "status",
			header: "Status",
			cell: (plan) => (
				<Badge variant={plan.status === "active" ? "default" : "secondary"}>
					{plan.status || "Unknown"}
				</Badge>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (plan) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(plan)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(plan)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setPlanToDelete(plan);
								setDeleteConfirmOpen(true);
							}}
							className="text-red-600"
						>
							<Trash2 className="h-4 w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className="p-6 space-y-6 bg-white rounded-lg min-h-screen">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Performance Improvement Plans</h1>
				<div className="flex items-center justify-end gap-4">
					<Button onClick={() => setOpenCreateEditDialog(true)} className="rounded-xl">
						<Plus className="h-4 w-4" />
						Create PIP
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search PIPs..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			<PaginatedTable<IPerformanceImprovementPlan>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await PERFORMANCE_IMPROVEMENT_PLAN_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
						institutionId: currentInstitution.id,
					});
				}}
				fetchFromUrl={PERFORMANCE_IMPROVEMENT_PLAN_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({
						error: err,
						defaultMessage: "Failed to fetch performance improvement plans",
					})
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No performance improvement plans found</p>
					</div>
				}
			/>

			{selectedPlan && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedPlan(null);
					}}
					title={`PIP Details: ${selectedPlan.employee?.name || selectedPlan.employee.user?.fullname || "Unknown"}`}
					description="View the details for this performance improvement plan."
					onRefresh={() => tableRefreshRef.current?.()}
				>
					<div className="space-y-4 overflow-y-auto max-h-[60svh]">
						<div>
							<label className="text-sm font-medium">Employee</label>
							<p>
								{selectedPlan.employee?.name || selectedPlan.employee.user?.fullname || "Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">Start Date</label>
							<p>
								{selectedPlan.start_date
									? format(new Date(selectedPlan.start_date), "PPP")
									: "Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">End Date</label>
							<p>
								{selectedPlan.end_date ? format(new Date(selectedPlan.end_date), "PPP") : "Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">Issues</label>
							<p>{selectedPlan.issues?.map((issue) => issue).join(", ") || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Support Resources</label>
							<p>
								{(selectedPlan.support_resources as IPIPSupportResource[])
									?.map((res) => res.name)
									.join(", ") || "Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">Progress Notes</label>
							<p>{selectedPlan.progress_notes || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Consequences</label>
							<p>{selectedPlan.consequences || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Status</label>
							<p>{selectedPlan.status || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Final Review Date</label>
							<p>
								{selectedPlan.final_review_date
									? format(new Date(selectedPlan.final_review_date), "PPP")
									: "Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">Outcome</label>
							<p>{selectedPlan.outcome || "Unknown"}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Objectives</label>
							<p>
								{(selectedPlan.objectives as IObjective[])?.map((obj) => obj.name).join(", ") ||
									"Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">Document Template</label>
							<p>{selectedPlan.document_template || "Unknown"}</p>
						</div>
					</div>
				</ApprovableDialog>
			)}

			<PerformanceImprovementPlanCreateEditDialog
				open={openCreateEditDialog}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedPlan(null);
					}
					setOpenCreateEditDialog(open);
				}}
				selectedPlan={selectedPlan}
				onSuccess={() => {
					if (tableRefreshRef.current) tableRefreshRef.current();
					setSelectedPlan(null);
				}}
			/>

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Performance Improvement Plan"
				description="Are you sure you want to delete this performance improvement plan? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
