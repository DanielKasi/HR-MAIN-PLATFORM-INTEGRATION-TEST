import { NotificationAction } from "./actions";
import { INotification, NOTIFICATION_ACTION_TYPES } from "./types";

export type NotificationsState = {
	notifications: INotification[];
};

const initialNotificationsState: NotificationsState = {
	notifications: [],
};

export const notificationsReducer = (
	state = initialNotificationsState,
	action: NotificationAction | { type: string; payload?: unknown },
): NotificationsState => {
	switch (action.type) {
		case NOTIFICATION_ACTION_TYPES.RECEIVE_NOTIFICATION:
			return {
				...state,
				notifications: [...state.notifications, action.payload as INotification],
			};
		case NOTIFICATION_ACTION_TYPES.REMOVE_NOTIFICATION:
			return {
				...state,
				notifications: state.notifications.filter((n) => n.id !== (action.payload as string)),
			};
		case NOTIFICATION_ACTION_TYPES.CLEAR_NOTIFICATIONS:
			return {
				...state,
				notifications: [],
			};
		default:
			return state;
	}
};
