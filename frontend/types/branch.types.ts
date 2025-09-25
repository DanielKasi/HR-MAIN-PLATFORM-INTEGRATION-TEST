import { IBaseApprovable } from "./approvals.types";

export interface Branch {
	id: number;
	institution: number;
	paying_bank_account: number;
	branch_name: string;
	institution_name: string;
	branch_phone_number?: string;
	branch_location: string;
	branch_longitude: string;
	branch_latitude: string;
	branch_email?: string;
	branch_opening_time?: string;
	branch_closing_time?: string;
	is_active: boolean;
}

export interface BranchFormData {
	branch_name: string;
	branch_location: string;
	branch_latitude: string;
	branch_longitude: string;
	branch_phone_number: string;
	branch_email: string;
	branch_opening_time: string;
	branch_closing_time: string;
	institution: number;
	paying_bank_account: number;
}

export interface Branch extends IBaseApprovable {}
