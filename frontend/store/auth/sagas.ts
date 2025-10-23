import {
	call,
	all,
	takeLatest,
	put,
	select,
	fork,
	take,
	delay,
	race,
	cancel,
	Effect,
} from "redux-saga/effects";
import { Task } from "redux-saga";

import { ActionWithPayLoad, parseJwtLifetime } from "../storeUtils";
import {
	clearEmployeeForm,
	clearEmployeesCache,
	toggleSideBarAction,
} from "../miscellaneous/actions";
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
	fetchRelatedEmployeeSuccess,
	fetchRelatedEmployeeFailure,
} from "./actions";
import {
	selectInactivityTimeout,
	selectLastRefreshTimeInMilliseconds,
	selectLogoutWarningVisible,
	selectRefreshInProgress,
	selectRefreshToken,
	selectSelectedInstitution,
	selectUser,
} from "./selectors";

import {
	AUTH_API,
	fetchUserAttachedInstitutions,
	fetchUserById,
	LoginResponse,
	loginWithEmailAndPassword,
} from "@/utils/auth-utils";

import { IUserInstitution } from "@/types/other";
import { IUser } from "@/types/user.types";
import { IEmployee } from "@/types/types.utils";
import { EMPLOYEE_API } from "@/lib/utils";

interface InactivityRaceResult {
	timeout?: unknown;
	cancel?: unknown;
	confirm?: unknown;
	activity?: unknown;
}

function* login({
	payload: { username, password },
}: ActionWithPayLoad<AUTH_ACTION_TYPES.LOGIN_START, { username: string; password: string }>) {
	try {
		const loginResponse: LoginResponse = yield call(loginWithEmailAndPassword, username, password);

		if (!loginResponse.user || !loginResponse.tokens.access || !loginResponse.tokens.refresh) {
			throw new Error("Failed to login");
		}
		yield put(setAccessToken(loginResponse.tokens.access));
		yield put(setRefreshToken(loginResponse.tokens.refresh));

		const lifetime: number = parseJwtLifetime(loginResponse.tokens.access);
		console.log("\n\n New lifetime on login : ", lifetime);
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
	const defaultPrimaryColor = "14 100% 51%";
	const defaultRingColor = "14 100% 51%";
	const defaultSideBarAccentColor = "240 3.7% 15.9%";

	try {
		yield put(clearEmployeeForm());
		yield put(clearEmployeesCache());
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
	} catch {}
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
	} catch {}
}

function* resetInactivityOnAccessRefreshed() {
	try {
		const refreshToken: string = yield select(selectRefreshToken);
		const response: { tokens: { access: string; refresh: string } } = yield call(
			AUTH_API.refreshTokens,
			{
				refreshToken,
			},
		);

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

	// Handle persisted logout warning on reload
	const logoutWarningVisible: boolean = yield select(selectLogoutWarningVisible);
	if (logoutWarningVisible) {
		const lastRefresh: number = yield select(selectLastRefreshTimeInMilliseconds);
		const duration: number = yield select(selectInactivityTimeout);
		let remaining = lastRefresh + duration - Date.now();

		if (remaining <= 0) {
			yield put(logoutSuccess());
		} else {
			timeoutTask = yield fork(function* (): Generator<Effect, void, unknown> {
				const raceResult = yield race({
					timeout: delay(remaining),
					cancel: take(AUTH_ACTION_TYPES.CANCEL_LOGOUT),
					confirm: take(AUTH_ACTION_TYPES.CONFIRM_LOGOUT),
					activity: take(AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED),
				});
				const { timeout, cancel, confirm, activity } = raceResult as InactivityRaceResult;
				console.log("\n\n Under inactivity logout ...");
				if (timeout) {
					const refreshInProgress = yield select(selectRefreshInProgress);
					if (!refreshInProgress as unknown as boolean) {
						yield put(logoutSuccess());
					}
				} else if (confirm) {
					yield put(hideLogoutWarning());
					yield put(logoutStart());
				} else if (cancel) {
					console.log("\n\n Cancel logout dispatched ...");
					yield put(hideLogoutWarning());
					yield put(refreshAccessTokenStart());
				} else if (activity) {
					yield put(hideLogoutWarning());
					yield put(refreshAccessTokenStart()); // Refresh on activity during warning
				}
			});
		}
	}

	while (true) {
		// console.log("\n\n Got into the condition ...")
		const user: IUser | null = yield select(selectUser);

		if (!user) {
			yield take(AUTH_ACTION_TYPES.SET_USER); // Wait for login
			continue;
		}

		yield take(AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED);
		if (timeoutTask) {
			// console.log("\n\n Found timeout task and cancelled...")
			yield cancel(timeoutTask); // Cancel previous timeout
		}

		const lastRefresh: number = yield select(selectLastRefreshTimeInMilliseconds);
		const duration: number = yield select(selectInactivityTimeout);
		let remaining = lastRefresh + duration - Date.now();
		// console.log("\n\n The remaining time in the saga : ", remaining)

		if (remaining <= 0) {
			yield put(logoutSuccess());
			continue;
		}

		const warningDelay = Math.max(0, remaining - 30000);
		const raceTimeout = remaining - warningDelay;

		timeoutTask = yield fork(function* (): Generator<Effect, void, unknown> {
			yield delay(warningDelay); // Wait until warning time
			yield put(showLogoutWarning());

			const raceResult = yield race({
				timeout: delay(raceTimeout), // Adjusted timeout to match expiration
				cancel: take(AUTH_ACTION_TYPES.CANCEL_LOGOUT),
				confirm: take(AUTH_ACTION_TYPES.CONFIRM_LOGOUT),
				activity: take(AUTH_ACTION_TYPES.USER_ACTIVITY_DETECTED),
			});
			const { timeout, cancel, confirm, activity } = raceResult as InactivityRaceResult;
			console.log("\n\n Under inactivity logout ...");
			if (timeout) {
				const refreshInProgress = yield select(selectRefreshInProgress);
				if (!refreshInProgress as unknown as boolean) {
					yield put(logoutSuccess());
				}
			} else if (confirm) {
				yield put(hideLogoutWarning());
				yield put(logoutStart());
			} else if (cancel) {
				console.log("\n\n Cancel logout dispatched ...");
				yield put(hideLogoutWarning());
				yield put(refreshAccessTokenStart());
			} else if (activity) {
				yield put(hideLogoutWarning());
				yield put(refreshAccessTokenStart()); // Refresh on activity during warning
			}
		});
	}
}

function* fetchRelatedEmployee({
	payload,
}: ActionWithPayLoad<AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_START, { userId: number }>) {
	try {
		// const relatedEmployeeLoading: boolean = yield select(selectRelatedEmployeeLoading);
		// if (relatedEmployeeLoading) {
		// 	console.log("\n\n Early return from saga with related employee loading ", relatedEmployeeLoading)
		// 	throw Error("Related employee already loading ...");
		// }
		const employee: IEmployee = yield call(EMPLOYEE_API.getByUserId, { user_id: payload.userId });
		if (employee) {
			yield put(fetchRelatedEmployeeSuccess({ employee }));
		}
	} catch (error) {
		yield put(fetchRelatedEmployeeFailure());
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

export function* watchUserRelatedEmployeeFetch() {
	yield takeLatest(AUTH_ACTION_TYPES.FETCH_RELATED_EMPLOYEE_START, fetchRelatedEmployee);
}

export function* authSaga() {
	yield all([
		fork(watchLogin),
		fork(watchAccessTokenRefresh),
		fork(watchLogout),
		fork(watchFetchRemoteUser),
		fork(watchUpToDateInstitutionFetch),
		// fork(inactivityWatcher),
		fork(watchUserRelatedEmployeeFetch),
	]);
}
