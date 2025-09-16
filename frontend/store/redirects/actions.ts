import { createAction, ActionWithPayLoad } from "../storeUtils";

import { RedirectPayload, REDIRECTS_ACTION_TYPES } from "./types";

type SetRedirect = ActionWithPayLoad<typeof REDIRECTS_ACTION_TYPES.SET_REDIRECT, RedirectPayload>;
type ClearRedirect = { type: typeof REDIRECTS_ACTION_TYPES.CLEAR_REDIRECT };
type TriggerRedirect = { type: typeof REDIRECTS_ACTION_TYPES.TRIGGER_REDIRECT };

export type RedirectsAction = SetRedirect | ClearRedirect | TriggerRedirect;

export const setRedirect = (payload: RedirectPayload): SetRedirect =>
	createAction(REDIRECTS_ACTION_TYPES.SET_REDIRECT, payload);

export const clearRedirect = (): ClearRedirect => ({ type: REDIRECTS_ACTION_TYPES.CLEAR_REDIRECT });

export const triggerRedirect = (): TriggerRedirect => ({
	type: REDIRECTS_ACTION_TYPES.TRIGGER_REDIRECT,
});
