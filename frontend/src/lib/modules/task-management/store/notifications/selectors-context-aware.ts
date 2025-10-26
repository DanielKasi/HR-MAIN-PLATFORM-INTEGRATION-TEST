import { createSelector } from "reselect";
import { createContextAwareSelector } from "@/platform-integration/store-adapter";
import { INotification } from "./types";

const notificationsSlice = createContextAwareSelector("notifications", (slice) => slice);

export const selectNotifications = createSelector(
	[notificationsSlice],
	(slice) => slice.notifications,
);

export const selectNotificationById = (id: string) =>
	createSelector([notificationsSlice], (slice) =>
		slice.notifications.find((n: INotification) => n.id === id),
	);
