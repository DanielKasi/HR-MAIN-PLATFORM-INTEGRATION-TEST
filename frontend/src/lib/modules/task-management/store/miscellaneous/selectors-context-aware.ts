import { createSelector } from "@reduxjs/toolkit";
import { createContextAwareSelector } from "@/lib/modules/task-management/store/create-context-aware-selector";
import { MiscState } from "./reducer";

// Create context-aware slice selector
const miscSlice = createContextAwareSelector<MiscState>("miscellaneous", (slice) => slice);

// Derived selectors
export const selectSideBarOpened = createSelector([miscSlice], (misc) => misc?.sideBarOpened);

export const selectSelectedTask = createSelector([miscSlice], (misc) => misc?.selectedTask);
