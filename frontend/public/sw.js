self.addEventListener("push", (event) => {
	const payload = event.data ? event.data.json() : { title: "HR Notification", body: "New alert" };
	const options = {
		body: payload.body,
		icon: "/icon.png", // Replace with your app's icon
		// badge: '/badge.png', // Optional: Replace with your badge
		data: { url: payload?.url || "/" }, // URL to open on click
		tag: payload.tag || "hr-notification", // Dedupe notifications
	};
	// event.waitUntil(self.registration.showNotification(payload.title || "HR System", options));
	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (client.url.includes(window.location.origin) && "focus" in client) {
					console.log("\n\n !Opened notification : ", event.notification.tag)
					client.postMessage({
						type: "NOTIFICATION_CLICKED",
						payload: {
							notificationId: event.notification.tag,
							url: urlToOpen,
						},
					});
					client.focus();
					return;
				}
			}
			// If no client is open, open a new one
			clients.openWindow(urlToOpen);
		}));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(
		clients.openWindow(event.notification.data.url), // Navigate to app or specific page
	);
});
