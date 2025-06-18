import {IPermission, IUser, IUserInstitution} from "@/app/types";
import apiRequest from "@/lib/apiRequest";
import {getInstitutionById} from "@/lib/helpers";
import {store} from "@/store";
import {clearTemporaryPermissions, setTemporaryPermissions} from "@/store/auth/actions";

export type LoginResponse = {
  tokens: {
    access: string;
    refresh: string;
  };
  user: IUser;
  InstitutionsAttached: IUserInstitution[];
};

export const loginWithEmailAndPassword = async (email: string, password: string) => {
  const response = await apiRequest.post("user/login/", {email: email, password: password});
  const responseData = response.data;

  return {
    ...responseData,
    InstitutionsAttached: response.data.institution_attached,
  } as LoginResponse;
};

export const fetchUserById = async (userId: number): Promise<IUser | null> => {
  try {
    const response = await apiRequest.get(`user/${userId}/`);

    return response.data as IUser;
  } catch {
    return null;
  }
};

export const fetchUserAttachedInstitutions = async (): Promise<IUserInstitution[] | null> => {
  try {
    const response = await apiRequest.get("user/Institutions/");

    return response.data as IUserInstitution[];
  } catch {
    return null;
  }
};

export const fetchRemoteInstitutionById = async (
  InstitutionId: number,
): Promise<IUserInstitution | null> => {
  try {
    const response = await getInstitutionById(InstitutionId);

    return response.data as IUserInstitution;
  } catch {
    return null;
  }
};

export function hasTemporaryPermissions(): boolean {
  const state = store.getState();

  return state.auth.temporaryPermissions.length > 0;
}

// Optional: Auto-clear temporary permissions after a certain time
export function setTemporaryPermissionsWithTimeout(
  permissions: IPermission[],
  timeoutMs: number = 30 * 60 * 1000, // 30 minutes default
) {
  store.dispatch(setTemporaryPermissions(permissions));

  setTimeout(() => {
    store.dispatch(clearTemporaryPermissions());
  }, timeoutMs);
}
