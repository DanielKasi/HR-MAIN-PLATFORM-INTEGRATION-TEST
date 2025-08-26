export type JobAdvertStatus =
  | "expired"
  | "active"
  | "archived"
  | "closed"
  | "inactive"
  | "pending_approval";

export type JobAdvertTypes = "internal" | "external" | "both";


export interface JobApplication {
  scheduled_by: number | null;
  application: number | null;
  shortlisted_by: number | null;
  reviewed_by: number | null;
  reviewed_by_details: IUserInstitution | null;
  shortlisted_by_details: IUserInstitution | null;
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
  resume: File | null;
  cover_letter?: File | null;
  application_date: string;
  status: "new" | "reviewed" | "shortlisted" | "rejected" | "passed";
  gender: "male" | "female";
  state: string;
  address: string;
  country: string;
  source: "website" | "referral" | "job_board" | "social_media" | "head_hunt" | "other";
  created_by: number;
}

export interface IPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


export interface JobPositionAdvert {
  data: Record<string, unknown>;
  job_position_details: IJobPosition;
  id: number;
  institution: IInstitution
  job_position: number; // Foreign key to JobPosition
  job_position_advert_status: JobAdvertStatus;
  published_date: string; // ISO datetime string
  expiry_date: string; // ISO datetime string
  number_of_employees_expected?: number | null;
  extra_information?: string | null;
  applications: JobApplication[];
  interview_stages: InterviewStage[]; // Updated to use proper type
  advert_type: JobAdvertTypes;
}

export interface IInstitution {
  id: number;
  name:string;
}


// Interview Stage Types
export interface InterviewStage {
  id: number;
  candidates: Candidate[];
  candidates_count: number;
  feedback_fields: FeedbackField[] | null;
  interviewers: number[]; // Array of interviewer IDs
  interviews_details: InterviewerDetail[];
  job_position_advert: number; // ID of the job position advert
  level: number;
  name: string;
}

// Candidate Types
export interface Candidate {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: CandidateStatus;
  application_date: string;
  resume_url?: string;
  cover_letter_url?: string;
  interview_scheduled?: boolean;
  interview_date?: string;
  feedback?: string;
  score?: number;
  notes?: string;
}

export type CandidateStatus = 
  | "pending"
  | "scheduled"
  | "completed"
  | "passed"
  | "failed"
  | "cancelled"
  | "no_show";

// Interviewer Types
export interface InterviewerDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: IDepartment[];
  phone?: string;
  avatar_url?: string;
  expertise_areas?: string[];
  availability?: InterviewerAvailability[];
}

export interface InterviewerAvailability {
  day: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

// Feedback Field Types
export interface FeedbackField {
  id: number;
  name: string;
  type: FeedbackFieldType;
  required: boolean;
  options?: string[]; // For select/radio fields
  min_value?: number; // For numeric fields
  max_value?: number; // For numeric fields
  placeholder?: string;
  description?: string;
  weight?: number; // For scoring fields
}

export type FeedbackFieldType = 
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "rating"
  | "date";

// Interview Types
export interface Interview {
  id: number;
  candidate: Candidate;
  interviewer: InterviewerDetail;
  stage: InterviewStage;
  scheduled_date: string;
  duration_minutes: number;
  status: InterviewStatus;
  location?: string;
  meeting_link?: string;
  notes?: string;
  feedback?: InterviewFeedback[];
  result?: InterviewResult;
}

export type InterviewStatus = 
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

export interface InterviewFeedback {
  field_id: number;
  field_name: string;
  value: string | number | boolean;
  notes?: string;
  score?: number;
}

export interface InterviewResult {
  overall_score: number;
  decision: "pass" | "fail" | "conditional_pass" | "needs_improvement";
  strengths: string[];
  areas_for_improvement: string[];
  recommendations: string[];
  next_steps: string[];
}

// Job Position Advert Reference
export interface JobPositionAdvertReference {
  id: number;
  title: string;
  department: string;
  status: string;
  published_date: string;
  expiry_date: string;
}

// Updated Interview_stages interface (keeping for backward compatibility)
export interface Interview_stages {
  id: number;
  candidates: Candidate[];
  candidates_count: number;
  feedback_fields: FeedbackField[] | null;
  interviewers: number[];
  interviews_details: InterviewerDetail[];
  job_position_advert: number;
  level: number;
  name: string;
}


export interface IJobPosition {
  job_adverts: JobPositionAdvert[];
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
  job_position_status: "active" | "inactive";
}


export interface IDepartment {
  id: number;
  name: string;
  description?: string | null;
  institution: number; 
  institution_details?: IUserInstitution | null; 
  job_positions?: {id: number; name: string; description: string; department_id: number}[];
}

export interface IUserInstitution {
  id: number;
  institution_email: string,
  approval_date?: string | null,
  approval_status: string,
  approval_status_display: string,
  institution_owner_id: number;
  institution_name: string;
  institution_logo: string | null;
  theme_color: null | string;
  branches?: Branch[];
  first_phone_number: string;
  second_phone_number: string;
  latitude: number,
  longitude: number,
  location: string
}

export interface Branch {
  id: number;
  institution: number;
  branch_name: string;
  branch_phone_number?: string;
  branch_location: string;
  branch_longitude: string;
  branch_latitude: string;
  branch_email?: string;
  branch_opening_time?: string;
  branch_closing_time?: string;
}


export interface IReportsToDetails {
  id: number;
  name: string;
  email: string;
  department: string; // Department name
}






