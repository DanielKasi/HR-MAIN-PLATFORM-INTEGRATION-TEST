import type { ApprovableEntityStatus } from "@/types/approvals.types";

import React from "react";

export type ApprovalStatusBadgeProps = {
	approval_status: ApprovableEntityStatus;
	className?: string;
};

const statusToColor: Record<ApprovableEntityStatus, string> = {
	under_creation: "bg-yellow-100 text-yellow-800 border-yellow-200",
	under_update: "bg-amber-100 text-amber-800 border-amber-200",
	under_deletion: "bg-red-100 text-red-800 border-red-200",
	active: "bg-green-100 text-green-800 border-green-200",
};

const labelMap: Record<ApprovableEntityStatus, string> = {
	under_creation: "Under Creation",
	under_update: "Under Update",
	under_deletion: "Under Deletion",
	active: "Active",
};

export const ApprovalStatusBadge: React.FC<ApprovalStatusBadgeProps> = ({
	approval_status,
	className,
}) => {
	const color = statusToColor[approval_status] || "bg-gray-100 text-gray-800 border-gray-200";
	const label = labelMap[approval_status] || approval_status;

	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${color} ${className || ""}`}
		>
			{label}
		</span>
	);
};

export default ApprovalStatusBadge;
