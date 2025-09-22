import { IPaginatedResponse } from "@/types/types.utils";
import apiRequest from "../apiRequest";
import {
	FAQ,
	FAQCategory,
	FAQFormData,
	FAQCategoryFormData,
	TicketAttachment,
	TicketComment,
	Ticket,
	TicketCategory,
	TicketCategoryFormData,
	TicketCommentFormData,
} from "@/types/help-desk.types";

export const FAQ_CATEGORIES_API = {
	getPaginated: async ({
		page = 1,
		search,
		ordering,
	}: {
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `help-desk/faq-categories/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<FAQCategory>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<FAQCategory>;
	},

	create: async ({ data }: { data: FAQCategoryFormData }) => {
		const response = await apiRequest.post(`help-desk/faq-categories/`, data);
		return response.data as FAQCategory;
	},

	update: async ({
		categoryId,
		data,
	}: {
		categoryId: number;
		data: Partial<FAQCategoryFormData>;
	}) => {
		const response = await apiRequest.patch(`help-desk/faq-categories/${categoryId}/`, data);
		return response.data as FAQCategory;
	},

	delete: async ({ categoryId }: { categoryId: number }) => {
		await apiRequest.delete(`help-desk/faq-categories/${categoryId}/`);
	},

	getById: async ({ categoryId }: { categoryId: number }) => {
		const response = await apiRequest.get(`help-desk/faq-categories/${categoryId}/`);
		return response.data as FAQCategory;
	},
};

export const FAQ_API = {
	getPaginated: async ({
		page = 1,
		search,
		ordering,
	}: {
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `help-desk/faqs/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<FAQ>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<FAQ>;
	},

	create: async ({ data }: { data: FAQFormData }) => {
		const response = await apiRequest.post(`help-desk/faqs/`, data);
		return response.data as FAQ;
	},

	update: async ({ faqId, data }: { faqId: number; data: Partial<FAQFormData> }) => {
		const response = await apiRequest.patch(`help-desk/faqs/${faqId}/`, data);
		return response.data as FAQ;
	},

	delete: async ({ faqId }: { faqId: number }) => {
		await apiRequest.delete(`help-desk/faqs/${faqId}/`);
	},

	getById: async ({ faqId }: { faqId: number }) => {
		const response = await apiRequest.get(`help-desk/faqs/${faqId}/`);
		return response.data as FAQ;
	},
};

export const TICKET_CATEGORIES_API = {
	getPaginated: async ({
		page = 1,
		search,
		ordering,
	}: {
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `help-desk/ticket-categories/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<TicketCategory>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<TicketCategory>;
	},

	create: async ({ data }: { data: TicketCategoryFormData }) => {
		const response = await apiRequest.post(`help-desk/ticket-categories/`, data);
		return response.data as TicketCategory;
	},

	update: async ({
		categoryId,
		data,
	}: {
		categoryId: number;
		data: Partial<TicketCategoryFormData>;
	}) => {
		const response = await apiRequest.patch(`help-desk/ticket-categories/${categoryId}/`, data);
		return response.data as TicketCategory;
	},

	delete: async ({ categoryId }: { categoryId: number }) => {
		await apiRequest.delete(`help-desk/ticket-categories/${categoryId}/`);
	},

	getById: async ({ categoryId }: { categoryId: number }) => {
		const response = await apiRequest.get(`help-desk/ticket-categories/${categoryId}/`);
		return response.data as TicketCategory;
	},
};

export const TICKET_API = {
	getPaginated: async ({
		page = 1,
		search,
		ordering,
	}: {
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `help-desk/tickets/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<Ticket>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<Ticket>;
	},

	create: async ({ data }: { data: FormData }) => {
		const response = await apiRequest.post(`help-desk/tickets/`, data);
		return response.data as Ticket;
	},

	update: async ({ ticketId, data }: { ticketId: number; data: FormData }) => {
		const response = await apiRequest.patch(`help-desk/tickets/${ticketId}/`, data);
		return response.data as Ticket;
	},

	delete: async ({ ticketId }: { ticketId: number }) => {
		await apiRequest.delete(`help-desk/tickets/${ticketId}/`);
	},

	getById: async ({ ticketId }: { ticketId: number }) => {
		const response = await apiRequest.get(`help-desk/tickets/${ticketId}/`);
		return response.data as Ticket;
	},
};

export const TICKET_COMMENT_API = {
	getPaginated: async ({
		page = 1,
		ticketId,
		search,
		ordering,
	}: {
		page?: number;
		ticketId?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (ticketId) {
			params.append("ticket_id", ticketId.toString());
		}
		if (search) {
			params.append("search", search);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `help-desk/ticket-comments/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<TicketComment>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<TicketComment>;
	},

	create: async ({ data }: { data: TicketCommentFormData }) => {
		const response = await apiRequest.post(`help-desk/ticket-comments/`, data);
		return response.data as TicketComment;
	},

	update: async ({
		commentId,
		data,
	}: {
		commentId: number;
		data: Partial<TicketCommentFormData>;
	}) => {
		const response = await apiRequest.patch(`help-desk/ticket-comments/${commentId}/`, data);
		return response.data as TicketComment;
	},

	delete: async ({ commentId }: { commentId: number }) => {
		await apiRequest.delete(`help-desk/ticket-comments/${commentId}/`);
	},

	getById: async ({ commentId }: { commentId: number }) => {
		const response = await apiRequest.get(`help-desk/ticket-comments/${commentId}/`);
		return response.data as TicketComment;
	},
};

export const TICKET_ATTACHMENT_API = {
	getPaginated: async ({
		page = 1,
		ticketId,
		search,
		ordering,
	}: {
		page?: number;
		ticketId?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (ticketId) {
			params.append("ticket_id", ticketId.toString());
		}
		if (search) {
			params.append("search", search);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `help-desk/ticket-attachments/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<TicketAttachment>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<TicketAttachment>;
	},

	create: async ({ data }: { data: FormData }) => {
		const response = await apiRequest.post(`help-desk/ticket-attachments/`, data);
		return response.data as TicketAttachment;
	},

	update: async ({ attachmentId, data }: { attachmentId: number; data: FormData }) => {
		const response = await apiRequest.patch(`help-desk/ticket-attachments/${attachmentId}/`, data);
		return response.data as TicketAttachment;
	},

	delete: async ({ attachmentId }: { attachmentId: number }) => {
		await apiRequest.delete(`help-desk/ticket-attachments/${attachmentId}/`);
	},

	getById: async ({ attachmentId }: { attachmentId: number }) => {
		const response = await apiRequest.get(`help-desk/ticket-attachments/${attachmentId}/`);
		return response.data as TicketAttachment;
	},
};
