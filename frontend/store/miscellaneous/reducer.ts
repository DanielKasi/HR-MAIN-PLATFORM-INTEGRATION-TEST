import {MiscAction} from "./actions";
import {MISC_ACTION_TYPES} from "./types";

export type MiscState = {
  sideBarOpened: boolean;
};

const intialMiscState: MiscState = {
  sideBarOpened: false,
};

export const miscReducer = (
  state = intialMiscState,
  action: MiscAction | {type: string; payload?: unknown},
): MiscState => {
  switch (action.type) {
    case MISC_ACTION_TYPES.TOGGLE_SIDEBAR:
      return {...state, sideBarOpened: !state.sideBarOpened};
    default:
      return state;
  }
};
