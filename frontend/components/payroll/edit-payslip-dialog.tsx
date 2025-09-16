import { formatCurrency } from "@/lib/helpers";
import { IPayslip, IPayslipFormData } from "@/types/types.utils";
import { Loader2 } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import React, { useState } from "react";
import { showErrorToast, updatePayslip } from "@/lib/utils";
import { toast } from "sonner";
import FormattedNumberInput from "../common/inputs/formatted-number-input";

interface EditPayslipDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	paySlip: IPayslip;
	isUpdating: boolean;
	setIsUpdating: (state: boolean) => void;
	onSuccess: () => void;
}

export function EditPayslipDialog({
	isOpen,
	paySlip,
	isUpdating,
	onOpenChange,
	setIsUpdating,
	onSuccess,
}: EditPayslipDialogProps) {
	const initialEditFormData: IPayslipFormData = {
		basic_salary: paySlip.basic_salary,
		total_allowances: paySlip.total_allowances,
		total_deductions: paySlip.total_deductions,
		days_worked: paySlip.days_worked,
		employee: paySlip.employee.id,
		payroll_period: paySlip.payroll_period.id,
		gross_salary: paySlip.gross_salary,
		net_salary: paySlip.net_salary,
		is_paid: paySlip.is_paid,
		paid_date: paySlip.paid_date,
	};

	const [editFormData, setEditFormData] = useState<IPayslipFormData>(initialEditFormData);

	const resetEditForm = () => {
		setEditFormData(initialEditFormData);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (!paySlip) return;

		setIsUpdating(true);
		try {
			const basicSalary = Number(editFormData.basic_salary || 0);
			const totalAllowances = Number(editFormData.total_allowances || 0);
			const totalDeductions = Number(editFormData.total_deductions || 0);
			const daysWorked = Number(editFormData.days_worked || 0);

			const updatedData = {
				basic_salary: basicSalary.toString(),
				total_allowances: totalAllowances.toString(),
				total_deductions: totalDeductions.toString(),
				days_worked: daysWorked,
				gross_salary: (basicSalary + totalAllowances).toString(),
				net_salary: (basicSalary + totalAllowances - totalDeductions).toString(),
			};

			const updatedPayslip = await updatePayslip({
				id: paySlip.id,
				payslipData: updatedData,
			});

			onSuccess();
			toast.success("Payslip updated successfully");
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to update payslip" });
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="w-full max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl">
				<DialogHeader>
					<DialogTitle>Edit Payslip</DialogTitle>
					<DialogDescription>
						Update payslip details for {paySlip?.employee.user?.fullname || ""} in{" "}
						{paySlip?.payroll_period.name}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="h-full">
					<div className="overflow-y-auto w-full h-fit max-h-[80svh] md:max-h-[65svh]">
						<div className="grid grid-cols-2 gap-4 py-4">
							<div className="space-y-2">
								<label htmlFor="basic_salary" className="text-sm font-medium">
									Basic Salary
								</label>
								<FormattedNumberInput
									id="basic_salary"
									value={editFormData.basic_salary}
									onValueChange={(value) =>
										setEditFormData((prev) => ({
											...prev,
											basic_salary: value,
										}))
									}
									disabled={isUpdating}
									placeholder="Enter basic salary"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="days_worked" className="text-sm font-medium">
									Days Worked
								</label>
								<FormattedNumberInput
									id="days_worked"
									type="text"
									value={editFormData.days_worked}
									onValueChange={(val) =>
										setEditFormData((prev) => ({
											...prev,
											days_worked: val,
										}))
									}
									disabled={isUpdating}
									placeholder="Enter days worked"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="total_allowances" className="text-sm font-medium">
									Total Allowances
								</label>
								<FormattedNumberInput
									id="total_allowances"
									value={editFormData.total_allowances}
									onValueChange={(e) => {
										// console.log("\n\n\n Got parsed value as : ", e)
										setEditFormData((prev) => ({
											...prev,
											total_allowances: e,
										}));
									}}
									disabled={isUpdating}
									placeholder="Enter total allowances"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="total_deductions" className="text-sm font-medium">
									Total Deductions
								</label>
								<FormattedNumberInput
									id="total_deductions"
									value={editFormData.total_deductions}
									onValueChange={(val) =>
										setEditFormData((prev) => ({
											...prev,
											total_deductions: val,
										}))
									}
									disabled={isUpdating}
									placeholder="Enter total deductions"
								/>
							</div>
						</div>

						{/* Preview calculated values */}
						<div className="bg-gray-50 p-4 rounded-lg space-y-2">
							<h4 className="font-medium text-gray-900">Calculated Values</h4>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-gray-600">Gross Salary:</span>
									<span className="ml-2 font-medium">
										{" "}
										{formatCurrency(
											Number(editFormData.basic_salary || 0) +
												Number(editFormData.total_allowances || 0),
										)}
									</span>
								</div>
								<div>
									<span className="text-gray-600">Net Salary:</span>
									<span className="ml-2 font-medium text-green-600">
										{" "}
										{formatCurrency(
											Number(editFormData.basic_salary || 0) +
												Number(editFormData.total_allowances || 0) -
												Number(editFormData.total_deductions || 0),
										)}
									</span>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								onOpenChange(false);
								resetEditForm();
							}}
							disabled={isUpdating}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isUpdating}
							className="bg-orange-600 hover:bg-orange-700"
						>
							{isUpdating ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Updating...
								</>
							) : (
								"Update Payslip"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default EditPayslipDialog;
