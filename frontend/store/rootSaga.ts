import {all, fork} from "redux-saga/effects";

import {authSaga} from "@/store/auth/sagas";

function* rootSaga() {
  yield all([fork(authSaga)]);
}

export default rootSaga;
