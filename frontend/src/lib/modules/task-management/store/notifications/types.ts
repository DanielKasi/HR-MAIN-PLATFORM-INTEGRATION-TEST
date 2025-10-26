export interface INotification {
	id?: string;
	message: string;
	type?: "info" | "success" | "error" | "warning";
	timestamp: string;
	model_name: string;
	object_id: number;
}

export enum NOTIFICATION_ACTION_TYPES {
	RECEIVE_NOTIFICATION = "task-managementNotifications/RECEIVE_NOTIFICATION",
	REMOVE_NOTIFICATION = "task-managementNotifications/REMOVE_NOTIFICATION",
	CLEAR_NOTIFICATIONS = "task-managementNotifications/CLEAR_NOTIFICATIONS",
}
