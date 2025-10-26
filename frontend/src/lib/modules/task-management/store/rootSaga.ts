import { all, fork } from "redux-saga/effects";

import { notificationsSaga } from "./task-managementNotifications/sagas";

import { authSaga } from "@/store/task-managementAuth/sagas";

function* rootSaga() {
	yield all([fork(authSaga), fork(notificationsSaga)]);
}

export default rootSaga;
