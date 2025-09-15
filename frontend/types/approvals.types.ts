
import { Role, UserProfile } from ".";


export interface ApproverGroup {
  id: number;
  institution: number;
  institution_name?: string;
  name: string;
  description?: string;
  public_uuid: string;
  users_display: UserProfile[];
  roles_display: Role[];
}

export interface ApproverGroupFormData {
  institution: number
  name: string
  description?: string
  users: number[]
  roles: number[]
}

export interface ApprovalDocumentLevelApprover {
  id: number;
  approver_group: ApproverGroup;
}

export interface ApprovalDocumentLevelOverrider {
  id: number;
  approver_group: ApproverGroup;
}

export interface ApprovalDocumentLevel {
  id: number;
  level: number;
  name: string | null;
  description: string;
  public_uuid: string;
  approvers_detail: ApprovalDocumentLevelApprover[];
  overriders_detail: ApprovalDocumentLevelOverrider[];
  approval_document: number
}

export interface ApprovalDocumentLevelFormData {
  name: string | null;
  description: string;
  approvers: number[];
  overriders: number[];
  approval_document: number
}

export interface ApprovalDocument {
  id: number;
  institution: number;
  institution_name?: string;
  public_uuid: string;
  description: string | null;
  content_type: number
  content_type_name: string; // ContentType id
  actions: Action[];
  levels: ApprovalDocumentLevel[];
}

export interface ApprovalDocumentFormData {
  institution: number;
  description: string | null;
  content_type: number; // ContentType id
  actions: number[];
}

export type ApprovalStatus = "ongoing" | "rejected" | "completed";

export type ApprovalTaskType = "incoming" | "outgoing" | "all" | "open" | "critical" | "expired";

export type ApprovalTaskStatus =
  | "not_started"
  | "pending"
  | "rejected"
  | "approved"
  | "terminated";

export type ApprovalTaskContentObject = {
  content_type:{
    app_label:string,
    model:string
  },
  object_id:number
}

export interface ApprovalTask {
  id: number;
  status: ApprovalTaskStatus;
  comment: string | null;
  approved_by: number | null; // users.CustomUser id
  approved_by_fullname?: string | null;
  updated_at: string;
  level: ApprovalDocumentLevel;
  content_object:ApprovalTaskContentObject
}


export interface Action {
  id: number;
  name: string;
  code: string;
  description: string | null;
  public_uuid: string;
}

export interface Approval {
  id: number;
  public_id: string;
  status: ApprovalStatus;
  document: ApprovalDocument;
  action: Action;
  content_type: number;
  object_id: number;
  tasks: ApprovalTask[];
}


export type ApprovableEntityStatus =
  | "under_creation"
  | "under_update"
  | "under_deletion"
  | "active";

export interface IBaseApprovable {
  approval_status?: ApprovableEntityStatus;
  approvals?: Approval[];
}

export interface ContentTypeLite {
  id: number;
  app_label: string;
  model: string;
  name: string;
  plural_name: string;
}



export type Approvable<T> = T & IBaseApprovable;
