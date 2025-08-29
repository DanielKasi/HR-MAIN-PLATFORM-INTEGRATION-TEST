// import {takeLatest, select, put, call} from "redux-saga/effects";

// import {AUTH_ACTION_TYPES} from "../auth/types";
// import {selectPendingRedirect} from "./selectors";
// import {clearRedirect} from "./actions";
// import { RedirectPayload } from "./types";

// function buildPathFromRedirect(redirect: any) {
//   if (!redirect) return "/";
//   const {intent, intent_id} = redirect;
//   switch (intent) {
//     case "spot_check":
//       return `/spot-checks/${intent_id}`;
//     case "onboarding":
//       return `/onboarding/${intent_id}`;
//     default:
//       return `/items/${intent}/${intent_id}`;
//   }
// }

// function* handleUserSet() {
//   try {
//     const pending:RedirectPayload|null = yield select(selectPendingRedirect);
//     if (pending) {
//       const path = buildPathFromRedirect(pending);
//       if (typeof window !== "undefined") {
//         yield put(clearRedirect());
//         window.location.href = path;
//       }
//     }
//   } catch (e) {
//     // ignore
//   }
// }

// export function* watchUserSetRedirect() {
//   yield takeLatest(AUTH_ACTION_TYPES.SET_USER, handleUserSet);
// }
