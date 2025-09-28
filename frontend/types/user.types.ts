import { IBaseApprovable } from "./approvals.types";
import { Branch } from "./branch.types";

export enum USER_GENDER {
	MALE = "male",
	FEMALE = "female",
	OTHER = "other",
}

export enum USER_TYPES {
	STAFF = "STAFF",
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

export interface Role {
	id: number;
	name: string;
	description: string;
	institution: number;
	permissions_details?: Permission[];
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

export interface Role extends IBaseApprovable {}
