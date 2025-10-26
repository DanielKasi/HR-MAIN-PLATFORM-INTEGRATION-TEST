// AUTO-GENERATED - DO NOT EDIT
// Generated for module: task-management
// Generated at: 2025-10-26T15:31:24.284Z

import { RootState } from "@/store";

// Auth selectors for slice: taskManagementAuth
export const selectUser = (state: RootState) => state.taskManagementAuth?.user?.value;
export const selectUserLoading = (state: RootState) => state.taskManagementAuth?.user?.loading;
export const selectAuthError = (state: RootState) => state.taskManagementAuth?.user?.error;
export const selectAccessToken = (state: RootState) => state.taskManagementAuth?.accessToken;
export const selectRefreshToken = (state: RootState) => state.taskManagementAuth?.refreshToken;
export const selectSelectedInstitution = (state: RootState) =>
	state.taskManagementAuth?.selectedInstitution?.value;
export const selectSelectedInstitutionLoading = (state: RootState) =>
	state.taskManagementAuth?.selectedInstitution?.loading;
export const selectSelectedBranch = (state: RootState) =>
	state.taskManagementAuth?.selectedBranch?.value;
export const selectSelectedBranchLoading = (state: RootState) =>
	state.taskManagementAuth?.selectedBranch?.loading;
export const selectSelectedTill = (state: RootState) =>
	state.taskManagementAuth?.selectedTill?.value;
export const selectSelectedTillLoading = (state: RootState) =>
	state.taskManagementAuth?.selectedTill?.loading;
export const selectAttachedInstitutions = (state: RootState) =>
	state.taskManagementAuth?.InstitutionsAttached?.value || [];
export const selectAttachedInstitutionsLoading = (state: RootState) =>
	state.taskManagementAuth?.InstitutionsAttached?.loading;
export const selectTemporaryPermissions = (state: RootState) =>
	state.taskManagementAuth?.temporaryPermissions;
export const selectInactivityTimeout = (state: RootState) =>
	state.taskManagementAuth?.inactivityTimeout;
export const selectLogoutWarningVisible = (state: RootState) =>
	state.taskManagementAuth?.logoutWarningVisible;
export const selectRefreshInProgress = (state: RootState) =>
	state.taskManagementAuth?.refreshInProgress;

// Miscellaneous selectors for slice: taskManagementMisc
export const selectSideBarOpened = (state: RootState) => state.taskManagementMisc?.sideBarOpened;
export const selectSelectedTask = (state: RootState) => state.taskManagementMisc?.selectedTask;

// Redirects selectors for slice: taskManagementRedirects
export const selectRedirectIntent = (state: RootState) => state.taskManagementRedirects?.intent;
export const selectRedirectIntentId = (state: RootState) =>
	state.taskManagementRedirects?.intent_id;

// Notifications selectors for slice: taskManagementNotifications
export const selectNotifications = (state: RootState) =>
	state.taskManagementNotifications?.notifications || [];
export const selectUnreadCount = (state: RootState) =>
	state.taskManagementNotifications?.unreadCount || 0;
