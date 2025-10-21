"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { selectAccessToken, selectUser } from "@/store/auth/selectors";
import { receiveNotification, removeNotification } from "@/store/notifications/actions";
import { selectNotifications } from "@/store/notifications/selectors";
import { MAIN_DOMAIN_URL, NOTIFICATIONS_STREAM_BASE_PATH } from "@/constants";
import { showErrorToast } from "@/lib/utils";
import { INotification } from "@/store/notifications/types";
import { requireAnnouncementAcknowledgmentStart } from "@/store/miscellaneous/actions";
import apiRequest from "@/lib/apiRequest";
import { IPaginatedResponse } from "@/types/other";
import { NOTIFICATIONS_API } from "@/lib/api/notifications.utils";
import { removeTrailingSlash } from "@/lib/helpers";

const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const dispatch = useDispatch();
	const currentUser = useSelector(selectUser);
	const accessToken = useSelector(selectAccessToken);
	const notifications = useSelector(selectNotifications);

	// Refs to avoid stale closures
	const notificationsRef = useRef(notifications);
	const isFetchingRef = useRef(false);
	const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
	const lastNotificationIdRef = useRef<number | null>(null);

	// Keep notificationsRef in sync
	useEffect(() => {
		notificationsRef.current = notifications;
		if (notifications.length > 0) {
			const latest = Math.max(...notifications.map((n) => n.id));
			lastNotificationIdRef.current = latest;
		}
	}, [notifications]);

	// Compute base URL once
	const baseUrl = removeTrailingSlash(process.env.NEXT_PUBLIC_API_URL || `${MAIN_DOMAIN_URL}/api`);

	const apiUrl = `${baseUrl}${NOTIFICATIONS_STREAM_BASE_PATH}`;

	// Register SW and listen for messages
	// useEffect(() => {
	// 	if (!("serviceWorker" in navigator)) return;

	// 	const registerSW = async () => {
	// 		try {
	// 			const registration = await navigator.serviceWorker.register("/sw.js");
	// 			serviceWorkerRef.current = registration;
	// 		} catch (error) {
	// 			console.warn("Service Worker registration failed:", error);
	// 		}
	// 	};

	// 	const urlParams = new URLSearchParams(window.location.search);
	// 	const notificationId = urlParams.get("notificationId");
	// 	if (notificationId) {
	// 		markNotificationAsRead({ notificationId: parseInt(notificationId, 10) });
	// 		window.history.replaceState({}, document.title, window.location.pathname);
	// 	}

	// 	registerSW();
	// }, []);

	// Poll notifications every 10s (only if authenticated)
	useEffect(() => {
		if (!currentUser || !accessToken) return;

		const poll = () => {
			if (isFetchingRef.current) return;
			streamNotifications();
		};

		const intervalId = setInterval(poll, 10_000);
		poll(); // Fetch immediately on mount/auth

		return () => clearInterval(intervalId);
	}, [currentUser, accessToken, apiUrl]); // Include apiUrl for safety

	// Request permission only when needed (not on every notification change)
	const requestNotificationPermission = useCallback(async () => {
		if (typeof Notification === "undefined") {
			showErrorToast({
				error: new Error("Notifications not supported"),
				defaultMessage: "Browser notifications are not supported",
			});
			return;
		}

		const permission = await Notification.requestPermission();
		if (permission !== "granted") {
			showErrorToast({
				error: new Error("Notification permission denied"),
				defaultMessage: "Notification permission was denied",
			});
		}
	}, []);

	// Show browser notification for a single new notification
	// const showSingleBrowserNotification = useCallback(
	// 	async (notification: INotification) => {
	// 		if (typeof Notification === "undefined") return;

	// 		if (Notification.permission === "default") {
	// 			await requestNotificationPermission();
	// 		}

	// 		if (Notification.permission !== "granted" || !serviceWorkerRef.current) {
	// 			return;
	// 		}

	// 		const url = `${getNotificationPath(notification)}?notificationId=${notification.id}`;
	// 		try {
	// 			await serviceWorkerRef.current.showNotification("Alert", {
	// 				body: notification.message || "",
	// 				icon: "/icon.PNG",
	// 				tag: notification.id.toString(),
	// 				data: { url, notificationId: notification.id },
	// 			});
	// 		} catch (err) {
	// 			console.warn("Failed to show notification", err);
	// 		}
	// 	},
	// 	[requestNotificationPermission],
	// );

	// Mark as read API call
	const markNotificationAsRead = useCallback(
		async ({ notificationId }: { notificationId: number }) => {
			try {
				await NOTIFICATIONS_API.markAsRead({ notificationId });
			} catch (error) {
				showErrorToast({
					error,
					defaultMessage: "Failed to mark notification as read",
				});
			}
		},
		[],
	);

	// Fetch and process notifications
	const streamNotifications = useCallback(async () => {
		if (isFetchingRef.current) return;
		isFetchingRef.current = true;

		try {
			// Always fetch the first page (latest notifications)
			const response = await apiRequest.get(apiUrl);

			const currentNotifications = notificationsRef.current;
			const currentIds = new Set(currentNotifications.map((n) => n.id));

			for (const notif of (response.data as IPaginatedResponse<INotification>).results) {
				if (!currentIds.has(notif.id)) {
					// New notification!
					if (notif.model_name?.toLowerCase().includes("announcement")) {
						dispatch(requireAnnouncementAcknowledgmentStart(notif));
					} else {
						dispatch(receiveNotification(notif));
					}
					// if (!notif.model_name?.toLowerCase().includes("announcement")) {
					// 	showSingleBrowserNotification(notif);
					// }
				}
			}
		} catch (error) {
			console.warn("Failed to fetch notifications");
			// showErrorToast({
			// 	error,
			// 	defaultMessage: "Failed to fetch notifications",
			// });
		} finally {
			isFetchingRef.current = false;
		}
	}, [apiUrl, dispatch]);

	return <>{children}</>;
};

export default NotificationsProvider;
