import { IBaseApprovable } from "./approvals.types";

export type DocumentFormat = "pdf" | "word" | "excel" | "jpg" | "any" | "jpeg" | "png";

export interface IDocumentRequest extends IBaseApprovable {
	id: number;
	requested_by: number;
	employees: number[];
	employee_requests?: IEmployeeDocumentRequest[];
	created_at: string;
	document_type: string;
	document_format: DocumentFormat;
	description: string;
	due_date: string;
}

export type EmployeeDocumentRequestStatus = "pending" | "completed" | "rejected";

export interface IEmployeeDocumentRequest {
	id: number;
	employee_name?: string;
	document_type: string;
	document_format: DocumentFormat;
	due_date: string;
	created_at: string;
	status: EmployeeDocumentRequestStatus;
	document_request: number;
	employee: number;
}

export interface IDocumentRequestFormData {
	requested_by: number;
	employees: number[];
	document_type: string;
	document_format: DocumentFormat;
	description: string;
	due_date: string;
}

export interface ISignature {
	id: number;
	user: {
		id: number;
		fullname: string;
		email: string;
	};
	signature_image_url: string;
	signature?: string;
}

export interface ISignatureFormData {
	user: number;
	signature: string;
}
