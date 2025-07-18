import {Action} from "redux";

import {createAction} from "../storeUtils";

import {MISC_ACTION_TYPES} from "./types";

type ToggleSideBar = Action<MISC_ACTION_TYPES.TOGGLE_SIDEBAR>;

export type MiscAction = ToggleSideBar|OpenSideBar| CloseSideBar

export const toggleSideBarAction = () => createAction(MISC_ACTION_TYPES.TOGGLE_SIDEBAR);

type OpenSideBar = Action<MISC_ACTION_TYPES.OPEN_SIDE_BAR>
type CloseSideBar = Action<MISC_ACTION_TYPES.CLOSE_SIDE_BAR>



export const openSideBar = ():OpenSideBar => createAction(MISC_ACTION_TYPES.OPEN_SIDE_BAR)

export const closeSideBar = ():CloseSideBar => createAction(MISC_ACTION_TYPES.CLOSE_SIDE_BAR)

