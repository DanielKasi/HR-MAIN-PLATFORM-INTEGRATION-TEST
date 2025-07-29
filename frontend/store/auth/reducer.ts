import {AuthAction} from "./actions";
import {AUTH_ACTION_TYPES} from "./types";

import {Branch, IPermission, ITill, IUser, IUserInstitution, StoredColorData} from "@/app/types";
import {CUSTOM_CODES} from "@/app/types/types.utils";

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
  temporaryPermissions: IPermission[];
};

const intialAuthState: AuthState = {
  refreshToken: "",
  accessToken: "",
  user: {
    loading: false,
    value: null,
    error: null,
  },
  InstitutionsAttached: {loading: false, value: []},
  selectedInstitution: {loading: false, value: null},
  selectedBranch: {loading: false, value: null},
  selectedTill: {loading: false, value: null},
  temporaryPermissions: [],
};

export const authReducer = (
  state = intialAuthState,
  action: AuthAction | {type: string; payload?: unknown},
): AuthState => {
  switch (action.type) {
    case AUTH_ACTION_TYPES.LOGIN_START:
    case AUTH_ACTION_TYPES.LOGOUT_START:
      return {...state, user: {...state.user, loading: true}};

    case AUTH_ACTION_TYPES.LOGIN_FAILURE:
      return {
        ...state,
        user: {...state.user, error: action.payload as AuthError, loading: false},
      };
    case AUTH_ACTION_TYPES.LOGOUT_FAILURE:
      return {
        ...state,
        user: {
          ...state.user,
          error: {...state.user.error, message: action.payload as string} as AuthError,
          loading: false,
        },
      };
    case AUTH_ACTION_TYPES.SET_ACCESS_TOKEN:
      return {...state, accessToken: action.payload as string};

    case AUTH_ACTION_TYPES.SET_REFRESH_TOKEN:
      return {...state, refreshToken: action.payload as string};

    case AUTH_ACTION_TYPES.SET_ATTACHED_InstitutionS:
      return {
        ...state,
        InstitutionsAttached: {
          ...state.InstitutionsAttached,
          value: action.payload as IUserInstitution[],
        },
      };

    case AUTH_ACTION_TYPES.SET_SELECTED_Institution:
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
      return {...state, user: {...state.user, error: null}};

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
          value: {...state.selectedInstitution.value, theme_color: ""} as IUserInstitution,
        },
      };

    case AUTH_ACTION_TYPES.LOGOUT_SUCCESS:
      return {...intialAuthState};

    case AUTH_ACTION_TYPES.SET_TEMPORARY_PERMISSIONS:
      return {
        ...state,
        temporaryPermissions: action.payload as IPermission[],
      };
    case AUTH_ACTION_TYPES.CLEAR_TEMPORARY_PERMISSIONS:
      return {...state, temporaryPermissions: []};

    default:
      return state;
  }
};
