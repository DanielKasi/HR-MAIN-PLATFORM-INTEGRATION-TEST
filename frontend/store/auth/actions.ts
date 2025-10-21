import { ActionWithPayLoad, Action, createAction } from "../storeUtils";

import { AUTH_ACTION_TYPES } from "./types";
import { AuthError } from "./reducer";

import { StoredColorData, IUserInstitution } from "@/types/other";
import { Permission, IUser } from "@/types/user.types";
import { Branch } from "@/types/branch.types";
import { getAuthError } from "@/utils/error-utils";
import { IEmployee } from "@/types/types.utils";

type UpdateThemeAction = ActionWithPayLoad<AUTH_ACTION_TYPES.UPDATE_THEME, StoredColorData>;
type RemoveThemeAction = Action<AUTH_ACTION_TYPES.REMOVE_THEME>;

type LoginStart = ActionWithPayLoad<
	AUTH_ACTION_TYPES.LOGIN_START,
	{ username: string; password: string }
>;

type LoginFailure = ActionWithPayLoad<AUTH_ACTION_TYPES.LOGIN_FAILURE, AuthError>;

type FetchRemoteUserStart = Action<AUTH_ACTION_TYPES.FETCH_REMOTE_USER_START>;
type FetchRemoteUserFailure = Action<AUTH_ACTION_TYPES.FETCH_REMOTE_USER_FAILURE>;

type SetUser = ActionWithPayLoad<AUTH_ACTION_TYPES.SET_USER, IUser>;

type LogoutStart = Action<AUTH_ACTION_TYPES.LOGOUT_START>;

type LogoutFailure = ActionWithPayLoad<AUTH_ACTION_TYPES.LOGOUT_FAILURE, string>;

type LogoutSuccess = Action<AUTH_ACTION_TYPES.LOGOUT_SUCCESS>;

type SetRefreshToken = ActionWithPayLoad<AUTH_ACTION_TYPES.SET_REFRESH_TOKEN, string>;

type SetAccessToken = ActionWithPayLoad<AUTH_ACTION_TYPES.SET_ACCESS_TOKEN, string>;

type SetSelectedInstitution = ActionWithPayLoad<
	AUTH_ACTION_TYPES.SET_SELECTED_INSTITUTION,
	IUserInstitution
>;
type SetSelectedBranch = ActionWithPayLoad<AUTH_ACTION_TYPES.SET_SELECTED_BRANCH, Branch>;

type SetAttachedInstitutions = ActionWithPayLoad<
	AUTH_ACTION_TYPES.SET_ATTACHED_INSTITUTIONS,
	IUserInstitution[]
>;

type ClearAuthError = Action<AUTH_ACTION_TYPES.CLEAR_AUTH_ERROR>;

type FetchUpToDateInstitution = Action<AUTH_ACTION_TYPES.FETCH_UP_TO_DATE_INSTITUTION>;

type SetTemporaryPermissions = ActionWithPayLoad<
	AUTH_ACTION_TYPES.SET_TEMPORARY_PERMISSIONS,
	Permission[]
>;
type ClearTemporaryPermissions = Action<AUTH_ACTION_TYPES.CLEAR_TEMPORARY_PERMISSIONS>;

type FetchRelatedEmployeeStart = ActionWithPayLoad<
	AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_START,
	{ userId: number }
>;
type FetchRelatedEmployeeSuccess = ActionWithPayLoad<
	AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_SUCCESS,
	IEmployee
>;
type FetchRelatedEmployeeFailure = Action<AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_FAILURE>;
type ClearRelatedEmployee = Action<AUTH_ACTION_TYPES.CLEAR_RELATED_EMPLOYEE>;
type SetLastRefreshTime = ActionWithPayLoad<AUTH_ACTION_TYPES.SET_LAST_REFRESH_TIME, number>;

export type AuthAction =
	| LoginStart
	| LoginFailure
	| SetUser
	| LogoutStart
	| LogoutFailure
	| LogoutSuccess
	| SetRefreshToken
	| SetAccessToken
	| SetSelectedInstitution
	| RemoveThemeAction
	| UpdateThemeAction
	| ClearAuthError
	| FetchRemoteUserFailure
	| FetchRemoteUserStart
	| FetchUpToDateInstitution
	| SetTemporaryPermissions
	| ClearTemporaryPermissions
	| Action<AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED>
	| Action<AUTH_ACTION_TYPES.SHOW_LOGOUT_WARNING>
	| Action<AUTH_ACTION_TYPES.HIDE_LOGOUT_WARNING>
	| Action<AUTH_ACTION_TYPES.CONFIRM_LOGOUT>
	| Action<AUTH_ACTION_TYPES.CANCEL_LOGOUT>
	| Action<AUTH_ACTION_TYPES.REFRESH_TOKENS_START>
	| Action<AUTH_ACTION_TYPES.REFRESH_TOKENS_SUCCESS>
	| Action<AUTH_ACTION_TYPES.REFRESH_TOKENS_FAILURE>
	| SetLastRefreshTime
	| FetchRelatedEmployeeStart
	| FetchRelatedEmployeeFailure
	| FetchRelatedEmployeeSuccess
	| ClearRelatedEmployee;

export const loginStart = (username: string, password: string): LoginStart =>
	createAction(AUTH_ACTION_TYPES.LOGIN_START, { username, password });
export const loginFailure = (error: unknown): LoginFailure =>
	createAction(AUTH_ACTION_TYPES.LOGIN_FAILURE, getAuthError(error));

export const logoutStart = (): LogoutStart => createAction(AUTH_ACTION_TYPES.LOGOUT_START);
export const logoutFailure = (errorMessage: string): LogoutFailure =>
	createAction(AUTH_ACTION_TYPES.LOGOUT_FAILURE, errorMessage);
export const logoutSuccess = (): LogoutSuccess => createAction(AUTH_ACTION_TYPES.LOGOUT_SUCCESS);

export const setCurrentUser = (user: IUser): SetUser =>
	createAction(AUTH_ACTION_TYPES.SET_USER, user);

export const setRefreshToken = (token: string): SetRefreshToken =>
	createAction(AUTH_ACTION_TYPES.SET_REFRESH_TOKEN, token);
export const setAccessToken = (token: string): SetAccessToken =>
	createAction(AUTH_ACTION_TYPES.SET_ACCESS_TOKEN, token);

export const clearAuthError = (): ClearAuthError =>
	createAction(AUTH_ACTION_TYPES.CLEAR_AUTH_ERROR);

export const setSelectedInstitution = (Institution: IUserInstitution): SetSelectedInstitution =>
	createAction(AUTH_ACTION_TYPES.SET_SELECTED_INSTITUTION, Institution);

export const setSelectedBranch = (branch: Branch): SetSelectedBranch =>
	createAction(AUTH_ACTION_TYPES.SET_SELECTED_BRANCH, branch);

export const setAttachedInstitutions = (
	Institutions: IUserInstitution[],
): SetAttachedInstitutions =>
	createAction(AUTH_ACTION_TYPES.SET_ATTACHED_INSTITUTIONS, Institutions);

export const updateThemeStart = (colorData: StoredColorData): UpdateThemeAction =>
	createAction(AUTH_ACTION_TYPES.UPDATE_THEME, colorData);

export const removeThemeStart = (): RemoveThemeAction =>
	createAction(AUTH_ACTION_TYPES.REMOVE_THEME);

export const fetchRemoteUserStart = (): FetchRemoteUserStart =>
	createAction(AUTH_ACTION_TYPES.FETCH_REMOTE_USER_START);

export const fetchUpToDateInstitution = (): FetchUpToDateInstitution =>
	createAction(AUTH_ACTION_TYPES.FETCH_UP_TO_DATE_INSTITUTION);

export const setTemporaryPermissions = (
	temporaryPermissions: Permission[],
): SetTemporaryPermissions =>
	createAction(AUTH_ACTION_TYPES.SET_TEMPORARY_PERMISSIONS, temporaryPermissions);
export const clearTemporaryPermissions = (): ClearTemporaryPermissions =>
	createAction(AUTH_ACTION_TYPES.CLEAR_TEMPORARY_PERMISSIONS);

export const userActivityDetected = () => createAction(AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED);
export const showLogoutWarning = () => createAction(AUTH_ACTION_TYPES.SHOW_LOGOUT_WARNING);
export const hideLogoutWarning = () => createAction(AUTH_ACTION_TYPES.HIDE_LOGOUT_WARNING);
export const confirmLogout = () => createAction(AUTH_ACTION_TYPES.CONFIRM_LOGOUT);
export const cancelLogout = () => createAction(AUTH_ACTION_TYPES.CANCEL_LOGOUT);
export const refreshAccessTokenStart = () => createAction(AUTH_ACTION_TYPES.REFRESH_TOKENS_START);
export const refreshAccessTokenSuccess = () =>
	createAction(AUTH_ACTION_TYPES.REFRESH_TOKENS_SUCCESS);
export const refreshAccessTokenFailure = () =>
	createAction(AUTH_ACTION_TYPES.REFRESH_TOKENS_FAILURE);
export const setInactivityTimeout = (timeout: number) =>
	createAction(AUTH_ACTION_TYPES.SET_INACTIVITY_TIMEOUT, timeout);

export const setLastRefreshTime = (timeStampMIlliseconds: number): SetLastRefreshTime =>
	createAction(AUTH_ACTION_TYPES.SET_LAST_REFRESH_TIME, timeStampMIlliseconds);

export const fetchRelatedEmployeeStart = ({
	userId,
}: {
	userId: number;
}): FetchRelatedEmployeeStart => {
	// console.log("\n\n Starting related employee fetch in state action ...");
	return createAction(AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_START, { userId });
};
export const fetchRelatedEmployeeSuccess = ({
	employee,
}: {
	employee: IEmployee;
}): FetchRelatedEmployeeSuccess => {
	// console.log("\n\n Success on related employee fetch in state action ...");
	return createAction(AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_SUCCESS, employee);
};

export const fetchRelatedEmployeeFailure = (): FetchRelatedEmployeeFailure => {
	return createAction(AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_FAILURE);
};

export const clearRelatedEmployee = (): ClearRelatedEmployee =>
	createAction(AUTH_ACTION_TYPES.CLEAR_RELATED_EMPLOYEE);
