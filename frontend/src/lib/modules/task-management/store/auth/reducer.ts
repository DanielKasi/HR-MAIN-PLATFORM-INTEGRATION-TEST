import { AuthAction } from "./actions";
import { AUTH_ACTION_TYPES } from "./types";

import { Permission } from "@/types/user.types";
import { Branch } from "@/types/branch.types";
import { IUser } from "@/types/user.types";
import { StoredColorData, ITill, IUserInstitution } from "@/types/other";
import { CUSTOM_CODES } from "@/constants";

export type AuthError = {
	customCode: CUSTOM_CODES;
	message: string;
};

export type AuthState = {
	refreshToken: string;
	accessToken: string;
	user: {
		loading: boolean;
		value: IUser | null;
		error: AuthError | null;
	};
	InstitutionsAttached: {
		value: IUserInstitution[];
		loading: boolean;
	};
	selectedInstitution: {
		value: IUserInstitution | null;
		loading: boolean;
	};
	selectedBranch: {
		value: Branch | null;
		loading: boolean;
	};
	selectedTill: {
		value: ITill | null;
		loading: boolean;
	};
	temporaryPermissions: Permission[];
	inactivityTimeout: number; // In milliseconds
	logoutWarningVisible: boolean;
	refreshInProgress: boolean;
};

const intialAuthState: AuthState = {
	refreshToken: "",
	accessToken: "",
	user: {
		loading: false,
		value: null,
		error: null,
	},
	InstitutionsAttached: { loading: false, value: [] },
	selectedInstitution: { loading: false, value: null },
	selectedBranch: { loading: false, value: null },
	selectedTill: { loading: false, value: null },
	temporaryPermissions: [],
	inactivityTimeout: 0,
	logoutWarningVisible: false,
	refreshInProgress: false,
};

export const authReducer = (
	state = intialAuthState,
	action: AuthAction | { type: string; payload?: unknown },
): AuthState => {
	switch (action.type) {
		case AUTH_ACTION_TYPES.LOGIN_START:
		case AUTH_ACTION_TYPES.LOGOUT_START:
			return { ...state, user: { ...state.user, loading: true } };

		case AUTH_ACTION_TYPES.LOGIN_FAILURE:
			return {
				...state,
				user: { ...state.user, error: action.payload as AuthError, loading: false },
			};
		case AUTH_ACTION_TYPES.LOGOUT_FAILURE:
			return {
				...state,
				user: {
					...state.user,
					error: { ...state.user.error, message: action.payload as string } as AuthError,
					loading: false,
				},
			};
		case AUTH_ACTION_TYPES.SET_ACCESS_TOKEN:
			return { ...state, accessToken: action.payload as string };

		case AUTH_ACTION_TYPES.SET_REFRESH_TOKEN:
			return { ...state, refreshToken: action.payload as string };

		case AUTH_ACTION_TYPES.SET_ATTACHED_INSTITUTIONS:
			return {
				...state,
				InstitutionsAttached: {
					...state.InstitutionsAttached,
					value: action.payload as IUserInstitution[],
				},
			};

		case AUTH_ACTION_TYPES.SET_SELECTED_INSTITUTION:
			return {
				...state,
				selectedInstitution: {
					...state.selectedInstitution,
					value: action.payload as IUserInstitution,
				},
			};

		case AUTH_ACTION_TYPES.SET_SELECTED_BRANCH:
			return {
				...state,
				selectedBranch: {
					...state.selectedBranch,
					value: action.payload as Branch,
				},
			};
		case AUTH_ACTION_TYPES.SET_SELECTED_TILL:
			return {
				...state,
				selectedTill: {
					...state.selectedBranch,
					value: action.payload as ITill,
					loading: false,
				},
			};

		case AUTH_ACTION_TYPES.CLEAR_SELECTED_TILL:
			return {
				...state,
				selectedTill: {
					...state.selectedBranch,
					value: null,
					loading: false,
				},
			};

		case AUTH_ACTION_TYPES.SET_USER:
			return {
				...state,
				user: {
					...state.user,
					error: null,
					loading: false,
					value: action.payload as IUser,
				},
			};

		case AUTH_ACTION_TYPES.CLEAR_AUTH_ERROR:
			return { ...state, user: { ...state.user, error: null } };

		case AUTH_ACTION_TYPES.UPDATE_THEME:
			return {
				...state,
				selectedInstitution: {
					...state.selectedInstitution,
					value: {
						...state.selectedInstitution.value,
						theme_color: (action.payload as StoredColorData).colors[0] as string,
					} as IUserInstitution,
				},
			};
		case AUTH_ACTION_TYPES.REMOVE_THEME:
			return {
				...state,
				selectedInstitution: {
					...state.selectedInstitution,
					value: { ...state.selectedInstitution.value, theme_color: "" } as IUserInstitution,
				},
			};

		case AUTH_ACTION_TYPES.LOGOUT_SUCCESS:
			return { ...intialAuthState };

		case AUTH_ACTION_TYPES.SET_TEMPORARY_PERMISSIONS:
			return {
				...state,
				temporaryPermissions: action.payload as Permission[],
			};
		case AUTH_ACTION_TYPES.CLEAR_TEMPORARY_PERMISSIONS:
			// console.log("\n\n Got dispatched action : ", action)
			return { ...state, temporaryPermissions: [] };
		case AUTH_ACTION_TYPES.SET_INACTIVITY_TIMEOUT:
			return { ...state, inactivityTimeout: action.payload as number };
		case AUTH_ACTION_TYPES.SHOW_LOGOUT_WARNING:
			return { ...state, logoutWarningVisible: true };
		case AUTH_ACTION_TYPES.HIDE_LOGOUT_WARNING:
			return { ...state, logoutWarningVisible: false };
		case AUTH_ACTION_TYPES.REFRESH_TOKENS_START:
			return { ...state, refreshInProgress: true };
		case AUTH_ACTION_TYPES.REFRESH_TOKENS_SUCCESS:
		case AUTH_ACTION_TYPES.REFRESH_TOKENS_FAILURE:
			return { ...state, refreshInProgress: false, logoutWarningVisible: false };
		default:
			return state;
	}
};
