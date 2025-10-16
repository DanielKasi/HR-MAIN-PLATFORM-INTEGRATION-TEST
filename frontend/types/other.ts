import { Permission, UserProfile } from "./user.types";
import { IInstitutionDocument } from "./types.utils";
import { Branch } from "./branch.types";

import { IOwnerShipHistory } from "./institution.types";

export interface IProductCategoryDetail {
	id: number;
	institution: number;
	category_name: string;
	category_description: string | null;
}

export type InstitutionApprovalStatus = "pending" | "approved" | "rejected" | "under_review";

export interface IKYCDocument {
	id: number;
	institution: number;
	document_title: string;
	document_file: string;
	created_at: string;
	updated_at: string;
}

export interface IUserInstitution {
	id: number;
	institution_email: string;
	approval_date?: string | null;
	approval_status: InstitutionApprovalStatus;
	approval_status_display: string;
	institution_owner_id: number;
	institution_name: string;
	institution_logo: string | null;
	theme_color: null | string;
	branches?: Branch[];
	first_phone_number: string;
	second_phone_number: string;
	latitude: number;
	longitude: number;
	location: string;
	is_attendance_penalties_enabled: boolean;
	user_inactivity_time: number; // In minutes ,
	country_code: string;
	documents?: IInstitutionDocument[];
	transfer_history: IOwnerShipHistory[];
}

export interface IUserInstitutionFormData {
	institution_email: string;
	approval_date?: string | null;
	approval_status: InstitutionApprovalStatus;
	approval_status_display: string;
	institution_name: string;
	theme_color: null | string;
	first_phone_number: string;
	second_phone_number: string;
	latitude: number;
	longitude: number;
	location: string;
	is_attendance_penalties_enabled: boolean;
	user_inactivity_time: number; // In minutes ,
	country_code: string;
}

export interface ITask {
	id: number;
	step: ApprovalStep;
	status: string;
	object_id: number;
	content_object: string;
	updated_at: string;
	comment: string;
	approved_by: UserProfile | null;
}

export interface RoleDetail {
	id: number;
	name: string;
	description: string;
	owner_user: number;
	permissions_details: Permission[];
}

export interface StoredColorData {
	colors: string[];
	timestamp: number;
}

export interface IPaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export type ApprovalStepApprover = {
	id: number;
	approver_user: UserProfile;
};

export type ApprovalStep = {
	id: number;
	step_name: string;
	roles: number[];
	roles_details: {
		name: string;
		id: number;
	}[];
	approvers?: number[];
	approvers_details?: ApprovalStepApprover[];
	institution: number;
	action: number;
	action_details: {
		id: number;
		code: string;
		label: string;
		category: {
			code: string;
			label: string;
		};
	};
	level: number;
};

export interface BulkEmployeeUploadRowError {
	row: number;
	errors: any;
}

export interface BulkEmployeeUploadResult {
	detail?: string;
	created_count: number;
	updated_count: number;
	errors?: BulkEmployeeUploadRowError[];
	warnings?: any[];
}

export interface SeparationPolicy {
	id: number;
	separation_type: number;
	policy_document: string;
	description: string;
	min_notice_days: number;
	max_notice_days: number;
	require_separation_letter: boolean;
	require_all_stages: boolean;
	is_active: boolean;
	enforce_policy: boolean;
	created_at: string;
	updated_at: string;
}

export interface SubMenuItem {
	title: string;
	href: string;
	requiredPermission?: string;
}

export interface NavItem {
	title: string;
	href: string;
	icon: React.ReactNode;
	submenu?: SubMenuItem[];
	requiredPermission?: string;
}

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
