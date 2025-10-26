import type { ModuleDescriptor } from "@/platform/v1/types/module";
import { authReducer } from "@/store/auth/reducer";
import { miscReducer } from "@/store/miscellaneous/reducer";
import { redirectsReducer } from "@/store/redirects/reducer";
import { notificationsReducer } from "@/store/notifications/reducer";
import { authSaga } from "@/store/auth/sagas";

export const moduleDescriptor: ModuleDescriptor = {
	name: "task-management",
	version: "1.0.0",
	platformVersion: ">=1.0.0 <2.0.0",
	routeBasePath: "/tasks",
	routes: [
		"/dashboard",
		"/projects",
		"/projects/[id]",
		"/task-mgt/task",
		"/task-mgt/completed-tasks",
		"/task-mgt/failed-tasks",
		"/admin",
		"/create-organisation",
		"/login",
		"/signup",
	],
	slices: {
		// Namespaced slice keys for host integration
		taskManagementAuth: authReducer,
		taskManagementMisc: miscReducer,
		taskManagementRedirects: redirectsReducer,
		taskManagementNotifications: notificationsReducer,
	},
	sagas: [authSaga],
	peerDeps: {
		react: "^19.1.0",
		"react-dom": "^19.1.0",
		next: "^15.2.4",
		"@reduxjs/toolkit": "^2.7.0",
		"redux-saga": "^1.3.0",
		"redux-persist": "^6.0.0",
		"@tanstack/react-query": "^5.86.0",
		tailwindcss: "^3.4.17",
		"lucide-react": "^0.454.0",
	},
};
