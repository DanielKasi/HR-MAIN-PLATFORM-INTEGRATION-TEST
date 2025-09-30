import type { IDocumentTemplate, IGeneratedDocumentTemplate } from "@/types/types.utils";

import apiRequest from "../apiRequest";

export interface DocumentGenerationResponse {
	status: string;
	document_id: number;
}

export interface DocumentPreviewResponse {
	preview: string;
}

import { IPaginatedResponse } from "@/types/types.utils";
import {
	IDocumentRequest,
	IDocumentRequestFormData,
	ISignature,
	ISignatureFormData,
} from "@/types/documents.types";

export const getDocumentTemplates = async ({
	institutionId,
}: {
	institutionId: number;
}): Promise<IDocumentTemplate[]> => {
	try {
		const response = await apiRequest.get(`documents/institution/${institutionId}/templates/`);
		const data = response.data as IPaginatedResponse<IDocumentTemplate>;

		return data.results;
	} catch (error) {
		console.error("Failed to fetch document templates:", error);

		return [];
	}
};

export const getGeneratedDocumentTemplate = async (
	templateId: number,
	context: string,
	contextId: number,
): Promise<IGeneratedDocumentTemplate | null> => {
	try {
		const url = `documents/generate-document/${templateId}/`;
		const queryParams = new URLSearchParams({
			context,
			context_id: contextId.toString(),
		});
		const response = await apiRequest.get(`${url}?${queryParams}`);

		return response.data as IGeneratedDocumentTemplate;
	} catch (error) {
		console.error("Error fetching generated document template:", error);

		return null;
	}
};

export const generateDocument = async (
	templateId: number | null,
	context: string,
	contextId: number,
	placeholders?: Record<string, string>,
): Promise<DocumentGenerationResponse | null> => {
	try {
		const method = placeholders ? "POST" : "GET";
		const url = `documents/generate-document/${templateId}/`;
		const queryParams = new URLSearchParams({
			context,
			context_id: contextId.toString(),
		});
		const endpoint = templateId
			? `documents/generate-document/${templateId}/`
			: `documents/generate-document/`;
		const response = await apiRequest.post(endpoint, {
			context,
			context_id: contextId,
			placeholders,
		});

		return response.data as DocumentGenerationResponse;
	} catch (error) {
		console.error("Error generating document:", error);

		return null;
	}
};

export const getDocumentPreview = async (documentId: number): Promise<string | null> => {
	try {
		const response = await apiRequest.get(`documents/preview-document-content/${documentId}/`);

		return (response.data as DocumentPreviewResponse).preview;
	} catch (error) {
		console.error("Error fetching document preview:", error);

		return null;
	}
};

export const sendDocuments = async ({
	context,
	contextId,
	documentId,
}: {
	context: "employee" | "onboarding" | "leave" | "pip";
	contextId: number | string;
	documentId: number;
}): Promise<string | null> => {
	const queryParams = new URLSearchParams({
		context,
		context_id: contextId.toString(),
	});
	const response = await apiRequest.patch(
		`documents/${documentId}/status/?${queryParams.toString()}`,
		{
			status: "reviewed",
			context,
			context_id: contextId,
		},
	);

	return (response.data as DocumentPreviewResponse).preview;
};

export const DOCUMENTS_API = {
	getPaginatedDocumentTemplates: async (params: {
		institutionId: number;
		page?: number;
		search?: string;
	}) => {
		const urlParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			urlParams.append(key, value.toString());
		});

		const response = await apiRequest.get(
			`documents/institution/${params.institutionId}/templates/?${urlParams.toString()}`,
		);
		return response.data as IPaginatedResponse<IDocumentTemplate>;
	},

	getDocumentsTemplateFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IDocumentTemplate>;
	},
};

export const DOCUMENT_REQUESTS_API = {
	getPaginated: async (params: {
		page?: number;
		search?: string;
		status?: string;
		created_at?: string;
		ordering?: string;
		employee_id?: number;
	}) => {
		const urlParams = new URLSearchParams({
			page: "1",
		});
		Object.entries(params).forEach(([key, value]) => {
			if (value && value !== "page") {
				urlParams.append(key, value.toString());
			}
		});

		const endpoint = `employee/document-requests/?${urlParams.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IDocumentRequest>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IDocumentRequest>;
	},

	create: async ({ data }: { data: IDocumentRequestFormData }) => {
		const response = await apiRequest.post(`employee/document-requests/`, data);
		return response.data as IDocumentRequest;
	},

	update: async ({
		requestId,
		data,
	}: {
		requestId: number;
		data: Partial<IDocumentRequestFormData>;
	}) => {
		const response = await apiRequest.patch(`employee/document-requests/${requestId}/`, data);
		return response.data as IDocumentRequest;
	},

	delete: async ({ requestId }: { requestId: number }) => {
		await apiRequest.delete(`employee/document-requests/${requestId}/`);
	},

	getById: async ({ requestId }: { requestId: number }) => {
		const response = await apiRequest.get(`employee/document-requests/${requestId}/`);
		return response.data as IDocumentRequest;
	},
	uploadDocument: async ({
		requestEmployeeId,
		data,
		thisEmployee,
	}: {
		requestEmployeeId: number;
		thisEmployee: number;
		data: { file: File; remarks?: string };
	}) => {
		const formData = new FormData();
		formData.append("file", data.file);
		formData.append("document_request_employee", thisEmployee.toString());
		if (data.remarks) formData.append("remarks", data.remarks);
		const response = await apiRequest.post(
			`employee/document-requests/employee/${requestEmployeeId}/upload/`,
			formData,
		);
		return response.data;
	},
};

export const SIGNATURES_API = {
	getPaginated: async ({ page = 1, status }: { page?: number; status?: string }) => {
		const params = new URLSearchParams({ page: page.toString() });
		const res = await apiRequest.get(`/user/signatures/?${params.toString()}`);
		return res.data as IPaginatedResponse<ISignature>;
	},
	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const res = await apiRequest.get(url);
		return res.data as IPaginatedResponse<ISignature>;
	},
	create: async ({ data }: { data: ISignatureFormData }) => {
		const formData = new FormData();
		formData.append("user", data.user.toString());
		formData.append("signature", data.signature);
		const res = await apiRequest.post(`/user/signatures/`, formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return res.data as ISignature;
	},
	update: async ({ id, data }: { id: number; data: Partial<ISignatureFormData> }) => {
		const formData = new FormData();
		if (data.user) formData.append("user", data.user.toString());
		if (data.signature) formData.append("signature", data.signature);
		const res = await apiRequest.patch(`/user/signatures/${id}/`, formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return res.data as ISignature;
	},
	delete: async ({ id }: { id: number }) => {
		const res = await apiRequest.delete(`/user/signatures/${id}/`);
		return res.data;
	},
};
