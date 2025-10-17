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
import { MoreVertical, Edit, Eye, Trash2, Search } from "lucide-react";
import { ColumnDef } from "@/components/PaginatedTable";
import { PaginatedTable } from "@/components/PaginatedTable";
import { SKILL_ZONE_API } from "@/lib/api/recruitment.utils";
import type { ISkillZone } from "@/types/recruitment.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SkillZoneCreateEditDialog } from "./_components/skill-zone-create-edit-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { ApprovableDialog } from "@/components/approvals/approvable-dialog";

export default function SkillZonesPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");

	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedSkillZone, setSelectedSkillZone] = useState<ISkillZone | null>(null);

	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [skillZoneToDelete, setSkillZoneToDelete] = useState<ISkillZone | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!skillZoneToDelete) return;

		try {
			setDeleting(true);
			await SKILL_ZONE_API.delete({ skillZoneId: skillZoneToDelete.id });
			showSuccessToast("Skill Zone deleted successfully!");
			if (tableRefreshRef.current) tableRefreshRef.current();
		} catch (err) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete skill zone" });
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setSkillZoneToDelete(null);
		}
	};

	const openEditDialog = (skillZone: ISkillZone) => {
		setSelectedSkillZone(skillZone);
		setOpenCreateEditDialog(true);
	};

	const openDetails = (skillZone: ISkillZone) => {
		setSelectedSkillZone(skillZone);
		setOpenDetailsDialog(true);
	};

	const columns: ColumnDef<ISkillZone>[] = [
		{
			key: "candidate",
			header: (
				<div className="flex items-center justify-start gap-2 sm:gap-4">
					<span className="text-xs sm:text-sm">Candidate</span>
					<Button
						onClick={() =>
							setOrdering((prev) =>
								prev === "candidate__applicant_name"
									? "-candidate__applicant_name"
									: "candidate__applicant_name",
							)
						}
						size="sm"
						variant={ordering.includes("candidate__applicant_name") ? "default" : "outline"}
						type="button"
						className="h-6 w-6 sm:h-8 sm:w-8 p-0"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-3 !w-3 sm:!h-4 sm:!w-4" />
					</Button>
				</div>
			),
			cell: (skillZone) => (
				<div className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">
					{skillZone.applicant_name}
				</div>
			),
		},
		{
			key: "categories",
			header: "Categories",
			cell: (skillZone) => (
				<div className="flex items-center justify-start gap-1 sm:gap-2">
					{skillZone.category_names.length > 0 ? (
						<>
							<p className="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-none">
								{skillZone.category_names[0]}
							</p>
							{skillZone.category_names.length > 1 && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Badge variant={"secondary"} className="cursor-pointer text-xs">
											+{skillZone.category_names.length - 1}
										</Badge>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" className="max-h-[200px] overflow-y-auto w-48">
										{skillZone.category_names.map((cat_name, idx) => (
											<DropdownMenuItem key={idx} className="text-xs sm:text-sm">
												{cat_name}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</>
					) : (
						<p className="text-xs sm:text-sm text-muted-foreground">Unknown</p>
					)}
				</div>
			),
		},
		{
			key: "notes",
			header: "Notes",
			cell: (skillZone) => (
				<div className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[200px]">
					{skillZone.notes?.substring(0, 50) +
						(skillZone.notes && skillZone.notes.length > 50 ? "..." : "") || "Unknown"}
				</div>
			),
		},
		{
			key: "potential_value",
			header: "Potential Value",
			cell: (skillZone) => (
				<div className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[200px]">
					{skillZone.potential_value?.substring(0, 50) +
						(skillZone.potential_value && skillZone.potential_value.length > 50 ? "..." : "") ||
						"Unknown"}
				</div>
			),
		},
		{
			key: "approval_status",
			header: "Approval Status",
			cell: (skillZone) => (
				<Badge
					variant={skillZone.approval_status === "active" ? "default" : "secondary"}
					className="text-xs whitespace-nowrap"
				>
					{skillZone.approval_status || "Unknown"}
				</Badge>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (skillZone) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
							<MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-40 sm:w-48">
						<DropdownMenuItem onClick={() => openDetails(skillZone)} className="text-xs sm:text-sm">
							<Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => openEditDialog(skillZone)}
							className="text-xs sm:text-sm"
						>
							<Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setSkillZoneToDelete(skillZone);
								setDeleteConfirmOpen(true);
							}}
							className="text-red-600 text-xs sm:text-sm"
						>
							<Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white rounded-lg min-h-screen">
			{/* Header Section */}
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
				<h1 className="text-xl sm:text-2xl font-bold">Skill Zones</h1>
				<div className="flex items-center justify-end gap-2 sm:gap-4">
					<Link href={"/skill-zones/categories"} className="w-full sm:w-auto">
						<Button variant={"outline"} className="rounded-xl w-full sm:w-auto text-xs sm:text-sm">
							Categories
						</Button>
					</Link>
					<SkillZoneCreateEditDialog
						open={openCreateEditDialog}
						onOpenChange={setOpenCreateEditDialog}
						selectedSkillZone={selectedSkillZone}
						onSuccess={() => {
							if (tableRefreshRef.current) tableRefreshRef.current();
							setSelectedSkillZone(null);
						}}
					/>
				</div>
			</div>

			{/* Search Section */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full"
						placeholder="Search skill zones..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

			{/* Table Section */}
			<PaginatedTable<ISkillZone>
				fetchFirstPage={async () => {
					if (!currentInstitution) throw new Error("No institution selected");
					return await SKILL_ZONE_API.getPaginated({
						page: 1,
						search: searchTerm || undefined,
						ordering,
					});
				}}
				fetchFromUrl={SKILL_ZONE_API.getPaginatedFromUrl}
				deps={[currentInstitution?.id, searchTerm, ordering]}
				onError={(err) =>
					showErrorToast({ error: err, defaultMessage: "Failed to fetch skill zones" })
				}
				columns={columns}
				skeletonRows={10}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-8 sm:py-12">
						<p className="text-muted-foreground mb-4 text-sm sm:text-base">No skill zones found</p>
					</div>
				}
			/>

			{/* Details Dialog */}
			{selectedSkillZone && (
				<ApprovableDialog
					isOpen={openDetailsDialog}
					onOpenChange={(open) => {
						setOpenDetailsDialog(open);
						if (!open) setSelectedSkillZone(null);
					}}
					title={`Skill Zone Details: ${selectedSkillZone.job_title}`}
					description="View the details for this skill zone category."
					onRefresh={() => tableRefreshRef.current?.()}
				>
					<div className="space-y-4 overflow-y-auto max-h-[50svh] sm:max-h-[60svh]">
						<div>
							<label className="text-sm font-medium">Candidate</label>
							<p className="mt-1 text-sm sm:text-base">{selectedSkillZone.applicant_name}</p>
						</div>
						<div>
							<label className="text-sm font-medium">Categories</label>
							<p className="mt-1 text-sm sm:text-base">
								{selectedSkillZone.category_names.map((cat) => cat).join(", ") || "Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">Notes</label>
							<p className="mt-1 text-sm sm:text-base whitespace-pre-wrap break-words">
								{selectedSkillZone.notes || "Unknown"}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium">Potential Value</label>
							<p className="mt-1 text-sm sm:text-base whitespace-pre-wrap break-words">
								{selectedSkillZone.potential_value || "Unknown"}
							</p>
						</div>
					</div>
				</ApprovableDialog>
			)}

			<ConfirmationDialog
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				onConfirm={handleDelete}
				title="Delete Skill Zone"
				description="Are you sure you want to delete this skill zone entry? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				disabled={deleting}
			/>
		</div>
	);
}
