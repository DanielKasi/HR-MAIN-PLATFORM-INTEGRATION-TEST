// AUTO-GENERATED - DO NOT EDIT
// Generated at: 2025-10-24T17:08:35.199Z

import { combineReducers } from "@reduxjs/toolkit";
import { all, fork } from "redux-saga/effects";

import { moduleDescriptor as taskmanagement } from "../modules/task-management";

// Host slices
import { authReducer } from "@/store/auth/reducer";
import { miscReducer } from "@/store/miscellaneous/reducer";
import { redirectsReducer } from "@/store/redirects/reducer";
import { notificationsReducer } from "@/store/notifications/reducer";

// Host sagas
import { authSaga } from "@/store/auth/sagas";
import { notificationsSaga } from "@/store/notifications/sagas";
import { miscSaga } from "@/store/miscellaneous/sagas";

// Root reducer - combine all slices directly
export const rootReducer = combineReducers({
	auth: authReducer,
	miscellaneous: miscReducer,
	redirects: redirectsReducer,
	notifications: notificationsReducer,
	...taskmanagement.slices,
});

// Host sagas
function* hostSagas() {
	yield all([fork(authSaga), fork(notificationsSaga), fork(miscSaga)]);
}

// Module sagas
function* moduleSagas() {
	yield all([...(taskmanagement.sagas ?? []).map((saga) => fork(saga))]);
}

// Root saga
export function* rootSaga() {
	yield all([fork(hostSagas), fork(moduleSagas)]);
}

export type RootState = ReturnType<typeof rootReducer>;
