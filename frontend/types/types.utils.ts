import type { Branch, IUser, IUserInstitution, Role, UserProfile } from ".";
import type { ApprovalTask, IBaseApprovable } from "@/types/approvals.types";

export type ContextType = "employee" | "department" | "job_position";
export type CalculationMethod = "fixed" | "percentage";

export interface ContextItem {
	id: number;
	name: string;
	description?: string;
}

export interface CreateDepartmentData {
	name: string;
	description: string;
	company_id: number;
	branch_id: number;
}

export interface DepartmentFormData {
	name: string;
	description: string;
	institution: number;
}

export interface IInstitution {
	id: number;
	institution_email: string;
	institution_name: string;
	first_phone_number: string;
	second_phone_number?: string | null;
	institution_logo?: string | null; // ImageField serialized as URL or null
	institution_owner_id: number; // ForeignKey as ID
	theme_Color?: string | null;
	location?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	approval_status: string;
	approval_status_display: string;
	approval_date?: string | null; // ISO date
	documents: IInstitutionDocument[]; // Embedded serializer
	document_files?: File[]; // Write-only field
	document_titles?: string[]; // Write-only field
}

export interface IInstitutionDocument {
	id: number;
	title: string;
	fileUrl: string; // Adjust based on the serializer output
}

export interface IDepartment {
	id: number;
	name: string;
	description?: string | null;
	institution: number;
	institution_details?: IUserInstitution | null;
	job_positions?: { id: number; name: string; description: string; department_id: number }[];
}

export type OffboardingData = {
	separation_counts: {
		planned: number;
		completed: number;
		cancelled: number;
		total: number;
	};
	category_counts: {
		resignation: number;
		termination: number;
		retirement: number;
		layoff: number;
		other: number;
	};
	pending_requests: {
		resignation: number;
		termination: number;
		retirement: number;
		layoff: number;
		other: number;
		total: number;
	};
	recent_separations: {
		id: number;
		employee_name: string;
		separation_type: string;
		effective_date: string;
		separation_status: string;
		additional_notes: string;
	}[];
};

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

export interface IReportsToDetails {
	id: number;
	name: string;
	email: string;
	department: string; // Department name
}

export interface IJobPosition {
	job_adverts: any;
	id: number;
	name: string;
	description?: string | null;
	department: number;
	department_details?: IDepartment | null;
	reports_to?: number | null;
	reports_to_details?: IReportsToDetails | null;
	contract_template?: string | null;
	offer_letter_template?: string | null;
	salary_min: string | null;
	salary_max: string | null;
	employees: IEmployee[];
	job_position_status: "active" | "inactive";
}

export interface JobPositionFormData {
	name: string;
	description: string;
	department: number | null;
	reports_to: number | null;
	job_position_status: "active" | "inactive";
	offer_letter_template: File | null;
	salary_min: string;
	salary_max: string;
}

export interface CreateJobPositionData {
	affected_employees: number[]; // or any other correct type
	name: string;
	description?: string;
	department: number;
	reports_to?: number;
	job_position_status: "active" | "inactive";
	offer_letter_template?: File;
	salary_min: number;
	salary_max: number;
}

export interface JobApplication {
	scheduled_by: any;
	application: any;
	shortlisted_by: any;
	reviewed_by: any;
	reviewed_by_details: any;
	shortlisted_by_details: any;
	job_position_advert_job_details: {
		department: string;
		name: string;
		description: string;
		job_posted_date: string;
	};
	positions: number;
	id: number;
	job_position_advert: number;
	applicant_name: string;
	applicant_email: string;
	applicant_phone: string;
	resume: string;
	cover_letter: string;
	application_date: string;
	status: "new" | "reviewed" | "shortlisted" | "rejected" | "passed";
	gender: "male" | "female";
	state: string;
	address: string;
	country: string;
	source: "website" | "referral" | "job_board" | "social_media" | "head_hunt" | "other";
	created_by: number;
}

export interface JobApplicationFormData {
	job_position_advert: number;
	applicant_name: string;
	applicant_email: string;
	applicant_phone?: string;
	resume: File | null;
	cover_letter?: File | null;
	application_date?: string;
	status?: "new" | "reviewed" | "shortlisted" | "rejected" | "passed";
	gender: "male" | "female";
	state?: string;
	address: string;
	country: string;
	source?: "website" | "referral" | "job_board" | "social_media" | "head_hunt" | "other";
	created_by?: number;
	reviewed_by?: number;
	shortlisted_by?: number;
	recommended_by?: number;
	reviewed_by_name?: string;
	shortlisted_by_name?: string;
	recommended_by_name?: string;
}

// Extended application form data that includes additional fields
export interface JobApplicationCompleteFormData extends JobApplicationFormData {
	// Additional form fields
	address_latitude?: string;
	address_longitude?: string;
}

export type JobAdvertStatus =
	| "expired"
	| "active"
	| "archived"
	| "closed"
	| "inactive"
	| "pending_approval";

export type JobAdvertTypes = "internal" | "external" | "both";

export interface JobPositionAdvert {
	data: any;
	job_position_details: IJobPosition;
	id: number;
	job_position: number; // Foreign key to JobPosition
	job_position_advert_status: JobAdvertStatus;
	published_date: string; // ISO datetime string
	expiry_date: string; // ISO datetime string
	number_of_employees_expected?: number | null;
	extra_information?: string | null;
	applications: JobApplication[];
	interview_stages: JobApplication[];
	advert_type: JobAdvertTypes;
}

// For creating/updating job openings
export interface JobPositionAdvertFormData {
	level: number;
	interviewers: any;
	job_position: number;
	job_position_advert_status?: JobAdvertStatus;
	expiry_date: string; // ISO datetime string
	number_of_employees_expected?: number;
	extra_information?: string;
	advert_type?: JobAdvertTypes;
}

// Extended form data that includes interview stages setup
export interface JobAdvertCompleteFormData extends JobPositionAdvertFormData {
	// Interview stages setup data
	stages: Array<{
		id: string;
		name: string;
		interviewers: Array<{
			id: string;
			name: string;
			role: string;
		}>;
		feedbackFields: Array<{
			id: string;
			name: string;
			type: string;
		}>;
	}>;
	newStageName: string;
	selectedInterviewers: Array<{
		id: string;
		name: string;
		role: string;
	}>;
	newFeedbackFieldName: string;
	newFeedbackFieldType: string;
}

export interface IEmployee {
	id: number;
	date_of_birth: string;
	user: IUser | null;
	roles: Role[];
	employee_working_days: any | null;
	work_type: IWorkType;
	employee_type: IEmployeeType;
	bank_accounts: IEmployeeBankAccount[];
	educations: IEducation[];
	work_experiences: IWorkExperience[];
	next_of_kin: INextOfKin[];
	children: IChild[];
	spouse: {
		name: string;
		phone_number: string;
		date_of_birth: string;
	} | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	is_active: boolean;
	employee_id: string;
	email: string;
	name: string | null;
	phone_number: string;
	gender: IGender;
	date_of_joining: string;
	address: string;
	country: string;
	nin: string;
	nssf_no: string;
	tin: string;
	skills: string;
	marital_status: IMaritalStatus;
	has_children: boolean;
	employee_profile_picture: string | null;
	salary: string;
	position: {
		id: number;
		name: string;
		department_id: number;
	};
	department: IDepartment;
	payroll_branch: Branch | null;
}

export interface IPayrollItems {
	penalties: any;
	allowance: Record<string, IPayslipItem[]>;
	deduction: Record<string, IPayslipItem[]>;
}

export interface IPayslip {
	total_penalties: string;
	id: number;
	employee: IEmployee;
	payroll_period: IPayrollPeriod;
	basic_salary: string;
	total_allowances: string;
	taxable_allowances: string;
	non_taxable_allowances: string;
	total_deductions: string;
	gross_salary: string;
	net_salary: string;
	days_worked: number;
	is_paid: boolean;
	paid_date: string | null;
	created_at: string;
	updated_at: string;
	items: IPayrollItems;
}

export interface IRecruitmentDashboard {
	total_job_positions: number;
	active_job_positions: number;
	total_adverts: number;
	active_adverts: number;
	total_applications: number;
	applications_by_status: Array<{
		status: string;
		count: number;
	}>;
	total_interviews: number;
	interviews_by_status: Array<{
		status: string;
		count: number;
	}>;
	upcoming_interviews: number;
	total_onboardings: number;
	onboardings_by_status: Array<{
		status: string;
		count: number;
	}>;
	average_time_to_hire_days: number;
	applications_sources: Array<{
		source: string;
		count: number;
	}>;
	applications_over_time: Array<{
		date: string;
		count: number;
	}>;
}

export interface IEmployeeDashboard {
	total_employees: number;
	employees_by_gender: Array<{
		gender: string;
		count: number;
	}>;
	employees_by_employee_type: Array<{
		employee_type: string;
		count: number;
	}>;
	employees_by_work_type: Array<{
		work_type: string;
		count: number;
	}>;
	employees_by_department: Array<{
		department: string;
		count: number;
	}>;
	shift_statuses: Array<{
		status: string;
		count: number;
	}>;
	average_age: number;
	average_tenure_years: number;
	recent_hires: number;
	employees_by_marital_status: Array<{
		marital_status: string;
		count: number;
	}>;
}

export interface ILeaveDashboard {
	total_leave_applications: number;
	applications_by_status: Array<{
		status: string;
		count: number;
	}>;
	applications_by_leave_type: Array<{
		leave_type: string;
		count: number;
	}>;
	leave_balances_by_type: Array<{
		leave_type: string;
		total_allocated_days: number;
		total_used_days: number;
		total_available_days: number;
	}>;
	average_leave_days_taken: number;
	pending_approvals: number;
	applications_over_time: Array<{
		date: string;
		count: number;
	}>;
}

export interface ProjectStatusCount {
	status: string;
	count: number;
}

export interface TaskStatusCount {
	status: string;
	count: number;
}

export interface TaskPriorityCount {
	priority: string;
	count: number;
}

export interface ProjectsAnalytics {
	total: number;
	by_status: ProjectStatusCount[];
}

export interface TasksAnalytics {
	total: number;
	by_status: TaskStatusCount[];
	by_priority: TaskPriorityCount[];
}

export interface IProjectDashboard {
	projects: ProjectsAnalytics;
	tasks: TasksAnalytics;
	active_projects: number;
	overdue_tasks: number;
}

export interface DashboardError {
	error: string;
}

export type DashboardResponse = IProjectDashboard | DashboardError;
export interface IAttendanceDashboard {
	total_attendance_records: number;
	attendance_by_status: Array<{
		status: string;
		count: number;
	}>;
	average_overtime_hours: number;
	average_late_minutes: number;
	average_early_checkout_minutes: number;
	spot_check_response_rate: number;
	spot_checks_by_status: Array<{
		status: string;
		count: number;
	}>;
	attendance_over_time: Array<{
		date: string;
		count: number;
	}>;
}

export interface IPayrollDashboard {
	total_payroll_amount: number;
	total_gross_payroll: number;
	payroll_by_department: Array<{
		department: string;
		total_net: number;
		total_gross: number;
		employee_count: number;
	}>;
	payroll_over_time: Array<{
		month: string;
		total_net: number;
		total_gross: number;
		payslips_count: number;
	}>;
	allowances_vs_deductions: {
		total_allowances: number;
		total_deductions: number;
		net_difference: number;
	};
	average_gross_salary: number;
	average_net_salary: number;
	payroll_periods_summary: {
		total_periods: number;
		processed_periods: number;
		pending_periods: number;
		latest_period: string;
	};
	penalty_breakdown: Array<{
		penalty_type: string;
		count: number;
		total_amount: number;
	}>;
	total_penalties_amount: number;
	total_penalties_count: number;
}

export interface IInterviewStageFormData {
	job_position_advert: number;
	name: string;
	level: number;
	interviewers: number[];
}

export interface IInterviewStage {
	candidates: any[];
	id: number;
	job_position_advert: number;
	name: string;
	level: number;
	interviewers: number[];
	interviewers_details?: IEmployee[];
	candidates_count: number;
}

export type IInterviewType = "online" | "in_person";

export interface IInterview {
	updated_at: any;
	created_at: any;
	id: number;
	job_position_application: number;
	job_position_application_details?: JobApplication | null;
	interview_stage: number;
	interview_stage_details?: IInterviewStage | null;
	interview_date: string;
	status: string;
	feedback?: string | null;
	rating?: number | null;
	location: string;
	interview_time: string;
	interview_type: IInterviewType;
}

export interface IInterviewFormData {
	job_position_application: number;
	interview_stage: number;
	interview_date: string;
	feedback?: string | null;
	rating?: number | null;
	location: string;
	interview_time: string;
	interview_type: IInterviewType;
	status: string;
	created_by?: number;
}

export interface User {
	email: string;
	fullname: string;
	password?: string;
	roles_ids?: number[];
	permissions?: string;
}

export type IGender = "male" | "female" | "other";
export type IMaritalStatus = "single" | "married" | "divorced" | "widowed";

// Base interfaces for nested objects
export interface IChild {
	id: string;
	name: string;
	gender: IGender;
	date_of_birth: string;
}

export interface INextOfKin {
	id: string;
	name: string;
	phone_number: string;
	phone_number_country_code?: string;
	relationship: string;
	address: string;
}

export interface IEducation {
	id: string;
	name: string;
	institution: string;
	year: string;
	qualification: IQualificationAward | null;
}

export interface IEmployeeEducationFormData {
	id: string;
	name: string;
	institution: string;
	year: string;
	qualification_id: number;
}

export interface IQualificationAward {
	id: number;
	name: string;
	description: string;
}

export interface IWorkExperience {
	id: string;
	company: string;
	position: string;
	duration: string;
	reason_of_leave: string;
}

export interface IEmployeeBankAccountFormData {
	id?: string;
	bank_id: number;
	account_number: string;
	account_name: string;
}

export interface IEmployeeBankAccount {
	bank: IBankType;
	account_number: string;
	account_name: string;
}

export interface ISpouse {
	id?: string;
	name: string;
	phone_number: string;
	phone_number_country_code?: string;
	date_of_birth: string;
}

// Main employee form interface for backend API
export interface IEmployeeFormData {
	user: Partial<IUser>;
	id?: number;
	email: string;
	gender: "male" | "female" | "other";
	phone_number: string;
	phone_number_country_code?: string;
	position: number;
	department: number;
	work_type: number;
	employee_type: number;
	date_of_birth: string;
	date_of_joining: string;
	address: string;
	country: string;
	nin: string;
	tin: string;
	nssf_no: string;
	salary: number;
	is_active: boolean;
	skills: string;
	marital_status: IMaritalStatus;
	employee_profile_picture?: File | null;
	selected_branches: number[];
	has_children: boolean;

	// Nested arrays and objects
	children: IChild[];
	next_of_kin: INextOfKin[];
	educations: IEmployeeEducationFormData[];
	work_experiences: IWorkExperience[];
	bank_accounts: IEmployeeBankAccountFormData[];
	spouse?: ISpouse;

	// Legacy fields for backward compatibility
	emergency_contact_name?: string;
	emergency_contact_phone?: string;
	emergency_contact_relationship?: string;
	bank?: string;
	bank_account_number?: string;
	payroll_branch?: number | null;
}

// Interface for local form state management
export interface ICreateEmployeeForm {
	// Basic Information
	fullname: string;
	email: string;
	phone_number: string;
	phone_number_country_code?: string;
	gender: "male" | "female" | "other";
	date_of_birth: string;
	address: string;
	country: string;
	nin: string;
	marital_status: IMaritalStatus;

	// Work Information
	position: number;
	department: number;
	work_type: number;
	employee_type: number;
	date_of_joining: string;
	skills: string;
	selected_branches: number[];
	is_active: boolean;
	has_children: boolean;

	// Financial Information
	tin: string;
	nssf_no: string;
	salary: number;

	// Nested structures
	children: IChild[];
	next_of_kin: INextOfKin[];
	educations: IEducation[];
	work_experiences: IWorkExperience[];
	bank_accounts: IEmployeeBankAccountFormData[];
	spouse?: ISpouse;

	// Profile picture
	employee_profile_picture?: File | null;
}

// Form step types
export type EmployeeFormStep = "personal" | "work" | "financial";

export type RequiredEmployeeFields = Pick<
	IEmployeeFormData,
	| "user"
	| "email"
	| "phone_number"
	| "position"
	| "work_type"
	| "employee_type"
	| "date_of_birth"
	| "selected_branches"
>;

export interface IRoleResponse {
	id: number;
	name: string;
	description: string;
	institution: number;
	permissions_details: string;
}

// Interface for Department response
export interface IDepartmentResponse {
	id: number;
	name: string;
	description: string;
	institution: number;
	institution_details: {
		id: number;
		institution_email: string;
		institution_name: string;
		first_phone_number: string;
		second_phone_number: string;
		institution_logo: string;
		institution_owner_id: number;
		theme_color: string;
		location: string;
		latitude: number;
		longitude: number;
		approval_status: string;
		approval_status_display: string;
		approval_date: string;
		documents: any[];
	};
}

export interface IRole {
	id: number;
	name: string;
	description: string;
	institution: number; // ForeignKey as ID
	permissions_details: string[]; // List of permission codes
}
export interface IRoleFormData {
	name: string;
	description: string;
	institution: number; // ForeignKey as ID
	permissions_details: string[]; // List of permission codes
}

export interface IOnBoarding {
	application_details: JobApplication;
	id: number;
	application: number;
	attended: boolean;
	remarks: string | null;
	status: "initial" | "training" | "issued_contract" | "declined_offer" | "accepted_offer";
	created_at: string;
	updated_at: string;
}

export interface PaginatedIOnboardingResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: IOnBoarding[];
}

export interface IOnBoardingFormData {
	application?: number;
	attended?: boolean;
	remarks?: string;
	status?: "initial" | "training" | "issued_contract" | "declined_offer" | "accepted_offer";
}

// Bulk Onboarding Types
export interface IBulkOnBoardingRequest {
	application_ids: number[];
}

export interface IBulkOnBoardingSkipped {
	application_id: number;
	reason: string;
}

export interface IBulkOnBoardingSummary {
	total_requested: number;
	created_count: number;
	skipped_count: number;
}

export interface IBulkOnBoardingResponse {
	created: IOnBoarding[];
	skipped: any[];
	summary: {
		created_count: number;
		skipped_count: number;
		total_requested: number;
	};
}

export interface IWorkTypeFormData {
	name: string;
	code: string;
	description: string;
	institution: number;
}

export interface IEmployeeTypeFormData {
	name: string;
	code: string;
	description: string;
	institution: number;
}

// Response interfaces (what you get back from the API)
export interface IWorkType {
	id: number;
	name: string;
	institution: number;
	code?: string;
	description?: string;
	created_at?: string;
	updated_at?: string;
}

export interface IEmployeeType {
	id: number;
	institution: number;
	name: string;
	code?: string;
	description?: string;
	created_at?: string;
	updated_at?: string;
}

export interface BranchSummary {
	id: number;
	name: string;
	location: string;
	is_default?: boolean;
	attached_date?: string;
}

export interface PayrollBranch {
	id: number;
	name: string;
	location: string;
}

export interface EmployeeBranchSummary {
	branches: BranchSummary[];
	default_branch: BranchSummary | null;
	payroll_branch: PayrollBranch | null;
}

export interface UserBranch {
	id: number;
	user_id: number;
	user_email: string;
	branch_id: number;
	branch_name: string;
	is_default: boolean;
	created_at: string;
}

export interface AttachBranchesPayload {
	employee_id: number;
	branches: {
		branch_id: number;
		is_default?: boolean;
	}[];
}

export interface SetDefaultBranchPayload {
	branch_id: number;
}

export interface DisciplinaryActionForm {
	employee: string;
	discipline_type: string;
	incident_date: string;
	description: string;
	evidence: string;
	reported_by: string;
	assigned_to: string;
	status: string;
	action_taken: string;
	resolution_date: string;
	follow_up_required: boolean;
	follow_up_date: string | null; // Allow null
	notes: string;
}

export interface DisciplinaryActionRequest {
	discipline_type: number;
	employee: number;
	reported_by: number;
	assigned_to: number | null; // Allow null for optional assignment
	incident_date: string;
	description: string;
	evidence: string;
	status: string;
	action_taken: string;
	resolution_date: string | null; // Allow null for optional resolution date
	follow_up_required: boolean;
	follow_up_date: string | null; // Allow null for optional follow-up date
	notes: string;
}

export interface DisciplinaryActionResponse extends DisciplinaryActionRequest {
	id: number;
	created_at: string;
	updated_at: string;
}

export function convertFormToApiRequest(
	formData: DisciplinaryActionForm,
): DisciplinaryActionRequest {
	return {
		discipline_type: Number.parseInt(formData.discipline_type),
		employee: Number.parseInt(formData.employee),
		reported_by: Number.parseInt(formData.reported_by),
		assigned_to: formData.assigned_to ? Number.parseInt(formData.assigned_to) : null,
		incident_date: formData.incident_date,
		description: formData.description,
		evidence: formData.evidence,
		status: formData.status,
		action_taken: formData.action_taken,
		resolution_date: formData.resolution_date || null,
		follow_up_required: formData.follow_up_required,
		follow_up_date:
			formData.follow_up_required && formData.follow_up_date ? formData.follow_up_date : null,
		notes: formData.notes,
	};
}

export interface IDisciplineType {
	id?: number;
	name: string;
	description: string;
	severity: "low" | "medium" | "high" | "critical";
	is_active: boolean;
	created_at?: string;
}

export interface IDisciplineTypeFormData {
	name: string;
	description: string;
	severity: "low" | "medium" | "high" | "critical";
	is_active: boolean;
}

export interface IDisciplineTypeRequest {
	name: string;
	description: string;
	severity: "low" | "medium" | "high" | "critical";
	is_active: boolean;
}

export interface DisciplineTypeResponse extends IDisciplineTypeRequest {
	id: number;
	created_at: string;
	updated_at: string;
}

export function convertDisciplineTypeFormToApiRequest(
	formData: IDisciplineTypeFormData,
): IDisciplineTypeRequest {
	return {
		name: formData.name,
		description: formData.description,
		severity: formData.severity,
		is_active: formData.is_active,
	};
}

export interface IDisciplinaryAction {
	id: number;
	discipline_type?: {
		id: number;
		name: string;
		description: string;
		severity: "low" | "medium" | "high" | "critical";
		is_active: boolean;
		created_at: string;
	} | null;
	employee: IEmployee;
	reported_by: IEmployee;
	assigned_to: IEmployee | null;
	incident_date: string;
	reported_date: string;
	description: string;
	evidence: string;
	status: "pending" | "in_progress" | "completed" | "dismissed";
	action_taken: string;
	resolution_date: string | null;
	follow_up_required: boolean;
	follow_up_date: string | null;
	created_at: string;
	updated_at: string;
	notes: string;
}

export interface ILeaveTypeFormData {
	name: string;
	category: "annual" | "sick" | "personal" | "maternity" | "paternity" | "emergency" | "unpaid";
	description: string;
	max_days_per_year: number;
	carry_forward_allowed: boolean;
	max_carry_forward_days: number;
	is_active: boolean;
	requires_document: boolean;
	gender_specific: "male" | "female" | "all" | null;
}

export interface ILeaveType {
	id: number;
	created_at?: string;
	updated_at?: string;
	name: string;
	category: "annual" | "sick" | "personal" | "maternity" | "paternity" | "emergency" | "unpaid";
	description: string;
	max_days_per_year: number;
	carry_forward_allowed: boolean;
	max_carry_forward_days: number;
	is_active: boolean;
	requires_document: boolean;
	gender_specific: "male" | "female" | "all" | null;
}

export interface ILeaveBalance {
	id: number;
	employee: IEmployee;
	leave_type: ILeaveType;
	available_days: string | number;
	institution: number;
	year: number;
	allocated_days: string;
	used_days: string;
	pending_days: string;
	carried_forward_days: string;
	created_at: string;
	updated_at: string;
}

export interface ILeavePolicy {
	id?: number | string;
	leave_type: number;
	name: string;
	description: string;
	min_notice_days: number;
	max_consecutive_days: number | null;
	requires_manager_approval: boolean;
	requires_hr_approval: boolean;
	applicable_after_probation_months: number;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface ILeavePolicyFormData {
	leave_type: number;
	name: string;
	description: string;
	min_notice_days: number;
	max_consecutive_days: number;
	requires_manager_approval: boolean;
	requires_hr_approval: boolean;
	applicable_after_probation_months: number;
	is_active?: boolean;
}

export interface ILeavePolicyResponse extends ILeavePolicy {
	id: number;
	created_at: string;
	updated_at: string;
}

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type DurationType = "full_day" | "half_day" | "multiple_days";

export interface ILeaveRequest {
	id?: number | string;
	employee: number;
	leave_type: number;
	approved_by: number;
	start_date: string;
	end_date: string;
	duration_type: DurationType;
	reason: string;
	status: LeaveRequestStatus;
	rejection_reason: string;
	supporting_document: string;
	handover_notes: string;
	created_at?: string;
	updated_at?: string;
}

export interface ILeaveRequestFormData {
	employee: number;
	leave_type: number;
	start_date: string;
	end_date: string;
	duration_type: string;
	reason: string;
	handover_notes?: string;
	status?: string;
	supporting_document?: File | null;
}

export interface LeaveRequestWithRelations extends ILeaveRequest {
	employee_details?: {
		id: number;
		name: string;
		email: string;
		department?: string;
		position?: string;
	};
	leave_type_details?: {
		id: number;
		name: string;
		category: string;
		is_active: boolean;
	};
	approved_by_details?: {
		id: number;
		name: string;
		email: string;
		role?: string;
	};
	calculated_days?: number;
	is_editable?: boolean;
}

export interface ILeaveRequestResponse {
	success: boolean;
	data: ILeaveRequest | ILeaveRequest[];
	message?: string;
	errors?: Record<string, string[]>;
}

export interface ILeaveRequestFilters {
	employee_id?: number;
	leave_type_id?: number;
	status?: LeaveRequestStatus;
	start_date_from?: string;
	start_date_to?: string;
	approved_by?: number;
	duration_type?: DurationType;
}

export type IAllowanceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface IAllowanceType {
	id: number;
	name: string;
	institution: IUserInstitution;
	description: string;
	is_recurring: boolean;
	frequency?: IAllowanceFrequency | null;
	is_taxable: boolean;
	is_active: boolean;
	created_at: string;
}

export interface IAllowanceTypeFormData {
	name: string;
	description: string;
	is_recurring: boolean;
	frequency?: IAllowanceFrequency | null;
	is_taxable: boolean;
	is_active: boolean;
}

export interface IDeductionType {
	id: number;
	institution: IUserInstitution;
	name: string;
	description: string;
	is_mandatory: boolean;
	is_recurring: boolean;
	frequency?: IAllowanceFrequency | null;
	is_active: boolean;
	created_at: string;
}

export interface IDeductionTypeFormData {
	name: string;
	description: string;
	is_recurring: boolean;
	frequency?: IAllowanceFrequency | null;
	is_mandatory: boolean;
	is_active: boolean;
}

export interface IEmployeeAllowance {
	id: number;
	employee: IEmployee;
	allowance_type: IAllowanceType;
	calculation_method: "fixed" | "percentage";
	amount: string;
	percentage: string;
	is_active: boolean;
	effective_from: string;
	effective_to: string | null;
	created_at: string;
}

export interface IEmployeeAllowanceFormData {
	employee: number;
	allowance_type: number;
	calculation_method: "fixed" | "percentage";
	amount: string;
	percentage: string;
	is_active: boolean;
	effective_from: string;
	effective_to?: string | null;
}

export interface IEmployeeDeduction {
	id: number;
	employee: IEmployee;
	deduction_type: IDeductionType;
	calculation_method: "fixed" | "percentage";
	amount: string;
	percentage: string;
	is_active: boolean;
	effective_from: string;
	effective_to: string | null;
	created_at: string;
}

export interface IEmployeeDeductionFormData {
	employee: number;
	deduction_type: number;
	calculation_method: "fixed" | "percentage";
	amount: string;
	percentage: string;
	is_active: boolean;
	effective_from: string;
	effective_to?: string | null;
}

export interface IPayrollPeriod {
	id: number;
	name: string;
	start_date: string;
	end_date: string;
	pay_date: string;
	is_processed: boolean;
	created_at: string;
	institution: number;
}

export interface IPayrollPeriodFormData {
	name: string;
	start_date: string;
	end_date: string;
	pay_date: string;
	is_processed?: boolean;
}

export interface IPayslipFormData {
	employee: number;
	payroll_period: number;
	basic_salary: string | number;
	total_allowances: string | number;
	total_deductions: string | number;
	gross_salary: string | number;
	net_salary: string | number;
	days_worked: number;
	is_paid: boolean;
	paid_date: string | null;
}

export interface IPayslipItem {
	id: number;
	payslip: IPayslip;
	item_type: "allowance" | "deduction" | "overtime" | "penalty";
	name: string;
	amount: string;
	description: string;
}

export interface PaginatedPayslipResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: IPayslip[];
}

export type ContractStatus = "draft" | "active" | "expired" | "terminated";

export interface IContract {
	id: number;
	contract_id: string;
	applicant: JobApplication | null;
	employee?: IEmployee;
	is_active: boolean;
	contract_reference: string;
	original_contract: string | null;
	signed_contract: string | null;
	created_at: string;
	updated_at: string;
	differences?: string;
}

export interface IContractFormData {
	employee: number;
	signed_contract?: File | null;
	status?: ContractStatus;
	start_date: string;
	end_date?: string | null;
	notes?: string | null;
}

export interface IDocumentType {
	id: number;
	name: string;
	description: string;
	code: string;
}

export interface IDocumentTypeFormData {
	name: string;
	description: string;
}

export interface IDocumentTemplate {
	id: number;
	name: string;
	document_type: IDocumentType;
	template_type: "pdf" | "word" | "text";
	file: string | null;
	content: string | null;
	placeholders: string[] | null;
	created_at: string;
	updated_at: string;
}

export type DocumentGenerationContext = "employee" | "leave" | "onboarding";

export interface DocumentGenerationRequest {
	context: DocumentGenerationContext;
	context_id: number;
	placeholders: {
		[key: string]: string;
	};
}

export interface IDocumentTemplateFormData {
	document_type: number;
	name: string;
	template_type: "pdf" | "word" | "text";
	file?: File | null;
	content?: string | null;
	placeholders?: string[] | null;
}

interface IPlaceholder {
	value: string;
}

interface IPlaceholders {
	[key: string]: IPlaceholder;
}

export interface IGeneratedDocumentTemplate {
	id: number;
	template_id: number;
	placeholders: IPlaceholders | null;
}

export interface ICountry {
	name: { common: string };
	cca2: string;
	idd?: { root?: string; suffixes?: string[] };
}

export type ApprovalStepApprover = {
	id: string;
	approver_user: UserProfile;
};

export interface ITask {
	id: string;
	step: ApprovalStep;
	status: string;
	comment: string;
	approved_by: UserProfile | null;
}

export type ApprovalStep = {
	id: string;
	step_name: string;
	roles: string[];
	roles_details: {
		name: string;
		id: string;
	}[];
	approvers?: string[];
	approvers_details?: ApprovalStepApprover[];
	shop: string;
	action: string;
	action_details: {
		id: string;
		code: string;
		label: string;
		category: {
			code: string;
			label: string;
		};
	};
	level: number;
};

// Termination Types
export type TerminationInitiationStatus = "submitted" | "under_review" | "approved" | "rejected";
export type SeparationStatus = "planned" | "completed" | "cancelled";

export interface IEmployeeSeparation {
	id: number;
	effective_date: string;
	additional_notes: string | null;
	separation_status: SeparationStatus;
	employee_separation_type: number;
	employee: IEmployee;
	initiated_by: UserProfile;
}

export interface ITermination {
	id: number;
	separation: IEmployeeSeparation;
	termination_letter: string | null;
	comments: string;
	last_working_day: string;
	initiation_status: TerminationInitiationStatus;
	created_at: string;
	updated_at: string;
}

export interface ITerminationFormData {
	employee_id: number;
	termination_letter?: File | null;
	comments: string;
	last_working_day: string;
}

// Separation Policy Types
export type SeparationCategory =
	| "resignation"
	| "termination"
	| "retirement"
	| "contract_end"
	| "other";

export interface ISeparationType {
	id: number;
	institution: number;
	separation_type: string;
	description: string;
	supported_stages: number[] | IOffboardingStage[];
	category: SeparationCategory;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface ISeparationTypeFormData {
	separation_type: string;
	description: string;
	supported_stages: number[];
	category: SeparationCategory;
	is_active: boolean;
}

// Offboarding Stage Interfaces
export interface IOffboardingStage {
	id: number;
	institution: number;
	stage_name: string;
	stage_description: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface IOffboardingStageFormData {
	institution: number | string;
	stage_name: string;
	stage_description: string;
	is_active?: boolean;
}

export interface ISeparationPolicy {
	id: number;
	separation_type: ISeparationType;
	policy_document: string;
	policy_name: string;
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

export interface IAttendance {
	id: number;
	employee: IEmployee;
	check_in_time: string;
	check_out_time: string | null;
	check_in_latitude?: number;
	check_in_longitude?: number;
	check_out_latitude?: number;
	check_out_longitude?: number;
	status: string;
	date: string;
	overtime_hours: string;
}

export interface IAttendanceFormData {
	employee: number;
	check_in_time: string;
	check_in_longitude?: number;
	check_in_latitude?: number;
	check_out_longitude?: number;
	check_out_latitude?: number;
	check_out_time?: string | null;
	status: string;
	date?: string;
	overtime_hours?: string;
}

export interface IBankType {
	id: number | string;
	institution: number | string;
	bank_fullname: string;
	bank_code: string;
	br_code: string;
	created_by: number;
	created_at: string;
	updated_by: number;
	updated_at: string;
}

export interface IBankTypeFormData {
	bank_fullname: string;
	bank_code: string;
	br_code: string;
}

export interface IBankAccount {
	id: number | string;
	institution_bank: number | string;
	account_name: string;
	account_number: string;
	created_by: number;
	created_at: string;
	updated_by: number;
	updated_at: string;
	paid_branches?: Branch[];
}

export interface IBankAccountFormData {
	institution_bank: number | string;
	account_name: string;
	account_number: string;
}

export interface IPaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export interface PayslipItemData {
	id: number;
	payslip: {
		id: number;
		employee: {
			id: number;
			user: {
				id: number;
				email: string;
				fullname: string;
				is_active: boolean;
			};
			department: {
				id: number;
				name: string;
				institution_id: number;
			};
			position: {
				id: number;
				name: string;
				department_id: number;
			};
		};
		payroll_period: {
			id: number;
			name: string;
			start_date: string;
			end_date: string;
			pay_date: string;
			is_processed: boolean;
			institution: number;
		};
		basic_salary: string;
		total_allowances: string;
		total_deductions: string;
		gross_salary: string;
		net_salary: string;
		days_worked: number;
		is_paid: boolean;
		paid_date: string | null;
	};
	item_type: "allowance" | "deduction" | "overtime";
	name: string;
	amount: string;
	description?: string;
}

export interface PayslipItem {
	id: number;
	payslip_id: number;
	item_type: "allowance" | "deduction" | "overtime";
	name: string;
	amount: number;
	description?: string;
}

export interface ISystemWorkingDay {
	id: number;
	day_code: string;
	day_name: string;
	level: number;
}

// Institution Working Days interface
export interface IInstitutionWorkingDays {
	id: number;
	institution: number;
	days: ISystemWorkingDay[];
	created_by: number | null;
	created_at: string;
	updated_by: number | null;
	updated_at: string;
}

// Form data for creating/updating institution working days
export interface IWorkingDaysFormData {
	days: number[];
}

export interface ITax {
	id: number;
	institution: number;
	tax_name: string;
	tax_status: boolean;
	created_by: number;
	created_at: string;
	updated_by: number;
	updated_at: string;
}

export interface ITaxFormData {
	tax_name: string;
	tax_status: boolean;
}

export interface ITaxRule {
	id: number;
	institution_tax: ITax;
	tax_rule_name: string;
	tax_rule_description?: string;
	tax_rule_percentage?: number;
	tax_rule_fixed_amount?: number;
	salary_from?: number;
	salary_to?: number;
	created_by: number;
	created_at: string;
	updated_by: number;
	updated_at: string;
}

export interface ITaxRuleFormData {
	institution_tax: number;
	tax_rule_name: string;
	tax_rule_description?: string;
	tax_rule_percentage?: number;
	tax_rule_fixed_amount?: number;
	salary_from?: number;
	salary_to?: number;
}

// Legacy interfaces for backward compatibility
export interface Itax extends ITax {}
export interface ItaxRules extends ITaxRule {}

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

export interface DashboardCategory {
	count: number;
	tasks: ApprovalTask[];
}

export interface ApprovalTasksDashboardResponse {
	incoming: DashboardCategory;
	open: DashboardCategory;
	critical: DashboardCategory;
	expired: DashboardCategory;
	outgoing: DashboardCategory;
}

export type TaskType = "incoming" | "open" | "critical" | "expired" | "outgoing";

export interface ChangePasswordData {
	old_password: string;
	new_password: string;
	new_password_confirm: string;
}
export interface IAssetFormData {
	asset_name: string;
	serial_number: string;
	category: number;
	description?: string;
	status?: "available" | "allocated" | "maintenance" | "decommissioned";
}

export interface IAssetHistory {
	id: number;
	asset: IAsset;
	event_type:
		| "allocated"
		| "returned"
		| "maintenance"
		| "decommissioned"
		| "created"
		| "reassigned";
	performed_by: UserProfile;
	affected_user: UserProfile;
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

export interface IEmployeeTax {
	id: number;
	effective_from: string;
	effective_to: string;
	created_at: string;
	employee: IEmployee;
	institution_tax: ITax;
}

export interface IPublicHolidayFormData {
	institution: number;
	title: string;
	date: string;
}

export interface IEvent {
	id: number;
	institution: number;
	title: string;
	description: string;
	date: string;
	target_audience: "all" | "department" | "individual" | "specific_employees";
	event_mode: "physical" | "online" | "hybrid";
	department?: string;
	specific_employees?: string[];
	created_at: string;
	updated_at: string;
	created_by?: number;
	updated_by?: number;
}

export interface IPublicHoliday {
	id: number;
	institution: number;
	title: string;
	date: string;
	created_at: string;
	updated_at: string;
}

export interface IEventOccurrence {
	id: number;
	event: IEvent;
	date: string;
}

export interface ICalendar {
	id: number;
	institution: number;
	year: number;
	public_holidays: IPublicHoliday[];
	event_occurrences: IEventOccurrence[];
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

export interface IAssetAllocationFormData {
	asset: number;
	allocated_to: number;
	responding_to_request?: number;
	allocation_status?: "pending" | "allocated" | "rejected" | "cancelled";
}

export interface IEmployeeTaxFormData {
	target_departments?: number[];
	target_job_positions?: number[];
	target_employees?: number[];
	effective_from: string;
	effective_to?: string;
	institution_tax: number | string;
}

export interface ICalendarEvent {
	institution: number | IInstitution;
	year: string;
	public_holidays: number[] | IPublicHoliday[];
	events: number[] | IEvent[];
	created_at: string;
	updated_at: string;
}

export interface AttendanceEmployee {
	id: number;
	full_name: string;
	department: string;
	position: string;
}

export interface AttendanceSummary {
	present: number;
	absent: number;
	late: number;
	leave: number;
	total_working_days: number;
}

export interface AttendanceEmployeeData {
	employee: AttendanceEmployee;
	summary: AttendanceSummary;
	daily_statuses: Record<string, string>;
}

export interface AttendanceResponse {
	start_date: string;
	end_date: string;
	employees: AttendanceEmployeeData[];
}

export type IBasicDasboardDataCounts = {
	employee_count: number;
	department_count: number;
	on_leave_count: number;
};

export interface IInstitutionAnalytics {
	basic_counts: IBasicDasboardDataCounts;
	payroll_summary: {
		current: {
			month: string; // e.g. "01" through "12"
			payroll: number;
		}[];
		past: {
			total: number;
		};
	};
	employees_per_department: {
		dept_name: string;
		count: number;
		year: number;
	}[];
	gender_distribution: {
		employees_count: number;
		male: number;
		female: number;
		other: number;
	};
	payroll_by_department: {
		dept: string;
		payroll: number;
	}[];
}

export interface IKYCDocument {
	id: number;
	institution: number;
	document_title: string;
	document_file: string;
	created_at: string;
	updated_at: string;
}
export type ISpotCheckInitiator = "system" | "user";

export interface ISpotCheck {
	id: number;
	employee: IEmployee;
	created_at: string;
	updated_at: string;
	responded_at: string | null;
	address: string;
	latitude: number | null;
	longitude: number | null;
	initiated_by: ISpotCheckInitiator;
	spotcheck_time: string | null;
	status: ISpotCheckStatus;
	duration: string | null;
	notes: string | null;
}

export interface ISpotCheckFormData {
	employee: number;
	latitude: number;
	longitude: number;
	initiated_by: ISpotCheckInitiator;
	notes: string;
}

export interface ISpotCheckStatus {
	id: number;
	code: string;
	status_name: string;
	description: string;
}

export interface ILocation {
	latitude: number;
	longitude: number;
}

export interface IInstitutionPenaltyConfig {
	id: number;
	institution: number;
	penalty_type: string;
	penalty_value: number;
	penalty_value_type: string;
	percentage: number | null;
	created_at: string;
	updated_at: string;
}

export interface IInstitutionPenaltyConfigFormData {
	penalty_type: string;
	penalty_value: number;
	penalty_value_type: string;
	percentage?: number;
	institution: number;
}

export interface IBranchPenaltyConfig {
	id: number;
	branch: number;
	penalty_type: string;
	penalty_value: number;
	penalty_value_type: string;
	percentage: number | null;
	created_at: string;
	updated_at: string;
}

export interface IBranchPenaltyConfigFormData {
	branch: number;
	penalty_type: string;
	penalty_value: number;
	penalty_value_type: string;
	percentage?: number;
}

export interface IBranchLocationComparisonConfig {
	id: number;
	branch: number;
	branch_name: string;

	radius_in_meters: number;
	created_at: string;
	updated_at: string;
}

export interface IBranchLocationComparisonConfigFormData {
	branch: number;
	radius_in_meters: number;
}

export type IEmployeeShiftContext = "REQUEST" | "ASSIGNMENT" | "ALLOCATION";
export type IEmployeeShiftStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ASSIGNED";

export interface IBranchDay {
	id: number;
	day_id: number;
	day_name: string;
	day_type: "PHYSICAL" | "REMOTE";
}

export interface IBranchWorkingDays {
	id: number;
	branch: Branch;
	branch_days: IBranchDay[];
}

export interface IShiftFormData {
	name: string;
	shift_day: number;
	start_time: string;
	end_time: string;
	description: string;
}

export interface IEmployeeShift {
	id: string;
	employee: IEmployee;
	shift: IBranchShift;
	context: IEmployeeShiftContext;
	shift_status: IEmployeeShiftStatus;
	date: string;
	created_at: string;
	created_by: IUser;
}

export interface IEmployeeShiftFormData {
	employee: number;
	shift: number;
	context: IEmployeeShiftContext;
	shift_status: IEmployeeShiftStatus;
	date: string;
}

export interface IBranchShift {
	id: number;
	branch: Branch;
	name: string;
	shift_day: IBranchDay | null;
	start_time: string;
	end_time: string;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export interface IBranchShiftFormData {
	branch: number;
	name: string;
	shift_day?: number | null;
	start_time: string;
	end_time: string;
	description?: string | null;
}

export type IPenaltyType =
	| "late_coming"
	| "early_leaving"
	| "absent"
	| "no_response_spotcheck"
	| "late_spotcheck_response";
export type IEmployeePenaltyStatus = "waived" | "applied";

export interface IEmployeePenalty {
	id: number;
	employee: IEmployee;
	attendance?: IAttendance;
	spot_check?: ISpotCheck | null;
	date: string;
	penalty_type: IPenaltyType;
	amount: string | number;
	notes: string | null;
	status: IEmployeePenaltyStatus;
	created_at: string;
	updated_at: string;
}

export interface IEmployeePenaltyFormData {
	employee: number;
	attendance?: number | null;
	spot_check?: number | null;
	date: string;
	penalty_type: IPenaltyType;
	amount: string | number;
	notes?: string | null;
	status?: IEmployeePenaltyStatus;
}

export interface ISpotCheckSetting {
	lower_threshold: number;
	upper_threshold: number;
	expires_after_minutes: number;
	late_starts_after_minutes: number;
}

export interface IInstitutionSpotCheckSetting extends ISpotCheckSetting {
	institution: IUserInstitution;
}

export interface IBranchSpotCheckSetting extends ISpotCheckSetting {
	branch: Branch;
}

export interface IEmployeeSpotCheckSetting extends ISpotCheckSetting {
	employee: IEmployee;
}

export interface IBranchSpotCheckSettingFormData extends ISpotCheckSetting {
	branch: number;
}

export interface IEmployeeSpotCheckSettingFormData extends ISpotCheckSetting {
	employee: number;
}

export interface IInstitutionSpotCheckSettingFormData extends ISpotCheckSetting {
	institution: number;
}

export type IProjectTaskStatus = "not_started" | "in_progress" | "completed" | "on_hold";
export type IProjectTaskPriority = "low" | "medium" | "high" | "urgent";

export interface ITaskTimeSheet {
	id: number;
	task: number;
	start_time: string | null;
	end_time: string | null;
	time_spent: string | null;
	notes: string;
	created_at: string;
	updated_at: string;
	created_by: number | null;
	updated_by: number | null;
}

export interface IProjectTask {
	id: number;
	project: number;
	task_name: string;
	description: string;
	managers: UserProfile[];
	assigned_to: UserProfile[];
	start_date: string;
	end_date: string;
	task_status: IProjectTaskStatus;
	priority: IProjectTaskPriority;
	task_time_sheet: ITaskTimeSheet;
}

export interface IProjectTaskFormData {
	project: number;
	task_name: string;
	description: string;
	managers: number[];
	assigned_to: number[];
	start_date: string;
	end_date: string;
	task_status?: IProjectTaskStatus;
	priority: IProjectTaskPriority;
}

export type IProjectStatus =
	| "not_started"
	| "in_progress"
	| "planning"
	| "on_hold"
	| "cancelled"
	| "completed";

export interface IProject {
	id: number;
	institution: number;
	project_name: string;
	managers: UserProfile[];
	assignees: UserProfile[];
	description: string;
	start_date: string;
	end_date: string;
	project_status: IProjectStatus;
	project_tasks: IProjectTask[];
}

export interface IProjectFormData {
	institution: number;
	project_name: string;
	managers: number[];
	assignees: number[];
	description: string;
	start_date: string;
	end_date: string;
	project_status?: IProjectStatus;
}

export type IDurationUnit = "days" | "months" | "years";

export interface IPeriod {
	id: number;
	institution: IUserInstitution;
	name: string;
	start_date: string;
	end_date: string;
	is_closed: boolean;
}

export interface IPeriodFormData {
	institution: number;
	name: string;
	start_date: string;
	end_date: string;
	is_closed?: boolean;
}

export type IObjectiveStatus = "not_started" | "on_track" | "closed" | "at_risk" | "behind";

export interface IObjective {
	id: number;
	institution: IUserInstitution;
	name: string;
	description: string;
	managers?: IEmployee | null;
	duration_unit: IDurationUnit;
	duration: string;
	date: string;
	key_result?: IKeyResult | null;
	assignees?: IEmployee[];
	self_employee_progress_update: boolean;
}

export interface IObjectiveFormData {
	institution: number;
	name: string;
	description: string;
	managers_id?: number;
	duration_unit: IDurationUnit;
	duration: string;
	key_result?: number;
	assignees_id?: number[];
	date: string;
	self_employee_progress_update?: boolean;
}

export interface IEmployeeObjective {
	id: number;
	employee: IEmployee;
	objective: IObjective;
	status: IObjectiveStatus;
	start_date: string;
	end_date: string;
	key_result?: IKeyResult | null;
}

export interface IEmployeeObjectiveFormData {
	employee: number;
	objective: number;
	status: IObjectiveStatus;
	start_date: string;
	end_date: string;
	key_result?: number;
}

export type IProgressType = "percentage" | "number";

export interface IKeyResult {
	id: number;
	institution: IUserInstitution;
	title: string;
	description: string;
	target_value: number;
	duration: string;
	progress_type: IProgressType;
}

export interface IKeyResultFormData {
	institution: number;
	title: string;
	description: string;
	target_value: number;
	duration: string;
	progress_type: IProgressType;
}

export interface IFeedback360 {
	id: number;
	given_by: IEmployee | null;
	reviewer: IEmployee | null;
	period?: IPeriod | null;
	feedback_text?: string | null;
	rating?: number | null;
	is_anonymous: boolean;
	submission_date: string;
	strengths?: string | null;
	areas_for_improvement?: string | null;
}

export interface IFeedback360FormData {
	reviewee_id: number | null;
	reviewer_id: number | null;
	period?: number;
	feedback_text?: string;
	rating?: number;
	is_anonymous?: boolean;
	submission_date?: string;
	strengths?: string;
	areas_for_improvement?: string;
}

export interface IEmployeeBonusPoint {
	id: number;
	employee: IEmployee;
	bonus_point_setting?: IBonusPointSettings | null;
	reason: string;
	date: string;
	period?: IPeriod | null;
	redeemed: boolean;
}

export interface IEmployeeBonusPointFormData {
	employee_id: number;
	bonus_point_setting?: number;
	reason: string;
	date?: string;
	period?: number;
	redeemed?: boolean;
}

export interface IBonusPointSettings {
	id: number;
	institution: IUserInstitution;
	object_id: number;
	content_type: number;
	content_object: any;
	applicable_for: IApplicableFor;
	bonus_for: IBonusFor;
	points: number;
	condition_field: "completion_date";
	condition_operator: IConditionOperator;
	condition_value: "end_date";
}

export interface IBonusPointSettingsFormData {
	institution: number;
	object_id: number;
	content_type: number;
	applicable_for: IApplicableFor;
	bonus_for: IBonusFor;
	points: number;
	condition_field: "completion_date";
	condition_operator: IConditionOperator;
	condition_value: "end_date";
}

export type CustomFieldType =
	| "text"
	| "date"
	| "select"
	| "checkbox"
	| "number"
	| "textarea"
	| "file";

export type IQuestionCategory = "interview" | "performance_review" | "360_feedback" | "general";

export type IQuestionType = "text" | "rating" | "multiple_choice" | "yes_no";

export interface CustomField {
	id: string;
	name: string;
	description: string;
	type: IQuestionType;
	value?: any;
	is_required?: boolean;
	options?: string[]; // For multiple_choice
}

export interface CustomFieldFormData {
	title: string;
	description: string;
	question_type: IQuestionType;
	options?: string[]; // For multiple_choice
}

export interface IQuestionTemplate {
	id: number;
	institution: IUserInstitution;
	name: string;
	description?: string | null;
	category: IQuestionCategory;
	questions: CustomField[];
}

export interface IQuestionTemplateFormData {
	institution: number;
	name: string;
	description?: string;
	category: IQuestionCategory;
	questions: CustomField[];
}

export type IApplicableFor = "managers" | "assignees";

export type IBonusFor = "completing" | "closing";

export type IConditionOperator = "=" | "<" | ">" | "<=" | ">=";

export type IEventMode = "physical" | "online" | "hybrid";

export interface IMeeting {
	id: number;
	institution: IUserInstitution;
	title: string;
	description?: string | null;
	start_time: string;
	end_time: string;
	mode: IEventMode;
	location?: string | null;
	online_link?: string | null;
	participants: IEmployee[];
	organizer?: IEmployee | null;
	agenda?: string | null;
	minutes?: string | null;
	is_recurring: boolean;
	recurrence_rule?: string | null;
	calendar_event_id?: string | null;
}

export interface IMeetingFormData {
	institution: number;
	title: string;
	description?: string;
	start_time: string;
	end_time: string;
	mode: IEventMode;
	location?: string;
	participant_ids: number[];
	organizer_id?: number;
	agenda?: string;
	minutes?: string;
	is_recurring?: boolean;
	recurrence_rule?: string;
	online_link?: string | null;
}

export interface IMeetingIntegrationFormData {
	is_active?: boolean;
	platform: "zoom" | "google_meet" | "microsoft_teams" | "other";
	api_key?: string;
	api_secret?: string;
	oauth_token?: string;
	oauth_refresh_token?: string;
	tenant_id?: string;
}

export interface IMeetingIntegration {
	id: number;
	is_active?: boolean;
	approval_status: "under_creation" | "pending_approval" | "approved" | "rejected";
	platform: "zoom" | "google_meet" | "microsoft_teams" | "other";
	api_key: string | null;
	api_secret: string | null;
	oauth_token: string | null;
	oauth_refresh_token: string | null;
	tenant_id: string | null;
	updated_at: string;
	institution: number;
}

export interface IEmailProviderConfigFormData {
	provider: "cpanel" | "google_workspace" | "microsoft_365";
	domain: string;
	format_template?: string;
	quota?: number;
	port?: string;
	admin_email?: string;
	api_url?: string;
	api_username?: string;
	api_password?: string;
	api_client_id?: string;
	api_client_secret?: string;
	api_token?: string;
}

export interface IEmailProviderConfig {
	id: number;
	approval_status: "under_creation" | "pending_approval" | "approved" | "rejected";
	provider: "cpanel" | "google_workspace" | "microsoft_365";
	domain: string;
	format_template: string;
	quota: number;
	port: string;
	admin_email: string | null;
	api_url: string | null;
	api_username: string | null;
	api_password: string | null;
	api_client_id: string | null;
	api_client_secret: string | null;
	api_token: string | null;
	updated_at: string;
	institution: number;
}

// Apply approvals to existing READ interfaces via declaration merging
export interface IAllowanceType extends IBaseApprovable {}
export interface IAsset extends IBaseApprovable {}
export interface IAssetAllocation extends IBaseApprovable {}
export interface IAssetCategory extends IBaseApprovable {}
export interface IAssetRequest extends IBaseApprovable {}
export interface IAssetReturn extends IBaseApprovable {}

export interface IBranchPenaltyConfig extends IBaseApprovable {}
export interface IBranchShift extends IBaseApprovable {}
export interface IBranchSpotCheckSetting extends IBaseApprovable {}
export interface IBranchWorkingDays extends IBaseApprovable {}

export interface ICalendar extends IBaseApprovable {}
export interface ICompany extends IBaseApprovable {}
export interface ICompanyBranch extends IBaseApprovable {}
export interface ICompanyDepartment extends IBaseApprovable {}
export interface ICompanyPosition extends IBaseApprovable {}

export interface IDeduction extends IBaseApprovable {}
export interface IDeductionType extends IBaseApprovable {}

export interface IEmployee extends IBaseApprovable {}
export interface IEmployeeAllowance extends IBaseApprovable {}
export interface IEmployeeContract extends IBaseApprovable {}
export interface IEmployeeDeduction extends IBaseApprovable {}
export interface IEmployeeDocument extends IBaseApprovable {}
export interface IEmployeeEmergencyContact extends IBaseApprovable {}
export interface IEmployeeLeave extends IBaseApprovable {}
export interface IEmployeeLeaveBalance extends IBaseApprovable {}
export interface IEmployeeOvertime extends IBaseApprovable {}
export interface IEmployeePenalty extends IBaseApprovable {}
export interface IEmployeeShift extends IBaseApprovable {}

export interface IHoliday extends IBaseApprovable {}

export interface ILeaveType extends IBaseApprovable {}
export interface ILoan extends IBaseApprovable {}
export interface ILoanType extends IBaseApprovable {}

export interface IOvertimeType extends IBaseApprovable {}

export interface IPayrollPeriod extends IBaseApprovable {}
export interface IPayrollPeriodEmployee extends IBaseApprovable {}
export interface IPenalty extends IBaseApprovable {}

export interface IRole extends IBaseApprovable {}

export interface IShift extends IBaseApprovable {}
export interface ISpotCheck extends IBaseApprovable {}

export interface ITimesheet extends IBaseApprovable {}
export interface ITimesheetEntry extends IBaseApprovable {}
export interface IJobPosition extends IBaseApprovable {}
export interface IDepartment extends IBaseApprovable {}
export interface JobPositionAdvert extends IBaseApprovable {}
export interface JobApplication extends IBaseApprovable {}
export interface ISeparationPolicy extends IBaseApprovable {}
export interface IProject extends IBaseApprovable {}
export interface IInterview extends IBaseApprovable {}
export interface ITermination extends IBaseApprovable {}
export interface IOnBoarding extends IBaseApprovable {}
export interface ITax extends IBaseApprovable {}
export interface IProjectTask extends IBaseApprovable {}

export interface IPeriod extends IBaseApprovable {}
export interface IObjective extends IBaseApprovable {}
export interface IEmployeeObjective extends IBaseApprovable {}
export interface IKeyResult extends IBaseApprovable {}
export interface IFeedback360 extends IBaseApprovable {}
export interface IEmployeeBonusPoint extends IBaseApprovable {}
export interface IQuestionTemplate extends IBaseApprovable {}
export interface IBonusPointSettings extends IBaseApprovable {}
export interface IMeeting extends IBaseApprovable {}
