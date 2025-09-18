"use client";

import { ApprovableDialog } from "../approvals/approvable-dialog";
import type { ILeaveType } from "@/types/types.utils";
import type { Approval, ApprovableEntityStatus } from "@/types/approvals.types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import FormatNumberInput from "@/components/format-number-input";

interface LeaveTypeDetailsDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	leaveType: ILeaveType | null;
	approvals?: Approval[];
	instanceApprovalStatus?: ApprovableEntityStatus;
	onRefresh?: () => void;
}

const LEAVE_CATEGORIES = [
	{ value: "annual", label: "Annual Leave" },
	{ value: "sick", label: "Sick Leave" },
	{ value: "maternity", label: "Maternity Leave" },
	{ value: "paternity", label: "Paternity Leave" },
	{ value: "compassionate", label: "Compassionate Leave" },
	{ value: "study", label: "Study Leave" },
	{ value: "unpaid", label: "Unpaid Leave" },
];

const GENDER_CHOICES = [
	{ value: "all", label: "All" },
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
];

const getStatusColor = (status: boolean) => {
	return status
		? "bg-green-100 text-green-800 border-green-200"
		: "bg-gray-100 text-gray-800 border-gray-200";
};

export function LeaveTypeDetailsDialog({
	isOpen,
	onOpenChange,
	leaveType,
	approvals,
	instanceApprovalStatus,
	onRefresh,
}: LeaveTypeDetailsDialogProps) {
	if (!leaveType) return null;

	const viewFormData = {
		name: leaveType.name,
		category: leaveType.category,
		description: leaveType.description,
		max_days_per_year: leaveType.max_days_per_year.toString(),
		carry_forward_allowed: leaveType.carry_forward_allowed,
		max_carry_forward_days: leaveType.max_carry_forward_days.toString(),
		requires_document: leaveType.requires_document,
		gender_specific: leaveType.gender_specific || "all",
	};

	const renderViewContent = () => (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
			<div className="space-y-3">
				<Label className="text-xs sm:text-sm font-semibold text-gray-800">Name</Label>
				<Input
					value={viewFormData.name}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div className="space-y-3">
				<Label className="text-xs sm:text-sm font-semibold text-gray-800">Category</Label>
				<Select value={viewFormData.category} disabled>
					<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base bg-gray-50">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{LEAVE_CATEGORIES.map((category) => (
							<SelectItem key={category.value} value={category.value}>
								{category.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-3 md:col-span-2">
				<Label className="text-xs sm:text-sm font-semibold text-gray-800">Description</Label>
				<Textarea
					value={viewFormData.description}
					disabled
					rows={4}
					className="rounded-xl border-gray-200 text-sm sm:text-base resize-none bg-gray-50"
				/>
			</div>
			<div className="space-y-3">
				<Label className="text-xs sm:text-sm font-semibold text-gray-800">Max Days Per Year</Label>
				<FormatNumberInput
					value={viewFormData.max_days_per_year}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div className="space-y-3">
				<Label className="text-xs sm:text-sm font-semibold text-gray-800">
					Max Carry Forward Days
				</Label>
				<FormatNumberInput
					value={viewFormData.max_carry_forward_days}
					disabled
					className="h-10 sm:h-12 rounded-xl border-gray-200 text-sm sm:text-base bg-gray-50"
				/>
			</div>
			<div className="space-y-3">
				<Label className="text-xs sm:text-sm font-semibold text-gray-800">Gender Specific</Label>
				<Select value={viewFormData.gender_specific} disabled>
					<SelectTrigger className="h-10 sm:h-12 rounded-xl text-sm sm:text-base bg-gray-50">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{GENDER_CHOICES.map((gender) => (
							<SelectItem key={gender.value} value={gender.value}>
								{gender.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-4 md:col-span-2">
				<h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">
					Configuration Options
				</h4>
				<div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
					<div className="flex items-center space-x-3">
						<input
							type="checkbox"
							id="view-carry_forward_allowed"
							checked={viewFormData.carry_forward_allowed}
							disabled
							className="w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded bg-gray-50"
						/>
						<Label className="text-xs sm:text-sm font-medium text-gray-700">
							Carry Forward Allowed
						</Label>
					</div>
					<div className="flex items-center space-x-3">
						<input
							type="checkbox"
							id="view-requires_document"
							checked={viewFormData.requires_document}
							disabled
							className="w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded bg-gray-50"
						/>
						<Label className="text-xs sm:text-sm font-medium text-gray-700">
							Requires Document
						</Label>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<ApprovableDialog
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			title={`Leave Type Details: ${leaveType.name}`}
			description="View the configuration details for this leave type."
			approvals={approvals}
			instanceApprovalStatus={instanceApprovalStatus}
			onRefresh={onRefresh}
		>
			{renderViewContent()}
		</ApprovableDialog>
	);
}
