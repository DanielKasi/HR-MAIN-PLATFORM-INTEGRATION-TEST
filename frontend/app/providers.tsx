"use client";

import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { persistor, store } from "@/store";
import FixedLoader from "@/components/fixed-loader";
import NotificationsProvider from "@/providers/notifications-provider";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<Provider store={store}>
			<PersistGate loading={<FixedLoader />} persistor={persistor}>
				<NotificationsProvider>{children}</NotificationsProvider>
			</PersistGate>
		</Provider>
	);
}
