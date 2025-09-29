"use client";

import { useState, useRef } from "react";
import { Edit, Trash2, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BONUS_POINT_SETTINGS_API } from "@/lib/utils";
import type { IBonusPointSettings } from "@/types/types.utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { BonusPointSettingsModal } from "./bonus-points-settings-modal";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

export function InstitutionBonusPointSettingsTable() {
	const institution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = useRef<(() => void) | null>(null);
	const [bonusPointSettingToDelete, setBonusPointSettingToDelete] =
		useState<IBonusPointSettings | null>(null);
	const [editingBonusPointSetting, setEditingBonusPointSetting] = useState<
		IBonusPointSettings | undefined
	>();
	const [modalOpen, setModalOpen] = useState(false);

	const handleDelete = async () => {
		if (!bonusPointSettingToDelete) return;
		try {
			await BONUS_POINT_SETTINGS_API.delete({ settingsId: bonusPointSettingToDelete.id });
			toast.success("Bonus point setting deleted successfully");
			tableRefreshRef.current?.();
		} catch (error: any) {
			toast.error(error.message || "Failed to delete bonus point setting");
		} finally {
			setBonusPointSettingToDelete(null);
		}
	};

	const handleEdit = (bonusPointSetting: IBonusPointSettings) => {
		setEditingBonusPointSetting(bonusPointSetting);
		setModalOpen(true);
	};

	const handleCreate = () => {
		setEditingBonusPointSetting(undefined);
		setModalOpen(true);
	};

	const columns: ColumnDef<IBonusPointSettings>[] = [
		{
			key: "bonus_for",
			header: "Bonus For",
			cell: (setting) => setting.bonus_for,
		},
		{
			key: "points",
			header: "Points",
			cell: (setting) => setting.points,
		},
		{
			key: "applicable_for",
			header: "Applicable For",
			cell: (setting) => setting.applicable_for,
		},
		{
			key: "condition",
			header: "Condition",
			cell: (setting) =>
				`${setting.condition_field} ${setting.condition_operator} ${setting.condition_value.replace("_", " ")}`,
		},
		{
			key: "actions",
			header: "Actions",
			cell: (setting) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem onClick={() => handleEdit(setting)}>
							<Edit className="h-4 w-4 mr-2" /> Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setBonusPointSettingToDelete(setting)}
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
		<div className="overflow-x-auto w-full">
			<div className="flex justify-end mb-4 ">
				<Button onClick={handleCreate} className="rounded-xl">
					<Plus className="h-4 w-4 mr-2" /> Add Bonus Point Setting
				</Button>
			</div>
			<PaginatedTable<IBonusPointSettings>
				fetchFirstPage={async () => await BONUS_POINT_SETTINGS_API.getPaginated({ page: 1 })}
				fetchFromUrl={BONUS_POINT_SETTINGS_API.getPaginatedFromUrl}
				deps={[institution?.id]}
				className="space-y-4"
				tableClassName=""
				footerClassName="pt-4"
				columns={columns}
				skeletonRows={5}
				refreshRef={tableRefreshRef}
				emptyState={
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">No bonus point settings found</p>
					</div>
				}
			/>
			{bonusPointSettingToDelete && (
				<ConfirmationDialog
					isOpen={!!bonusPointSettingToDelete}
					onClose={() => setBonusPointSettingToDelete(null)}
					onConfirm={handleDelete}
					title={`Delete Bonus Point Setting`}
					description={`Are you sure you want to delete the bonus point setting for ${bonusPointSettingToDelete.bonus_for}? This action cannot be undone.`}
					confirmText="Delete"
					cancelText="Cancel"
				/>
			)}
			<BonusPointSettingsModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				bonusPointSetting={editingBonusPointSetting}
				institutionId={institution?.id || 0}
				onSubmit={() => tableRefreshRef.current?.()}
			/>
		</div>
	);
}
