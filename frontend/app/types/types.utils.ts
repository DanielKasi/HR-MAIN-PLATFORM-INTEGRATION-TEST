import { ReactNode } from "react";
import { IUser } from ".";

export enum CUSTOM_CODES {
  BLOCKED_BY_ADMIN = "BLOCKED_BY_ADMIN",
  SELF_CREATED_UNVERIFIED = "SELF_CREATED_UNVERIFIED",
  ADMIN_CREATED_UNVERIFIED = "ADMIN_CREATED_UNVERIFIED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  OTHER = "OTHER",
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
  CAN_DEACTIVATE_USERS = "can_deactivate_users",
  CAN_CREATE_USERS = "can_create_users",
  VIEW_USERS = "view_users",
  CAN_VIEW_STAFF_ROLES = "can_view_staff_roles",
  CAN_EDIT_STAFF_ROLES = "can_edit_staff_roles",
  CAN_EDIT_USER = "can_edit_user",

  // Administrative Tasks
  CAN_VIEW_ADMIN_DASHBOARD = "can_view_admin_dashboard",
  CAN_VIEW_GUIDE = "can_view_guide",
  CAN_VIEW_SETTINGS = "can_view_settings",
  CAN_VIEW_MODULES = "can_view_modules",
  CAN_CHANGE_THEME_COLOR = "can_change_theme_color",
  CAN_ADD_Institution_APPROVAL_STEPS = "can_add_Institution_approval_steps",
  CAN_EDIT_BRANCH = "can_edit_branch",
  CAN_DELETE_BRANCH = "can_delete_branch",
  CAN_ADD_BRANCH = "can_add_branch",
  CAN_VIEW_ADMIN_PAGE = "can_view_admin_page",
}








export interface CreateDepartmentData {
  name: string
  description: string
  company_id: number
  branch_id: number
}

export interface DepartmentFormData {
  name: string
  description: string,
  institution: number
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
  institution: number; // ForeignKey as ID
  institution_details?: IInstitution | null; // Embedded serializer
}

export interface IReportsToDetails {
  id: number;
  name: string;
  email: string;
  department: string; // Department name
}

export interface IJobPosition {
  id: number;
  name: string;
  description?: string | null;
  department: number; // ForeignKey as ID
  department_details?: IDepartment | null; // Embedded serializer
  reportsTo?: number | null; // ForeignKey as ID
  reportsToDetails?: IReportsToDetails | null; // SerializerMethodField
  contractTemplate?: string | null; // FileField serialized as URL
  offerLetterTemplate?: string | null; // FileField serialized as URL
  salary: number;
}



export interface JobPositionFormData {
  name: string
  description: string
  department: number | null
  reportsTo: number | null
  contractTemplate: File | null
  offerLetterTemplate: File | null
  salary: string
}

export interface CreateJobPositionData {
  name: string
  description?: string
  department: number
  reports_to?: number
  contract_template?: File
  offer_letter_template?: File
  salary: number
}


export interface JobApplication {
  job_position_advert_job_details: {name:string, description:string, job_posted_date:string};
  positions: number;
  id: number
  job_position_advert: number
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  resume: string
  cover_letter: string
  application_date: string
  status: "new" | "reviewed" | "shortlisted" | "rejected" | "passed"
  gender: "male" | "female"
  state: string
  address: string
  country: string
  source: "website" | "referral" | "job_board" | "social_media" | "other"
}

export interface JobApplicationFormData {
  job_position_advert: number
  applicant_name: string
  applicant_email: string
  applicant_phone?: string
  resume: File
  cover_letter?: File
  application_date?: string
  status?: "new" | "reviewed" | "shortlisted" | "rejected" | "passed"
  gender: "male" | "female"
  state?: string
  address: string
  country: string
  source?: "website" | "referral" | "job_board" | "social_media" | "other"
}

export type JobAdvertStatus = "expired" | "active" | "archived" | "closed";

export interface JobPositionAdvert {
  job_position_details: any;
  id: number;
  job_position: number; // Foreign key to JobPosition
  status: JobAdvertStatus;
  published_date: string; // ISO datetime string
  expiry_date: string; // ISO datetime string
  number_of_employees_expected?: number | null;
  extra_information?: string | null;
  applications:JobApplication[];
  interview_stages: JobApplication[]
}

// For creating/updating job adverts
export interface JobPositionAdvertFormData {
  job_position: number;
  status?: JobAdvertStatus;
  expiry_date: string; // ISO datetime string
  number_of_employees_expected?: number;
  extra_information?: string;
}


export interface IEmployee {
  id: number;
  user: IUser;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  position: number;
  department: number;
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  experience: number;
  qualifications?: string | null;
  skills?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship: string;
  marital_status: string;
  children_count?: number | null;
  employee_profile_picture?: string | null;
}

export interface IInterviewStageFormData {
  job_position_advert: number;
  name: string;
  level: number;
  interviewer: number;
}


export interface IInterviewStage{
  id: number;
  job_position_advert: number;
  name: string;
  level: number;
  interviewer: number;
  interviewer_details?: IEmployee;
  candidates_count: number;
}


export interface IInterview {
  id: number;
  job_position_application: number;
  job_position_application_details?: JobApplication | null;
  interview_stage: number;
  interview_stage_details?: IInterviewStage | null;
  interview_date: string;
  status: string;
  feedback?: string | null;
  rating?: number | null;
  location: string,
  interview_time: string,
  interview_type: string,
}

export interface User {
  email: string;
  fullname: string;
  password?: string;  
  roles_ids?: number[]; 
  permissions?: string;
}

export interface EmployeeFormData {
  user: User;
  id: number;
  email: string;
  phone_number: string;
  position: number;
  department: number;
  work_type: number;           // Added
  employee_type: number;       // Added
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  country: string;             // Added
  nin: string;                 // Added
  bank: string;                // Added
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
}

export interface EmployeeFormState {
  fullname: string;
  email: string;
  phone_number: string;
  position: number;
  department: number;
  work_type: number;           // Added
  employee_type: number;       // Added
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  country: string;             // Added
  nin: string;                 
  bank: string;                
  bank_account_number: string; 
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
}
export interface IRoleResponse {
  id: number
  name: string
  description: string
  institution: number
  permissions_details: string
}

// Interface for Department response
export interface IDepartmentResponse {
  id: number
  name: string
  description: string
  institution: number
  institution_details: {
    id: number
    institution_email: string
    institution_name: string
    first_phone_number: string
    second_phone_number: string
    institution_logo: string
    institution_owner_id: number
    theme_color: string
    location: string
    latitude: number
    longitude: number
    approval_status: string
    approval_status_display: string
    approval_date: string
    documents: any[]
  }
}

// Interface for Job Position response
export interface IJobPositionResponse {
  id: number
  name: string
  description: string
  department: number
  department_details: {
    id: number
    name: string
    description: string
    institution: number
    institution_details: any
  }
  reports_to: number
  reports_to_details: string
  contract_template: string
  offer_letter_template: string
  salary: string
  job_adverts: string
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
  application_name: JobApplication;
  id: number;
  application: number;
  attended: boolean;
  remarks: string | null;
  status: 'initial' | 'training' | 'issued_contract' | 'declined_offer' | 'accepted_offer';
  created_at: string;
  updated_at: string;
}

export interface IOnBoardingFormData {
  application?: number;
  attended?: boolean;
  remarks?: string;
  status?: 'initial' | 'training' | 'issued_contract' | 'declined_offer' | 'accepted_offer';
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
  created: IOnBoarding[]
  skipped: any[]
  summary: {
    created_count: number
    skipped_count: number
    total_requested: number
  }
}

export interface IInterviewFormData {
  job_position_application: number;
  interview_stage: number;
  interview_date: string;           
  feedback?: string;
  rating?: number;
  location: string,
  interview_time: string,
  interview_type: string,
  status: string;
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
  discipline_type: string 
  employee: string 
  reported_by: string 
  assigned_to: string 
  incident_date: string
  description: string
  evidence: string
  status: "pending" | "in_progress" | "completed" | "dismissed"
  action_taken: string
  resolution_date: string
  follow_up_required: boolean
  follow_up_date: string
  notes: string
}

export interface DisciplinaryActionRequest {
  discipline_type: number
  employee: number
  reported_by: number
  assigned_to: number
  incident_date: string // YYYY-MM-DD format
  description: string
  evidence: string
  status: "pending" | "in_progress" | "completed" | "dismissed"
  action_taken: string
  resolution_date: string // YYYY-MM-DD format
  follow_up_required: boolean
  follow_up_date: string // YYYY-MM-DD format
  notes: string
}


export interface DisciplinaryActionResponse extends DisciplinaryActionRequest {
  id: number
  created_at: string
  updated_at: string
}


export function convertFormToApiRequest(formData: DisciplinaryActionForm): DisciplinaryActionRequest {
  return {
    discipline_type: parseInt(formData.discipline_type),
    employee: parseInt(formData.employee),
    reported_by: parseInt(formData.reported_by),
    assigned_to: parseInt(formData.assigned_to),
    incident_date: formData.incident_date,
    description: formData.description,
    evidence: formData.evidence,
    status: formData.status,
    action_taken: formData.action_taken,
    resolution_date: formData.resolution_date,
    follow_up_required: formData.follow_up_required,
    follow_up_date: formData.follow_up_date,
    notes: formData.notes,
  }
}


export interface DisciplineType {
  id?: number
  name: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  is_active: boolean
  created_at?: string
}

export interface DisciplineTypeForm {
  name: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  is_active: boolean
}

export interface DisciplineTypeRequest {
  name: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  is_active: boolean
}

export interface DisciplineTypeResponse extends DisciplineTypeRequest {
  id: number
  created_at: string
  updated_at: string
}


export function convertDisciplineTypeFormToApiRequest(formData: DisciplineTypeForm): DisciplineTypeRequest {
  return {
    name: formData.name,
    description: formData.description,
    severity: formData.severity,
    is_active: formData.is_active,
  }
}

export interface DisciplinaryActionAPIResponse {
  id: number
  discipline_type: {
    id: number
    name: string
    description: string
    severity: "low" | "medium" | "high" | "critical"
    is_active: boolean
    created_at: string
  }
  employee: {
    id: number
    user: {
      id: number
      email: string
      fullname: string
      is_active: boolean
      is_email_verified: boolean
      is_password_verified: boolean
      is_staff: boolean
      roles: any[]
      branches: any[]
      permissions: any[]
    }
    email: string
    phone_number: string
    position: {
      id: number
      name: string
      department_id: number
    }
    department: {
      id: number
      name: string
      institution_id: number
    }
    roles: any[]
    date_of_birth: string | null
    date_of_joining: string
    address: string
    is_active: boolean
    created_at: string
    updated_at: string
    experience: number
    qualifications: string | null
    skills: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relationship: string | null
    marital_status: string
    children_count: number
    employee_profile_picture: string | null
  }
  reported_by: {
    id: number
    user: {
      id: number
      email: string
      fullname: string
      is_active: boolean
      is_email_verified: boolean
      is_password_verified: boolean
      is_staff: boolean
      roles: any[]
      branches: any[]
      permissions: any[]
    }
    email: string
    phone_number: string
    position: {
      id: number
      name: string
      department_id: number
    }
    department: {
      id: number
      name: string
      institution_id: number
    }
    roles: any[]
    date_of_birth: string | null
    date_of_joining: string
    address: string
    is_active: boolean
    created_at: string
    updated_at: string
    experience: number
    qualifications: string | null
    skills: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relationship: string | null
    marital_status: string
    children_count: number
    employee_profile_picture: string | null
  }
  assigned_to: {
    id: number
    user: {
      id: number
      email: string
      fullname: string
      is_active: boolean
      is_email_verified: boolean
      is_password_verified: boolean
      is_staff: boolean
      roles: any[]
      branches: any[]
      permissions: any[]
    }
    email: string
    phone_number: string
    position: {
      id: number
      name: string
      department_id: number
    }
    department: {
      id: number
      name: string
      institution_id: number
    }
    roles: any[]
    date_of_birth: string | null
    date_of_joining: string
    address: string
    is_active: boolean
    created_at: string
    updated_at: string
    experience: number
    qualifications: string | null
    skills: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relationship: string | null
    marital_status: string
    children_count: number
    employee_profile_picture: string | null
  } | null
  incident_date: string
  reported_date: string
  description: string
  evidence: string
  status: "pending" | "in_progress" | "completed" | "dismissed"
  action_taken: string
  resolution_date: string | null
  follow_up_required: boolean
  follow_up_date: string | null
  created_at: string
  updated_at: string
  notes: string
}

// Updated transform function to extract the names from nested objects
export const transformDisciplinaryActionData = (apiData: DisciplinaryActionAPIResponse[] | null) => {
  if (!apiData) return []
  
  return apiData.map(action => ({
    id: action.id.toString(),
    employee_name: action.employee.user.fullname,
    employee_department: action.employee.department.name,
    discipline_type: action.discipline_type.name,
    discipline_severity: action.discipline_type.severity,
    incident_date: action.incident_date,
    reported_date: action.reported_date,
    description: action.description,
    evidence: action.evidence,
    reported_by: action.reported_by.user.fullname,
    assigned_to: action.assigned_to ? action.assigned_to.user.fullname : 'Unassigned',
    status: action.status,
    action_taken: action.action_taken,
    resolution_date: action.resolution_date || '',
    follow_up_required: action.follow_up_required,
    follow_up_date: action.follow_up_date || '',
    notes: action.notes,
  }))
}