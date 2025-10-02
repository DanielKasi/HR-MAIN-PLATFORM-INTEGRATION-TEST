import { IPaginatedResponse } from "@/types/types.utils";
import apiRequest from "../apiRequest";
import { INotification } from "@/store/notifications/types";

export const NOTIFICATIONS_API = {
	getPaginated: async () => {
		const response = await apiRequest.get(`/communication/notifications/sse/`);
		return response.data as IPaginatedResponse<INotification>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<INotification>;
	},

	markAsRead: async ({ notificationId }: { notificationId: number }) => {
		await apiRequest.post(
			`/communication/notifications/read/?notification_id=${notificationId}`,
			{},
		);
	},
};
