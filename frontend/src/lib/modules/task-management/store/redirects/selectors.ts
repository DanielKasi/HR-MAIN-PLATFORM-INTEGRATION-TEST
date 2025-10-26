import { createSelector } from "reselect";

import { RootState } from "../rootReducer";

const slice = (state: RootState) => state.redirects;

export const selectPendingRedirect = createSelector([slice], (s) => s.pending);
