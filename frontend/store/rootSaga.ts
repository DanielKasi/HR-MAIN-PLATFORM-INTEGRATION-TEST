import { all, fork } from "redux-saga/effects";

import { notificationsSaga } from "./notifications/sagas";

import { authSaga } from "@/store/auth/sagas";
import { miscSaga } from "./miscellaneous/sagas";

function* rootSaga() {
	yield all([fork(authSaga), fork(notificationsSaga), fork(miscSaga)]);
}

export default rootSaga;
