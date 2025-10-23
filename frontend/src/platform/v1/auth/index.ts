// Re-export auth utilities from your existing store
export { hasPermission } from "@/lib/helpers";

export {
	selectAccessToken,
	selectSelectedInstitution,
	selectUser,
	selectUserLoading,
	selectAttachedInstitutions,
	selectSelectedBranch,
	selectRefreshToken,
	selectAuthError,
	selectTemporaryPermissions,
	selectInactivityTimeout,
	selectLogoutWarningVisible,
	selectRefreshInProgress,
	selectRelatedEmployee,
	selectRelatedEmployeeLoading,
	selectLastRefreshTimeInMilliseconds,
} from "@/store/auth/selectors";

export {
	loginStart,
	logoutStart,
	setCurrentUser,
	setAccessToken,
	setRefreshToken,
	clearAuthError,
	setSelectedInstitution,
	setSelectedBranch,
	setAttachedInstitutions,
	fetchRemoteUserStart,
	fetchUpToDateInstitution,
	setTemporaryPermissions,
	clearTemporaryPermissions,
	userActivityDetected,
	showLogoutWarning,
	hideLogoutWarning,
	confirmLogout,
	cancelLogout,
	refreshAccessTokenStart,
	refreshAccessTokenSuccess,
	refreshAccessTokenFailure,
	setInactivityTimeout,
	setLastRefreshTime,
	fetchRelatedEmployeeStart,
	fetchRelatedEmployeeSuccess,
	fetchRelatedEmployeeFailure,
	clearRelatedEmployee,
} from "@/store/auth/actions";

// Auth types
export type { IUser, Role, Permission } from "@/types/user.types";
export type { IUserInstitution } from "@/types/other";

// Auth utilities
export const getAuthHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	"Content-Type": "application/json",
});

export const isAuthenticated = (token: string | null): boolean => {
	return !!token && token.length > 0;
};
