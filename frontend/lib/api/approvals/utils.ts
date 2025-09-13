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
  ApprovalTaskStatus,
} from "@/types/approvals.types";
import { ApprovalTasksDashboardResponse, IPaginatedResponse } from "@/types/types.utils";

const BASE = "approval";


/* -------------------- ACTIONS -------------------- */
export const ACTIONS_API = {
  fetchActions: async (params?: { search?: string; page?: number; page_size?: number }) => {
    const res = await apiRequest.get(`${BASE}/actions/`);
    return res.data as Action[];
  },
};

/* -------------------- APPROVABLE MODELS -------------------- */
export const APPROVABLE_MODELS_API = {
  fetchAll: async () => {
    const res = await apiRequest.get(`${BASE}/approvable-models/`);
    return res.data as ContentTypeLite[];
  },

  fetchById: async ({ id }: { id: number }) => {
    const res = await apiRequest.get(`${BASE}/approvable-models/${id}`);
    return res.data as ContentTypeLite;
  },
};

/* -------------------- APPROVALS -------------------- */
export const APPROVALS_API = {
  fetchAll: async (params?: {
    search?: string;
    status?: "ongoing" | "rejected" | "completed";
    page?: number;
    page_size?: number;
  }) => {
    const search_params = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          search_params.append(key, value.toString());
        }
      });
    }
    const res = await apiRequest.get(`${BASE}/approvals/${search_params ? `?${search_params.toString()}` : ""}`);
    return res.data as IPaginatedResponse<Approval>;
  },

  fetchById: async ({ id }: { id: number }) => {
    const res = await apiRequest.get(`${BASE}/approvals/${id}/`);
    return res.data as Approval;
  },
};

/* -------------------- APPROVAL TASKS -------------------- */
export const APPROVAL_TASKS_API = {

  fetchAnalysticsSummary: async () => {
    const res = await apiRequest.get(`${BASE}/tasks-analytics/`);
    return res.data as ApprovalTasksDashboardResponse;
  },
  fetchAll: async (params?: {
    search?: string;
    status?: ApprovalTaskStatus;
    assigned_to?: number;
    page?: number;
    page_size?: number;
  }) => {
    const search_params = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          search_params.append(key, value.toString());
        }
      });
    }
    const res = await apiRequest.get(`${BASE}/approval-tasks/${search_params ? `?${search_params.toString()}` : ""}`);
    return res.data as IPaginatedResponse<ApprovalTask>;
  },

  fetchPaginatedTasksFromUrl: async (url: string) => {
    const res = await apiRequest.get(url);
    return res.data as IPaginatedResponse<ApprovalTask>;
  },

  fetchById: async ({ id }: { id: number }) => {
    const res = await apiRequest.get(`${BASE}/approval-tasks/${id}/`);
    return res.data as ApprovalTask;
  },

  approve: async ({ id, comment }: { id: number; comment?: string }) => {
    const url = comment
      ? `${BASE}/approval-tasks/${id}/approve/?comment=${encodeURIComponent(comment)}`
      : `${BASE}/approval-tasks/${id}/approve/`;
    const res = await apiRequest.patch(url, {});
    return res.data as ApprovalTask;
  },

  reject: async ({ id, comment }: { id: number; comment?: string }) => {
    const url = comment
      ? `${BASE}/approval-tasks/${id}/reject/?comment=${encodeURIComponent(comment)}`
      : `${BASE}/approval-tasks/${id}/reject/`;
    const res = await apiRequest.patch(url, {});
    return res.data as ApprovalTask;
  },

  override: async ({ id, comment }: { id: number; comment?: string }) => {
    const url = comment
      ? `${BASE}/override/${id}/?comment=${encodeURIComponent(comment)}`
      : `${BASE}/approval-tasks/${id}/approve/`;
    const res = await apiRequest.patch(url, {});
    return res.data as ApprovalTask;
  },

  fetchDashboard: async () => {
    const res = await apiRequest.get(`${BASE}/tasks-analytics/`);
    return res.data as {
      incoming: { count: number; tasks: ApprovalTask[] };
      open: { count: number; tasks: ApprovalTask[] };
      critical: { count: number; tasks: ApprovalTask[] };
      expired: { count: number; tasks: ApprovalTask[] };
      outgoing: { count: number; tasks: ApprovalTask[] };
    };
  },
};

/* -------------------- APPROVAL DOCUMENTS -------------------- */
export const APPROVAL_DOCUMENTS_API = {
  fetchAll: async (params?: {
    search?: string;
    page?: number;
    content_type_id?: number;
    app_label?: string;
  }) => {
    const search_params = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          search_params.append(key, value.toString());
        }
      });
    }
    const res = await apiRequest.get(`${BASE}/approval-documents/${search_params ? `?${search_params.toString()}` : ""}`);
    return res.data as IPaginatedResponse<ApprovalDocument>;
  },

  fetchById: async ({ id }: { id: number }) => {
    const res = await apiRequest.get(`${BASE}/approval-documents/${id}/`);
    return res.data as ApprovalDocument;
  },

  create: async (payload: Partial<ApprovalDocumentFormData>) => {
    const res = await apiRequest.post(`${BASE}/approval-documents/`, payload);
    return res.data as ApprovalDocument;
  },

  update: async ({ id, payload }: { id: number; payload: Partial<ApprovalDocumentFormData> }) => {
    const res = await apiRequest.patch(`${BASE}/approval-documents/${id}/`, payload);
    return res.data as ApprovalDocument;
  },

  delete: async ({ id }: { id: number }) => {
    const res = await apiRequest.delete(`${BASE}/approval-documents/${id}/`);
    return res.status === 204;
  },
};

/* -------------------- APPROVAL DOCUMENT LEVELS -------------------- */
export const APPROVAL_DOCUMENT_LEVELS_API = {
  fetchAll: async (params?: { search?: string; page?: number; approval_document?: number }) => {
    const search_params = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          search_params.append(key, value.toString());
        }
      });
    }
    const res = await apiRequest.get(
      `${BASE}/approval-document-levels/${search_params ? `?${search_params.toString()}` : ""}`,
    );
    return res.data as IPaginatedResponse<ApprovalDocumentLevel>;
  },

  fetchById: async ({ id }: { id: number }) => {
    const res = await apiRequest.get(`${BASE}/approval-document-levels/${id}/`);
    return res.data as ApprovalDocumentLevel;
  },

  create: async (payload: Partial<ApprovalDocumentLevelFormData>) => {
    const res = await apiRequest.post(`${BASE}/approval-document-levels/`, payload);
    return res.data as ApprovalDocumentLevel;
  },

  update: async ({ id, payload }: { id: number; payload: Partial<ApprovalDocumentLevelFormData> }) => {
    const res = await apiRequest.patch(`${BASE}/approval-document-levels/${id}/`, payload);
    return res.data as ApprovalDocumentLevel;
  },

  delete: async ({ id }: { id: number }) => {
    await apiRequest.delete(`${BASE}/approval-document-levels/${id}/`);
  },
};

/* -------------------- APPROVER GROUPS -------------------- */
export const APPROVER_GROUPS_API = {
  fetchAll: async (params?: { search?: string; page?: number; page_size?: number }) => {
    const search_params = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          search_params.append(key, value.toString());
        }
      });
    }
    const res = await apiRequest.get(`${BASE}/approver-groups/${search_params ? `?${search_params.toString()}` : ""}`);
    return res.data as IPaginatedResponse<ApproverGroup>
  },

  fetchById: async ({ id }: { id: number }) => {
    const res = await apiRequest.get(`${BASE}/approver-groups/${id}/`);
    return res.data as ApproverGroup;
  },

  create: async (payload: Partial<ApproverGroupFormData>) => {
    const res = await apiRequest.post(`${BASE}/approver-groups/`, payload);
    return res.data as ApproverGroup;
  },

  update: async ({ id, payload }: { id: number; payload: Partial<ApproverGroupFormData> }) => {
    const res = await apiRequest.patch(`${BASE}/approver-groups/${id}/`, payload);
    return res.data as ApproverGroup;
  },

  delete: async ({ id }: { id: number }) => {
    await apiRequest.delete(`${BASE}/approver-groups/${id}/`);
  },
};
