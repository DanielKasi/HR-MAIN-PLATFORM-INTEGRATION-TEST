import { combineReducers } from "@reduxjs/toolkit";

import { authReducer } from "@/lib/modules/task-management/store/auth/reducer";
import { miscReducer } from "@/lib/modules/task-management/store/miscellaneous/reducer";
import { redirectsReducer } from "@/lib/modules/task-management/store/redirects/reducer";
import { notificationsReducer } from "@/lib/modules/task-management/store/notifications/reducer";

const rootReducer = combineReducers({
	auth: authReducer,
	miscellaneous: miscReducer,
	redirects: redirectsReducer,
	notifications: notificationsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
