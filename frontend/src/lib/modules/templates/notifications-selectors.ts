/**
 * Notifications Selector Template
 *
 * This template generates notification-related selectors for modules.
 * The selectors are designed to work with the namespaced slice structure
 * in the host platform (e.g., taskManagementNotifications instead of notifications).
 */

export const generateNotificationsSelectors = (sliceKey: string): string => {
	return `
// Notifications selectors for slice: ${sliceKey}
export const selectNotifications = (state: RootState) => state.${sliceKey}?.notifications || [];
export const selectUnreadCount = (state: RootState) => state.${sliceKey}?.unreadCount || 0;

`;
};

// List of all notifications selectors for import replacement
export const notificationsSelectorNames = ["selectNotifications", "selectUnreadCount"];
