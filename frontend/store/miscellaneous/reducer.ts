import { IAnnouncement } from "@/types/announcements.types";
import { MiscAction } from "./actions";
import { MISC_ACTION_TYPES } from "./types";

import {
	ICreateEmployeeForm,
	JobAdvertCompleteFormData,
	JobApplicationCompleteFormData,
	IProjectTask,
	IPaginatedResponse,
	IEmployee,
} from "@/types/types.utils";

export type MiscState = {
	sideBarOpened: boolean;
	employeeCreationForm: Exclude<ICreateEmployeeForm, "employee_profile_picture"> | null;
	jobAdvertForm: JobAdvertCompleteFormData | null;
	applicationForm: JobApplicationCompleteFormData | null;
	cachedEmployeesPage: IPaginatedResponse<IEmployee> | null;
	employeesCacheTimestamp: number | null;
	acknowledgmentRequiredAnnouncement: IAnnouncement | null;
};

const intialMiscState: MiscState = {
	sideBarOpened: false,
	employeeCreationForm: null,
	jobAdvertForm: null,
	applicationForm: null,
	cachedEmployeesPage: null,
	employeesCacheTimestamp: null,
	acknowledgmentRequiredAnnouncement: null,
};

export const miscReducer = (
	state = intialMiscState,
	action: MiscAction | { type: string; payload?: unknown },
): MiscState => {
	switch (action.type) {
		case MISC_ACTION_TYPES.TOGGLE_SIDEBAR:
			return { ...state, sideBarOpened: !state.sideBarOpened };
		case MISC_ACTION_TYPES.OPEN_SIDE_BAR:
			return { ...state, sideBarOpened: true };
		case MISC_ACTION_TYPES.CLOSE_SIDE_BAR:
			return { ...state, sideBarOpened: false };
		case MISC_ACTION_TYPES.SAVE_EMPLOYEE_FORM:
			return { ...state, employeeCreationForm: action.payload as ICreateEmployeeForm };
		case MISC_ACTION_TYPES.CLEAR_EMPLOYEE_FORM:
			return { ...state, employeeCreationForm: null };
		case MISC_ACTION_TYPES.SAVE_JOB_ADVERT_FORM:
			return { ...state, jobAdvertForm: action.payload as JobAdvertCompleteFormData };
		case MISC_ACTION_TYPES.CLEAR_JOB_ADVERT_FORM:
			return { ...state, jobAdvertForm: null };
		case MISC_ACTION_TYPES.SAVE_APPLICATION_FORM:
			return { ...state, applicationForm: action.payload as JobApplicationCompleteFormData };
		case MISC_ACTION_TYPES.CLEAR_APPLICATION_FORM:
			return { ...state, applicationForm: null };

		case MISC_ACTION_TYPES.CACHE_EMPLOYEES_PAGE:
			return {
				...state,
				cachedEmployeesPage: action.payload as IPaginatedResponse<IEmployee>,
			};

		case MISC_ACTION_TYPES.CLEAR_EMPLOYEES_CACHE:
			return {
				...state,
				cachedEmployeesPage: null,
				employeesCacheTimestamp: null,
			};

		case MISC_ACTION_TYPES.SET_EMPLOYEES_CACHE_TIMESTAMP:
			return {
				...state,
				employeesCacheTimestamp: action.payload as number,
			};

		case MISC_ACTION_TYPES.REQUIRE_ANNOUNCEMENT_ACKNOWLDEGMENT_SUCCESS:
			return {
				...state,
				acknowledgmentRequiredAnnouncement: action.payload as IAnnouncement,
			};

		case MISC_ACTION_TYPES.CLEAR_ACKNOWLEDGMENT_REQUIRED_ANNOUNCEMENT:
			return {
				...state,
				acknowledgmentRequiredAnnouncement: null,
			};
		default:
			return state;
	}
};
