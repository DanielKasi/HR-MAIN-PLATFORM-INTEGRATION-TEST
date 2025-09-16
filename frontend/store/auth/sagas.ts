import { call, all, takeLatest, put, select, fork, take, delay, race, cancel, Effect, SelectEffect } from "redux-saga/effects";

import { ActionWithPayLoad, parseJwtLifetime } from "../storeUtils";
import { clearEmployeeForm, toggleSideBarAction } from "../miscellaneous/actions";
import { selectSideBarOpened } from "../miscellaneous/selectors";

import { AUTH_ACTION_TYPES } from "./types";
import {
  loginFailure,
  logoutFailure,
  logoutSuccess,
  setAccessToken,
  setAttachedInstitutions,
  setRefreshToken,
  setSelectedBranch,
  setSelectedInstitution,
  setCurrentUser,
  hideLogoutWarning,
  refreshAccessTokenFailure,
  refreshAccessTokenStart,
  refreshAccessTokenSuccess,
  setInactivityTimeout,
  showLogoutWarning,
  userActivityDetected,
  logoutStart,
} from "./actions";
import { selectInactivityTimeout, selectRefreshInProgress, selectRefreshToken, selectSelectedInstitution, selectUser } from "./selectors";

import {
  AUTH_API,
  fetchUserAttachedInstitutions,
  fetchUserById,
  LoginResponse,
  loginWithEmailAndPassword,
} from "@/utils/auth-utils";
import { IUser, IUserInstitution } from "@/types";
import { Task } from "redux-saga";


interface InactivityRaceResult {
  timeout?: unknown;
  cancel?: unknown;
  confirm?: unknown;
  activity?: unknown;
}

function* login({
  payload: { email, password },
}: ActionWithPayLoad<AUTH_ACTION_TYPES.LOGIN_START, { email: string; password: string }>) {
  try {
    const loginResponse: LoginResponse = yield call(loginWithEmailAndPassword, email, password);

    if (!loginResponse.user || !loginResponse.tokens.access || !loginResponse.tokens.refresh) {
      throw new Error("Failed to login");
    }
    yield put(setAccessToken(loginResponse.tokens.access));
    yield put(setRefreshToken(loginResponse.tokens.refresh));

    const lifetime: number = parseJwtLifetime(loginResponse.tokens.access);
    yield put(setInactivityTimeout(lifetime));
    yield put(setCurrentUser(loginResponse.user));
    yield put(userActivityDetected());

    if (loginResponse.institution_attached.length) {
      yield put(setAttachedInstitutions(loginResponse.institution_attached));
      yield put(setSelectedInstitution(loginResponse.institution_attached[0]));
      if (
        loginResponse.institution_attached[0].branches &&
        loginResponse.institution_attached[0].branches.length
      ) {
        yield put(setSelectedBranch(loginResponse.institution_attached[0].branches[0]));
      }
    }
  } catch (error: any) {
    yield put(loginFailure(error));
  }
}



function* logout() {
  const defaultPrimaryColor = "142.1 76.2% 36.3%";
  const defaultRingColor = "142.1 76.2% 36.3%";
  const defaultSideBarAccentColor = "240 4.8% 95.9%";

  try {
    yield put(clearEmployeeForm());
    yield put(logoutSuccess());
    document.documentElement.style.setProperty("--primary", defaultPrimaryColor);
    document.documentElement.style.setProperty("--ring", defaultRingColor);
    document.documentElement.style.setProperty("--sidebar-accent", defaultSideBarAccentColor);
    const sideBarOpened: boolean = yield select(selectSideBarOpened);

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
      yield put(setCurrentUser(user));
    }
  } catch { }
}

function* fetchRemoteInstitution() {

  try {
    const selectedInstitution: IUserInstitution | null = yield select(selectSelectedInstitution);

    if (selectedInstitution) {
      const attachedInstitutions: IUserInstitution[] = yield call(fetchUserAttachedInstitutions);
      const upToDateInstitution = attachedInstitutions?.find(
        (institution) => institution.id === selectedInstitution.id,
      );

      if (upToDateInstitution) {
        yield put(setSelectedInstitution(upToDateInstitution));
      }
      if (attachedInstitutions && attachedInstitutions.length) {
        yield put(setAttachedInstitutions(attachedInstitutions));
      }
    }
  } catch { }
}

function* resetInactivityOnAccessRefreshed() {
  try {
    const refreshToken: string = yield select(selectRefreshToken);
    const response: { tokens: { access: string; refresh: string } } = yield call(AUTH_API.refreshTokens, { refreshToken });
    yield put(setAccessToken(response.tokens.access));
    yield put(setRefreshToken(response.tokens.refresh));
    const newLifetime: number = parseJwtLifetime(response.tokens.access);

    yield put(setInactivityTimeout(newLifetime));
    yield put(refreshAccessTokenSuccess());
    yield put(userActivityDetected());
  } catch (error) {
    yield put(refreshAccessTokenFailure());
    yield put(logoutSuccess()); // Logout on refresh failure
  }
}

function* inactivityWatcher() {
  let timeoutTask: Task | null = null; // Track the timeout task
  while (true) {
    const user: IUser | null = yield select(selectUser);
    if (!user) {
      yield take(AUTH_ACTION_TYPES.SET_USER); // Wait for login
      continue;
    }
    yield take(AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED);
    if (timeoutTask) {
      yield cancel(timeoutTask); // Cancel previous timeout
    }
    const inactivityTimeout: number = yield select(selectInactivityTimeout);
    if (inactivityTimeout <= 60000) continue; // Skip invalid timeouts
    timeoutTask = yield fork(function* (): Generator<Effect, void, unknown> {
      yield delay(inactivityTimeout - 60000); // Wait until 60s before expiry
      yield put(showLogoutWarning());

      const raceResult = yield race({
        timeout: delay(60000), // 60s warning period
        cancel: take(AUTH_ACTION_TYPES.CANCEL_LOGOUT),
        confirm: take(AUTH_ACTION_TYPES.CONFIRM_LOGOUT),
        activity: take(AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED),
      });
      const { timeout, cancel, confirm, activity } = raceResult as InactivityRaceResult;
      if (timeout) {
      // console.log("\n\n Timeout set as : ", timeout)
        const refreshInProgress = yield select(selectRefreshInProgress);
        if (!refreshInProgress as unknown as boolean) {
          yield put(logoutSuccess());
        }
      } else if (confirm) {
      // console.log("\n\n Logout is confirmed from saga ...")
        yield put(hideLogoutWarning());
        yield put(logoutStart());
      } else if (cancel) {
        yield put(hideLogoutWarning());
        yield put(refreshAccessTokenStart());
      } else if (activity) {
      // console.log("\n\n Activity detected from saga ...")
        yield put(hideLogoutWarning());
      }
    });
  }
}

export function* watchLogin() {
  yield takeLatest(AUTH_ACTION_TYPES.LOGIN_START, login);
}

export function* watchAccessTokenRefresh() {
  yield takeLatest(AUTH_ACTION_TYPES.REFRESH_TOKENS_START, resetInactivityOnAccessRefreshed);
}

export function* watchLogout() {
  yield takeLatest(AUTH_ACTION_TYPES.LOGOUT_START, logout);
}
export function* watchFetchRemoteUser() {
  yield takeLatest(AUTH_ACTION_TYPES.FETCH_REMOTE_USER_START, fetchRemoteUser);
}

export function* watchUpToDateInstitutionFetch() {
  yield takeLatest(AUTH_ACTION_TYPES.FETCH_UP_TO_DATE_INSTITUTION, fetchRemoteInstitution);
}

export function* authSaga() {
  yield all([
    fork(watchLogin),
    fork(watchAccessTokenRefresh),
    fork(watchLogout),
    fork(watchFetchRemoteUser),
    fork(watchUpToDateInstitutionFetch),
    // fork(inactivityWatcher),
  ]);
}
