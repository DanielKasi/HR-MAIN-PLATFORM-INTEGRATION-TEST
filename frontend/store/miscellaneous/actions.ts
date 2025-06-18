import {Action} from "redux";

import {createAction} from "../storeUtils";

import {MISC_ACTION_TYPES} from "./types";

type ToggleSideBar = Action<MISC_ACTION_TYPES.TOGGLE_SIDEBAR>;

export type MiscAction = ToggleSideBar;

export const toggleSideBarAction = () => createAction(MISC_ACTION_TYPES.TOGGLE_SIDEBAR);
