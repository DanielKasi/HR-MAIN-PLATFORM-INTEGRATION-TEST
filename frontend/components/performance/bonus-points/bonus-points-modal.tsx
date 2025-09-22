"use client";

import { useState, useEffect, memo, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { EMPLOYEE_BONUS_POINTS_API } from "@/lib/utils";
import type {
	IEmployeeBonusPoint,
	IEmployeeBonusPointFormData,
	IEmployee,
} from "@/types/types.utils";
import { Checkbox } from "@/components/ui/checkbox";
import BonusPointSettingsSelect from "@/components/selects/bonus-points-settings-select";
import { Input } from "@/components/ui/input";
import { PeriodSelect } from "@/components/selects/period-select";

interface BonusPointsModalProps {
	isOpen: boolean;
	onClose: () => void;
	bonusPoint?: IEmployeeBonusPoint;
	employee: IEmployee;
	onSubmit: () => void;
}

export function BonusPointsModal({
	isOpen,
	onClose,
	bonusPoint,
	employee,
	onSubmit,
}: BonusPointsModalProps) {
	const [formData, setFormData] = useState<IEmployeeBonusPointFormData>({
		employee_id: employee.id,
		reason: "",
		date: new Date().toISOString().split("T")[0],
		redeemed: false,
		bonus_point_setting_id: bonusPoint?.bonus_point_setting?.id || 0,
	});
	const [submitting, setSubmitting] = useState(false);

	console.log("BonusPointsModal render", { bonusPoint, formData });

	const memoizedBonusPointSettingsSelect = useMemo(
		() => (
			<BonusPointSettingsSelect
				value={formData.bonus_point_setting_id ? [formData.bonus_point_setting_id] : []}
				onValueChange={(values) => handleInputChange("bonus_point_setting_id", values[0] || 0)}
				disabled={submitting}
				placeholder="Select bonus point setting"
			/>
		),
		[formData.bonus_point_setting_id],
	);

	const handleInputChange = (
		field: keyof IEmployeeBonusPointFormData,
		value: string | number | boolean,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		if (!formData.reason.trim()) {
			toast.error("Reason is required");
			return;
		}
		if (!formData.bonus_point_setting_id) {
			toast.error("Bonus point setting is required");
			return;
		}

		setSubmitting(true);
		try {
			if (bonusPoint) {
				await EMPLOYEE_BONUS_POINTS_API.update({
					bonusPointId: bonusPoint.id,
					data: formData,
				});
				toast.success("Bonus point updated successfully");
			} else {
				await EMPLOYEE_BONUS_POINTS_API.create({ data: formData });
				toast.success("Bonus point created successfully");
			}
			onSubmit();
			onClose();
		} catch (error: any) {
			toast.error(error.message || "Failed to save bonus point");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px] rounded-2xl border-0 shadow-2xl">
				<DialogHeader>
					<DialogTitle>{bonusPoint ? "Edit Bonus Point" : "Create Bonus Point"}</DialogTitle>
					<DialogDescription>
						{bonusPoint
							? `Update bonus point for ${employee?.name || "this employee"}`
							: `Create a new bonus point for ${employee?.name || "this employee"}`}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="bonus_point_setting" className="text-sm font-medium">
							Bonus Point Setting *
						</Label>
						{memoizedBonusPointSettingsSelect}
					</div>
					<div className="space-y-2">
						<Label htmlFor="bonus_pperiod_idoint_setting" className="text-sm font-medium">
							Performance Period (Optional)
						</Label>
						<PeriodSelect
							value={formData.period_id ?? 0}
							onValueChange={(val) => handleInputChange("period_id", Number(val))}
							placeholder="Select performance period"
							disabled={submitting}
						/>
						<p className="text-xs text-slate-500">
							Link this bonus point to a specific performance period
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="reason" className="text-sm font-medium">
							Reason *
						</Label>
						<Textarea
							id="reason"
							value={formData.reason}
							onChange={(e) => handleInputChange("reason", e.target.value)}
							placeholder="Enter reason for bonus"
							disabled={submitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="date" className="text-sm font-medium">
							Date *
						</Label>
						<Input
							id="date"
							type="date"
							value={formData.date}
							onChange={(e) => handleInputChange("date", e.target.value)}
							disabled={submitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
						/>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="redeemed"
							checked={formData.redeemed}
							onCheckedChange={(checked) => handleInputChange("redeemed", checked)}
							disabled={submitting}
						/>
						<Label htmlFor="redeemed" className="text-sm font-medium">
							Redeemed
						</Label>
					</div>
				</div>
				<DialogFooter>
					<Button className="w-full rounded-full" onClick={handleSubmit} disabled={submitting}>
						{submitting ? "Saving..." : bonusPoint ? "Update" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
