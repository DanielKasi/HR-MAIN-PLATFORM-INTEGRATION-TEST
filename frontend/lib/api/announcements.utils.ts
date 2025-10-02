import { IPaginatedResponse } from "@/types/types.utils";

import apiRequest from "../apiRequest";
import { IAcknowledgment, IAnnouncement, IAnnouncementFormData } from "@/types/announcements.types";

export const ANNOUNCEMENTS_API = {
	getPaginated: async ({
		page,
		search,
		ordering,
		created_at,
		page_size,
		type,
	}: {
		page: number;
		search?: string;
		ordering?: string;
		created_at?: string;
		page_size?: number;
		type?: string;
	}) => {
		const params = new URLSearchParams({ page: page.toString() });
		if (search) params.append("search", search);
		if (ordering) params.append("ordering", ordering);
		if (created_at) params.append("created_at", created_at);
		if (page_size) params.append("page_size", page_size.toString());
		if (type) params.append("type", type);

		const res = await apiRequest.get(`/communication/announcements/?${params.toString()}`);
		return res.data as IPaginatedResponse<IAnnouncement>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const res = await apiRequest.get(url);
		return res.data as IPaginatedResponse<IAnnouncement>;
	},

	getById: async ({ id }: { id: number }) => {
		const res = await apiRequest.get(`/communication/announcements/${id}/`);
		return res.data as IAnnouncement;
	},

	create: async ({ data }: { data: IAnnouncementFormData }) => {
		const res = await apiRequest.post(`/communication/announcements/`, data);
		return res.data as IAnnouncement;
	},

	update: async ({ id, data }: { id: number; data: Partial<IAnnouncementFormData> }) => {
		const res = await apiRequest.patch(`/communication/announcements/${id}/`, data);
		return res.data as IAnnouncement;
	},

	delete: async ({ id }: { id: number }) => {
		const res = await apiRequest.delete(`/communication/announcements/${id}/`);
		return res.data;
	},
};

export const ACKNOWLEDGMENTS_API = {
	getPaginated: async ({ page, acknowledged }: { page: number; acknowledged?: boolean }) => {
		const params = new URLSearchParams({ page: page.toString() });
		if (acknowledged !== undefined) params.append("acknowledged", acknowledged.toString());

		const res = await apiRequest.get(`/communication/acknowledgments/?${params.toString()}`);
		return res.data as IPaginatedResponse<IAcknowledgment>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const res = await apiRequest.get(url);
		return res.data as IPaginatedResponse<IAcknowledgment>;
	},

	acknowledge: async ({ ack_id }: { ack_id: number }) => {
		console.log("Acknowledging announcement with ack_id:", ack_id);
		const res = await apiRequest.post(`/communication/acknowledge/`, { ack_id });
		return res.data;
	},
	getOneForLoggedInEmployee: async ({ announcement_id }: { announcement_id: number }) => {
		const res = await apiRequest.get(
			`/communication/acknowledgments/?announcement_id=${announcement_id}`,
		);
		return res.data.results as IAcknowledgment[];
	},
};
