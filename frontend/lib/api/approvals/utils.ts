import { apiGet, apiPatch, apiPost } from "@/lib/apiRequest";
import type {
  Action,
  Approval,
  ApprovalTask,
  ContentTypeLite,
  ApprovalDocument,
  ApprovalDocumentLevel,
} from "@/types/approvals.types";

const BASE = "approval";

export const fetchActions = async (params?: { search?: string; page?: number; page_size?: number }) => {
  const res = await apiGet(`${BASE}/actions/`, null, {}, params ? { params } : {});
  return res.data as { count?: number; next?: string | null; previous?: string | null; results?: Action[] } | Action[];
};

export const fetchApprovableModels = async () => {
  const res = await apiGet(`${BASE}/approvable-models/`);
  return res.data as ContentTypeLite[];
};

export const fetchApprovals = async (params?: { search?: string; status?: "ongoing" | "rejected" | "completed"; page?: number; page_size?: number }) => {
  const res = await apiGet(`${BASE}/approvals/`, null, {}, params ? { params } : {});
  return res.data as { count: number; next: string | null; previous: string | null; results: Approval[] };
};

export const fetchApprovalById = async (id: number) => {
  const res = await apiGet(`${BASE}/approvals/${id}/`);
  return res.data as Approval;
};

export const fetchApprovalTasks = async (params?: {
  search?: string;
  status?: "not_started" | "pending" | "rejected" | "approved" | "terminated";
  assigned_to?: number;
  page?: number;
  page_size?: number;
}) => {
  const res = await apiGet(`${BASE}/approval-tasks/`, null, {}, params ? { params } : {});
  return res.data as { count: number; next: string | null; previous: string | null; results: ApprovalTask[] };
};

export const fetchApprovalTaskById = async (id: number) => {
  const res = await apiGet(`${BASE}/approval-tasks/${id}/`);
  return res.data as ApprovalTask;
};

export const approveApprovalTask = async (id: number, comment?: string) => {
  const url = comment ? `${BASE}/approval-tasks/${id}/approve/?comment=${encodeURIComponent(comment)}` : `${BASE}/approval-tasks/${id}/approve/`;
  const res = await apiPatch(url, undefined);
  return res.data as { status: "approved" };
};

export const rejectApprovalTask = async (id: number, comment?: string) => {
  const url = comment ? `${BASE}/approval-tasks/${id}/reject/?comment=${encodeURIComponent(comment)}` : `${BASE}/approval-tasks/${id}/reject/`;
  const res = await apiPatch(url, undefined);
  return res.data as { status: "rejected" };
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
  const res = await apiGet(`${BASE}/tasks-analytics/`);
  return res.data as ApprovalTasksDashboardResponse;
};

// Approval Documents
export const fetchApprovalDocuments = async (params?: { search?: string; page?: number; page_size?: number }) => {
  const res = await apiGet(`${BASE}/approval-documents/`, null, {}, params ? { params } : {});
  return res.data as { count: number; next: string | null; previous: string | null; results: ApprovalDocument[] };
};

export const createApprovalDocument = async (payload: { institution: number; content_type: number; description?: string }) => {
  const res = await apiPost(`${BASE}/approval-documents/`, payload);
  return res.data as ApprovalDocument;
};

export const updateApprovalDocument = async (id: number, payload: Partial<{ actions: number[]; description: string }>) => {
  const res = await apiPatch(`${BASE}/approval-documents/${id}/`, payload);
  return res.data as ApprovalDocument;
};

// Approval Document Levels
export const createApprovalDocumentLevel = async (payload: { approval_document: number; level: number; name?: string | null; description?: string }) => {
  const res = await apiPost(`${BASE}/approval-document-levels/`, payload);
  return res.data as ApprovalDocumentLevel;
};
