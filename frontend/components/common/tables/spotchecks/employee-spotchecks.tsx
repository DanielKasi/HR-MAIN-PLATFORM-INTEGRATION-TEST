"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import SpotchecksTable from "@/components/common/tables/spotchecks/spotcheck-table";
import { showErrorToast, spotcheckAPI } from "@/lib/utils";
import { toast } from "sonner";
import type { IEmployee, ISpotCheckFormData } from "@/types/types.utils";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface Props {
	employee: IEmployee;
}

export default function EmployeeSpotchecks({ employee }: Props) {
	const refreshRef = useRef<() => void>(() => {});
	const [open, setOpen] = useState(false);

	const [isSending, setIsSending] = useState(false);

	const handleSend = async () => {
		setIsSending(true);
		try {
			const payload: Partial<ISpotCheckFormData> = {
				employee: employee.id,
			};

			await spotcheckAPI.create(payload);
			toast.success("Spot check sent to employee");
			setOpen(false);
			if (refreshRef.current) {
				try {
					refreshRef.current();
				} catch (e) {
					/* ignore */
				}
			}
		} catch (err: any) {
			showErrorToast({ error: err, defaultMessage: "Failed to send spot check" });
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Spotchecks</h3>
				<Button className="rounded-full " onClick={() => setOpen(true)}>
					Send Spotcheck
				</Button>
			</div>

			<SpotchecksTable scope={{ type: "employee", employee }} refreshTableRef={refreshRef} />

			<ConfirmationDialog
				description="You're about to send a spotcheck to this employee. Do you want to proceed ?"
				disabled={isSending}
				isOpen={open}
				title={`Send spotcheck to  ${employee.user?.fullname || "employee"}`}
				onConfirm={handleSend}
				onClose={() => setOpen(false)}
			/>
		</div>
	);
}
