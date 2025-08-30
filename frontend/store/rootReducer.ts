import {combineReducers} from "@reduxjs/toolkit";

import {authReducer} from "./auth/reducer";
import {miscReducer} from "./miscellaneous/reducer";
import { redirectsReducer } from "./redirects/reducer";

const rootReducer = combineReducers({
  auth: authReducer,
  miscellaneous: miscReducer,
  redirects:redirectsReducer
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
