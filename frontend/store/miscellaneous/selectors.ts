import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../rootReducer";

// Base selectors
export const selectMiscState = (state: RootState) => state.miscellaneous;

// Derived selectors
export const selectSideBarOpened = createSelector([selectMiscState], (misc) => misc.sideBarOpened);

export const selectEmployeeCreationForm = createSelector(
	[selectMiscState],
	(misc) => misc.employeeCreationForm,
);

export const selectJobAdvertForm = createSelector([selectMiscState], (misc) => misc.jobAdvertForm);

export const selectApplicationForm = createSelector(
	[selectMiscState],
	(misc) => misc.applicationForm,
);
