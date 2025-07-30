import type {IDocumentTemplate, IGeneratedDocumentTemplate} from "@/app/types/types.utils";
import apiRequest from "./apiRequest";

export interface DocumentGenerationResponse {
  status: string;
  document_id: number;
}

export interface DocumentPreviewResponse {
  preview: string;
}

import {IPaginatedResponse} from "@/app/types";

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
  templateId: number,
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

    const response = await apiRequest.post(`documents/generate-document/${templateId}/`, {
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
  context: "employee" | "onboarding" | "leave";
  contextId: number|string;
  documentId: number ;
}): Promise<string | null> => {
  try {
    const queryParams = new URLSearchParams({
      context,
      context_id: contextId.toString(),
    });
    const response = await apiRequest.patch(
      `documents/${documentId}/status/?${queryParams}`,
      {status: "reviewed", context, context_id: contextId},
    );
    return (response.data as DocumentPreviewResponse).preview;
  } catch (error) {
    console.error("Error fetching document preview:", error);
    return null;
  }
};
