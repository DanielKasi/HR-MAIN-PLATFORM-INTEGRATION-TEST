import { IUser, UserProfile } from "./user.types";

export interface AssetsData {
	asset_counts: {
		available: number;
		allocated: number;
		maintenance: number;
		decommissioned: number;
		total: number;
	};
	category_counts: {
		[key: string]: number;
	};
	pending_counts: {
		requests: number;
		allocations: number;
		returns: number;
		total: number;
	};
	recent_assets: IAsset[];
}

export interface IAssetCategory {
	id: number;
	institution: number;
	category_name: string;
	category_description: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface IAssetCategoryFormData {
	category_name: string;
	category_description?: string;
}

export interface IAsset {
	id: number;
	institution: number;
	asset_name: string;
	batch_number: string;
	serial_number: string;
	category: IAssetCategory | null;
	description: string | null;
	status: "available" | "allocated" | "maintenance" | "decommissioned";
	is_active: boolean;
	created_at: string;
	updated_at: string;
	created_by: number;
	current_holder: number | UserProfile;
	current_holder_details?: any; // Employee details
	asset_histories?: IAssetHistory[];
}

export interface IAssetFormData {
	asset_name: string;
	serial_number: string;
	category: number;
	description?: string;
	status?: "available" | "allocated" | "maintenance" | "decommissioned";
}

export interface IAssetHistory {
	is_active: any;
	id: number;
	asset: IAsset;
	event_type:
		| "allocated"
		| "returned"
		| "maintenance"
		| "decommissioned"
		| "created"
		| "reassigned";
	performed_by: IUser;
	affected_user: IUser;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface IAssetHistoryFormData {
	id: number;
	asset: number;
	event_type:
		| "allocated"
		| "returned"
		| "maintenance"
		| "decommissioned"
		| "created"
		| "reassigned";
	performed_by: number;
	affected_user: number;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface IAssetRequest {
	id: number;
	asset: IAsset;
	requester: any; // Employee details
	request_reference_code: string;
	asset_request_status: "pending" | "approved" | "rejected" | "cancelled";
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface IAssetRequestFormData {
	asset_id: number;
	notes?: string;
}

export interface IAssetAllocation {
	id: number;
	asset: IAsset;
	allocated_to: UserProfile; // Employee details
	allocated_by: UserProfile; // Employee details
	responding_to_request?: IAssetRequest | null;
	allocation_status: "pending" | "allocated" | "rejected" | "cancelled";
	alloc_code: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface IAssetReturn {
	id: number;
	asset: IAsset;
	allocation: IAssetAllocation;
	condition: "good" | "damaged" | "lost";
	notes: string | null;
	created_at: string;
	updated_at: string;
	is_active: boolean;
	deleted_at: string | null;
}

export interface IAssetReturnFormData {
	asset: number;
	allocation: number;
	condition: "good" | "damaged" | "lost";
	notes?: string;
}
