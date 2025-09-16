self.addEventListener("push", (event) => {
	// For frontend-only, we won't receive real push events yet
	// This is a placeholder for future backend integration
	const payload = event.data ? event.data.json() : { title: "HR Notification", body: "New alert" };
	const options = {
		body: payload.body,
		icon: "/icon.png", // Replace with your app's icon
		// badge: '/badge.png', // Optional: Replace with your badge
		data: { url: payload?.url || "/" }, // URL to open on click
		tag: payload.tag || "hr-notification", // Dedupe notifications
	};
	event.waitUntil(self.registration.showNotification(payload.title || "HR System", options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(
		clients.openWindow(event.notification.data.url), // Navigate to app or specific page
	);
});
