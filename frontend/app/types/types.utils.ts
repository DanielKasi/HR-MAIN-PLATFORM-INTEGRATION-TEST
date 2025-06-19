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
  id: number;
  job_position: number; // Foreign key to JobPosition
  status: JobAdvertStatus;
  published_date: string; // ISO datetime string
  expiry_date: string; // ISO datetime string
  number_of_employees_expected?: number | null;
  extra_information?: string | null;
}

// For creating/updating job adverts
export interface JobPositionAdvertFormData {
  job_position: number;
  status?: JobAdvertStatus;
  expiry_date: string; // ISO datetime string
  number_of_employees_expected?: number;
  extra_information?: string;
}
