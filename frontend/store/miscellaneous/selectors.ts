import {createSelector} from "reselect";

import {RootState} from "../rootReducer";

const miscSlice = (state: RootState) => state.miscellaneous;

export const selectSidebarOpened = createSelector([miscSlice], (slice) => slice.sideBarOpened);
