import { RedirectPayload, REDIRECTS_ACTION_TYPES } from "./types";

export type RedirectsState = {
	pending: RedirectPayload | null;
};

const initialState: RedirectsState = {
	pending: null,
};

export const redirectsReducer = (
	state = initialState,
	action: { type: string; payload?: any },
): RedirectsState => {
	switch (action.type) {
		case REDIRECTS_ACTION_TYPES.SET_REDIRECT:
			return { ...state, pending: action.payload as RedirectPayload };
		case REDIRECTS_ACTION_TYPES.CLEAR_REDIRECT:
			return { ...state, pending: null };
		default:
			return state;
	}
};
