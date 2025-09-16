import type { Approval, ApprovalTask } from "@/types/approvals.types";

import { useMemo } from "react";

export const useApprovalsForObject = (approvals?: Approval[]) => {
	const currentApproval = useMemo(() => {
		if (!approvals || approvals.length === 0) return undefined;
		// Prefer ongoing approval else latest by updated task
		const ongoing = approvals.find((a) => a.status === "ongoing");

		return ongoing || approvals[0];
	}, [approvals]);

	const currentTask: ApprovalTask | undefined = useMemo(() => {
		if (!currentApproval) return undefined;

		return currentApproval.tasks.find((t) => t.status === "pending");
	}, [currentApproval]);

	const currentLevel = currentTask?.level;

	return { approvals, currentApproval, currentTask, currentLevel } as const;
};

export const useApprovalTaskActions = () => {
	return {
		approve: async (id: number, comment?: string) => {},
		reject: async (id: number, comment?: string) => {},
		override: async (_id: number, _comment?: string) => {},
	} as const;
};

export const usePendingTasksForUser = () => {
	return { tasks: [] as ApprovalTask[] } as const;
};

export const useTasksAnalytics = () => {
	return {
		incoming: { count: 0, tasks: [] as ApprovalTask[] },
		open: { count: 0, tasks: [] as ApprovalTask[] },
		critical: { count: 0, tasks: [] as ApprovalTask[] },
		expired: { count: 0, tasks: [] as ApprovalTask[] },
		outgoing: { count: 0, tasks: [] as ApprovalTask[] },
	} as const;
};
