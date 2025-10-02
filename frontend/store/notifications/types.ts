export interface INotification {
	id: number;
	message: string;
	timestamp: string;
	model_name: string;
	object_id: number;
	requires_acknowledgment?: string;
}

export enum NOTIFICATION_ACTION_TYPES {
	RECEIVE_NOTIFICATION = "notifications/RECEIVE_NOTIFICATION",
	REMOVE_NOTIFICATION = "notifications/REMOVE_NOTIFICATION",
	CLEAR_NOTIFICATIONS = "notifications/CLEAR_NOTIFICATIONS",
}
