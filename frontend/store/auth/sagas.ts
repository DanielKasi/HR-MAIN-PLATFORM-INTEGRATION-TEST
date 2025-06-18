import {call, all, takeLatest, put, select, fork} from "redux-saga/effects";

import {ActionWithPayLoad} from "../storeUtils";
import {toggleSideBarAction} from "../miscellaneous/actions";
import {selectSidebarOpened} from "../miscellaneous/selectors";

import {AUTH_ACTION_TYPES} from "./types";
import {
  loginFailure,
  logoutFailure,
  logoutSuccess,
  setAccessToken,
  setAttachedInstitutions,
  setRefreshToken,
  setSelectedBranch,
  setSelectedInstitution,
  setUserAction,
} from "./actions";
import {selectSelectedInstitution, selectUser} from "./selectors";

import {
  fetchRemoteInstitutionById,
  fetchUserAttachedInstitutions,
  fetchUserById,
  LoginResponse,
  loginWithEmailAndPassword,
} from "@/utils/authUtils";
import {IUser, IUserInstitution} from "@/app/types";
// import { IUserInstitution } from "@/app/types";
// import { selectAttachedInstitutions } from "./selectors";

function* login({
  payload: {email, password},
}: ActionWithPayLoad<AUTH_ACTION_TYPES.LOGIN_START, {email: string; password: string}>) {
  try {
    const loginResponse: LoginResponse = yield call(loginWithEmailAndPassword, email, password);

    if (!loginResponse.user || !loginResponse.tokens.access || !loginResponse.tokens.refresh) {
      throw new Error("Failed to login");
    }
    yield put(setAccessToken(loginResponse.tokens.access));
    yield put(setRefreshToken(loginResponse.tokens.refresh));
    yield put(setUserAction(loginResponse.user));

    if (loginResponse.InstitutionsAttached.length) {
      yield put(setAttachedInstitutions(loginResponse.InstitutionsAttached));
      yield put(setSelectedInstitution(loginResponse.InstitutionsAttached[0]));
      if (
        loginResponse.InstitutionsAttached[0].branches &&
        loginResponse.InstitutionsAttached[0].branches.length
      ) {
        yield put(setSelectedBranch(loginResponse.InstitutionsAttached[0].branches[0]));
      }
    }
  } catch (error: any) {
    yield put(loginFailure(error));
  }
}

export function* watchLogin() {
  yield takeLatest(AUTH_ACTION_TYPES.LOGIN_START, login);
}

function* logout() {
  const defaultPrimaryColor = "142.1 76.2% 36.3%";
  const defaultRingColor = "142.1 76.2% 36.3%";
  const defaultSideBarAccentColor = "240 4.8% 95.9%";

  try {
    yield put(logoutSuccess());
    document.documentElement.style.setProperty("--primary", defaultPrimaryColor);
    document.documentElement.style.setProperty("--ring", defaultRingColor);
    document.documentElement.style.setProperty("--sidebar-accent", defaultSideBarAccentColor);
    const sideBarOpened: boolean = yield select(selectSidebarOpened);

    if (!sideBarOpened) {
      yield put(toggleSideBarAction());
    }
  } catch {
    yield put(logoutFailure("Something went wrong !"));
  }
}

function* fetchRemoteUser() {
  try {
    const currentUser: IUser | null = yield select(selectUser);

    if (!currentUser) {
      return;
    }
    const user: IUser | null = yield call(fetchUserById, currentUser.id);

    if (user) {
      yield put(setUserAction(user));
    }
  } catch {}
}

function* fetchRemoteInstitution() {
  try {
    const selectedInstitution: IUserInstitution | null = yield select(selectSelectedInstitution);

    if (selectedInstitution) {
      const upToDateInstitution: IUserInstitution | null = yield call(fetchRemoteInstitutionById, selectedInstitution.id);
      const attachedInstitutions: IUserInstitution[] | null = yield call(fetchUserAttachedInstitutions);

      if (upToDateInstitution) {
        yield put(setSelectedInstitution(upToDateInstitution));
      }
      if (attachedInstitutions && attachedInstitutions.length) {
        yield put(setAttachedInstitutions(attachedInstitutions));
      }
    }
  } catch {}
}

export function* watchLogout() {
  yield takeLatest(AUTH_ACTION_TYPES.LOGOUT_START, logout);
}
export function* watchFetchRemoteUser() {
  yield takeLatest(AUTH_ACTION_TYPES.FETCH_REMOTE_USER_START, fetchRemoteUser);
}

export function* watchUpToDateInstitutionFetch() {
  yield takeLatest(AUTH_ACTION_TYPES.FETCH_UPTODATE_Institution, fetchRemoteInstitution);
}

export function* authSaga() {
  yield all([
    fork(watchLogin),
    fork(watchLogout),
    fork(watchFetchRemoteUser),
    fork(watchUpToDateInstitutionFetch),
  ]);
}
