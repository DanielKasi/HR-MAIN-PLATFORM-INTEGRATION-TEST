/**
 * Miscellaneous Selector Template
 *
 * This template generates miscellaneous selectors for modules.
 * The selectors are designed to work with the namespaced slice structure
 * in the host platform (e.g., taskManagementMisc instead of miscellaneous).
 */

export const generateMiscSelectors = (sliceKey: string): string => {
	return `
// Miscellaneous selectors for slice: ${sliceKey}
export const selectSideBarOpened = (state: RootState) => state.${sliceKey}?.sideBarOpened;
export const selectSelectedTask = (state: RootState) => state.${sliceKey}?.selectedTask;

`;
};

// List of all misc selectors for import replacement
export const miscSelectorNames = ["selectSideBarOpened", "selectSelectedTask"];
