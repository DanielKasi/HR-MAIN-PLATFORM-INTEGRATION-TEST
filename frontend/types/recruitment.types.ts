import { IBaseApprovable } from "./approvals.types";
import { JobApplication } from "./types.utils";

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
	candidate: JobApplication;
	category: ISkillZoneCategory[];
	notes?: string | null;
	potential_value?: string | null;
}

export interface ISkillZoneFormData {
	candidate: number;
	category: number[];
	notes?: string;
	potential_value?: string;
}
