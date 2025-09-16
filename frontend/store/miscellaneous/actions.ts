import { Action } from "redux";

import { ActionWithPayLoad, createAction } from "../storeUtils";

import { MISC_ACTION_TYPES } from "./types";
import {
	ICreateEmployeeForm,
	JobAdvertCompleteFormData,
	JobApplicationCompleteFormData,
} from "@/types/types.utils";

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

export type MiscAction =
	| ToggleSideBar
	| OpenSideBar
	| CloseSideBar
	| SaveEmployeeForm
	| ClearEmployeeForm
	| SaveJobAdvertForm
	| ClearJobAdvertForm
	| SaveApplicationForm
	| ClearApplicationForm;

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
