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

export const selectCachedEmployeesPage = createSelector(
	[selectMiscState],
	(misc) => misc.cachedEmployeesPage,
);

export const selectEmployeesCacheTimestamp = createSelector(
	[selectMiscState],
	(misc) => misc.employeesCacheTimestamp,
);

const EMPLOYEES_CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000;

export const selectIsEmployeesCacheValid = createSelector(
	[selectEmployeesCacheTimestamp],
	(timestamp) => {
		if (timestamp === null) return false;
		const now = Date.now();
		return now - timestamp < EMPLOYEES_CACHE_EXPIRY_TIME;
	},
);

// New selector to get valid cached data or null
export const selectValidCachedEmployeesPage = createSelector(
	[selectCachedEmployeesPage, selectIsEmployeesCacheValid],
	(cachedPage, isValid) => {
		return isValid ? cachedPage : null;
	},
);

export const selectRequiredAnnouncementAcknowledgment = createSelector(
	[selectMiscState],
	(misc) => misc.acknowledgmentRequiredAnnouncement,
);
