import {ReactNode} from "react";
import {Branch, ICustomerProfile, IUser, IUserInstitution, Permission, Role, UserProfile} from ".";

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

export enum PURCHASE_ORDER_STATUS {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
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

  // Employee Management
  CAN_CREATE_EMPLOYEES = "can_create_employees",
  CAN_VIEW_EMPLOYEES = "can_view_employees",
  CAN_EDIT_EMPLOYEES = "can_edit_employees",
  CAN_DELETE_EMPLOYEES = "can_delete_employees",
  CAN_VIEW_EMPLOYEE_PERSONAL_DATA = "can_view_employee_personal_data",
  CAN_EDIT_EMPLOYEE_PERSONAL_DATA = "can_edit_employee_personal_data",
  CAN_VIEW_EMPLOYEE_SALARY_INFO = "can_view_employee_salary_info",
  CAN_TERMINATE_EMPLOYEES = "can_terminate_employees",

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
  CAN_VIEW_LEAVE_APPLICATIONS = "can_view_leave_applications",
  CAN_APPROVE_LEAVE_APPLICATIONS = "can_approve_leave_applications",
  CAN_REJECT_LEAVE_APPLICATIONS = "can_reject_leave_applications",
  CAN_MANAGE_LEAVE_TYPES = "can_manage_leave_types",
  CAN_VIEW_LEAVE_BALANCES = "can_view_leave_balances",
  CAN_ADJUST_LEAVE_BALANCES = "can_adjust_leave_balances",
  CAN_VIEW_LEAVE_REPORTS = "can_view_leave_reports",
  CAN_CANCEL_APPROVED_LEAVE = "can_cancel_approved_leave",

  // Payroll & Compensation
  CAN_VIEW_PAYROLL_DATA = "can_view_payroll_data",
  CAN_PROCESS_PAYROLL = "can_process_payroll",
  CAN_GENERATE_PAYSLIPS = "can_generate_payslips",
  CAN_MANAGE_ALLOWANCES = "can_manage_allowances",
  CAN_MANAGE_DEDUCTIONS = "can_manage_deductions",
  CAN_APPROVE_SALARY_CHANGES = "can_approve_salary_changes",
  CAN_VIEW_PAYROLL_REPORTS = "can_view_payroll_reports",
  CAN_MANAGE_COMPENSATION_POLICIES = "can_manage_compensation_policies",

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
  CAN_MANAGE_PAYROLL_PERIODS = "CAN_MANAGE_PAYROLL_PERIODS",
}

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
  job_positions?: {id: number; name: string; description: string; department_id: number}[];
}


export interface PaginatedEmployeeResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IEmployee[];
}

export interface IReportsToDetails {
  id: number;
  name: string;
  email: string;
  department: string; // Department name
}

// Interface for Job Position response
export interface IJobPositionResponse {
  id: number;
  name: string;
  description: string;
  department: number;
  department_details: {
    id: number;
    name: string;
    description: string;
    institution: number;
    institution_details: any;
  };
  reports_to: number;
  reports_to_details: string;
  contract_template: string;
  offer_letter_template: string;
  salary: string;
  job_adverts: string;
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
  tasks: ITask[];
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

export type JobAdvertTypes = "internal" | "external";

export interface JobPositionAdvert {
  data: any;
  job_position_details: any;
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

// For creating/updating job adverts
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
  first_name: any;
  last_name: any;
  id: number;
  user: IUser | null;
  email: string;
  phone_number: string;
  employee_id: string;
  position: {
    id: number;
    name: string;
    department_id: number;
  };
  department: IDepartment;
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  country: string;
  nin: string;
  nssf_no: string;
  tin: string;
  bank: string;
  bank_account_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  experience: number;
  qualifications: string;
  skills: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  marital_status: string;
  children_count: number;
  employee_profile_picture: string | null;
  employee_type: number | IEmployeeType;
  work_type: number | IWorkType;
  payroll_branch: Branch | null;
  gender: string;
  salary: string;
  roles: Role[];
}

export interface IPayrollItems {
  allowance: Record<string, IPayslipItem[]>;
  deduction: Record<string, IPayslipItem[]>;
}

export interface IPayslip {
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
  interview_type: string;
}

export interface User {
  email: string;
  fullname: string;
  password?: string;
  roles_ids?: number[];
  permissions?: string;
}

export interface EmployeeFormData {
  user: Partial<User>;
  id: number;
  email: string;
  phone_number: string;
  position: number;
  department: number;
  work_type: number; // Added
  employee_type: number; // Added
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  country: string; // Added
  nin: string;
  tin: string;
  nssf_no: string; // Added
  bank: string; // Added
  bank_account_number: string; // Added
  is_active: boolean;
  experience: number;
  qualifications: string;
  skills: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  marital_status: string;
  children_count: number;
  employee_profile_picture: File | null;
  selected_branches: number[];
}

export interface ICreateEmployeeForm {
  tin: string;
  nssf_no: string;
  fullname: string;
  email: string;
  phone_number: string;
  phone_number_country_code?:string;
  position: number;
  department: number;
  work_type: number; // Added
  employee_type: number; // Added
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  country: string; // Added
  nin: string;
  bank: string;
  bank_account_number: string;
  is_active: boolean;
  experience: number;
  qualifications: string;
  skills: string;
  selected_branches: number[]; // Added for multi-branch selection
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_phone_country_code?:string
  emergency_contact_relationship: string;
  marital_status: string;
  children_count: number;
}
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

// Interface for Job Position response
export interface IJobPositionResponse {
  id: number;
  name: string;
  description: string;
  department: number;
  department_details: {
    id: number;
    name: string;
    description: string;
    institution: number;
    institution_details: any;
  };
  reports_to: number;
  reports_to_details: string;
  contract_template: string;
  offer_letter_template: string;
  salary: string;
  job_adverts: string;
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

export interface IInterviewFormData {
  job_position_application: number;
  interview_stage: number;
  interview_date: string;
  feedback?: string | null;
  rating?: number | null;
  location: string;
  interview_time: string;
  interview_type: string;
  status: string;
  created_by: number;
}

export interface IWorkTypeFormData {
  name: string;
  code: string;
  description: string;
}

export interface IEmployeeTypeFormData {
  name: string;
  code: string;
  description: string;
}

// Response interfaces (what you get back from the API)
export interface IWorkType {
  id: number;
  name: string;
  code?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IEmployeeType {
  id: number;
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
    discipline_type: parseInt(formData.discipline_type),
    employee: parseInt(formData.employee),
    reported_by: parseInt(formData.reported_by),
    assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
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

export interface DisciplineType {
  id?: number;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  is_active: boolean;
  created_at?: string;
}

export interface DisciplineTypeForm {
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  is_active: boolean;
}

export interface DisciplineTypeRequest {
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  is_active: boolean;
}

export interface DisciplineTypeResponse extends DisciplineTypeRequest {
  id: number;
  created_at: string;
  updated_at: string;
}

export function convertDisciplineTypeFormToApiRequest(
  formData: DisciplineTypeForm,
): DisciplineTypeRequest {
  return {
    name: formData.name,
    description: formData.description,
    severity: formData.severity,
    is_active: formData.is_active,
  };
}

 export interface DisciplinaryAction {
  id: string;
  employee_name: string;
  employee_department: string;
  discipline_type: string;
  discipline_severity: "low" | "medium" | "high" | "critical";
  incident_date: string;
  reported_date: string;
  description: string;
  evidence: string;
  reported_by: string;
  assigned_to: string;
  status: "pending" | "in_progress" | "completed" | "dismissed";
  action_taken: string;
  resolution_date: string;
  follow_up_required: boolean;
  follow_up_date: string;
  notes: string;
}

export interface DisciplinaryActionAPIResponse {
  id: number;
  discipline_type: {
    id: number;
    name: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    is_active: boolean;
    created_at: string;
  };
  employee: {
    id: number;
    user: {
      id: number;
      email: string;
      fullname: string;
      is_active: boolean;
      is_email_verified: boolean;
      is_password_verified: boolean;
      is_staff: boolean;
      roles: any[];
      branches: any[];
      permissions: any[];
    };
    email: string;
    phone_number: string;
    position: {
      id: number;
      name: string;
      department_id: number;
    };
    department: {
      id: number;
      name: string;
      institution_id: number;
    };
    roles: any[];
    date_of_birth: string | null;
    date_of_joining: string;
    address: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    experience: number;
    qualifications: string | null;
    skills: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    marital_status: string;
    children_count: number;
    employee_profile_picture: string | null;
  };
  reported_by: {
    id: number;
    user: {
      id: number;
      email: string;
      fullname: string;
      is_active: boolean;
      is_email_verified: boolean;
      is_password_verified: boolean;
      is_staff: boolean;
      roles: any[];
      branches: any[];
      permissions: any[];
    };
    email: string;
    phone_number: string;
    position: {
      id: number;
      name: string;
      department_id: number;
    };
    department: {
      id: number;
      name: string;
      institution_id: number;
    };
    roles: any[];
    date_of_birth: string | null;
    date_of_joining: string;
    address: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    experience: number;
    qualifications: string | null;
    skills: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    marital_status: string;
    children_count: number;
    employee_profile_picture: string | null;
  };
  assigned_to: {
    id: number;
    user: {
      id: number;
      email: string;
      fullname: string;
      is_active: boolean;
      is_email_verified: boolean;
      is_password_verified: boolean;
      is_staff: boolean;
      roles: any[];
      branches: any[];
      permissions: any[];
    };
    email: string;
    phone_number: string;
    position: {
      id: number;
      name: string;
      department_id: number;
    };
    department: {
      id: number;
      name: string;
      institution_id: number;
    };
    roles: any[];
    date_of_birth: string | null;
    date_of_joining: string;
    address: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    experience: number;
    qualifications: string | null;
    skills: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    marital_status: string;
    children_count: number;
    employee_profile_picture: string | null;
  } | null;
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

export const transformDisciplinaryActionData = (
  apiData: DisciplinaryActionAPIResponse[] | null,
) => {
  if (!apiData) return [];

  return apiData.map((action) => {
    try {
      return {
        id: action.id.toString(),
        employee_name:
          action.employee?.user?.fullname || action.employee?.email || "Unknown Employee",
        employee_department: action.employee?.department?.name || "No Department",
        discipline_type: action.discipline_type?.name || "Unknown Type",
        discipline_severity: action.discipline_type?.severity || "low",
        incident_date: action.incident_date,
        reported_date: action.reported_date,
        description: action.description || "",
        evidence: action.evidence || "",
        reported_by:
          action.reported_by?.user?.fullname || action.reported_by?.email || "Unknown Reporter",
        assigned_to: action.assigned_to?.user?.fullname || "Unassigned",
        status: action.status,
        action_taken: action.action_taken || "",
        resolution_date: action.resolution_date || "",
        follow_up_required: action.follow_up_required || false,
        follow_up_date: action.follow_up_date || "",
        notes: action.notes || "",
      };
    } catch (error) {
      console.error("Error transforming disciplinary action:", action, error);
      // Return a safe fallback object
      return {
        id: action.id?.toString() || "unknown",
        employee_name: "Error loading employee",
        employee_department: "Unknown",
        discipline_type: "Unknown",
        discipline_severity: "low" as const,
        incident_date: action.incident_date || "",
        reported_date: action.reported_date || "",
        description: action.description || "",
        evidence: action.evidence || "",
        reported_by: "Unknown",
        assigned_to: "Unknown",
        status: action.status || "pending",
        action_taken: action.action_taken || "",
        resolution_date: action.resolution_date || "",
        follow_up_required: false,
        follow_up_date: "",
        notes: action.notes || "",
      };
    }
  });
};

export interface LeaveType {
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

export interface ILeaveType extends LeaveType {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export interface ILeaveBalance {
  id: number;
  employee:
    | number
    | {
        id: number;
        user: {
          id: number;
          fullname?: string;
          first_name?: string;
          last_name?: string;
        };
        employee_id: string;
      };
  leave_type:
    | number
    | {
        id: number;
        name: string;
      };
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

export interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  user?: {
    fullname: string;
    email: string;
  };
}

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
  basic_salary: string;
  total_allowances: string;
  total_deductions: string;
  gross_salary: string;
  net_salary: string;
  days_worked: number;
  is_paid: boolean;
  paid_date: string | null;
}

export interface IPayslipItem {
  id: number;
  payslip: IPayslip;
  item_type: "allowance" | "deduction" | "overtime";
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
  name: {common: string};
  cca2: string;
  idd?: {root?: string; suffixes?: string[]};
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
  institution_tax: number;
  calculation_type: string;
  percentage: string;
  fixed_amount: number;
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

export interface IAssetFormData {
  asset_name: string;
  serial_number: string;
  category: number;
  description?: string;
  status?: "available" | "allocated" | "maintenance" | "decommissioned";
}

export interface IAssetHistory {
  id: number;
  asset: number | IAsset;
  event_type:
    | "allocated"
    | "returned"
    | "maintenance"
    | "decommissioned"
    | "created"
    | "reassigned";
  performed_by: number | UserProfile;
  affected_user: number | UserProfile;
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

export interface IAssetAllocationWorkflow extends IAssetAllocation {
  workflow_status: string;
  current_step: number;
  total_steps: number;
  approval_tasks: IApprovalTask[];
}

export interface IApprovalTask {
  id: number;
  step: IApprovalStep;
  status: "not_started" | "pending" | "completed" | "rejected";
  comment: string | null;
  approved_by: any | null; // Profile details
  created_at: string;
  updated_at: string;
}

export interface IApprovalStep {
  id: number;
  step_name: string;
  level: number;
  roles: string[];
  roles_details: {
    name: string;
    id: number;
  }[];
  approvers: string[];
  approvers_details: {
    id: string;
    approver_user: {
      id: number;
      fullname: string;
      email: string;
    };
  }[];
  action: string;
  action_details: {
    id: number;
    code: string;
    label: string;
    category: {
      code: string;
      label: string;
    };
  };
}

export interface IAssetAllocationFormData {
  asset: number;
  allocated_to: number;
  responding_to_request?: number;
  allocation_status?: "pending" | "allocated" | "rejected" | "cancelled";
}

// export interface IAssetReturn {
//   id: number;
//   asset: IAsset;
//   returned_by: IEmployee;
//   returned_to: IEmployee;
//   return_date: string;
//   return_reason: string | null;
//   asset_condition: "good" | "fair" | "poor" | "damaged";
//   notes: string | null;
//   created_at: string;
//   updated_at: string;
// }

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

export interface IAssetAllocationWorkflow extends IAssetAllocation {
  workflow_status: string;
  current_step: number;
  total_steps: number;
  approval_tasks: IApprovalTask[];
}

export interface IApprovalTask {
  id: number;
  step: IApprovalStep;
  status: "not_started" | "pending" | "completed" | "rejected";
  comment: string | null;
  approved_by: any | null; // Profile details
  created_at: string;
  updated_at: string;
}

export interface IApprovalStep {
  id: number;
  step_name: string;
  level: number;
  roles: string[];
  roles_details: {
    name: string;
    id: number;
  }[];
  approvers: string[];
  approvers_details: {
    id: string;
    approver_user: {
      id: number;
      fullname: string;
      email: string;
    };
  }[];
  action: string;
  action_details: {
    id: number;
    code: string;
    label: string;
    category: {
      code: string;
      label: string;
    };
  };
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
  effective_to: string;
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

