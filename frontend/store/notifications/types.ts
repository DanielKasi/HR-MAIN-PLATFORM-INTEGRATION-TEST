export interface INotification {
	id?: string;
	message: string;
	type?: "info" | "success" | "error" | "warning";
	timestamp: string;
	model_name: string;
	object_id: number;
}

export enum NOTIFICATION_ACTION_TYPES {
	RECEIVE_NOTIFICATION = "notifications/RECEIVE_NOTIFICATION",
	REMOVE_NOTIFICATION = "notifications/REMOVE_NOTIFICATION",
	CLEAR_NOTIFICATIONS = "notifications/CLEAR_NOTIFICATIONS",
}
