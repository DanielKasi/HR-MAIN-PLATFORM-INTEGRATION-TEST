"use client";

import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { selectAccessToken, selectUser } from "@/store/auth/selectors";
import { receiveNotification } from "@/store/notifications/actions";
import { selectNotifications } from "@/store/notifications/selectors";
import { MAIN_DOMAIN_URL, NOTIFICATIONS_STREAM_BASE_PATH } from "@/constants";
import { showErrorToast } from "@/lib/utils";
import { INotification } from "@/store/notifications/types";
import { getNotificationPath } from "@/utils/notifications-path-matcher";

const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const dispatch = useDispatch();
	const currentUser = useSelector(selectUser);
	const accessToken = useSelector(selectAccessToken);
	const notifications = useSelector(selectNotifications);
	const [isInitialized, setIsInitialized] = useState(false);
	const prevNotificationsRef = useRef(notifications);
	const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
	const retryCountRef = useRef(0);
	const maxRetries = 3;
	const retryDelay = 10000; // 10 seconds

	// Register Service Worker
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js")
				.then((registration) => {
					serviceWorkerRef.current = registration;
					console.log("Service Worker registered");
				})
				.catch((error) => {
					console.error("Service Worker registration failed:", error);
				});
		}
	}, []);

	// Handle SSE connection with retry logic
	useEffect(() => {
		if (!currentUser || !accessToken || isInitialized) {
			return;
		}

		const baseUrl = process.env.NEXT_PUBLIC_API_URL
			? process.env.NEXT_PUBLIC_API_URL.endsWith("/")
				? process.env.NEXT_PUBLIC_API_URL.slice(0, -1)
				: process.env.NEXT_PUBLIC_API_URL
			: MAIN_DOMAIN_URL;

		const url = `${baseUrl}${NOTIFICATIONS_STREAM_BASE_PATH}`;
		const controller = new AbortController();

		async function streamNotifications(attemptNumber = 1) {
			try {
				const response = await fetch(url, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: "text/event-stream",
					},
					signal: controller.signal,
				});

				if (!response.body) {
					throw new Error("No response body");
				}

				// Reset retry count on successful connection
				retryCountRef.current = 0;

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();

					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n\n");

					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data: ")) {
							try {
								const data: INotification = JSON.parse(line.slice(6));

								if (data && data.id && !notifications.find((notif) => notif.id === data.id)) {
									dispatch(receiveNotification(data));
								}
							} catch (error) {
								console.warn("Error parsing notification:", error);
								// showErrorToast({ error, defaultMessage: "Error parsing notification" });
							}
						}
					}
				}
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					console.warn("Notification stream connection aborted");
					return;
				}

				console.warn(
					`Failed to connect to notification stream (attempt ${attemptNumber}/${maxRetries}):`,
					error,
				);

				if (attemptNumber < maxRetries) {
					retryCountRef.current = attemptNumber;
					console.log(`Retrying in ${retryDelay / 1000} seconds...`);

					setTimeout(() => {
						if (!controller.signal.aborted) {
							streamNotifications(attemptNumber + 1);
						}
					}, retryDelay);
				} else {
					console.warn(
						"Max retry attempts reached. No longer attempting to connect to notification stream.",
					);
					// showErrorToast({ error, defaultMessage: "Failed to connect to notification stream" });
				}
			}
		}

		streamNotifications();
		setIsInitialized(true);

		return () => {
			controller.abort();
		};
	}, [dispatch, currentUser, accessToken, isInitialized, notifications]);

	// Watch notifications and show browser notifications
	useEffect(() => {
		showBrowserNotifications();
	}, [notifications]);

	// Request Notification permission
	const requestNotificationPermission = async () => {
		if (typeof Notification === "undefined") {
			console.warn("Browser notifications are not supported");
			// showErrorToast({
			// 	error: new Error("Notifications not supported"),
			// 	defaultMessage: "Browser notifications are not supported",
			// });
			return;
		}
		const permission = await Notification.requestPermission();

		if (permission !== "granted") {
			showErrorToast({
				error: new Error("Notification permission denied"),
				defaultMessage: "Notification permission was denied",
			});
		}
	};

	// Show browser notifications for new notifications
	const showBrowserNotifications = async () => {
		if (
			typeof Notification === "undefined" ||
			Notification.permission !== "granted" ||
			!serviceWorkerRef.current
		) {
			console.warn("Notifications not supported or permission not granted");
			return;
		}

		if (
			!notifications ||
			notifications.length === 0 ||
			notifications === prevNotificationsRef.current
		) {
			console.warn("No notifications to show");
			return;
		}

		const lastNotification = notifications[notifications.length - 1];

		if (lastNotification.message) {
			const url = getNotificationPath(lastNotification);

			await serviceWorkerRef.current.showNotification(`HR System: ${lastNotification.message}`, {
				body: `${lastNotification.type?.toUpperCase() || "Alert"}`,
				icon: "/icon.png", // Our app's icon
				tag: lastNotification.id || (notifications.length - 1).toString(), // Prevents duplicates
				data: { url }, // Navigate to approval page
			});
		}

		prevNotificationsRef.current = notifications;
	};

	// Monitor new notifications
	useEffect(() => {
		if (
			typeof Notification !== "undefined" &&
			Notification.permission === "default" &&
			notifications.length > 0
		) {
			requestNotificationPermission();
		}
	}, [notifications]);

	return <>{children}</>;
};

export default NotificationsProvider;
