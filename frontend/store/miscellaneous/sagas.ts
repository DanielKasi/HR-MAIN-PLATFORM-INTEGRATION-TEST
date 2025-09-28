import { call, all, takeLatest, put, select, fork, take, delay } from "redux-saga/effects";
import { ActionWithPayLoad } from "../storeUtils";
import { cacheEmployeesPage, clearEmployeesCache, setEmployeesCacheTimestamp } from "./actions";
import { selectCachedEmployeesPage, selectIsEmployeesCacheValid } from "./selectors";
import { MISC_ACTION_TYPES } from "./types";
import { AUTH_ACTION_TYPES } from "../auth/types";
import { IPaginatedResponse, IEmployee } from "@/types/types.utils";

// Clear cache on logout
function* handleLogout() {
	yield put(clearEmployeesCache());
}

// Cache employees page when fetched
function* handleCacheEmployeesPage({
	payload,
}: ActionWithPayLoad<MISC_ACTION_TYPES.CACHE_EMPLOYEES_PAGE, IPaginatedResponse<IEmployee>>) {
	yield put(setEmployeesCacheTimestamp(Date.now()));
}

export function* watchEmployeesCache() {
	yield takeLatest(MISC_ACTION_TYPES.CACHE_EMPLOYEES_PAGE, handleCacheEmployeesPage);
}

export function* watchLogoutForCacheClear() {
	yield takeLatest(AUTH_ACTION_TYPES.LOGOUT_SUCCESS, handleLogout);
}

export function* miscSaga() {
	yield all([fork(watchEmployeesCache), fork(watchLogoutForCacheClear)]);
}
