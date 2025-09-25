import { IBaseApprovable } from "@/types/approvals.types";
import { IEmployee, IInstitution, IObjective } from "./types.utils";

export interface IPerformanceConcernType extends IBaseApprovable {
	id: number;
	institution: number | IInstitution;
	name: string;
	description: string;
}

export interface IPerformanceConcernTypeFormData {
	name: string;
	description: string;
	institution?: number;
}

export interface IPerformanceConcern extends IBaseApprovable {
	id: number;
	description: string;
	category: IPerformanceConcernType;
}

export interface IPerformanceConcernFormData {
	description: string;
	category: number;
}

export interface IPIPSupportResourceType extends IBaseApprovable {
	id: number;
	institution: number;
	name: string;
	description: string;
}

export interface IPIPSupportResourceTypeFormData {
	name: string;
	description: string;
	institution?: number;
}

export interface IPIPSupportResource extends IBaseApprovable {
	id: number;
	name: string;
	description: string | null;
	type: IPIPSupportResourceType;
}

export interface IPIPSupportResourceFormData {
	name: string;
	description?: string;
	type: number;
}

export interface IPerformanceImprovementPlan extends IBaseApprovable {
	id: number;
	employee: IEmployee;
	start_date: string;
	end_date: string;
	issues: number[] | IPerformanceConcern[];
	support_resources: IPIPSupportResource[];
	progress_notes: string | null;
	consequences: string | null;
	status:
		| "draft"
		| "active"
		| "under_review"
		| "completed_success"
		| "completed_failure"
		| "terminated";
	final_review_date: string | null;
	outcome: string | null;
	objectives: IObjective[];
	document_template: number | null;
}

export interface IPerformanceImprovementPlanFormData {
	employee: number;
	start_date: string;
	end_date: string;
	issues: number[];
	support_resources: number[];
	progress_notes?: string;
	consequences?: string;
	status?:
		| "draft"
		| "active"
		| "under_review"
		| "completed_success"
		| "completed_failure"
		| "terminated";
	final_review_date?: string;
	outcome?: string;
	objectives: number[];
	document_template?: number | null;
}

export interface IPIPEmployeeObjectives extends IBaseApprovable {
	id: number;
	pip: IPerformanceImprovementPlan;
	objective: IObjective;
	milestone_checks: any[];
}

export interface IPIPEmployeeObjectivesFormData {
	pip: number;
	objective: number;
	milestone_checks?: any[];
}
