import { createSelector } from "reselect";

import { RootState } from "../rootReducer";

const authSlice = (state: RootState) => state.auth;

export const selectUser = createSelector([authSlice], (slice) => slice.user.value);

export const selectAuthError = createSelector([authSlice], (slice) => slice.user.error);

export const selectUserLoading = createSelector([authSlice], (slice) => slice.user.loading);

export const selectAccessToken = createSelector([authSlice], (slice) => slice.accessToken);

export const selectRefreshToken = createSelector([authSlice], (slice) => slice.refreshToken);

export const selectSelectedInstitution = createSelector(
	[authSlice],
	(slice) => slice.selectedInstitution.value,
);

export const selectSelectedInstitutionLoading = createSelector(
	[authSlice],
	(slice) => slice.selectedInstitution.loading,
);

export const selectSelectedBranch = createSelector(
	[authSlice],
	(slice) => slice.selectedBranch.value,
);

export const selectSelectedBranchLoading = createSelector(
	[authSlice],
	(slice) => slice.selectedBranch.loading,
);

export const selectSelectedTill = createSelector([authSlice], (slice) => slice.selectedTill.value);

export const selectSelectedTillLoading = createSelector(
	[authSlice],
	(slice) => slice.selectedTill.loading,
);

export const selectAttachedInstitutions = createSelector(
	[authSlice],
	(slice) => slice.InstitutionsAttached.value || [],
);

export const selectAttachedInstitutionsLoading = createSelector(
	[authSlice],
	(slice) => slice.InstitutionsAttached.loading,
);

export const selectTemporaryPermissions = createSelector(
	[authSlice],
	(slice) => slice.temporaryPermissions,
);

export const selectInactivityTimeout = createSelector(
	[authSlice],
	(slice) => slice.inactivityTimeout,
);
export const selectLogoutWarningVisible = createSelector(
	[authSlice],
	(slice) => slice.logoutWarningVisible,
);
export const selectRefreshInProgress = createSelector(
	[authSlice],
	(slice) => slice.refreshInProgress,
);
