/**
 * Selector Templates Index
 *
 * This file exports all selector templates and their associated selector names
 * for use in the sync script.
 */

export { generateAuthSelectors, authSelectorNames } from "./auth-selectors";
export { generateMiscSelectors, miscSelectorNames } from "./misc-selectors";
export { generateRedirectsSelectors, redirectsSelectorNames } from "./redirects-selectors";
export {
	generateNotificationsSelectors,
	notificationsSelectorNames,
} from "./notifications-selectors";

// Mapping of slice types to their templates and selector names
export const selectorTemplates = {
	auth: {
		generate: generateAuthSelectors,
		selectorNames: authSelectorNames,
		importPath: "@/store/auth/selectors-context-aware",
	},
	misc: {
		generate: generateMiscSelectors,
		selectorNames: miscSelectorNames,
		importPath: "@/store/miscellaneous/selectors-context-aware",
	},
	redirects: {
		generate: generateRedirectsSelectors,
		selectorNames: redirectsSelectorNames,
		importPath: "@/store/redirects/selectors-context-aware",
	},
	notifications: {
		generate: generateNotificationsSelectors,
		selectorNames: notificationsSelectorNames,
		importPath: "@/store/notifications/selectors-context-aware",
	},
};

// Helper function to determine slice type from slice key
export const getSliceType = (sliceKey: string): string => {
	if (sliceKey.includes("Auth")) return "auth";
	if (sliceKey.includes("Misc")) return "misc";
	if (sliceKey.includes("Redirects")) return "redirects";
	if (sliceKey.includes("Notifications")) return "notifications";
	return "unknown";
};
