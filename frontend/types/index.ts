import { IBaseApprovable } from "./approvals.types";
import { IInstitutionDocument } from "./types.utils";

import { PERMISSION_CODES } from "@/constants";

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

export enum USER_GENDER {
	MALE = "male",
	FEMALE = "female",
	OTHER = "other",
}

export enum USER_TYPES {
	STAFF = "STAFF",
}

export interface Role {
	id: number;
	name: string;
	description: string;
	institution: number;
	permissions_details?: Permission[];
}

export interface IUser {
	id: number;
	fullname: string;
	email: string;
	is_active: boolean;
	is_staff: boolean;
	is_email_verified: boolean;
	is_password_verified: boolean;
	roles: Role[];
	branches: Branch[];
	permissions: Record<any, any>;
	last_login: string | null;
	is_superuser: boolean;
	gender?: USER_GENDER;
	user_type?: USER_TYPES;
}

export interface UserProfile {
	id: number;
	user: IUser;
	institution: number;
	bio: string | null;
}

export interface Permission {
	id: number;
	permission_name: string;
	permission_code: string;
	permission_description: string;
	category: {
		id: number;
		permission_category_name: string;
		permission_category_description: string;
	};
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

export interface Permission {
	permission_code: PERMISSION_CODES;
	name: string;
	description: string;
}

export interface ITill {
	id: number;
	name: string;
	branch: number;
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
export interface Role extends IBaseApprovable {}
export interface Branch extends IBaseApprovable {}
export interface IUser extends IBaseApprovable {}
