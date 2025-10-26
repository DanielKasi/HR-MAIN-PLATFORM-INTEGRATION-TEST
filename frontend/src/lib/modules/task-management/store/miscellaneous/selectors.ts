import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../rootReducer";

// Base selectors
export const selectMiscState = (state: RootState) => state.miscellaneous;

// Derived selectors
export const selectSideBarOpened = createSelector([selectMiscState], (misc) => misc.sideBarOpened);

export const selectSelectedTask = createSelector([selectMiscState], (misc) => misc.selectedTask);
