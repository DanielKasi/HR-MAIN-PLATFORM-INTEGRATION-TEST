import { Action } from "redux";

import { ActionWithPayLoad, createAction } from "../storeUtils";

import { MISC_ACTION_TYPES } from "./types";

import {
	ICreateEmployeeForm,
	JobAdvertCompleteFormData,
	JobApplicationCompleteFormData,
	IEmployee,
	IPaginatedResponse,
} from "@/types/types.utils";
import { INotification } from "../notifications/types";
import { IAnnouncement } from "@/types/announcements.types";
import { ThemePalette } from "@/types/other";

type ToggleSideBar = Action<MISC_ACTION_TYPES.TOGGLE_SIDEBAR>;
type OpenSideBar = Action<MISC_ACTION_TYPES.OPEN_SIDE_BAR>;
type CloseSideBar = Action<MISC_ACTION_TYPES.CLOSE_SIDE_BAR>;

type SaveEmployeeForm = ActionWithPayLoad<
	MISC_ACTION_TYPES.SAVE_EMPLOYEE_FORM,
	ICreateEmployeeForm
>;
type ClearEmployeeForm = Action<MISC_ACTION_TYPES.CLEAR_EMPLOYEE_FORM>;

type SaveJobAdvertForm = ActionWithPayLoad<
	MISC_ACTION_TYPES.SAVE_JOB_ADVERT_FORM,
	JobAdvertCompleteFormData
>;
type ClearJobAdvertForm = Action<MISC_ACTION_TYPES.CLEAR_JOB_ADVERT_FORM>;

type SaveApplicationForm = ActionWithPayLoad<
	MISC_ACTION_TYPES.SAVE_APPLICATION_FORM,
	JobApplicationCompleteFormData
>;
type ClearApplicationForm = Action<MISC_ACTION_TYPES.CLEAR_APPLICATION_FORM>;

type CacheEmployeesPage = ActionWithPayLoad<
	MISC_ACTION_TYPES.CACHE_EMPLOYEES_PAGE,
	IPaginatedResponse<IEmployee>
>;
type ClearEmployeesCache = Action<MISC_ACTION_TYPES.CLEAR_EMPLOYEES_CACHE>;
type SetEmployeesCacheTimestamp = ActionWithPayLoad<
	MISC_ACTION_TYPES.SET_EMPLOYEES_CACHE_TIMESTAMP,
	number
>;

type RequireAnnouncementAcknowledgmentStart = ActionWithPayLoad<
	MISC_ACTION_TYPES.REQUIRE_ANNOUNCEMENT_ACKNOWLDEGMENT_START,
	INotification
>;

type ClearAcknowledgmentRequiredAnnouncement =
	Action<MISC_ACTION_TYPES.CLEAR_ACKNOWLEDGMENT_REQUIRED_ANNOUNCEMENT>;

type RequireAnnouncementAcknowledgmentSuccess = ActionWithPayLoad<
	MISC_ACTION_TYPES.REQUIRE_ANNOUNCEMENT_ACKNOWLDEGMENT_SUCCESS,
	IAnnouncement
>;

type SetThemeColorPalette = ActionWithPayLoad<
	MISC_ACTION_TYPES.SET_THEME_COLOR,
	{ color: string; palette: ThemePalette }
>;

export type MiscAction =
	| ToggleSideBar
	| OpenSideBar
	| CloseSideBar
	| SaveEmployeeForm
	| ClearEmployeeForm
	| SaveJobAdvertForm
	| ClearJobAdvertForm
	| SaveApplicationForm
	| ClearApplicationForm
	| CacheEmployeesPage
	| ClearEmployeesCache
	| SetEmployeesCacheTimestamp
	| RequireAnnouncementAcknowledgmentStart
	| RequireAnnouncementAcknowledgmentSuccess
	| ClearAcknowledgmentRequiredAnnouncement
	| SetThemeColorPalette;

export const toggleSideBarAction = () => createAction(MISC_ACTION_TYPES.TOGGLE_SIDEBAR);

export const openSideBar = (): OpenSideBar => createAction(MISC_ACTION_TYPES.OPEN_SIDE_BAR);

export const closeSideBar = (): CloseSideBar => createAction(MISC_ACTION_TYPES.CLOSE_SIDE_BAR);

export const saveEmployeeForm = (employeeForm: ICreateEmployeeForm): SaveEmployeeForm =>
	createAction(MISC_ACTION_TYPES.SAVE_EMPLOYEE_FORM, employeeForm);
export const clearEmployeeForm = (): ClearEmployeeForm =>
	createAction(MISC_ACTION_TYPES.CLEAR_EMPLOYEE_FORM);

export const saveJobAdvertForm = (jobAdvertForm: JobAdvertCompleteFormData): SaveJobAdvertForm =>
	createAction(MISC_ACTION_TYPES.SAVE_JOB_ADVERT_FORM, jobAdvertForm);
export const clearJobAdvertForm = (): ClearJobAdvertForm =>
	createAction(MISC_ACTION_TYPES.CLEAR_JOB_ADVERT_FORM);

export const saveApplicationForm = (
	applicationForm: JobApplicationCompleteFormData,
): SaveApplicationForm => createAction(MISC_ACTION_TYPES.SAVE_APPLICATION_FORM, applicationForm);
export const clearApplicationForm = (): ClearApplicationForm =>
	createAction(MISC_ACTION_TYPES.CLEAR_APPLICATION_FORM);

export const cacheEmployeesPage = (
	employeesPage: IPaginatedResponse<IEmployee>,
): CacheEmployeesPage => createAction(MISC_ACTION_TYPES.CACHE_EMPLOYEES_PAGE, employeesPage);

export const clearEmployeesCache = (): ClearEmployeesCache =>
	createAction(MISC_ACTION_TYPES.CLEAR_EMPLOYEES_CACHE);

export const setEmployeesCacheTimestamp = (timestamp: number): SetEmployeesCacheTimestamp =>
	createAction(MISC_ACTION_TYPES.SET_EMPLOYEES_CACHE_TIMESTAMP, timestamp);

export const requireAnnouncementAcknowledgmentStart = (
	notification: INotification,
): RequireAnnouncementAcknowledgmentStart => {
	return createAction(MISC_ACTION_TYPES.REQUIRE_ANNOUNCEMENT_ACKNOWLDEGMENT_START, notification);
};

export const requireAnnouncementAcknowledgmentSuccess = (
	announcement: IAnnouncement,
): RequireAnnouncementAcknowledgmentSuccess => {
	return createAction(MISC_ACTION_TYPES.REQUIRE_ANNOUNCEMENT_ACKNOWLDEGMENT_SUCCESS, announcement);
};

export const clearAcknowledgmentRequiredAnnouncement =
	(): ClearAcknowledgmentRequiredAnnouncement => {
		return createAction(MISC_ACTION_TYPES.CLEAR_ACKNOWLEDGMENT_REQUIRED_ANNOUNCEMENT);
	};

export const setThemeColor = ({
	color,
	palette,
}: {
	color: string;
	palette: ThemePalette;
}): SetThemeColorPalette => {
	return createAction(MISC_ACTION_TYPES.SET_THEME_COLOR, { color, palette });
};
