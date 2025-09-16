import { takeLatest, put, all, fork } from "redux-saga/effects";
import { INotification, NOTIFICATION_ACTION_TYPES } from "./types";
import { receiveNotification, ReceiveNotificationAction } from "./actions";
import { toast } from "sonner";
import { showBrowserNotification } from "@/lib/helpers";

function* handleReceiveNotification(action: ReceiveNotificationAction) {
	if (action.payload && (action.payload as INotification).message) {
		// console.warn(`\n\n Notification saga task ran !`);
		toast.success(`New notification : ${action.payload.message}`);
		// showBrowserNotification({ notification: action.payload as INotification });
	}
	//   yield put(receiveNotification(action.payload as INotification));
}

function* watchReceiveNotification() {
	yield takeLatest(NOTIFICATION_ACTION_TYPES.RECEIVE_NOTIFICATION, handleReceiveNotification);
}

export function* notificationsSaga() {
	yield all([fork(watchReceiveNotification)]);
}
