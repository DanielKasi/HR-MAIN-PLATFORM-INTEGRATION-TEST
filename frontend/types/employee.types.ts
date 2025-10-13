import { IEmployee } from "./types.utils";

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

export interface IWorkHourCount {
	id: number;
	created_at: string;
	updated_at: string;
	deleted_at: string;
	is_active: boolean;
	year: number;
	month: number;
	total_worked_hours: string; //Decimal
	total_overtime_hours: string; //Decimal
	total_late_minutes: number;
	total_early_checkout_minutes: number;
	total_absent_days: number;
	employee: IEmployee;
}

export interface IEmployeeLog {
	id: number;
	employee: { id: number; name: string; position: string; employee_id: string };
	device: { id: number; name: string };
	record_reference: string;
	date: string;
	time: string;
}
