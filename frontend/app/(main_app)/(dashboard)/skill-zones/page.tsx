"use client";

import { useEffect, useRef, useState } from "react";
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
import { ColumnDef } from "@/components/common/tables/paginated-table";
import { PaginatedTable } from "@/components/common/tables/paginated-table";
import { SKILL_ZONE_API, SKILL_ZONE_CATEGORIES_API } from "@/lib/api/recruitment.utils";
import type { ISkillZone, ISkillZoneCategory } from "@/types/recruitment.types";
import { JobApplication } from "@/types/types.utils";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import FixedLoader from "@/components/fixed-loader";
import { SkillZoneCreateEditDialog } from "./_components/skill-zone-create-edit-dialog";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

export default function SkillZonesPage() {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const [searchTerm, setSearchTerm] = useState("");
	const [ordering, setOrdering] = useState("");

	// Dialog states
	const [openCreateEditDialog, setOpenCreateEditDialog] = useState(false);
	const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
	const [selectedSkillZone, setSelectedSkillZone] = useState<ISkillZone | null>(null);

	// Delete confirmation
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
				<div className="flex items-center justify-start gap-4">
					<span>Candidate</span>
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
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (skillZone) => skillZone.candidate.applicant_name,
		},
		{
			key: "categories",
			header: "Categories",
			cell: (skillZone) => skillZone.category.map((cat) => cat.name).join(", ") || "N/A",
		},
		{
			key: "notes",
			header: "Notes",
			cell: (skillZone) =>
				skillZone.notes?.substring(0, 50) +
					(skillZone.notes && skillZone.notes.length > 50 ? "..." : "") || "N/A",
		},
		{
			key: "potential_value",
			header: "Potential Value",
			cell: (skillZone) =>
				skillZone.potential_value?.substring(0, 50) +
					(skillZone.potential_value && skillZone.potential_value.length > 50 ? "..." : "") ||
				"N/A",
		},
		{
			key: "approval_status",
			header: "Approval Status",
			cell: (skillZone) => (
				<Badge variant={skillZone.approval_status === "active" ? "default" : "secondary"}>
					{skillZone.approval_status || "N/A"}
				</Badge>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (skillZone) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => openDetails(skillZone)}>
							<Eye className="h-4 w-4 mr-2" /> View Details
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openEditDialog(skillZone)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setSkillZoneToDelete(skillZone);
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
				<h1 className="text-2xl font-bold">Skill Zones</h1>
				<div className="flex items-center justify-end gap-8">
					<Link href={"/skill-zones/categories"}>
						<Button variant={"outline"} className="rounded-xl">
							Categories
						</Button>
					</Link>
				</div>
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

			<div className="flex items-center gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-9 w-full max-w-md lg:max-w-xl"
						placeholder="Search skill zones..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
			</div>

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
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No skill zones found</p>
					</div>
				}
			/>

			<Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Skill Zone Details</DialogTitle>
					</DialogHeader>
					{selectedSkillZone && (
						<div className="space-y-4 overflow-y-auto max-h-[60svh]">
							<div>
								<label className="text-sm font-medium">Candidate</label>
								<p>{selectedSkillZone.candidate.applicant_name}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Categories</label>
								<p>{selectedSkillZone.category.map((cat) => cat.name).join(", ") || "N/A"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Notes</label>
								<p>{selectedSkillZone.notes || "N/A"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Potential Value</label>
								<p>{selectedSkillZone.potential_value || "N/A"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Approval Status</label>
								<p>
									<Badge
										variant={
											selectedSkillZone.approval_status === "active" ? "default" : "secondary"
										}
									>
										{selectedSkillZone.approval_status || "N/A"}
									</Badge>
								</p>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

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
