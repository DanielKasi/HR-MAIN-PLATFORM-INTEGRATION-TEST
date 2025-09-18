"use client";

import { useState, useRef } from "react";
import { Edit, Trash2, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EMPLOYEE_BONUS_POINTS_API } from "@/lib/utils";
import type { IEmployeeBonusPoint, IEmployee } from "@/types/types.utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PaginatedTable, ColumnDef } from "@/components/common/tables/paginated-table";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { BonusPointsModal } from "./bonus-points-modal";
import { Plus } from "lucide-react";

interface EmployeeBonusPointsTableProps {
	employee: IEmployee;
	refreshFunctionRef?: React.RefObject<(() => void) | null>;
}

export function EmployeeBonusPointsTable({
	employee,
	refreshFunctionRef,
}: EmployeeBonusPointsTableProps) {
	const tableRefreshRef = refreshFunctionRef || useRef<(() => void) | null>(null);
	const [bonusPointToDelete, setBonusPointToDelete] = useState<IEmployeeBonusPoint | null>(null);
	const [editingBonusPoint, setEditingBonusPoint] = useState<IEmployeeBonusPoint | undefined>();
	const [modalOpen, setModalOpen] = useState(false);

	const handleDelete = async () => {
		if (!bonusPointToDelete) return;
		try {
			await EMPLOYEE_BONUS_POINTS_API.delete({ bonusPointId: bonusPointToDelete.id });
			toast.success("Bonus point deleted successfully");
			tableRefreshRef.current?.();
		} catch (error: any) {
			toast.error(error.message || "Failed to delete bonus point");
		} finally {
			setBonusPointToDelete(null);
		}
	};

	const handleEdit = (bonusPoint: IEmployeeBonusPoint) => {
		setEditingBonusPoint(bonusPoint);
		setModalOpen(true);
	};

	const handleCreate = () => {
		setEditingBonusPoint(undefined);
		setModalOpen(true);
	};

	const columns: ColumnDef<IEmployeeBonusPoint>[] = [
		{
			key: "bonus_point_setting",
			header: "Bonus Type",
			cell: (bonusPoint) => bonusPoint.bonus_point_setting?.bonus_for || "N/A",
		},
		{
			key: "points",
			header: "Points",
			cell: (bonusPoint) => bonusPoint.bonus_point_setting?.points || 0,
		},
		{
			key: "reason",
			header: "Reason",
			cell: (bonusPoint) => bonusPoint.reason,
		},
		{
			key: "date",
			header: "Date",
			cell: (bonusPoint) => new Date(bonusPoint.date).toLocaleDateString(),
		},
		{
			key: "redeemed",
			header: "Status",
			cell: (bonusPoint) =>
				bonusPoint.redeemed ? (
					<Badge className="bg-green-100 text-green-800">Redeemed</Badge>
				) : (
					<Badge className="bg-gray-100 text-gray-800">Not Redeemed</Badge>
				),
		},
		{
			key: "actions",
			header: "Actions",
			cell: (bonusPoint) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => handleEdit(bonusPoint)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setBonusPointToDelete(bonusPoint)}
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
		<>
			<div className="flex justify-end mb-4">
				<Button onClick={handleCreate} className="rounded-full">
					<Plus className="h-4 w-4 md:mr-2" />
					<span className=" hidden md:inline-block">Add Bonus Point</span>
				</Button>
			</div>
			<PaginatedTable<IEmployeeBonusPoint>
				fetchFirstPage={async () => await EMPLOYEE_BONUS_POINTS_API.getPaginated({ page: 1 })}
				fetchFromUrl={EMPLOYEE_BONUS_POINTS_API.getPaginatedFromUrl}
				deps={[employee.id]}
				className="space-y-4"
				tableClassName="min-w-[800px]"
				footerClassName="pt-4"
				columns={columns}
				skeletonRows={5}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No bonus points found</p>
					</div>
				}
			/>
			{bonusPointToDelete && (
				<ConfirmationDialog
					isOpen={!!bonusPointToDelete}
					onClose={() => setBonusPointToDelete(null)}
					onConfirm={handleDelete}
					title={`Delete Bonus Point`}
					description={`Are you sure you want to delete the bonus point for ${bonusPointToDelete.reason}? This action cannot be undone.`}
					confirmText="Delete"
					cancelText="Cancel"
				/>
			)}
			<BonusPointsModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				bonusPoint={editingBonusPoint}
				employee={employee}
				onSubmit={() => tableRefreshRef.current?.()}
			/>
		</>
	);
}
