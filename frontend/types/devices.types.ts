export type IDeviceStatus = "active" | "inactive" | "maintenance" | "faulty";

export interface IDevice {
	id: number;
	institution: { id: number; name: string } | null;
	branch: { id: number; name: string } | null;
	serial_number: string;
	description: string;
	attached_employees: { id: number; name: string }[];
	status: IDeviceStatus;
}

export interface IDeviceFormData {
	branch: number;
	serial_number: string;
	description: string;
	status: IDeviceStatus;
}

export interface IDeviceEmployeeAttachment {
	id: number;
	device: { id: number; serial_number: string };
	employee: { id: number; name: string; employee_id: string };
	enroll_id: string;
	is_admin: boolean;
	created_at: string;
	updated_at: string;
}

export interface IDeviceEmployeeAttachmentFormData {
	device?: number;
	employee_id?: number;
	enroll_id: string;
	is_admin: boolean;
}
