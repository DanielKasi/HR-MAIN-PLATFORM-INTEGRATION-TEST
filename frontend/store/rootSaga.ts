import { all, fork } from "redux-saga/effects";

import { notificationsSaga } from "./notifications/sagas";

import { authSaga } from "@/store/auth/sagas";

function* rootSaga() {
	yield all([fork(authSaga), fork(notificationsSaga)]);
}

export default rootSaga;
