import { call, all, takeLatest, put, select, fork, take, delay } from "redux-saga/effects";
import { ActionWithPayLoad } from "../storeUtils";
import {
	clearEmployeesCache,
	requireAnnouncementAcknowledgmentSuccess,
	setEmployeesCacheTimestamp,
} from "./actions";
import { MISC_ACTION_TYPES } from "./types";
import { AUTH_ACTION_TYPES } from "../auth/types";
import { IPaginatedResponse, IEmployee } from "@/types/types.utils";
import { INotification } from "../notifications/types";
import { ANNOUNCEMENTS_API } from "@/lib/api/announcements.utils";
import { IAnnouncement } from "@/types/announcements.types";

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

function* requestAnnouncementAcknowledgment({
	payload,
}: ActionWithPayLoad<MISC_ACTION_TYPES.REQUIRE_ANNOUNCEMENT_ACKNOWLDEGMENT_START, INotification>) {
	try {
		const announcement: IAnnouncement = yield call(ANNOUNCEMENTS_API.getById, {
			id: payload.object_id,
		});
		yield put(requireAnnouncementAcknowledgmentSuccess(announcement));
	} catch (error) {
		console.warn("Failed to fetch announcement for acknowledgment");
	}
}

export function* watchEmployeesCache() {
	yield takeLatest(MISC_ACTION_TYPES.CACHE_EMPLOYEES_PAGE, handleCacheEmployeesPage);
}

export function* watchLogoutForCacheClear() {
	yield takeLatest(AUTH_ACTION_TYPES.LOGOUT_SUCCESS, handleLogout);
}

export function* watchAnnouncementAcknowledgmentRequest() {
	yield takeLatest(
		MISC_ACTION_TYPES.REQUIRE_ANNOUNCEMENT_ACKNOWLDEGMENT_START,
		requestAnnouncementAcknowledgment,
	);
}

export function* miscSaga() {
	yield all([
		fork(watchEmployeesCache),
		fork(watchLogoutForCacheClear),
		fork(watchAnnouncementAcknowledgmentRequest),
	]);
}
