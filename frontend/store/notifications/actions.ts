import { ActionWithPayLoad, Action, createAction } from "../storeUtils";

import { INotification, NOTIFICATION_ACTION_TYPES } from "./types";

export type ReceiveNotificationAction = ActionWithPayLoad<
	NOTIFICATION_ACTION_TYPES.RECEIVE_NOTIFICATION,
	INotification
>;

export type RemoveNotificationAction = ActionWithPayLoad<
	NOTIFICATION_ACTION_TYPES.REMOVE_NOTIFICATION,
	string
>;

export type ClearNotificationsAction = Action<NOTIFICATION_ACTION_TYPES.CLEAR_NOTIFICATIONS>;

export type NotificationAction =
	| ReceiveNotificationAction
	| RemoveNotificationAction
	| ClearNotificationsAction;

export const receiveNotification = (notification: INotification): ReceiveNotificationAction =>
	createAction(NOTIFICATION_ACTION_TYPES.RECEIVE_NOTIFICATION, notification);

export const removeNotification = (id: string): RemoveNotificationAction =>
	createAction(NOTIFICATION_ACTION_TYPES.REMOVE_NOTIFICATION, id);

export const clearNotifications = (): ClearNotificationsAction =>
	createAction(NOTIFICATION_ACTION_TYPES.CLEAR_NOTIFICATIONS);
