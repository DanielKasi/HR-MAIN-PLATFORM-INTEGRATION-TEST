import apiRequest from "@/lib/apiRequest";
import type {
  Action,
  Approval,
  ApprovalTask,
  ContentTypeLite,
  ApprovalDocument,
  ApprovalDocumentLevel,
  ApprovalDocumentFormData,
  ApprovalDocumentLevelFormData,
  ApproverGroup,
  ApproverGroupFormData,
} from "@/types/approvals.types";
import { IPaginatedResponse } from "@/types/types.utils";

const BASE = "approval";

export const fetchActions = async (params?: { search?: string; page?: number; page_size?: number }) => {
  const res = await apiRequest.get(`${BASE}/actions/`);
  return res.data as { count?: number; next?: string | null; previous?: string | null; results?: Action[] } | Action[];
};

export const fetchApprovableModels = async () => {
  const res = await apiRequest.get(`${BASE}/approvable-models/`);
  return res.data as ContentTypeLite[];
};

export const fetchApprovableModelById = async ({ id }: { id: number }) => {
  const res = await apiRequest.get(`${BASE}/approvable-models/${id}`);
  return res.data as ContentTypeLite;
};

export const fetchApprovals = async (params?: { search?: string; status?: "ongoing" | "rejected" | "completed"; page?: number; page_size?: number }) => {
  const res = await apiRequest.get(`${BASE}/approvals/`, null, {}, params ? { params } : {});
  return res.data as { count: number; next: string | null; previous: string | null; results: Approval[] };
};

export const fetchApprovalById = async (id: number) => {
  const res = await apiRequest.get(`${BASE}/approvals/${id}/`);
  return res.data as Approval;
};

export const fetchApprovalTasks = async (params?: {
  search?: string;
  status?: "not_started" | "pending" | "rejected" | "approved" | "terminated";
  assigned_to?: number;
  page?: number;
  page_size?: number;
}) => {
  const res = await apiRequest.get(`${BASE}/approval-tasks/`, null, {}, params ? { params } : {});
  return res.data as { count: number; next: string | null; previous: string | null; results: ApprovalTask[] };
};

export const fetchApprovalTaskById = async (id: number) => {
  const res = await apiRequest.get(`${BASE}/approval-tasks/${id}/`);
  return res.data as ApprovalTask;
};

export const approveApprovalTask = async (id: number, comment?: string) => {
const url = comment ? `${BASE}/approval-tasks/${id}/approve/?comment=${encodeURIComponent(comment)}` : `${BASE}/approval-tasks/${id}/approve/`;
const res = await apiRequest.patch(url, {});
return res.data as ApprovalTask;
};

export const rejectApprovalTask = async (id: number, comment?: string) => {
  const url = comment ? `${BASE}/approval-tasks/${id}/reject/?comment=${encodeURIComponent(comment)}` : `${BASE}/approval-tasks/${id}/reject/`;
  const res = await apiRequest.patch(url, {});
  return res.data as ApprovalTask;
};

export const overrideApprovalTask = async (id: number, comment?: string) => {
const url = comment ? `${BASE}/override/${id}/?comment=${encodeURIComponent(comment)}` : `${BASE}/approval-tasks/${id}/approve/`;
const res = await apiRequest.patch(url, {});
return res.data as ApprovalTask;
};

export type DashboardCategory<T = ApprovalTask> = { count: number; tasks: T[] };
export type ApprovalTasksDashboardResponse = {
  incoming: DashboardCategory;
  open: DashboardCategory;
  critical: DashboardCategory;
  expired: DashboardCategory;
  outgoing: DashboardCategory;
};

export const fetchApprovalTasksDashboard = async () => {
  const res = await apiRequest.get(`${BASE}/tasks-analytics/`);
  return res.data as ApprovalTasksDashboardResponse;
};

// Approval Documents
export const fetchApprovalDocuments = async (params?: { search?: string; page?: number, content_type_id?: number, app_label?: string }) => {
  const res = await apiRequest.get(`${BASE}/approval-documents/`, null, {}, params ? { params } : {});
  return res.data as IPaginatedResponse<ApprovalDocument>
};
export const createApprovalDocument = async (payload: Partial<ApprovalDocumentFormData>) => {
  const res = await apiRequest.post(`${BASE}/approval-documents/`, payload);
  return res.data as ApprovalDocument;
};

export const fetchApprovalDocumentById = async (id: number) => {
  const res = await apiRequest.get(`${BASE}/approval-documents/${id}/`);
  return res.data as ApprovalDocument;
};

export const updateApprovalDocument = async (id: number, payload: Partial<ApprovalDocumentFormData>) => {
  const res = await apiRequest.patch(`${BASE}/approval-documents/${id}/`, payload);
  return res.data as ApprovalDocument;
};

export const deleteApprovalDocument = async (id: number) => {
  const res = await apiRequest.delete(`${BASE}/approval-documents/${id}/`);
  return res.status === 204;
};

// Approval Document Levels
export const fetchApprovalDocumentLevels = async (params?: {
  search?: string
  page?: number
  approval_document?: number
}) => {
  const res = await apiRequest.get(`${BASE}/approval-document-levels/`, null, {}, params ? { params } : {})
  return res.data as IPaginatedResponse<ApprovalDocumentLevel>
}

export const fetchApprovalDocumentLevelById = async (id: number) => {
  const res = await apiRequest.get(`${BASE}/approval-document-levels/${id}/`)
  return res.data as ApprovalDocumentLevel
}

export const createApprovalDocumentLevel = async (payload: Partial<ApprovalDocumentLevelFormData>) => {
  const res = await apiRequest.post(`${BASE}/approval-document-levels/`, payload)
  return res.data as ApprovalDocumentLevel
}

export const updateApprovalDocumentLevel = async (id: number, payload: Partial<ApprovalDocumentLevelFormData>) => {
  const res = await apiRequest.patch(`${BASE}/approval-document-levels/${id}/`, payload)
  return res.data as ApprovalDocumentLevel
}

export const deleteApprovalDocumentLevel = async (id: number) => {
  await apiRequest.delete(`${BASE}/approval-document-levels/${id}/`)
}



// Approver Groups
export const fetchApproverGroups = async (params?: { search?: string; page?: number; page_size?: number }) => {
  const res = await apiRequest.get(`${BASE}/approver-groups/`, null, {}, params ? { params } : {})
  return res.data as { count: number; next: string | null; previous: string | null; results: ApproverGroup[] }
}

export const fetchApproverGroupById = async (id: number) => {
  const res = await apiRequest.get(`${BASE}/approver-groups/${id}/`)
  return res.data as ApproverGroup
}

export const createApproverGroup = async (payload: Partial<ApproverGroupFormData>) => {
  const res = await apiRequest.post(`${BASE}/approver-groups/`, payload)
  return res.data as ApproverGroup
}

export const updateApproverGroup = async (id: number, payload: Partial<ApproverGroupFormData>) => {
  const res = await apiRequest.patch(`${BASE}/approver-groups/${id}/`, payload)
  return res.data as ApproverGroup
}

export const deleteApproverGroup = async (id: number) => {
  await apiRequest.delete(`${BASE}/approver-groups/${id}/`)
}
