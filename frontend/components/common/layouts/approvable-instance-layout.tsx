"use client";

import React from "react";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";
import { IBaseApprovable } from "@/types/approvals.types";
import { cn } from "@/lib/utils";

interface ApprovableInstanceProps<T extends IBaseApprovable> {
	instance: T | null | undefined;
	children: React.ReactNode;
	className?: string;
	onInstanceRefresh?: () => void;
}

export function ApprovableInstancePageLayout<T extends IBaseApprovable>({
	instance,
	children,
	className,
	onInstanceRefresh,
}: ApprovableInstanceProps<T>) {
	const hasPendingApprovals =
		instance?.approvals && instance.approvals?.length > 0 && instance.approval_status !== "active";

	return (
		<div
			className={cn(
				"gap-6",
				className,
				hasPendingApprovals && "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3",
			)}
		>
			{hasPendingApprovals && (
				<div className="order-1 lg:order-2">
					<ApprovalWorkflow
						approvals={instance.approvals || []}
						instance_approval_status={instance.approval_status}
						onRefresh={onInstanceRefresh ?? (() => {})}
					/>
				</div>
			)}

			<div className={cn(hasPendingApprovals && "lg:col-span-2 xl:col-span-3 order-2 lg:order-1")}>
				{children}
			</div>
		</div>
	);
}

export default ApprovableInstancePageLayout;
