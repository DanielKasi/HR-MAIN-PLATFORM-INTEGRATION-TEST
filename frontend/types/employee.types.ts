export interface IEmployeeDashboard {
	total_employees: number;
	employees_by_gender: Array<{
		gender: string;
		count: number;
	}>;
	employees_by_employee_type: Array<{
		employee_type: string;
		count: number;
	}>;
	employees_by_work_type: Array<{
		work_type: string;
		count: number;
	}>;
	employees_by_department: Array<{
		department: string;
		count: number;
	}>;
	shift_statuses: Array<{
		status: string;
		count: number;
	}>;
	average_age: number;
	average_tenure_years: number;
	recent_hires: number;
	employees_by_marital_status: Array<{
		marital_status: string;
		count: number;
	}>;
}
