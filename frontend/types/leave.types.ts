export interface ILeaveDashboard {
	total_leave_applications: number;
	applications_by_status: Array<{
		status: string;
		count: number;
	}>;
	applications_by_leave_type: Array<{
		leave_type: string;
		count: number;
	}>;
	leave_balances_by_type: Array<{
		leave_type: string;
		total_allocated_days: number;
		total_used_days: number;
		total_available_days: number;
	}>;
	average_leave_days_taken: number;
	pending_approvals: number;
	applications_over_time: Array<{
		month: string;
		count: number;
	}>;
}
