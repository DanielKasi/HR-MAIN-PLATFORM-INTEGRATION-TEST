import { MiscAction } from "./actions";
import { MISC_ACTION_TYPES } from "./types";

import { IProjectTask } from "@/types/types.utils";

export type MiscState = {
	sideBarOpened: boolean;
	selectedTask: IProjectTask | null;
};

const intialMiscState: MiscState = {
	sideBarOpened: false,
	selectedTask: null,
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
		case MISC_ACTION_TYPES.SAVE_SELECTED_TASK:
			return { ...state, selectedTask: action.payload as IProjectTask };
		case MISC_ACTION_TYPES.CLEAR_SELECTED_TASK:
			return { ...state, selectedTask: null };
		default:
			return state;
	}
};
