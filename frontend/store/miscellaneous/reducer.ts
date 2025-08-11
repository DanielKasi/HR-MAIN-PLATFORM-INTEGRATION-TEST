import {ICreateEmployeeForm, JobAdvertCompleteFormData, JobApplicationCompleteFormData} from "@/types/types.utils";
import {MiscAction} from "./actions";
import {MISC_ACTION_TYPES} from "./types";

export type MiscState = {
  sideBarOpened: boolean;
  employeeCreationForm: Exclude<ICreateEmployeeForm, "employee_profile_picture"> | null;
  jobAdvertForm: JobAdvertCompleteFormData | null;
  applicationForm: JobApplicationCompleteFormData | null;
};

const intialMiscState: MiscState = {
  sideBarOpened: false,
  employeeCreationForm: null,
  jobAdvertForm: null,
  applicationForm: null,
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
      return {...state, employeeCreationForm: action.payload as ICreateEmployeeForm}
    case MISC_ACTION_TYPES.CLEAR_EMPLOYEE_FORM:
      return {...state, employeeCreationForm:null}
    case MISC_ACTION_TYPES.SAVE_JOB_ADVERT_FORM:
      return {...state, jobAdvertForm: action.payload as JobAdvertCompleteFormData}
    case MISC_ACTION_TYPES.CLEAR_JOB_ADVERT_FORM:
      return {...state, jobAdvertForm: null}
    case MISC_ACTION_TYPES.SAVE_APPLICATION_FORM:
      return {...state, applicationForm: action.payload as JobApplicationCompleteFormData}
    case MISC_ACTION_TYPES.CLEAR_APPLICATION_FORM:
      return {...state, applicationForm: null}
    default:
      return state;
  }
};
