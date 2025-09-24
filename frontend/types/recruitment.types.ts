import { IBaseApprovable } from "./approvals.types";

export interface ISkillZoneCategory {
	id: number;
	institution: number;
	name: string;
	description?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface ISkillZoneCategoryFormData {
	institution: number;
	name: string;
	description?: string;
}

export interface ISkillZone extends IBaseApprovable {
	id: number;
	candidate: number;
	category: number[];
	applicant_name: string;
	job_title: string;
	category_names: string[];
	notes?: string | null;
	potential_value?: string | null;
}

export interface ISkillZoneFormData {
	candidate: number;
	category: number[];
	notes?: string;
	potential_value?: string;
}
