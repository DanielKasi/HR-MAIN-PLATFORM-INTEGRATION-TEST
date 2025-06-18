// app/providers.tsx
"use client";

import React from "react";
import {Provider} from "react-redux";
import {PersistGate} from "redux-persist/integration/react";

import {persistor, store} from "@/store";
import FixedLoader from "@/components/fixed-loader";

export function Providers({children}: {children: React.ReactNode}) {
  // This will give us a _new_ store per request in SSR, but on the client it reuses the store.

  return (
    <Provider store={store}>
      <PersistGate loading={<FixedLoader />} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
