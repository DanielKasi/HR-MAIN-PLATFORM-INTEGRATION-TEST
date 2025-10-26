import { Action } from "redux";

import { ActionWithPayLoad, createAction } from "../storeUtils";

import { MISC_ACTION_TYPES } from "./types";

import { IProjectTask } from "@/types/types.utils";

type ToggleSideBar = Action<MISC_ACTION_TYPES.TOGGLE_SIDEBAR>;
type OpenSideBar = Action<MISC_ACTION_TYPES.OPEN_SIDE_BAR>;
type CloseSideBar = Action<MISC_ACTION_TYPES.CLOSE_SIDE_BAR>;

type SaveSelectedTask = ActionWithPayLoad<MISC_ACTION_TYPES.SAVE_SELECTED_TASK, IProjectTask>;
type ClearSelectedTask = Action<MISC_ACTION_TYPES.CLEAR_SELECTED_TASK>;

export type MiscAction =
	| ToggleSideBar
	| OpenSideBar
	| CloseSideBar
	| SaveSelectedTask
	| ClearSelectedTask;

export const toggleSideBarAction = () => createAction(MISC_ACTION_TYPES.TOGGLE_SIDEBAR);

export const openSideBar = (): OpenSideBar => createAction(MISC_ACTION_TYPES.OPEN_SIDE_BAR);

export const closeSideBar = (): CloseSideBar => createAction(MISC_ACTION_TYPES.CLOSE_SIDE_BAR);

export const saveSelectedTask = (task: IProjectTask): SaveSelectedTask =>
	createAction(MISC_ACTION_TYPES.SAVE_SELECTED_TASK, task);
export const clearSelectedTask = (): ClearSelectedTask =>
	createAction(MISC_ACTION_TYPES.CLEAR_SELECTED_TASK);
