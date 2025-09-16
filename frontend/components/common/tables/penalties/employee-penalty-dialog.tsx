"use client";

import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/lib/utils";
import {
	type IEmployee,
	type IEmployeePenalty,
	type IEmployeePenaltyFormData,
	type IPenaltyType,
} from "@/types/types.utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import FormattedNumberInput from "../../inputs/formatted-number-input";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PENALTY_TYPES, PERMISSION_CODES } from "@/constants";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: Partial<IEmployeePenaltyFormData>) => void;
	initialData?: IEmployeePenalty | null;
	employee: IEmployee;
	isSaving?: boolean;
}

export default function EmployeePenaltyDialog({
	isOpen,
	onClose,
	onSave,
	initialData,
	employee,
	isSaving,
}: Props) {
	const [amount, setAmount] = useState(initialData?.amount || 0);
	const [penaltyType, setPenaltyType] = useState<IPenaltyType>(
		initialData?.penalty_type || "late_coming",
	);

	const todayStr = new Date().toISOString().split("T")[0];
	const [date, setDate] = useState<string>(initialData?.date || todayStr);

	useEffect(() => {
		if (initialData) {
			setAmount(initialData.amount?.toString() || "");
			setPenaltyType(initialData.penalty_type || "late_coming");
		}
	}, [initialData]);

	const handleSave = () => {
		// Validate date is not in the future
		if (date > todayStr) {
			showErrorToast({
				error: new Error("Penalty date cannot be in the future"),
				defaultMessage: "Penalty date cannot be in the future",
			});
			return;
		}

		onSave({
			amount: amount,
			penalty_type: penaltyType,
			date: date,
		});
	};

	return (
		<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PENALTIES}>
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="rounded-xl">
					<DialogHeader>
						<DialogTitle>{initialData ? "Edit Penalty" : "Create Penalty"}</DialogTitle>
					</DialogHeader>

					<div className="grid gap-2">
						<div className="space-y-2">
							<Label className="text-sm">Penalty Type</Label>
							<Select
								value={penaltyType}
								onValueChange={(value) => setPenaltyType(value as IPenaltyType)}
							>
								<SelectTrigger className="rounded-xl">
									{penaltyType ? PENALTY_TYPES.find((p) => p.value === penaltyType)?.label : ""}
								</SelectTrigger>
								<SelectContent>
									{PENALTY_TYPES.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											{type.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label className="text-sm">Amount</Label>
							<FormattedNumberInput
								className="rounded-xl"
								value={amount}
								onValueChange={(val) => setAmount(Number(val))}
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-sm">Date</Label>
							<Input
								className="rounded-xl"
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								disabled={isSaving}
								max={todayStr}
							/>
						</div>
					</div>

					<DialogFooter className="mt-12">
						<Button className="w-full rounded-full" disabled={isSaving} onClick={handleSave}>
							{isSaving
								? initialData
									? "Updating..."
									: "Creating..."
								: initialData
									? "Update"
									: "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ProtectedComponent>
	);
}
