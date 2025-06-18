import {combineReducers} from "@reduxjs/toolkit";

import {authReducer} from "./auth/reducer";
import {miscReducer} from "./miscellaneous/reducer";

const rootReducer = combineReducers({
  auth: authReducer,
  miscellaneous: miscReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
