/**
 * Redirects Selector Template
 *
 * This template generates redirect-related selectors for modules.
 * The selectors are designed to work with the namespaced slice structure
 * in the host platform (e.g., taskManagementRedirects instead of redirects).
 */

export const generateRedirectsSelectors = (sliceKey: string): string => {
	return `
// Redirects selectors for slice: ${sliceKey}
export const selectRedirectIntent = (state: RootState) => state.${sliceKey}?.intent;
export const selectRedirectIntentId = (state: RootState) => state.${sliceKey}?.intent_id;

`;
};

// List of all redirects selectors for import replacement
export const redirectsSelectorNames = ["selectRedirectIntent", "selectRedirectIntentId"];
