export interface IPayrollDashboard {
	total_payroll_amount: number;
	total_gross_payroll: number;
	payroll_by_department: Array<{
		department: string;
		total_net: number;
		total_gross: number;
		employee_count: number;
	}>;
	payroll_over_time: Array<{
		month: string;
		total_net: number;
		total_gross: number;
		payslips_count: number;
	}>;
	allowances_vs_deductions: {
		total_allowances: number;
		total_deductions: number;
		net_difference: number;
	};
	average_gross_salary: number;
	average_net_salary: number;
	payroll_periods_summary: {
		total_periods: number;
		processed_periods: number;
		pending_periods: number;
		latest_period: string;
	};
	penalty_breakdown: Array<{
		penalty_type: string;
		count: number;
		total_amount: number;
	}>;
	total_penalties_amount: number;
	total_penalties_count: number;
}
