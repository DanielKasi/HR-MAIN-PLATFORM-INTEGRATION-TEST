import {ICreateEmployeeForm} from "@/app/types/types.utils";
import {MiscAction} from "./actions";
import {MISC_ACTION_TYPES} from "./types";

export type MiscState = {
  sideBarOpened: boolean;
  employeeCreationForm: Exclude<ICreateEmployeeForm, "employee_profile_picture"> | null;
};

const intialMiscState: MiscState = {
  sideBarOpened: false,
  employeeCreationForm: null,
};

export const miscReducer = (
  state = intialMiscState,
  action: MiscAction | {type: string; payload?: unknown},
): MiscState => {
  switch (action.type) {
    case MISC_ACTION_TYPES.TOGGLE_SIDEBAR:
      return {...state, sideBarOpened: !state.sideBarOpened};
    case MISC_ACTION_TYPES.OPEN_SIDE_BAR:
      return {...state, sideBarOpened: true};

    case MISC_ACTION_TYPES.CLOSE_SIDE_BAR:
      return {...state, sideBarOpened: false};
    case MISC_ACTION_TYPES.SAVE_EMPLOYEE_FORM:
      return {...state, employeeCreationForm:action.payload as ICreateEmployeeForm}
    case MISC_ACTION_TYPES.CLEAR_EMPLOYEE_FORM:
      return {...state, employeeCreationForm:null}
    default:
      return state;
  }
};
