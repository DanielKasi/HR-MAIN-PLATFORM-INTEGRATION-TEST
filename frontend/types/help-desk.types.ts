import { IBaseApprovable } from "@/types/approvals.types";
import { IInstitution, IEmployee } from "@/types/types.utils";

export interface FAQCategory extends IBaseApprovable {
	id: number;
	institution: number;
	institution_details?: IInstitution | null;
	name: string;
	description: string;
}

export interface FAQCategoryFormData {
	institution: number;
	name: string;
	description: string;
}

export interface FAQ extends IBaseApprovable {
	id: number;
	question: string;
	answer: string;
	category: FAQCategory;
}

export interface FAQFormData {
	question: string;
	answer: string;
	category_id: number;
}

export enum TicketStatus {
	OPEN = "OPEN",
	IN_PROGRESS = "IN_PROGRESS",
	CLOSED = "CLOSED",
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
	[TicketStatus.OPEN]: "Open",
	[TicketStatus.IN_PROGRESS]: "In Progress",
	[TicketStatus.CLOSED]: "Closed",
};

export enum TicketPriority {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
	[TicketPriority.LOW]: "Low",
	[TicketPriority.MEDIUM]: "Medium",
	[TicketPriority.HIGH]: "High",
};

export interface TicketCategory extends IBaseApprovable {
	id: number;
	institution: number;
	institution_details?: IInstitution | null;
	name: string;
	description: string;
	created_by: number;
}

export interface TicketCategoryFormData {
	institution: number;
	name: string;
	description: string;
}

export interface Ticket extends IBaseApprovable {
	id: number;
	title: string;
	status: TicketStatus;
	priority: TicketPriority;
	category: TicketCategory | null;
	assigned_to: IEmployee | null;
	comments: TicketComment[];
	attachments: TicketAttachment[];
	created_by: number;
}

export interface TicketFormData {
	title: string;
	status: TicketStatus;
	priority: TicketPriority;
	category_id: number | null;
	assigned_to_id: number | null;
	new_comments?: string[];
	new_attachments?: File[];
}

export interface TicketComment {
	id: number;
	ticket: number;
	ticket_detail?: { id: number; title: string };
	comment: string;
	created_at: string;
	updated_at: string;
	is_active: boolean;
	created_by: number;
}

export interface TicketCommentFormData {
	ticket: number;
	comment: string;
}

export interface TicketAttachment {
	id: number;
	ticket: number;
	ticket_detail?: { id: number; title: string };
	file: string;
	created_at: string;
	updated_at: string;
	is_active: boolean;
	created_by: number;
}

export interface TicketAttachmentFormData {
	ticket: number;
	file: File;
}
