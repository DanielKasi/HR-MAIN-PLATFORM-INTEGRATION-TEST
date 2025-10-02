import { IBaseApprovable } from "./approvals.types";

export interface IAnnouncement extends IBaseApprovable {
	id: number;
	title: string;
	content: string;
	requires_acknowledgment: boolean;
	target_employees: number[];
	target_employees_details: Array<{
		id: number;
		name: string;
		email: string;
	}>;
	target_departments: {
		id: number;
		name: string;
	}[];
	target_job_positions: {
		id: number;
		title: string;
	}[];
	announcement_type: number;
	content_type_name: string;
	created_at?: string;
}

export interface IAnnouncementFormData {
	title: string;
	content: string;
	requires_acknowledgment: boolean;
	target_employees?: number[];
	target_departments?: number[];
	target_job_positions?: number[];
	announcement_type?: number;
}

export interface IAcknowledgment {
	id: number;
	employee: number;
	announcement: IAnnouncement;
	acknowledged: boolean;
	acknowledged_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface IAcknowledgmentFormData {
	acknowledged?: boolean;
	acknowledged_at?: string;
}
