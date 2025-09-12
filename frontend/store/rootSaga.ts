import {all, fork} from "redux-saga/effects";

import {authSaga} from "@/store/auth/sagas";
import { notificationsSaga } from "./notifications/sagas";

function* rootSaga() {
  yield all([fork(authSaga),
     fork(notificationsSaga)
    ]
    );
}

export default rootSaga;
