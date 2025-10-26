import { ActionWithPayLoad, Action, createAction } from "../storeUtils";

import { AUTH_ACTION_TYPES } from "./types";
import { AuthError } from "./reducer";

import { getAuthError } from "@/utils/error-utils";
import { ITill, IUserInstitution, StoredColorData } from "@/types/other";
import { IUser, Permission } from "@/types/user.types";
import { Branch } from "@/types/branch.types";

type UpdateThemeAction = ActionWithPayLoad<AUTH_ACTION_TYPES.UPDATE_THEME, StoredColorData>;
type RemoveThemeAction = Action<AUTH_ACTION_TYPES.REMOVE_THEME>;

type LoginStart = ActionWithPayLoad<
	AUTH_ACTION_TYPES.LOGIN_START,
	{ email: string; password: string }
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

type SetSelectedTill = ActionWithPayLoad<AUTH_ACTION_TYPES.SET_SELECTED_TILL, ITill>;
type ClearSelectedTill = Action<AUTH_ACTION_TYPES.CLEAR_SELECTED_TILL>;

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
	| SetSelectedTill
	| ClearSelectedTill
	| Action<AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED>
	| Action<AUTH_ACTION_TYPES.SHOW_LOGOUT_WARNING>
	| Action<AUTH_ACTION_TYPES.HIDE_LOGOUT_WARNING>
	| Action<AUTH_ACTION_TYPES.CONFIRM_LOGOUT>
	| Action<AUTH_ACTION_TYPES.CANCEL_LOGOUT>
	| Action<AUTH_ACTION_TYPES.REFRESH_TOKENS_START>
	| Action<AUTH_ACTION_TYPES.REFRESH_TOKENS_SUCCESS>
	| Action<AUTH_ACTION_TYPES.REFRESH_TOKENS_FAILURE>;

export const loginStart = (email: string, password: string): LoginStart =>
	createAction(AUTH_ACTION_TYPES.LOGIN_START, { email, password });
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

export const setSelectedTill = (till: ITill): SetSelectedTill =>
	createAction(AUTH_ACTION_TYPES.SET_SELECTED_TILL, till);

export const clearSelectedTill = (): ClearSelectedTill =>
	createAction(AUTH_ACTION_TYPES.CLEAR_SELECTED_TILL);

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

// Inactivity monitoring mechanism

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
