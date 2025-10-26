/**
 * Auth Selector Template
 *
 * This template generates auth-related selectors for modules.
 * The selectors are designed to work with the namespaced slice structure
 * in the host platform (e.g., taskManagementAuth instead of auth).
 */

export const generateAuthSelectors = (sliceKey: string): string => {
	return `
// Auth selectors for slice: ${sliceKey}
export const selectUser = (state: RootState) => state.${sliceKey}?.user?.value;
export const selectUserLoading = (state: RootState) => state.${sliceKey}?.user?.loading;
export const selectAccessToken = (state: RootState) => state.${sliceKey}?.accessToken;
export const selectRefreshToken = (state: RootState) => state.${sliceKey}?.refreshToken;
export const selectSelectedInstitution = (state: RootState) => state.${sliceKey}?.selectedInstitution?.value;
export const selectSelectedInstitutionLoading = (state: RootState) => state.${sliceKey}?.selectedInstitution?.loading;
export const selectSelectedBranch = (state: RootState) => state.${sliceKey}?.selectedBranch?.value;
export const selectSelectedBranchLoading = (state: RootState) => state.${sliceKey}?.selectedBranch?.loading;
export const selectSelectedTill = (state: RootState) => state.${sliceKey}?.selectedTill?.value;
export const selectSelectedTillLoading = (state: RootState) => state.${sliceKey}?.selectedTill?.loading;
export const selectAttachedInstitutions = (state: RootState) => state.${sliceKey}?.InstitutionsAttached?.value || [];
export const selectAttachedInstitutionsLoading = (state: RootState) => state.${sliceKey}?.InstitutionsAttached?.loading;
export const selectTemporaryPermissions = (state: RootState) => state.${sliceKey}?.temporaryPermissions;
export const selectInactivityTimeout = (state: RootState) => state.${sliceKey}?.inactivityTimeout;
export const selectLogoutWarningVisible = (state: RootState) => state.${sliceKey}?.logoutWarningVisible;
export const selectRefreshInProgress = (state: RootState) => state.${sliceKey}?.refreshInProgress;

`;
};

// List of all auth selectors for import replacement
export const authSelectorNames = [
	"selectUser",
	"selectUserLoading",
	"selectAccessToken",
	"selectRefreshToken",
	"selectSelectedInstitution",
	"selectSelectedInstitutionLoading",
	"selectSelectedBranch",
	"selectSelectedBranchLoading",
	"selectSelectedTill",
	"selectSelectedTillLoading",
	"selectAttachedInstitutions",
	"selectAttachedInstitutionsLoading",
	"selectTemporaryPermissions",
	"selectInactivityTimeout",
	"selectLogoutWarningVisible",
	"selectRefreshInProgress",
];
