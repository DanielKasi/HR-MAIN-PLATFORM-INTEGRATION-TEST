import {Action} from "redux";

import {ActionWithPayLoad, createAction} from "../storeUtils";

import {MISC_ACTION_TYPES} from "./types";
import { ICreateEmployeeForm } from "@/app/types/types.utils";

type ToggleSideBar = Action<MISC_ACTION_TYPES.TOGGLE_SIDEBAR>;
type OpenSideBar = Action<MISC_ACTION_TYPES.OPEN_SIDE_BAR>
type CloseSideBar = Action<MISC_ACTION_TYPES.CLOSE_SIDE_BAR>

type SaveEmployeeForm = ActionWithPayLoad<MISC_ACTION_TYPES.SAVE_EMPLOYEE_FORM, ICreateEmployeeForm>
type ClearEmployeeForm = Action<MISC_ACTION_TYPES.CLEAR_EMPLOYEE_FORM>

export type MiscAction = ToggleSideBar|OpenSideBar| CloseSideBar|SaveEmployeeForm|ClearEmployeeForm

export const toggleSideBarAction = () => createAction(MISC_ACTION_TYPES.TOGGLE_SIDEBAR);




export const openSideBar = ():OpenSideBar => createAction(MISC_ACTION_TYPES.OPEN_SIDE_BAR)

export const closeSideBar = ():CloseSideBar => createAction(MISC_ACTION_TYPES.CLOSE_SIDE_BAR);

export const saveEmployeeForm  = (employeeForm:ICreateEmployeeForm):SaveEmployeeForm => createAction(MISC_ACTION_TYPES.SAVE_EMPLOYEE_FORM, employeeForm)
export const clearEmployeeForm  = ():ClearEmployeeForm => createAction(MISC_ACTION_TYPES.CLEAR_EMPLOYEE_FORM)


