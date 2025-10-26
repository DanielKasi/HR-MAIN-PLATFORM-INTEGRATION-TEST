import { createSelector } from "reselect";

import { RootState } from "../rootReducer";

import { INotification } from "./types";

const notificationsSlice = (state: RootState) => state.notifications;

export const selectNotifications = createSelector(
	[notificationsSlice],
	(slice) => slice.notifications,
);

export const selectNotificationById = (id: string) =>
	createSelector([notificationsSlice], (slice) =>
		slice.notifications.find((n: INotification) => n.id === id),
	);
