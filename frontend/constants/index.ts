import { Approval } from "@/types/approvals.types";
import { IPenaltyType } from "@/types/types.utils";

export const MAIN_DOMAIN_URL = "https://peracosoft.com";
export const NOTIFICATIONS_STREAM_BASE_PATH = "/communication/notifications/sse/";

export const LEAVE_CATEGORIES: Array<{ value: string; label: string }> = [
	{ value: "annual", label: "Annual Leave" },
	{ value: "sick", label: "Sick Leave" },
	{ value: "maternity", label: "Maternity Leave" },
	{ value: "paternity", label: "Paternity Leave" },
	{ value: "compassionate", label: "Compassionate Leave" },
	{ value: "study", label: "Study Leave" },
	{ value: "unpaid", label: "Unpaid Leave" },
];

export const GENDER_CHOICES = [
	{ value: "all", label: "All" },
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
];

export const PENALTY_TYPES: { value: IPenaltyType; label: string }[] = [
	{ value: "late_coming", label: "Late Coming" },
	{ value: "early_leaving", label: "Early Checkout" },
	{ value: "absent", label: "Absent" },
	{ value: "no_response_spotcheck", label: "Not responding to a spotcheck" },
	{ value: "late_spotcheck_response", label: "Late spotcheck response" },
];

export enum CUSTOM_CODES {
	BLOCKED_BY_ADMIN = "BLOCKED_BY_ADMIN",
	SELF_CREATED_UNVERIFIED = "SELF_CREATED_UNVERIFIED",
	ADMIN_CREATED_UNVERIFIED = "ADMIN_CREATED_UNVERIFIED",
	INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
	OTHER = "OTHER",
}
export enum ALLOWANCE_FREQUENCIES {
	DAILY = "DAILY",
	WEEKLY = "WEEKLY",
	MONTHLY = "MONTHLY",
	QUARTERLY = "QUARTERLY",
}

export type CustomApiRequestError = {
	message: string;
	status: number;
	custom_code?: CUSTOM_CODES | null;
};

// Enum for Permission Codes
export enum PERMISSION_CODES {
	// POS Permissions
	can_access_gps = "can_access_gps",
	CAN_REMOVE_ITEM_FROM_CART_POS = "can_remove_item_from_cart_pos",
	CAN_HOLD_SALE = "can_hold_sale",

	// User Management
	CAN_CREATE_USERS = "can_create_users",
	CAN_VIEW_USERS = "can_view_users",
	CAN_EDIT_USERS = "can_edit_users",
	CAN_DEACTIVATE_USERS = "can_deactivate_users",
	CAN_DELETE_USERS = "can_delete_users",
	CAN_RESET_USER_PASSWORDS = "can_reset_user_passwords",
	CAN_VIEW_STAFF_ROLES = "can_view_staff_roles",
	CAN_EDIT_STAFF_ROLES = "can_edit_staff_roles",
	CAN_ASSIGN_USER_ROLES = "can_assign_user_roles",

	// AI Assistant
	CAN_VIEW_AI_ASSISTANT = "can_view_ai_assistant",

	// Employee Management
	CAN_CREATE_EMPLOYEES = "can_create_employees",
	CAN_VIEW_EMPLOYEES = "can_view_employees",
	CAN_EDIT_EMPLOYEES = "can_edit_employees",
	CAN_DELETE_EMPLOYEES = "can_delete_employees",
	CAN_VIEW_EMPLOYEE_PERSONAL_DATA = "can_view_employee_personal_data",
	CAN_EDIT_EMPLOYEE_PERSONAL_DATA = "can_edit_employee_personal_data",
	CAN_VIEW_EMPLOYEE_SALARY_INFO = "can_view_employee_salary_info",
	CAN_TERMINATE_EMPLOYEES = "can_terminate_employees",
	CAN_EXPORT_EMPLOYEES = "can_export_employees_to_excel",

	// Recruitment & Selection
	CAN_CREATE_JOB_POSITIONS = "can_create_job_positions",
	CAN_VIEW_JOB_POSITIONS = "can_view_job_positions",
	CAN_EDIT_JOB_POSITIONS = "can_edit_job_positions",
	CAN_DELETE_JOB_POSITIONS = "can_delete_job_positions",
	CAN_CREATE_JOB_ADVERTS = "can_create_job_adverts",
	CAN_VIEW_JOB_ADVERTS = "can_view_job_adverts",
	CAN_EDIT_JOB_ADVERTS = "can_edit_job_adverts",
	CAN_DELETE_JOB_ADVERTS = "can_delete_job_adverts",
	CAN_PUBLISH_JOB_ADVERTS = "can_publish_job_adverts",
	CAN_VIEW_JOB_APPLICATIONS = "can_view_job_applications",
	CAN_SHORTLIST_CANDIDATES = "can_shortlist_candidates",
	CAN_SCHEDULE_INTERVIEWS = "can_schedule_interviews",
	CAN_VIEW_INTERVIEWS = "can_view_interviews",
	CAN_CONDUCT_INTERVIEWS = "can_conduct_interviews",
	CAN_MAKE_JOB_OFFERS = "can_make_job_offers",
	CAN_PERFORM_GAP_ANALYSIS = "can_perform_gap_analysis",
	CAN_MANAGE_RECRUITMENT_PIPELINE = "can_manage_recruitment_pipeline",

	// Performance Management
	CAN_VIEW_PERFORMANCE_DATA = "can_view_performance_data",
	CAN_CONDUCT_APPRAISALS = "can_conduct_appraisals",
	CAN_SET_PERFORMANCE_GOALS = "can_set_performance_goals",
	CAN_APPROVE_APPRAISALS = "can_approve_appraisals",
	CAN_VIEW_PERFORMANCE_REPORTS = "can_view_performance_reports",
	CAN_MANAGE_PERFORMANCE_CYCLES = "can_manage_performance_cycles",
	CAN_CREATE_PERFORMANCE_POLICIES = "can_create_performance_policies",

	// Training & Development
	CAN_VIEW_TRAINING_PROGRAMS = "can_view_training_programs",
	CAN_CREATE_TRAINING_PROGRAMS = "can_create_training_programs",
	CAN_ENROLL_EMPLOYEES_TRAINING = "can_enroll_employees_training",
	CAN_APPROVE_TRAINING_REQUESTS = "can_approve_training_requests",
	CAN_MANAGE_TRAINING_BUDGET = "can_manage_training_budget",
	CAN_CONDUCT_TRAINING_NEEDS_ASSESSMENT = "can_conduct_training_needs_assessment",
	CAN_VIEW_TRAINING_REPORTS = "can_view_training_reports",

	// Leave Management
	CAN_CREATE_LEAVE_APPLICATIONS = "can_create_leave_applications",
	CAN_VIEW_LEAVE_APPLICATIONS = "can_view_leave_applications",
	CAN_EDIT_LEAVE_APPLICATIONS = "can_edit_leave_applications",
	CAN_DELETE_LEAVE_APPLICATIONS = "can_delete_leave_applications",
	CAN_APPROVE_LEAVE_APPLICATIONS = "can_approve_leave_applications",
	CAN_REJECT_LEAVE_APPLICATIONS = "can_reject_leave_applications",
	CAN_MANAGE_LEAVE_TYPES = "can_manage_leave_types",
	CAN_CREATE_LEAVE_BALANCES = "can_create_leave_balances",
	CAN_VIEW_LEAVE_BALANCES = "can_view_leave_balances",
	CAN_EDIT_LEAVE_BALANCES = "can_edit_leave_balances",
	CAN_DELETE_LEAVE_BALANCES = "can_delete_leave_balances",
	CAN_ADJUST_LEAVE_BALANCES = "can_adjust_leave_balances",
	CAN_VIEW_LEAVE_REPORTS = "can_view_leave_reports",
	CAN_CANCEL_APPROVED_LEAVE = "can_cancel_approved_leave",
	CAN_CREATE_LEAVE_POLICIES = "can_create_leave_policies",
	CAN_VIEW_LEAVE_POLICIES = "can_view_leave_policies",
	CAN_EDIT_LEAVE_POLICIES = "can_edit_leave_policies",
	CAN_DELETE_LEAVE_POLICIES = "can_delete_leave_policies",

	// Payroll & Compensation
	CAN_VIEW_PAYROLL_DATA = "can_view_payroll_data",
	CAN_PROCESS_PAYROLL = "can_process_payroll",
	CAN_GENERATE_PAYSLIPS = "can_generate_payslips",
	CAN_MANAGE_ALLOWANCES = "can_manage_allowances",
	CAN_VIEW_ALLOWANCE_TYPES = "can_view_allowance_types",
	CAN_CREATE_ALLOWANCE_TYPES = "can_create_allowance_types",
	CAN_EDIT_ALLOWANCE_TYPES = "can_edit_allowance_types",
	CAN_DELETE_ALLOWANCE_TYPES = "can_delete_allowance_types",
	CAN_VIEW_DEDUCTION_TYPES = "can_view_deduction_types",
	CAN_CREATE_DEDUCTION_TYPES = "can_create_deduction_types",
	CAN_EDIT_DEDUCTION_TYPES = "can_edit_deduction_types",
	CAN_DELETE_DEDUCTION_TYPES = "can_delete_deduction_types",
	CAN_VIEW_EMPLOYEE_DEDUCTIONS = "can_view_employee_deductions",
	CAN_CREATE_EMPLOYEE_DEDUCTIONS = "can_create_employee_deductions",
	CAN_EDIT_EMPLOYEE_DEDUCTIONS = "can_edit_employee_deductions",
	CAN_DELETE_EMPLOYEE_DEDUCTIONS = "can_delete_employee_deductions",
	CAN_VIEW_EMPLOYEE_TAX = "can_view_employee_tax",
	CAN_CREATE_EMPLOYEE_TAX = "can_create_employee_tax",
	CAN_EDIT_EMPLOYEE_TAX = "can_edit_employee_tax",
	CAN_DELETE_EMPLOYEE_TAX = "can_delete_employee_tax",
	CAN_VIEW_EMPLOYEE_ALLOWANCES = "can_view_employee_allowances",
	CAN_CREATE_EMPLOYEE_ALLOWANCES = "can_create_employee_allowances",
	CAN_EDIT_EMPLOYEE_ALLOWANCES = "can_edit_employee_allowances",
	CAN_DELETE_EMPLOYEE_ALLOWANCES = "can_delete_employee_allowances",
	CAN_VIEW_PAYROLL_PERIODS = "can_view_payroll_periods",
	CAN_CREATE_PAYROLL_PERIODS = "can_create_payroll_periods",
	CAN_EDIT_PAYROLL_PERIODS = "can_edit_payroll_periods",
	CAN_DELETE_PAYROLL_PERIODS = "can_delete_payroll_periods",
	CAN_MANAGE_DEDUCTIONS = "can_manage_deductions",
	CAN_APPROVE_SALARY_CHANGES = "can_approve_salary_changes",
	CAN_VIEW_PAYROLL_REPORTS = "can_view_payroll_reports",
	CAN_MANAGE_COMPENSATION_POLICIES = "can_manage_compensation_policies",
	CAN_DOWNLOAD_PAYSLIPS = "can_download_payslips",

	// Discipline Management
	CAN_VIEW_DISCIPLINE_CASES = "can_view_discipline_cases",
	CAN_CREATE_DISCIPLINE_CASES = "can_create_discipline_cases",
	CAN_EDIT_DISCIPLINE_CASES = "can_edit_discipline_cases",
	CAN_DELETE_DISCIPLINE_CASES = "can_delete_discipline_cases",
	CAN_INVESTIGATE_DISCIPLINE_CASES = "can_investigate_discipline_cases",
	CAN_APPROVE_DISCIPLINARY_ACTIONS = "can_approve_disciplinary_actions",
	CAN_MANAGE_DISCIPLINARY_COMMITTEE = "can_manage_disciplinary_committee",
	CAN_LODGE_DISCIPLINARY_COMPLAINTS = "can_lodge_disciplinary_complaints",

	// Attendance Management
	CAN_VIEW_ATTENDANCE_RECORDS = "can_view_attendance_records",
	CAN_EDIT_ATTENDANCE_RECORDS = "can_edit_attendance_records",
	CAN_APPROVE_ATTENDANCE_CORRECTIONS = "can_approve_attendance_corrections",
	CAN_VIEW_ATTENDANCE_REPORTS = "can_view_attendance_reports",
	CAN_MANAGE_ATTENDANCE_POLICIES = "can_manage_attendance_policies",

	// Administration
	CAN_MANAGE_COMPANY_ASSETS = "can_manage_company_assets",
	CAN_MANAGE_TRAVEL_REQUESTS = "can_manage_travel_requests",
	CAN_APPROVE_TRAVEL_REQUESTS = "can_approve_travel_requests",
	CAN_MANAGE_DRIVER_SCHEDULES = "can_manage_driver_schedules",
	CAN_MANAGE_VISITOR_ACCESS = "can_manage_visitor_access",
	CAN_MANAGE_WELFARE_SERVICES = "can_manage_welfare_services",
	CAN_MANAGE_HEALTH_SAFETY = "can_manage_health_safety",
	CAN_LODGE_WELLNESS_COMPLAINTS = "can_lodge_wellness_complaints",
	CAN_MANAGE_MAINTENANCE_SCHEDULES = "can_manage_maintenance_schedules",

	// Policy Management
	CAN_CREATE_POLICIES = "can_create_policies",
	CAN_EDIT_POLICIES = "can_edit_policies",
	CAN_APPROVE_POLICIES = "can_approve_policies",
	CAN_PUBLISH_POLICIES = "can_publish_policies",
	CAN_ARCHIVE_POLICIES = "can_archive_policies",
	CAN_TRACK_POLICY_ACKNOWLEDGMENTS = "can_track_policy_acknowledgments",

	// Leadership & Culture
	CAN_MANAGE_COMPANY_VISION = "can_manage_company_vision",
	CAN_MANAGE_CORE_VALUES = "can_manage_core_values",
	CAN_MANAGE_LEADERSHIP_PROGRAMS = "can_manage_leadership_programs",
	CAN_ASSESS_LEADERSHIP_GAPS = "can_assess_leadership_gaps",
	CAN_MANAGE_CULTURAL_ACTIVITIES = "can_manage_cultural_activities",

	// Reports & Analytics
	CAN_VIEW_HR_DASHBOARD = "can_view_hr_dashboard",
	CAN_GENERATE_HR_REPORTS = "can_generate_hr_reports",
	CAN_VIEW_QUALITY_METRICS = "can_view_quality_metrics",
	CAN_EXPORT_HR_DATA = "can_export_hr_data",
	CAN_VIEW_COMPLIANCE_REPORTS = "can_view_compliance_reports",
	CAN_VIEW_EMPLOYEE_STATISTICS = "can_view_employee_statistics",

	// System Administration
	CAN_VIEW_ADMIN_DASHBOARD = "can_view_admin_dashboard",
	CAN_VIEW_ADMIN_PAGE = "can_view_admin_page",
	CAN_VIEW_SETTINGS = "can_view_settings",
	CAN_EDIT_SETTINGS = "can_edit_settings",
	CAN_VIEW_MODULES = "can_view_modules",
	CAN_MANAGE_MODULES = "can_manage_modules",
	CAN_CHANGE_THEME_COLOR = "can_change_theme_color",
	CAN_VIEW_GUIDE = "can_view_guide",
	CAN_MANAGE_APPROVAL_WORKFLOWS = "can_manage_approval_workflows",
	CAN_BACKUP_SYSTEM = "can_backup_system",
	CAN_RESTORE_SYSTEM = "can_restore_system",
	CAN_ADD_Institution_APPROVAL_STEPS = "can_add_institution_approval_steps",

	// Branch Management
	CAN_VIEW_BRANCHES = "can_view_branches",
	CAN_ADD_BRANCH = "can_add_branch",
	CAN_EDIT_BRANCH = "can_edit_branch",
	CAN_DELETE_BRANCH = "can_delete_branch",
	CAN_MANAGE_BRANCH_EMPLOYEES = "can_manage_branch_employees",

	// Department Management
	CAN_VIEW_DEPARTMENTS = "can_view_departments",
	CAN_CREATE_DEPARTMENTS = "can_create_departments",
	CAN_EDIT_DEPARTMENTS = "can_edit_departments",
	CAN_DELETE_DEPARTMENTS = "can_delete_departments",
	CAN_MANAGE_DEPARTMENT_HEADS = "can_manage_department_heads",

	// Document Management
	CAN_CREATE_DOCUMENT_TYPES = "can_create_document_types",
	CAN_VIEW_DOCUMENT_TYPES = "can_view_document_types",
	CAN_EDIT_DOCUMENT_TYPES = "can_edit_document_types",
	CAN_DELETE_DOCUMENT_TYPES = "can_delete_document_types",

	CAN_CREATE_DOCUMENT_TEMPLATES = "can_create_document_templates",
	CAN_VIEW_DOCUMENT_TEMPLATES = "can_view_document_templates",
	CAN_EDIT_DOCUMENT_TEMPLATES = "can_edit_document_templates",
	CAN_DELETE_DOCUMENT_TEMPLATES = "can_delete_document_templates",

	CAN_UPLOAD_DOCUMENTS = "can_upload_documents",
	CAN_VIEW_DOCUMENTS = "can_view_documents",
	CAN_EDIT_DOCUMENTS = "can_edit_documents",
	CAN_DELETE_DOCUMENTS = "can_delete_documents",
	CAN_APPROVE_DOCUMENTS = "can_approve_documents",
	CAN_ARCHIVE_DOCUMENTS = "can_archive_documents",

	// Project Management
	CAN_CREATE_PROJECTS = "can_create_projects",
	CAN_VIEW_PROJECTS = "can_view_projects",
	CAN_EDIT_PROJECTS = "can_edit_projects",
	CAN_DELETE_PROJECTS = "can_delete_projects",
	CAN_CREATE_TASKS = "can_create_tasks",
	CAN_VIEW_TASKS = "can_view_tasks",
	CAN_EDIT_TASKS = "can_edit_tasks",
	CAN_DELETE_TASKS = "can_delete_tasks",
	CAN_START_TASKS = "can_start_tasks",
	CAN_COMPLETE_TASKS = "can_complete_tasks",
	CAN_ASSIGN_TASKS = "can_assign_tasks",
	CAN_MANAGE_PAYROLL_PERIODS = "CAN_MANAGE_PAYROLL_PERIODS",

	//assets management
	CAN_CREATE_ASSET_CATEGORIES = "can_create_asset_categories",
	CAN_VIEW_ASSET_CATEGORIES = "can_view_asset_categories",
	CAN_EDIT_ASSET_CATEGORIES = "can_edit_asset_categories",
	CAN_DELETE_ASSET_CATEGORIES = "can_delete_asset_categories",
	CAN_CREATE_ASSETS = "can_create_assets",
	CAN_VIEW_ASSETS = "can_view_assets",
	CAN_EDIT_ASSETS = "can_edit_assets",
	CAN_DELETE_ASSETS = "can_delete_assets",
	CAN_REQUEST_ASSETS = "can_request_assets",
	CAN_VIEW_ASSET_REQUESTS = "can_view_asset_requests",
	CAN_EDIT_ASSET_REQUESTS = "can_edit_asset_requests",
	CAN_DELETE_ASSET_REQUESTS = "can_delete_asset_requests",
	CAN_APPROVE_ASSET_REQUESTS = "can_approve_asset_requests",
	CAN_CANCEL_ASSET_REQUESTS = "can_cancel_asset_requests",
	CAN_ALLOCATE_ASSETS = "can_allocate_assets",
	CAN_VIEW_ASSET_ALLOCATIONS = "can_view_asset_allocations",
	CAN_EDIT_ASSET_ALLOCATIONS = "can_edit_asset_allocations",
	CAN_DELETE_ASSET_ALLOCATIONS = "can_delete_asset_allocations",
	CAN_APPROVE_ASSET_ALLOCATIONS = "can_approve_asset_allocations",
	CAN_CANCEL_ASSET_ALLOCATIONS = "can_cancel_asset_allocations",
	CAN_RETURN_ASSETS = "can_return_assets",
	CAN_VIEW_ASSET_RETURNS = "can_view_asset_returns",
	CAN_EDIT_ASSET_RETURNS = "can_edit_asset_returns",
	CAN_DELETE_ASSET_RETURNS = "can_delete_asset_returns",
	CAN_VIEW_ASSET_HISTORY = "can_view_asset_history",
	CAN_VIEW_ASSET_STATUSES = "can_view_asset_statuses",
	CAN_VIEW_ASSET_WORKFLOWS = "can_view_asset_workflows",

	//onboarding & offboarding management
	CAN_CREATE_ONBOARDING_RECORDS = "can_create_onboarding_records",
	CAN_VIEW_ONBOARDING_RECORDS = "can_view_onboarding_records",
	CAN_EDIT_ONBOARDING_RECORDS = "can_edit_onboarding_records",
	CAN_DELETE_ONBOARDING_RECORDS = "can_delete_onboarding_records",
	CAN_CREATE_OFFBOARDING_STAGES = "can_create_offboarding_stages",
	CAN_VIEW_OFFBOARDING_STAGES = "can_view_offboarding_stages",
	CAN_EDIT_OFFBOARDING_STAGES = "can_edit_offboarding_stages",
	CAN_DELETE_OFFBOARDING_STAGES = "can_delete_offboarding_stages",
	CAN_CREATE_SEPARATION_TYPES = "can_create_separation_types",
	CAN_VIEW_SEPARATION_TYPES = "can_view_separation_types",
	CAN_EDIT_SEPARATION_TYPES = "can_edit_separation_types",
	CAN_DELETE_SEPARATION_TYPES = "can_delete_separation_types",
	CAN_CREATE_SEPARATION_POLICIES = "can_create_separation_policies",
	CAN_VIEW_SEPARATION_POLICIES = "can_view_separation_policies",
	CAN_EDIT_SEPARATION_POLICIES = "can_edit_separation_policies",
	CAN_DELETE_SEPARATION_POLICIES = "can_delete_separation_policies",
	CAN_CREATE_RESIGNATION_REQUESTS = "can_create_resignation_requests",
	CAN_VIEW_RESIGNATION_REQUESTS = "can_view_resignation_requests",
	CAN_EDIT_RESIGNATION_REQUESTS = "can_edit_resignation_requests",
	CAN_DELETE_RESIGNATION_REQUESTS = "can_delete_resignation_requests",
	CAN_VIEW_OWN_RESIGNATION_REQUESTS = "can_view_own_resignation_requests",
	CAN_CREATE_TERMINATION_INITIATIONS = "can_create_termination_initiations",
	CAN_VIEW_TERMINATION_INITIATIONS = "can_view_termination_initiations",
	CAN_EDIT_TERMINATION_INITIATIONS = "can_edit_termination_initiations",
	CAN_DELETE_TERMINATION_INITIATIONS = "can_delete_termination_initiations",
	CAN_CREATE_RETIREMENT_REQUESTS = "can_create_retirement_requests",
	CAN_VIEW_RETIREMENT_REQUESTS = "can_view_retirement_requests",
	CAN_EDIT_RETIREMENT_REQUESTS = "can_edit_retirement_requests",
	CAN_DELETE_RETIREMENT_REQUESTS = "can_delete_retirement_requests",

	//penalties management
	CAN_CREATE_PENALTIES = "can_create_penalties",
	CAN_VIEW_PENALTIES = "can_view_penalties",
	CAN_EDIT_PENALTIES = "can_edit_penalties",
	CAN_DELETE_PENALTIES = "can_delete_penalties",
}
