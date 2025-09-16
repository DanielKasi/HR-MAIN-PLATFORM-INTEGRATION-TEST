"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import PenaltiesTable from "@/components/common/tables/penalties/penalties-table";
import { showErrorToast, penaltiesAPI } from "@/lib/utils";
import { type IEmployee, type IEmployeePenaltyFormData } from "@/types/types.utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import EmployeePenaltyDialog from "@/components/common/tables/penalties/employee-penalty-dialog";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";

interface Props {
	employee: IEmployee;
}

export default function EmployeePenalties({ employee }: Props) {
	const refreshRef = useRef<() => void>(() => {});
	const [openSend, setOpenSend] = useState(false);
	const [editingPenalty, setEditingPenalty] = useState<any | null>(null);
	const [isSending, setIsSending] = useState(false);

	const handleCreate = async (data: Partial<IEmployeePenaltyFormData>) => {
		if (!data.penalty_type) {
			toast.error("Please select a penalty type");

			return;
		}
		setIsSending(true);
		try {
			const payload: Omit<IEmployeePenaltyFormData, ""> & { taget_employees: number[] } = {
				...data,
				taget_employees: [employee.id],
				employee: employee.id,
				date: data.date || new Date().toISOString().split("T")[0],
				penalty_type: data.penalty_type || 0,
				amount: data.amount || 0,
			};

			if (editingPenalty && editingPenalty.id) {
				await penaltiesAPI.EMPLOYEE.update(editingPenalty.id, payload as any);
				toast.success("Penalty updated");
			} else {
				await penaltiesAPI.EMPLOYEE.create(payload);
				toast.success("Penalty created");
			}

			setOpenSend(false);
			setEditingPenalty(null);
			if (refreshRef.current) refreshRef.current();
		} catch (err: any) {
			showErrorToast({ error: err, defaultMessage: "Failed to save penalty" });
		} finally {
			setIsSending(false);
		}
	};

	const handleDelete = async (id: number) => {
		setIsSending(true);
		try {
			await penaltiesAPI.EMPLOYEE.delete(id);
			toast.success("Penalty deleted");
			if (refreshRef.current) refreshRef.current();
		} catch (err: any) {
			showErrorToast({ error: err, defaultMessage: "Failed to delete penalty" });
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Penalties</h3>
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PENALTIES}>
					<div className="flex gap-2">
						<Button
							size={"sm"}
							onClick={() => {
								setEditingPenalty(null);
								setOpenSend(true);
							}}
							className="rounded-full"
						>
							Create Penalty
						</Button>
					</div>
				</ProtectedComponent>
			</div>

			<PenaltiesTable
				scope={{ type: "employee", employee }}
				refreshTableRef={refreshRef}
				onEdit={(p) => {
					setEditingPenalty(p);
					setOpenSend(true);
				}}
				onDelete={handleDelete}
			/>

			<EmployeePenaltyDialog
				isOpen={openSend}
				onClose={() => {
					setOpenSend(false);
					setEditingPenalty(null);
				}}
				onSave={handleCreate}
				initialData={editingPenalty}
				employee={employee}
				isSaving={isSending}
			/>

			<ConfirmationDialog
				isOpen={false}
				onClose={() => {}}
				onConfirm={() => {}}
				title=""
				description=""
			/>
		</div>
	);
}
